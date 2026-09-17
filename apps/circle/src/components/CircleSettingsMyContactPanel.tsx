import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { Loader2, Lock, PencilLine, UserRound } from 'lucide-react';
import {
  composeContactDisplayName,
  findManagedContactByEmail,
  listManagedProxyContacts,
  listPatientManagedContacts,
  mergeContactWithMemberContactProfile,
  normalizeContactDateOfBirth,
  normalizeInviteEmail,
  parseMemberContactProfile,
  parsePatientManagedContacts,
  readMemberContactProfile,
  saveCircleUserProfile,
  getBrowserTimeZone,
  normalizeTimeZoneId,
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
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { normalizeCircleUiLanguage } from '../lib/circleLanguages';
import { useCircleMemberTimeZone } from '../hooks/useCircleMemberTimeZone';
import { CircleTimeZoneSelect } from './CircleTimeZoneSelect';
import {
  notifyCircleIdentityMismatchChanged,
  useCircleMemberIdentityMismatch,
} from '../hooks/useCircleMemberIdentityMismatch';
import {
  relationshipLabelI18n,
  translateCircleMemberAccessLabel,
} from '../lib/adminScreenI18n';

type CircleSettingsMyContactPanelProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
  patients?: CirclePatientSummary[];
  onProfileSaved?: (displayName: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const editableFieldClass =
  'w-full min-w-0 max-w-full box-border px-4 py-3.5 bg-white border-2 border-blue-200 rounded-xl text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all';

const readOnlyValueClass =
  'w-full px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-500';

const readOnlyBadgeClass =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-200/90 px-3 py-1 text-xs font-semibold text-slate-600';

function LockedContactFieldsNote({
  proxies,
  viewerEmail,
  viewerIsProxy,
  t,
}: {
  proxies: ManagedProxyContact[];
  viewerEmail: string;
  viewerIsProxy: boolean;
  t: ReturnType<typeof useCircleT>;
}) {
  const security = t('admin.myContactPanel.lockedSecurity');

  if (viewerIsProxy) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        {security} {t('admin.myContactPanel.lockedProxyUserMgmt')}
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
        {security} {t('admin.myContactPanel.lockedReachOutNone')}
      </p>
    );
  }

  return (
    <p className="text-[11px] text-slate-500 leading-relaxed">
      {security} {t('admin.myContactPanel.lockedReachOutPrefix')}{' '}
      {others.map((proxy, index) => {
        const roleLabel = translateCircleMemberAccessLabel(t, 'proxy', proxy.tier);
        const displayName = proxy.name.trim() || proxy.email;
        const separator =
          index === 0
            ? ''
            : index === others.length - 1
              ? ` ${t('admin.myContactPanel.or')} `
              : ', ';
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
  setFirstName: (v: string) => void,
  setLastName: (v: string) => void,
  setDateOfBirth: (v: string) => void,
  setLanguage: (v: string) => void,
  setRelationship: (v: string) => void,
) {
  setContact(merged);
  setFirstName(merged.firstName || '');
  setLastName(merged.lastName || '');
  setDateOfBirth(merged.dateOfBirth || '');
  setName(
    composeContactDisplayName({
      firstName: merged.firstName,
      lastName: merged.lastName,
      name: merged.name,
    }),
  );
  setLanguage(merged.language || 'English');
  setRelationship(merged.relationship || defaultRelationshipForKind(merged.kind));
}

export function CircleSettingsMyContactPanel({
  user,
  db,
  patient,
  patients = [],
  onProfileSaved,
  onDirtyChange,
}: CircleSettingsMyContactPanelProps) {
  const t = useCircleT();
  const { setLanguage: setUiLanguage } = useCircleI18nContext();
  const { timezoneId: savedTimezoneId, setTimezoneId: persistTimezoneId } = useCircleMemberTimeZone(
    db,
    user,
  );
  const identityMismatch = useCircleMemberIdentityMismatch(db, user, patients);
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [language, setLanguage] = useState('English');
  const [timezoneId, setTimezoneId] = useState(savedTimezoneId);
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
      setFirstName(merged.firstName || '');
      setLastName(merged.lastName || '');
      setDateOfBirth(merged.dateOfBirth || '');
      setName(
        composeContactDisplayName({
          firstName: merged.firstName,
          lastName: merged.lastName,
          name: merged.name,
        }),
      );
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
      setError(t('admin.myContactPanel.loadError'));
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId, syncFormFromMerged, t, user.email, user.uid]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId || !user.uid || !user.email) return;

    const patientRef = doc(db, 'patients', patient.patientId);
    const contactPrefsRef = doc(
      db,
      'patients',
      patient.patientId,
      'members',
      user.uid,
      'prefs',
      'contact',
    );
    const memberLegacyRef = doc(db, 'patients', patient.patientId, 'members', user.uid);

    const apply = (
      patientData: Record<string, unknown> | undefined,
      prefsData: Record<string, unknown> | undefined,
    ) => {
      if (!patientData) return;
      const listed = parsePatientManagedContacts(patientData);
      setProxyContacts(listManagedProxyContacts(listed));
      const base = findManagedContactByEmail(listed, user.email ?? '');
      if (!base) {
        syncFormFromMerged(null, false);
        return;
      }
      const memberProfile = parseMemberContactProfile(prefsData);
      syncFormFromMerged(
        mergeContactWithMemberContactProfile(base, memberProfile),
        isDirty,
      );
    };

    let latestPatient: Record<string, unknown> | undefined;
    let latestPrefs: Record<string, unknown> | undefined;
    let legacyApplied = false;

    const unsubPatient = onSnapshot(patientRef, (snap) => {
      latestPatient = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      apply(latestPatient, latestPrefs);
    });
    const unsubPrefs = onSnapshot(contactPrefsRef, (snap) => {
      if (snap.exists()) {
        latestPrefs = snap.data() as Record<string, unknown>;
        legacyApplied = true;
        apply(latestPatient, latestPrefs);
        return;
      }
      if (legacyApplied) {
        latestPrefs = undefined;
        apply(latestPatient, latestPrefs);
      }
    });
    const unsubLegacy = onSnapshot(memberLegacyRef, (snap) => {
      if (legacyApplied) return;
      latestPrefs = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      apply(latestPatient, latestPrefs);
    });

    return () => {
      unsubPatient();
      unsubPrefs();
      unsubLegacy();
    };
  }, [db, isDirty, patient?.patientId, syncFormFromMerged, user.email, user.uid]);

  useEffect(() => {
    if (!isDirty) setTimezoneId(savedTimezoneId);
  }, [isDirty, savedTimezoneId]);

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
    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();
    const nextDob = normalizeContactDateOfBirth(dateOfBirth);
    const trimmedName = composeContactDisplayName({
      firstName: nextFirstName,
      lastName: nextLastName,
      name,
    });
    if (!trimmedName) {
      setError(t('admin.users.nameRequired'));
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
          firstName: nextFirstName,
          lastName: nextLastName,
          dateOfBirth: nextDob,
          language,
          relationship: showRelationship ? nextRelationship : undefined,
        },
      );

      const nextTimezoneId = normalizeTimeZoneId(timezoneId, getBrowserTimeZone());
      await saveCircleUserProfile(db, user.uid, {
        displayName: trimmedName,
        language,
        languageSource: 'circle',
        timezoneId: nextTimezoneId,
        email: user.email || undefined,
      });
      await persistTimezoneId(nextTimezoneId);
      await updateProfile(user, { displayName: trimmedName });

      applyMergedContactToForm(
        updated,
        setContact,
        setName,
        setFirstName,
        setLastName,
        setDateOfBirth,
        setLanguage,
        setRelationship,
      );
      setUiLanguage(normalizeCircleUiLanguage(language));
      setIsDirty(false);
      setSaved(true);
      onProfileSaved?.(trimmedName);
      notifyCircleIdentityMismatchChanged();
    } catch (err) {
      console.warn('[CircleSettingsMyContactPanel] save', err);
      setError(
        err instanceof Error ? err.message : t('admin.myContactPanel.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          {t('admin.myContactPanel.noPatient')}
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
          <h3 className="font-bold text-slate-800">{t('drawer.myContact')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {t('admin.myContactPanel.subtitle', { name: patient.displayName })}
          </p>
        </div>
      </div>

      {identityMismatch.hasMismatch ? (
        <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/90">
          <p className="text-xs font-bold text-sky-800 uppercase tracking-wide">
            {t('admin.myContactPanel.identityMismatchTitle')}
          </p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            {t('admin.myContactPanel.identityMismatchNotice', {
              name: patient.displayName,
              names: identityMismatch.patientNames.join(', '),
            })}
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !contact ? (
        <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl p-4">
          {t('admin.myContactPanel.notFound', { email: user.email ?? '' })}
        </p>
      ) : (
        <>
          {patient.role && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t('admin.myContactPanel.circleAccess')}
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier)}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('admin.myContactPanel.circleAccessManaged')}
              </p>
            </div>
          )}

          <section className="space-y-4 p-4 min-w-0 overflow-x-hidden bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                {t('admin.myContactPanel.youCanEdit')}
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                <PencilLine size={12} />
                {t('admin.myContactPanel.editable')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  {t('admin.contact.fieldFirstName')}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setFirstName(next);
                    setName(
                      composeContactDisplayName({
                        firstName: next,
                        lastName,
                        name,
                      }),
                    );
                    markDirty();
                  }}
                  className={editableFieldClass}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  {t('admin.contact.fieldLastName')}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLastName(next);
                    setName(
                      composeContactDisplayName({
                        firstName,
                        lastName: next,
                        name,
                      }),
                    );
                    markDirty();
                  }}
                  className={editableFieldClass}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                {t('admin.contact.fieldName')}
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
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t('admin.myContactPanel.displayNameHint')}
              </p>
            </div>
            <div className="space-y-2 min-w-0 max-w-full">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                {t('admin.contact.fieldDob')}
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  markDirty();
                }}
                className={`${editableFieldClass} circle-date-input`}
                autoComplete="bday"
              />
            </div>
            {showRelationship ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  {t('admin.contact.fieldRelationship')}
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
                      {relationshipLabelI18n(t, option)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                {t('admin.myContactPanel.fieldApplicationLanguage')}
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                {t('admin.myContactPanel.fieldTimeZone')}
              </label>
              <CircleTimeZoneSelect
                value={timezoneId}
                onChange={(next) => {
                  setTimezoneId(next);
                  markDirty();
                }}
                className={editableFieldClass}
                aria-label={t('admin.myContactPanel.fieldTimeZone')}
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {t('admin.myContactPanel.fieldTimeZoneHint')}
              </p>
            </div>
          </section>

          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {t('admin.myContactPanel.saved')}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              saving ||
              !composeContactDisplayName({ firstName, lastName, name }).trim()
            }
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200"
          >
            {saving ? t('common.saving') : t('admin.myContactPanel.saveChanges')}
          </button>

          <section className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider min-w-0">
                {t('admin.myContactPanel.managedByPatient')}
              </h4>
              <span className={readOnlyBadgeClass}>
                <Lock size={12} className="shrink-0" aria-hidden />
                {t('admin.myContactPanel.readOnly')}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('admin.contact.fieldEmail')}
              </p>
              <p className={readOnlyValueClass}>{contact.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('admin.contact.fieldMobile')}
              </p>
              <p className={readOnlyValueClass}>{contact.mobile || '—'}</p>
            </div>
            <LockedContactFieldsNote
              proxies={proxyContacts}
              viewerEmail={user.email ?? ''}
              viewerIsProxy={viewerIsProxy}
              t={t}
            />
          </section>
        </>
      )}
    </div>
  );
}
