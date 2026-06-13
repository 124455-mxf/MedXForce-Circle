import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { Bell, Loader2 } from 'lucide-react';
import {
  findManagedContactByEmail,
  listPatientManagedContacts,
  mergeContactWithMemberNotifyPreferences,
  parseMemberNotifyPreferences,
  readMemberNotifyPreferences,
  parsePatientManagedContacts,
  updateOwnCircleNotifyPreferences,
  type CircleManagedContact,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CircleContactNotifyGrid } from './CircleContactNotifyGrid';
import {
  CircleNotifyTurnOffConfirmModal,
  type CircleNotifyTurnOffKey,
} from './CircleNotifyTurnOffConfirmModal';
import { useCircleT } from '../lib/circleI18nContext';

type CircleSettingsNotificationPreferencesPanelProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
};

export function CircleSettingsNotificationPreferencesPanel({
  user,
  db,
  patient,
}: CircleSettingsNotificationPreferencesPanelProps) {
  const t = useCircleT();
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [turnOffConfirm, setTurnOffConfirm] = useState<CircleNotifyTurnOffKey | null>(null);
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
      const base = findManagedContactByEmail(listed, user.email) ?? null;
      if (!base || !user.uid) {
        setContact(base);
        return;
      }
      const memberPrefs = await readMemberNotifyPreferences(db, patient.patientId, user.uid);
      setContact(mergeContactWithMemberNotifyPreferences(base, memberPrefs));
    } catch (err) {
      console.warn('[CircleSettingsNotificationPreferencesPanel]', err);
      setError(t('settings.notificationsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId, t, user.email, user.uid]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId || !user.uid || !user.email) return;

    const patientRef = doc(db, 'patients', patient.patientId);
    const memberRef = doc(db, 'patients', patient.patientId, 'members', user.uid);

    const apply = (patientData: Record<string, unknown> | undefined, memberData: Record<string, unknown> | undefined) => {
      if (!patientData) return;
      const listed = parsePatientManagedContacts(patientData);
      const base = findManagedContactByEmail(listed, user.email ?? '');
      if (!base) {
        setContact(null);
        return;
      }
      const memberPrefs = parseMemberNotifyPreferences(memberData);
      setContact(mergeContactWithMemberNotifyPreferences(base, memberPrefs));
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
  }, [db, patient?.patientId, user.email, user.uid]);

  const hasEmail = !!contact?.email.trim();

  const saveToggle = async (key: 'alert' | 'attention' | 'message', nextValue: boolean) => {
    if (!patient?.patientId || !user.email || !contact) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateOwnCircleNotifyPreferences(
        db,
        patient.patientId,
        user.uid,
        user.email,
        { [key]: nextValue },
      );
      setContact(next);
      setSaved(true);
    } catch (err) {
      console.warn('[CircleSettingsNotificationPreferencesPanel] save', err);
      setError(err instanceof Error ? err.message : t('settings.notificationsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: 'alert' | 'attention' | 'message') => {
    if (!contact || saving) return;

    const turningOff = contact[key];
    if (turningOff && (key === 'alert' || key === 'attention')) {
      setTurnOffConfirm(key);
      return;
    }

    void saveToggle(key, !contact[key]);
  };

  const handleConfirmTurnOff = async () => {
    if (!turnOffConfirm) return;
    const key = turnOffConfirm;
    setTurnOffConfirm(null);
    await saveToggle(key, false);
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500">{t('settings.notificationsNoPatient')}</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <Bell size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">{t('drawer.notifications')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {t('settings.notificationsSubtitle', { name: patient.displayName })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !contact ? (
        <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl p-4">
          {t('settings.notificationsContactNotFound', { email: user.email ?? '' })}
        </p>
      ) : (
        <>
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('settings.notificationsYourEmail')}
              </p>
              <p className="text-sm font-medium text-slate-800 mt-1 break-all">{contact.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('settings.notificationsMobile')}
              </p>
              <p className="text-sm font-medium text-slate-800 mt-1">{contact.mobile || '—'}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('settings.notificationsManagedHint')}
            </p>
          </div>

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.notifyMe')}
            </h4>
            <CircleContactNotifyGrid
              values={{
                alert: contact.alert,
                attention: contact.attention,
                message: contact.message,
                sms: contact.sms,
              }}
              hasEmail={hasEmail}
              hasMobile={!!contact.mobile.trim()}
              keys={['alert', 'attention', 'message', 'sms']}
              lockSms
              onToggle={(key) => {
                if (key === 'sms') return;
                void handleToggle(key);
              }}
            />
          </section>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {t('settings.notificationsSaved')}
            </p>
          )}
          {saving && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> {t('admin.contact.saving')}
            </p>
          )}
        </>
      )}

      <CircleNotifyTurnOffConfirmModal
        open={turnOffConfirm !== null}
        notifyKey={turnOffConfirm ?? 'alert'}
        patientDisplayName={patient.displayName}
        onConfirm={() => void handleConfirmTurnOff()}
        onCancel={() => setTurnOffConfirm(null)}
        isSubmitting={saving}
      />
    </div>
  );
}
