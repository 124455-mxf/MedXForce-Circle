import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import type { CirclePatientAttentionBadge } from '../lib/circlePatientAttentionBadge';

export function CirclePatientAttentionIndicator({
  badge,
  size = 'md',
  className,
}: {
  badge: CirclePatientAttentionBadge | undefined;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (!badge || (badge.totalUnread <= 0 && !badge.hasUrgentAlert)) return null;

  const iconSize = size === 'sm' ? 14 : 16;
  const badgeClass =
    size === 'sm'
      ? 'min-w-[1.25rem] h-5 px-1 text-[10px]'
      : 'min-w-[1.5rem] h-6 px-1.5 text-[11px]';

  if (badge.hasUrgentAlert) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-red-500 text-white shrink-0',
          badgeClass,
          className,
        )}
        aria-hidden
      >
        <AlertTriangle size={iconSize} className="shrink-0" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-red-500 font-bold text-white tabular-nums shrink-0',
        badgeClass,
        className,
      )}
    >
      {formatCircleBadgeCount(badge.totalUnread)}
    </span>
  );
}
