/** @license SPDX-License-Identifier: Apache-2.0 */
import { Clock } from 'lucide-react';
import { formatCareCalendarTimeRange, type ImminentCareCalendarAppointment } from '@medxforce/shared';

type CircleScheduleImminentBannerProps = {
  items: ImminentCareCalendarAppointment[];
  t: (path: string, params?: Record<string, unknown>) => string;
  onSelect?: (entryId: string) => void;
};

export function CircleScheduleImminentBanner({
  items,
  t,
  onSelect,
}: CircleScheduleImminentBannerProps) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm space-y-2">
      <div className="flex items-center gap-2 text-amber-800">
        <Clock size={16} className="shrink-0" />
        <p className="font-bold uppercase tracking-wider text-[10px]">
          {t('schedulePage.views.imminentHeading')}
        </p>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const timeLabel = formatCareCalendarTimeRange(
            item.startTimeMinutes,
            item.endTimeMinutes,
          );
          const label = t('schedulePage.views.imminentItem', {
            title: item.title,
            minutes: item.minutesUntilStart,
          });
          const detail = timeLabel ? `${label} · ${timeLabel}` : label;

          if (!onSelect) {
            return (
              <li key={`${item.entryId}-${item.dateKey}`} className="text-sm text-amber-950">
                {detail}
              </li>
            );
          }

          return (
            <li key={`${item.entryId}-${item.dateKey}`}>
              <button
                type="button"
                onClick={() => onSelect(item.entryId)}
                className="w-full text-left rounded-xl px-3 py-2 bg-white/70 border border-amber-100 hover:bg-white transition-colors text-sm text-amber-950"
              >
                {detail}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
