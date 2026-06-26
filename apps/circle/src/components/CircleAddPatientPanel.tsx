import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import {
  checkPatientEmailAvailability,
  createPatientProvisionForProxy,
  type PatientProvisionRecord,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { useCircleToast } from '../hooks/useCircleToast';
import {
  provisionSetupEmailToastKey,
  sendPatientProvisionSetupEmails,
} from '../services/circlePatientProvisionSetupEmailApi';

type CircleAddPatientPanelProps = {
  user: User;
  db: Firestore;
  onCreated: (provision: PatientProvisionRecord) => void;
  compact?: boolean;
};

export function CircleAddPatientPanel({
  user,
  db,
  onCreated,
  compact = false,
}: CircleAddPatientPanelProps) {
  const t = useCircleT();
  const { showToast } = useCircleToast();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [intendedEmail, setIntendedEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDisplayName('');
    setFirstName('');
    setLastName('');
    setIntendedEmail('');
    setError(null);
  };

  const handleSubmit = async () => {
    const name =
      displayName.trim() ||
      [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
    if (!name) {
      setError(t('provision.displayNameRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (intendedEmail.trim()) {
        const availability = await checkPatientEmailAvailability(db, intendedEmail);
        if (!availability.available) {
          setError(
            availability.registeredPatientId
              ? t('provision.emailAlreadyRegistered')
              : t('provision.emailPendingSetup'),
          );
          return;
        }
      }

      const draftFirst = firstName.trim();
      const draftLast = lastName.trim();
      const provision = await createPatientProvisionForProxy(db, user, {
        displayName: name,
        intendedEmail: intendedEmail.trim() || undefined,
        profileDraft:
          draftFirst || draftLast
            ? {
                ...(draftFirst ? { firstName: draftFirst } : {}),
                ...(draftLast ? { lastName: draftLast } : {}),
              }
            : undefined,
        proxyDisplayName: user.displayName || undefined,
      });
      reset();
      setOpen(false);
      onCreated(provision);
      void sendPatientProvisionSetupEmails({ provision, proxyUser: user }).then((result) => {
        const key = provisionSetupEmailToastKey(result);
        showToast(
          key === 'setupEmailsFailed' ? result.message || t(`provision.${key}`) : t(`provision.${key}`),
          result.success ? 'success' : 'error',
        );
        if (!result.success) {
          console.warn('[CircleAddPatientPanel] setup emails', result.message);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('provision.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700'
            : 'w-full py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2'
        }
      >
        <UserPlus size={compact ? 16 : 18} />
        {t('provision.addPatient')}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Plus size={18} />
        <h3 className="font-bold">{t('provision.addPatientTitle')}</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{t('provision.addPatientHint')}</p>

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={t('provision.displayNamePlaceholder')}
        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t('provision.firstNamePlaceholder')}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t('provision.lastNamePlaceholder')}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white"
        />
      </div>
      <input
        type="email"
        value={intendedEmail}
        onChange={(e) => setIntendedEmail(e.target.value)}
        placeholder={t('provision.emailOptionalPlaceholder')}
        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSubmit()}
          className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {t('provision.createSetup')}
        </button>
      </div>
    </div>
  );
}
