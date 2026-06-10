import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { formatPatientLastSeen } from '../hooks/usePatientOnlinePresence';
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
            Last seen: {online ? 'Now' : formatPatientLastSeen(lastSeen)}
          </>
        ) : online ? (
          <span className="text-emerald-700 font-semibold">Online in patient app</span>
        ) : (
          <>
            Last seen{' '}
            <span className="font-medium text-slate-600">
              {formatPatientLastSeen(lastSeen)}
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
  return (
    <div className={cn('relative shrink-0', className)}>
      {children}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm',
          online ? 'bg-emerald-500' : 'bg-slate-300',
        )}
        title={online ? 'Patient app is active' : 'Patient app is not active'}
        aria-hidden
      />
    </div>
  );
}
