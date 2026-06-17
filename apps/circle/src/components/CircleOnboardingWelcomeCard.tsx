import { ExternalLink, Megaphone, X } from 'lucide-react';
import { CIRCLE_ONBOARDING_LEARN_MORE_URL, type CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { translateCircleMemberAccessLabel } from '../lib/adminScreenI18n';
import { cn } from '../lib/utils';

type CircleOnboardingWelcomeCardProps = {
  patient: CirclePatientSummary;
  variant: 'dashboard' | 'circle';
  onDismiss: () => void;
  dismissing?: boolean;
  className?: string;
};

export function CircleOnboardingWelcomeCard({
  patient,
  variant,
  onDismiss,
  dismissing = false,
  className,
}: CircleOnboardingWelcomeCardProps) {
  const t = useCircleT();
  const roleLabel = translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier);
  const bodyKey =
    variant === 'dashboard' ? 'onboarding.welcomeBodyDashboard' : 'onboarding.welcomeBodyCircle';

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-sky-50 p-4 shadow-sm',
        className,
      )}
    >
      <button
        type="button"
        aria-label={t('onboarding.dismissWelcome')}
        disabled={dismissing}
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white flex items-center justify-center shadow-sm disabled:opacity-60"
      >
        <X size={14} />
      </button>

      <div className="flex gap-3 pr-8">
        <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-700">
          <Megaphone size={18} aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
              {t('onboarding.welcomeEyebrow')}
            </p>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug mt-0.5">
              {t('onboarding.welcomeHeadline', { patient: patient.displayName })}
            </h3>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {t(bodyKey, { patient: patient.displayName, role: roleLabel })}
          </p>

          <ul className="text-xs text-slate-600 leading-relaxed space-y-1.5 list-none p-0 m-0">
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>{t('onboarding.tipDashboard')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">•</span>
              <span>{t('onboarding.tipCircle')}</span>
            </li>
            {variant === 'dashboard' ? (
              <li className="flex gap-2">
                <span className="text-indigo-500 shrink-0">•</span>
                <span>{t('onboarding.tipRole', { role: roleLabel })}</span>
              </li>
            ) : null}
          </ul>

          <a
            href={CIRCLE_ONBOARDING_LEARN_MORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
          >
            {t('onboarding.learnMore')}
            <ExternalLink size={13} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
