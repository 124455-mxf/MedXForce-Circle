/** @license SPDX-License-Identifier: Apache-2.0 */
import { Clock } from 'lucide-react';
import { formatCareCalendarTimeRange, type ImminentCareCalendarAppointment } from '@medxforce/shared';
import { useCircleLiveTranslatedText } from '../hooks/useCircleLiveTranslatedText';
import { CircleCareCalendarForYouLine } from './CircleCareCalendarForYouLine';

type CircleScheduleImminentBannerProps = {
  items: ImminentCareCalendarAppointment[];
  t: (path: string, params?: Record<string, unknown>) => string;
  onSelect?: (entryId: string) => void;
  viewerTimezoneId?: string;
};

function ImminentItemRow({
  item,
  t,
  onSelect,
  viewerTimezoneId,
}: {
  item: ImminentCareCalendarAppointment;
  t: (path: string, params?: Record<string, unknown>) => string;
  onSelect?: (entryId: string) => void;
  viewerTimezoneId?: string;
}) {
  const { displayText } = useCircleLiveTranslatedText(item.title);
  const timeLabel = formatCareCalendarTimeRange(item.startTimeMinutes, item.endTimeMinutes, item.timezoneId);
  const label = t('schedulePage.views.imminentItem', {
    title: displayText,
    minutes: item.minutesUntilStart,
  });
  const detail = timeLabel ? `${label} · ${timeLabel}` : label;
  const forYouLine = (
    <CircleCareCalendarForYouLine
      dateKey={item.dateKey}
      startMinutes={item.startTimeMinutes}
      endMinutes={item.endTimeMinutes}
      eventTimeZoneId={item.timezoneId}
      viewerTimeZoneId={viewerTimezoneId}
      t={t}
      className="mt-0.5 text-amber-800/80"
    />
  );

  if (!onSelect) {
    return (
      <li className="text-sm text-amber-950">
        <p>{detail}</p>
        {forYouLine}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.entryId)}
        className="w-full text-left rounded-xl px-3 py-2 bg-white/70 border border-amber-100 hover:bg-white transition-colors text-sm text-amber-950"
      >
        <p>{detail}</p>
        {forYouLine}
      </button>
    </li>
  );
}

export function CircleScheduleImminentBanner({
  items,
  t,
  onSelect,
  viewerTimezoneId,
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
        {items.map((item) => (
          <ImminentItemRow
            key={`${item.entryId}-${item.dateKey}`}
            item={item}
            t={t}
            onSelect={onSelect}
            viewerTimezoneId={viewerTimezoneId}
          />
        ))}
      </ul>
    </div>
  );
}
