import { useState } from 'react';
import { Check, Copy, KeyRound, Stethoscope, X } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';

type CirclePendingProvisionPanelProps = {
  patient: CirclePatientSummary;
  /** When the proxy manages other active patients, allow leaving this setup screen. */
  canDismiss?: boolean;
  onDismiss?: () => void;
  onSwitchPatient?: () => void;
};

export function CirclePendingProvisionPanel({
  patient,
  canDismiss = false,
  onDismiss,
  onSwitchPatient,
}: CirclePendingProvisionPanelProps) {
  const t = useCircleT();
  const [copied, setCopied] = useState(false);
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
      </div>
    </div>
  );
}
