import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { Loader2, Lock, PencilLine, UserRound } from 'lucide-react';
import {
  circleMemberAccessLabel,
  findManagedContactByEmail,
  listManagedProxyContacts,
  listPatientManagedContacts,
  mergeContactWithMemberContactProfile,
  normalizeInviteEmail,
  parseMemberContactProfile,
  parsePatientManagedContacts,
  readMemberContactProfile,
  saveCircleUserProfile,
  updateOwnCircleContactProfile,
  type CircleManagedContact,
  type CirclePatientSummary,
  type ManagedProxyContact,
} from '@medxforce/shared';
import {
  clampRelationship,
  CONTACT_LANGUAGE_OPTIONS,
  defaultRelationshipForKind,
} from './CircleContactEditorModal';

type CircleSettingsMyContactPanelProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
  onProfileSaved?: (displayName: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const editableFieldClass =
  'w-full px-4 py-3.5 bg-white border-2 border-blue-200 rounded-xl text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all';

const readOnlyValueClass =
  'w-full px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-500';

const readOnlyBadgeClass =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-200/90 px-3 py-1 text-xs font-semibold text-slate-600';

function LockedContactFieldsNote({
  proxies,
  viewerEmail,
  viewerIsProxy,
}: {
  proxies: ManagedProxyContact[];
  viewerEmail: string;
  viewerIsProxy: boolean;
}) {
  const security = (
    <>
      Email and mobile stay locked here so Circle sign-in stays secure.
    </>
  );

  if (viewerIsProxy) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        {security} You can update these for circle members in User Management.
      </p>
    );
  }

  const normalizedViewer = normalizeInviteEmail(viewerEmail);
  const others = proxies.filter(
    (proxy) => normalizeInviteEmail(proxy.email) !== normalizedViewer,
  );

  if (others.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        {security} To update yours, reach out to your proxy.
      </p>
    );
  }

  return (
    <p className="text-[11px] text-slate-500 leading-relaxed">
      {security} To update yours, reach out to{' '}
      {others.map((proxy, index) => {
        const roleLabel = circleMemberAccessLabel('proxy', proxy.tier);
        const displayName = proxy.name.trim() || proxy.email;
        const separator =
          index === 0 ? '' : index === others.length - 1 ? ' or ' : ', ';
        return (
          <span key={`${proxy.email}-${proxy.tier}`}>
            {separator}
            <span className="font-semibold text-slate-700">{displayName}</span> ({roleLabel})
          </span>
        );
      })}
      .
    </p>
  );
}

function applyMergedContactToForm(
  merged: CircleManagedContact,
  setContact: (c: CircleManagedContact) => void,
  setName: (v: string) => void,
  setLanguage: (v: string) => void,
  setRelationship: (v: string) => void,
) {
  setContact(merged);
  setName(merged.name);
  setLanguage(merged.language || 'English');
  setRelationship(merged.relationship || defaultRelationshipForKind(merged.kind));
}

export function CircleSettingsMyContactPanel({
  user,
  db,
  patient,
  onProfileSaved,
  onDirtyChange,
}: CircleSettingsMyContactPanelProps) {
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('English');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [proxyContacts, setProxyContacts] = useState<ManagedProxyContact[]>([]);

  const syncFormFromMerged = useCallback(
    (merged: CircleManagedContact | null, preserveDraft: boolean) => {
      setContact(merged);
      if (!merged || preserveDraft) return;
      setName(merged.name);
      setLanguage(merged.language || 'English');
      setRelationship(merged.relationship || defaultRelationshipForKind(merged.kind));
    },
    [],
  );

  const loadOwnContact = useCallback(async () => {
    if (!patient?.patientId || !user.email) {
      syncFormFromMerged(null, false);
      setProxyContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const listed = await listPatientManagedContacts(db, patient.patientId);
      setProxyContacts(listManagedProxyContacts(listed));
      const base = findManagedContactByEmail(listed, user.email) ?? null;
      if (!base || !user.uid) {
        syncFormFromMerged(base, false);
        return;
      }
      const memberProfile = await readMemberContactProfile(db, patient.patientId, user.uid);
      syncFormFromMerged(mergeContactWithMemberContactProfile(base, memberProfile), false);
    } catch (err) {
      console.warn('[CircleSettingsMyContactPanel]', err);
      setError('Could not load your contact details.');
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId, syncFormFromMerged, user.email, user.uid]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId || !user.uid || !user.email) return;

    const patientRef = doc(db, 'patients', patient.patientId);
    const memberRef = doc(db, 'patients', patient.patientId, 'members', user.uid);

    const apply = (
      patientData: Record<string, unknown> | undefined,
      memberData: Record<string, unknown> | undefined,
    ) => {
      if (!patientData) return;
      const listed = parsePatientManagedContacts(patientData);
      setProxyContacts(listManagedProxyContacts(listed));
      const base = findManagedContactByEmail(listed, user.email ?? '');
      if (!base) {
        syncFormFromMerged(null, false);
        return;
      }
      const memberProfile = parseMemberContactProfile(memberData);
      syncFormFromMerged(
        mergeContactWithMemberContactProfile(base, memberProfile),
        isDirty,
      );
    };

    let latestPatient: Record<string, unknown> | undefined;
    let latestMember: Record<string, unknown> | undefined;

    const unsubPatient = onSnapshot(patientRef, (snap) => {
      latestPatient = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      apply(latestPatient, latestMember);
    });
    const unsubMember = onSnapshot(memberRef, (snap) => {
      latestMember = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      apply(latestPatient, latestMember);
    });

    return () => {
      unsubPatient();
      unsubMember();
    };
  }, [db, isDirty, patient?.patientId, syncFormFromMerged, user.email, user.uid]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const showRelationship =
    contact?.kind === 'caregiver' || contact?.kind === 'family';

  const viewerIsProxy = patient?.role === 'proxy';

  const relationshipOptions =
    contact?.kind === 'caregiver'
      ? (['Spouse', 'Partner', 'Child', 'Other'] as const)
      : contact?.kind === 'family'
        ? (['Family', 'Partner', 'Child', 'Parent', 'Spouse'] as const)
        : [];

  const markDirty = () => {
    setIsDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!patient?.patientId || !user.email || !user.uid || !contact) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const nextRelationship = showRelationship
        ? clampRelationship(contact.kind, relationship)
        : contact.relationship;

      const updated = await updateOwnCircleContactProfile(
        db,
        patient.patientId,
        user.uid,
        user.email,
        {
          name: trimmedName,
          language,
          relationship: showRelationship ? nextRelationship : undefined,
        },
      );

      await saveCircleUserProfile(db, user.uid, {
        displayName: trimmedName,
        language,
        email: user.email || undefined,
      });
      await updateProfile(user, { displayName: trimmedName });

      applyMergedContactToForm(updated, setContact, setName, setLanguage, setRelationship);
      setIsDirty(false);
      setSaved(true);
      onProfileSaved?.(trimmedName);
    } catch (err) {
      console.warn('[CircleSettingsMyContactPanel] save', err);
      setError(err instanceof Error ? err.message : 'Could not save your contact details.');
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          Open Settings → Switch patient to choose who you are supporting first.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
          <UserRound size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">My contact details</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            How you appear to <span className="font-bold text-slate-700">{patient.displayName}</span>{' '}
            in messages and the care list
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !contact ? (
        <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl p-4">
          We could not find your contact record for this circle. Ask the patient or proxy to add{' '}
          <span className="font-semibold text-slate-700">{user.email}</span> in the Patient app.
        </p>
      ) : (
        <>
          {patient.role && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Circle access
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {circleMemberAccessLabel(patient.role, patient.proxyTier)}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your access level is managed by the patient or proxy.
              </p>
            </div>
          )}

          <section className="space-y-4 p-4 bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                You can edit
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                <PencilLine size={12} />
                Editable
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markDirty();
                }}
                className={editableFieldClass}
                autoComplete="name"
              />
            </div>
            {showRelationship ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => {
                    setRelationship(e.target.value);
                    markDirty();
                  }}
                  className={editableFieldClass}
                >
                  {relationshipOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  markDirty();
                }}
                className={editableFieldClass}
              >
                {CONTACT_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              Saved. Your name and language are updated for this circle.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          <section className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider min-w-0">
                Managed by patient or proxy
              </h4>
              <span className={readOnlyBadgeClass}>
                <Lock size={12} className="shrink-0" aria-hidden />
                Read-only
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
              <p className={readOnlyValueClass}>{contact.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</p>
              <p className={readOnlyValueClass}>{contact.mobile || '—'}</p>
            </div>
            <LockedContactFieldsNote
              proxies={proxyContacts}
              viewerEmail={user.email ?? ''}
              viewerIsProxy={viewerIsProxy}
            />
          </section>
        </>
      )}
    </div>
  );
}
