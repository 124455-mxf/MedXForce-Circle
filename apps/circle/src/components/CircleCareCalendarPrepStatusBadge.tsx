/** @license SPDX-License-Identifier: Apache-2.0 */

import { Check } from 'lucide-react';
import type { AssessmentHistoryMap } from '@medxforce/shared';
import {
  countAppointmentPrepRemaining,
  resolveCareCalendarAppointmentTiming,
  resolvePrepNudgeTier,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarDayEvent,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarPrepStatusBadgeProps = {
  event: CareCalendarDayEvent;
  dateKey: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  preferences?: Record<string, unknown>;
  histories?: AssessmentHistoryMap;
  now?: Date;
  highlightTodayTiming?: boolean;
  forcePast?: boolean;
  compact?: boolean;
  className?: string;
};

export function CircleCareCalendarPrepStatusBadge({
  event,
  dateKey,
  t,
  preferences,
  histories = {},
  now,
  highlightTodayTiming = false,
  forcePast = false,
  compact = false,
  className,
}: CircleCareCalendarPrepStatusBadgeProps) {
  const timing = resolveCareCalendarAppointmentTiming(event, dateKey, {
    now,
    highlightTodayTiming,
    forcePast,
  });
  if (timing !== 'upcoming' || !supportsCareCalendarAppointmentEpisode(event.kind)) {
    return null;
  }

  const tier = resolvePrepNudgeTier(
    dateKey,
    event.startTimeMinutes,
    event.endTimeMinutes,
    now,
  );
  if (tier === 'none') return null;

  const prep = countAppointmentPrepRemaining(event, dateKey, { preferences, histories, now, tier });

  if (prep.total > 0) {
    const pulse = tier === 'strong';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide text-white bg-amber-500',
          pulse && 'animate-prep-attention',
          !pulse && 'bg-amber-400',
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
          className,
        )}
        title={t('schedulePage.views.prepNeededHint', { count: prep.total })}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full bg-white shrink-0', pulse && 'animate-pulse')} aria-hidden />
        {t('schedulePage.views.prepNeeded', { count: prep.total })}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className,
      )}
    >
      <Check size={compact ? 10 : 11} className="shrink-0" aria-hidden />
      {t('schedulePage.views.prepReady')}
    </span>
  );
}
