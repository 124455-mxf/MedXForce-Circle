import { useState } from 'react';
import type { User } from 'firebase/auth';
import { Check, Copy, KeyRound, Loader2, Mail, Stethoscope, Trash2, X } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { useCircleToast } from '../hooks/useCircleToast';
import {
  provisionSetupEmailToastKey,
  sendPatientProvisionSetupEmails,
} from '../services/circlePatientProvisionSetupEmailApi';

type CirclePendingProvisionPanelProps = {
  patient: CirclePatientSummary;
  user: User;
  /** When the proxy manages other active patients, allow leaving this setup screen. */
  canDismiss?: boolean;
  onDismiss?: () => void;
  onSwitchPatient?: () => void;
  onCancelPending?: (patient: CirclePatientSummary) => Promise<void>;
};

export function CirclePendingProvisionPanel({
  patient,
  user,
  canDismiss = false,
  onDismiss,
  onSwitchPatient,
  onCancelPending,
}: CirclePendingProvisionPanelProps) {
  const t = useCircleT();
  const { showToast } = useCircleToast();
  const [copied, setCopied] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const setupCode = patient.setupCode || '--------';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(setupCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleSendSetupEmails = async () => {
    if (!patient.setupCode || sendingEmails) return;
    setSendingEmails(true);
    try {
      const result = await sendPatientProvisionSetupEmails({
        provision: {
          displayName: patient.displayName,
          setupCode: patient.setupCode,
          intendedEmail: patient.intendedEmail,
        },
        proxyUser: user,
      });
      const key = provisionSetupEmailToastKey(result);
      showToast(
        key === 'setupEmailsFailed' ? result.message || t(`provision.${key}`) : t(`provision.${key}`),
        result.success ? 'success' : 'error',
      );
    } finally {
      setSendingEmails(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="relative bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
        {canDismiss && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label={t('provision.dismissSetup')}
          >
            <X size={20} />
          </button>
        ) : null}

        <div className="flex items-start gap-3 pr-10">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Stethoscope size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{patient.displayName}</h2>
            <p className="text-sm text-amber-700 font-medium mt-1">{t('provision.waitingForIpad')}</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{t('provision.waitingBody')}</p>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t('provision.intendedEmailLabel')}
          </p>
          {patient.intendedEmail ? (
            <>
              <p className="text-sm font-semibold text-slate-900 break-all">{patient.intendedEmail}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{t('provision.intendedEmailHint')}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">{t('provision.intendedEmailUnset')}</p>
          )}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-blue-900">
            <KeyRound size={18} />
            <span className="text-sm font-semibold">{t('provision.setupCodeLabel')}</span>
          </div>
          <p className="font-mono text-3xl tracking-[0.2em] text-center text-blue-900 font-black">
            {setupCode}
          </p>
          <button
            type="button"
            onClick={() => void copyCode()}
            className="w-full py-3 rounded-2xl bg-white border border-blue-200 text-blue-700 font-semibold flex items-center justify-center gap-2"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? t('provision.copied') : t('provision.copyCode')}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed">{t('provision.sendSetupEmailsHint')}</p>
          <button
            type="button"
            disabled={sendingEmails || !user.email}
            onClick={() => void handleSendSetupEmails()}
            className="w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sendingEmails ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            {sendingEmails ? t('provision.sendingSetupEmails') : t('provision.sendSetupEmails')}
          </button>
        </div>

        <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
          <li>{t('provision.stepOpenSafari')}</li>
          <li>{t('provision.stepSignInGoogle')}</li>
          <li>{t('provision.stepEnterCode')}</li>
        </ol>

        {canDismiss && onSwitchPatient ? (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={onSwitchPatient}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200"
            >
              {t('provision.continueOtherPatients')}
            </button>
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              {t('provision.continueOtherPatientsHint')}
            </p>
          </div>
        ) : null}

        {onCancelPending ? (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setConfirmCancel(true);
              }}
              disabled={canceling}
              className="w-full py-3 rounded-2xl border border-red-200 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {canceling ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {t('provision.cancelPendingConfirm')}
            </button>
            {cancelError ? <p className="text-sm text-red-600 text-center">{cancelError}</p> : null}
          </div>
        ) : null}
      </div>

      {confirmCancel && onCancelPending ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{t('provision.cancelPendingTitle')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('provision.cancelPendingBody', { name: patient.displayName })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                disabled={canceling}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCanceling(true);
                  setCancelError(null);
                  void onCancelPending(patient)
                    .then(() => setConfirmCancel(false))
                    .catch((err) => {
                      console.warn('[CirclePendingProvisionPanel] cancel', err);
                      setCancelError(t('provision.cancelPendingFailed'));
                    })
                    .finally(() => setCanceling(false));
                }}
                disabled={canceling}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold disabled:opacity-50"
              >
                {t('provision.cancelPendingConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
