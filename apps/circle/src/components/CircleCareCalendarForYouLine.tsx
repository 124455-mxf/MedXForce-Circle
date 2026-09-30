/** @license SPDX-License-Identifier: Apache-2.0 */

import { formatCareCalendarViewerTimeRange } from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarForYouLineProps = {
  dateKey: string;
  startMinutes?: number;
  endMinutes?: number;
  eventTimeZoneId?: string | null;
  viewerTimeZoneId?: string | null;
  t: (path: string, params?: Record<string, unknown>) => string;
  className?: string;
};

export function CircleCareCalendarForYouLine({
  dateKey,
  startMinutes,
  endMinutes,
  eventTimeZoneId,
  viewerTimeZoneId,
  t,
  className,
}: CircleCareCalendarForYouLineProps) {
  const text = formatCareCalendarViewerTimeRange({
    dateKey,
    startMinutes,
    endMinutes,
    eventTimeZoneId,
    viewerTimeZoneId,
    forYouLabel: t('dashboard.careCalendar.fields.timeZoneForYou'),
  });
  if (!text) return null;
  return <p className={cn('text-[11px] font-medium text-slate-500', className)}>{text}</p>;
}
