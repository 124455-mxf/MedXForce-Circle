import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { Loader2, UserRound } from 'lucide-react';
import {
  circleMemberAccessLabel,
  findManagedContactByEmail,
  listPatientManagedContacts,
  parsePatientManagedContacts,
  readPatientDocUpdatedAt,
  saveCircleUserProfile,
  updateOwnCircleContactProfile,
  type CircleManagedContact,
  type CirclePatientSummary,
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
};

const fieldClass =
  'w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-400 transition-all';

const readOnlyValueClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-800';

export function CircleSettingsMyContactPanel({
  user,
  db,
  patient,
  onProfileSaved,
}: CircleSettingsMyContactPanelProps) {
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('English');
  const [relationship, setRelationship] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [patientDocUpdatedAt, setPatientDocUpdatedAt] = useState(0);

  const applyContact = useCallback((next: CircleManagedContact | null) => {
    setContact(next);
    if (!next) return;
    setName(next.name);
    setLanguage(next.language || 'English');
    setRelationship(next.relationship || defaultRelationshipForKind(next.kind));
  }, []);

  const loadOwnContact = useCallback(async () => {
    if (!patient?.patientId || !user.email) {
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const listed = await listPatientManagedContacts(db, patient.patientId);
      applyContact(findManagedContactByEmail(listed, user.email) ?? null);
    } catch (err) {
      console.warn('[CircleSettingsMyContactPanel]', err);
      setError('Could not load your contact details.');
    } finally {
      setLoading(false);
    }
  }, [applyContact, db, patient?.patientId, user.email]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId) return;
    return onSnapshot(doc(db, 'patients', patient.patientId), (snap) => {
      if (!snap.exists() || !user.email) return;
      setPatientDocUpdatedAt(readPatientDocUpdatedAt(snap.data() as Record<string, unknown>));
      const listed = parsePatientManagedContacts(snap.data() as Record<string, unknown>);
      applyContact(findManagedContactByEmail(listed, user.email) ?? null);
    });
  }, [applyContact, db, patient?.patientId, user.email]);

  const showRelationship =
    contact?.kind === 'caregiver' || contact?.kind === 'family';

  const relationshipOptions =
    contact?.kind === 'caregiver'
      ? (['Spouse', 'Partner', 'Child', 'Other'] as const)
      : contact?.kind === 'family'
        ? (['Family', 'Partner', 'Child', 'Parent', 'Spouse'] as const)
        : [];

  const handleSave = async () => {
    if (!patient?.patientId || !user.email || !contact) return;
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
        user.email,
        {
          name: trimmedName,
          language,
          relationship: showRelationship ? nextRelationship : undefined,
        },
        { expectedPatientUpdatedAt: patientDocUpdatedAt },
      );

      await saveCircleUserProfile(db, user.uid, {
        displayName: trimmedName,
        language,
        email: user.email || undefined,
      });
      await updateProfile(user, { displayName: trimmedName });

      applyContact(updated);
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
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Circle access
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {circleMemberAccessLabel(patient.role, patient.proxyTier)}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your access level is managed by the patient or proxy. Email and mobile stay
                read-only here so Circle sign-in stays secure.
              </p>
            </div>
          )}

          <section className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              You can edit
            </h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                className={fieldClass}
                autoComplete="name"
              />
            </div>
            {showRelationship ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => {
                    setRelationship(e.target.value);
                    setSaved(false);
                  }}
                  className={fieldClass}
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setSaved(false);
                }}
                className={fieldClass}
              >
                {CONTACT_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Managed by patient or proxy
            </h4>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</p>
              <p className={readOnlyValueClass}>{contact.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</p>
              <p className={readOnlyValueClass}>{contact.mobile || '—'}</p>
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
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      )}
    </div>
  );
}
