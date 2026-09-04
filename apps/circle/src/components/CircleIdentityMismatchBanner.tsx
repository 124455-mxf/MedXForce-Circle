import { UserRound, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleIdentityMismatchBannerProps = {
  patientNames: string[];
  onDismiss: () => void;
};

export function CircleIdentityMismatchBanner({
  patientNames,
  onDismiss,
}: CircleIdentityMismatchBannerProps) {
  const t = useCircleT();
  if (patientNames.length < 2) return null;
  const names = patientNames.join(', ');

  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-sky-100 bg-sky-50/90">
      <div className="w-10 h-10 rounded-xl bg-white border border-sky-100 flex items-center justify-center shrink-0 text-sky-700">
        <UserRound size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-sky-800 uppercase tracking-wide">
          {t('dashboard.identityMismatchTitle')}
        </p>
        <p className="text-sm font-medium text-slate-800 mt-1 leading-snug">
          {t('dashboard.identityMismatchBody', { names })}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-2 rounded-xl text-slate-400 hover:bg-white/80 shrink-0"
        aria-label={t('dashboard.identityMismatchDismiss')}
      >
        <X size={16} />
      </button>
    </div>
  );
}
