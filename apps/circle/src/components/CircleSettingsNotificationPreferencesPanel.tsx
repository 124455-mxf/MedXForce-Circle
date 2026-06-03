import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { Bell, Loader2 } from 'lucide-react';
import {
  findManagedContactByEmail,
  listPatientManagedContacts,
  parsePatientManagedContacts,
  readPatientDocUpdatedAt,
  updateOwnCircleNotifyPreferences,
  type CircleManagedContact,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CircleContactNotifyGrid } from './CircleContactNotifyGrid';

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
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [patientDocUpdatedAt, setPatientDocUpdatedAt] = useState(0);

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
      setContact(findManagedContactByEmail(listed, user.email) ?? null);
    } catch (err) {
      console.warn('[CircleSettingsNotificationPreferencesPanel]', err);
      setError('Could not load your notification settings.');
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId, user.email]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId) return;
    return onSnapshot(doc(db, 'patients', patient.patientId), (snap) => {
      if (!snap.exists() || !user.email) return;
      setPatientDocUpdatedAt(readPatientDocUpdatedAt(snap.data() as Record<string, unknown>));
      const listed = parsePatientManagedContacts(snap.data() as Record<string, unknown>);
      setContact(findManagedContactByEmail(listed, user.email) ?? null);
    });
  }, [db, patient?.patientId, user.email]);

  const hasEmail = !!contact?.email.trim();

  const handleToggle = async (key: 'alert' | 'attention' | 'message') => {
    if (!patient?.patientId || !user.email || !contact) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateOwnCircleNotifyPreferences(
        db,
        patient.patientId,
        user.email,
        { [key]: !contact[key] },
        { expectedPatientUpdatedAt: patientDocUpdatedAt },
      );
      setContact(next);
      setSaved(true);
    } catch (err) {
      console.warn('[CircleSettingsNotificationPreferencesPanel] save', err);
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500">Select someone you are caring for on the home screen first.</p>
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
          <h3 className="font-bold text-slate-800">Notifications</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            How <span className="font-bold text-red-600">{patient.displayName}</span> reaches you for
            alerts and messages
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
          <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your email</p>
              <p className="text-sm font-medium text-slate-800 mt-1 break-all">{contact.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{contact.mobile || '—'}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Email and mobile are managed by the patient or proxy so Circle sign-in stays secure.
              You can choose Alert, Attention, and Message below.
            </p>
          </div>

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notify me</h4>
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
              Saved
            </p>
          )}
          {saving && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Saving…
            </p>
          )}
        </>
      )}
    </div>
  );
}
