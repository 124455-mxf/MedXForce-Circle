import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { formatPatientLastSeenT } from '../lib/dashboardI18n';
import { cn } from '../lib/utils';

type PatientPresenceCaptionProps = {
  online: boolean;
  lastSeen?: number;
  /** Compact uppercase style (sub-page header). */
  variant?: 'header' | 'card';
  className?: string;
};

export function PatientPresenceCaption({
  online,
  lastSeen = 0,
  variant = 'card',
  className,
}: PatientPresenceCaptionProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const isHeader = variant === 'header';

  return (
    <p
      className={cn(
        'flex items-center gap-1 min-w-0 truncate',
        isHeader
          ? 'text-xs font-bold text-slate-400 uppercase tracking-wide leading-normal'
          : 'text-[11px] text-slate-500 leading-snug mt-0.5',
        className,
      )}
    >
      <Clock size={isHeader ? 12 : 11} className="shrink-0 opacity-70" aria-hidden />
      <span className="truncate">
        {isHeader ? (
          <>
            {t('presence.lastSeen')}: {online ? t('presence.now') : formatPatientLastSeenT(t, language, lastSeen)}
          </>
        ) : online ? (
          <span className="text-emerald-700 font-semibold">{t('presence.onlineInPatientApp')}</span>
        ) : (
          <>
            {t('presence.lastSeenLabel')}{' '}
            <span className="font-medium text-slate-600">
              {formatPatientLastSeenT(t, language, lastSeen)}
            </span>
          </>
        )}
      </span>
    </p>
  );
}

type PatientAvatarPresenceRingProps = {
  online: boolean;
  children: ReactNode;
  className?: string;
};

export function PatientAvatarPresenceRing({
  online,
  children,
  className,
}: PatientAvatarPresenceRingProps) {
  const t = useCircleT();

  return (
    <div className={cn('relative shrink-0', className)}>
      {children}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm',
          online ? 'bg-emerald-500' : 'bg-slate-300',
        )}
        title={online ? t('presence.patientAppActive') : t('presence.patientAppInactive')}
        aria-hidden
      />
    </div>
  );
}
