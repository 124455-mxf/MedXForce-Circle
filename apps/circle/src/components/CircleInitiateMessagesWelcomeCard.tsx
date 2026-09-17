import { MessageSquare, X } from 'lucide-react';
import { circleDisplayFirstName, type CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';

type CircleInitiateMessagesWelcomeCardProps = {
  patient: CirclePatientSummary;
  onDismiss: () => void;
  dismissing?: boolean;
  className?: string;
};

export function CircleInitiateMessagesWelcomeCard({
  patient,
  onDismiss,
  dismissing = false,
  className,
}: CircleInitiateMessagesWelcomeCardProps) {
  const t = useCircleT();
  const patientName = circleDisplayFirstName(patient.displayName, patient.firstName);

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-sky-50 p-4 shadow-sm',
        className,
      )}
    >
      <button
        type="button"
        aria-label={t('onboarding.dismissInitiateNotice')}
        disabled={dismissing}
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white flex items-center justify-center shadow-sm disabled:opacity-60"
      >
        <X size={14} />
      </button>

      <div className="flex gap-3 pr-8">
        <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-700">
          <MessageSquare size={18} aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
              {t('onboarding.initiateEyebrow')}
            </p>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug mt-0.5">
              {t('onboarding.initiateHeadline', { patient: patientName })}
            </h3>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {t('onboarding.initiateBody', { patient: patientName })}
          </p>

          <ul className="text-xs text-slate-600 leading-relaxed space-y-1.5 list-none p-0 m-0">
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>{t('onboarding.initiateTipApp')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>{t('onboarding.initiateTipGates')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>{t('onboarding.initiateTipFlood')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
