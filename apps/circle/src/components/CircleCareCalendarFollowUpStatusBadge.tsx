/** @license SPDX-License-Identifier: Apache-2.0 */

import { countVisibleAppointmentFollowUpTasks, type CareCalendarDayEvent } from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarFollowUpStatusBadgeProps = {
  event: CareCalendarDayEvent;
  dateKey: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  now?: Date;
  compact?: boolean;
  className?: string;
};

export function CircleCareCalendarFollowUpStatusBadge({
  event,
  dateKey,
  t,
  now,
  compact = false,
  className,
}: CircleCareCalendarFollowUpStatusBadgeProps) {
  const count = countVisibleAppointmentFollowUpTasks(event, dateKey, { now });
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide text-white bg-rose-500',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className,
      )}
      title={t('schedulePage.views.followUpNeededHint', { count })}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" aria-hidden />
      {t('schedulePage.views.followUpNeeded', { count })}
    </span>
  );
}
