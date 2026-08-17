/** @license SPDX-License-Identifier: Apache-2.0 */
import {
  getPeriodCreditStart,
  graceDaysForRecurrence,
  isRecurrenceActiveOnDate,
  isSameCalendarDay,
  type AssessmentRecurrence,
} from '@medxforce/shared';
import { CIRCLE_ANALYTICS_WINDOW_DAYS, timelinePointToTimestamp } from './circleAnalyticsChart';

export type AnalyticsAdherenceTimelinePoint = {
  date: string;
  label?: string;
  count?: number;
};

export type AssessmentScheduleAdherencePoint = {
  date: string;
  value: number;
};

export type AssessmentScheduleAdherence = {
  scheduled: number;
  taken: number;
  missed: number;
  dueToday: number;
  graceDays: number;
  takenTimeline: AssessmentScheduleAdherencePoint[];
  missedTimeline: AssessmentScheduleAdherencePoint[];
};

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function chartDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function nextScheduledDateAfter(recurrence: AssessmentRecurrence, date: Date): Date | null {
  for (let offset = 1; offset <= 40; offset += 1) {
    const candidate = addLocalDays(date, offset);
    if (isRecurrenceActiveOnDate(recurrence, candidate)) return candidate;
  }
  return null;
}

export function completionTimestampsFromAnalyticsTimeline(
  timeline: AnalyticsAdherenceTimelinePoint[] | undefined,
  latestAt?: number | null,
): number[] {
  const stamps: number[] = [];
  for (const point of timeline ?? []) {
    const count = typeof point.count === 'number' ? point.count : 1;
    if (count <= 0) continue;
    const ts = timelinePointToTimestamp(point.date, point.label);
    if (ts == null) continue;
    stamps.push(ts);
  }
  if (typeof latestAt === 'number' && Number.isFinite(latestAt) && latestAt > 0) {
    const already = stamps.some((ts) => isSameCalendarDay(ts, latestAt));
    if (!already) stamps.push(latestAt);
  }
  return stamps;
}

/**
 * Marks each scheduled occurrence in the window as taken, missed, or still due today.
 * A completion counts for an occurrence when it falls in that period’s credit window,
 * including the early-take grace from `graceDaysForRecurrence`.
 */
export function buildAssessmentScheduleAdherence(params: {
  recurrence: AssessmentRecurrence;
  completions: number[];
  now?: Date;
  windowDays?: number;
}): AssessmentScheduleAdherence {
  const now = params.now ?? new Date();
  const windowDays = params.windowDays ?? CIRCLE_ANALYTICS_WINDOW_DAYS;
  const today = startOfLocalDay(now);
  const windowStart = addLocalDays(today, -(windowDays - 1));
  const graceDays = graceDaysForRecurrence(params.recurrence);
  const completions = [...params.completions].sort((a, b) => a - b);

  const takenTimeline: AssessmentScheduleAdherencePoint[] = [];
  const missedTimeline: AssessmentScheduleAdherencePoint[] = [];
  let scheduled = 0;
  let taken = 0;
  let missed = 0;
  let dueToday = 0;

  for (let i = 0; i < windowDays; i += 1) {
    const day = addLocalDays(windowStart, i);
    day.setHours(12, 0, 0, 0);
    const date = chartDateLabel(day);
    if (!isRecurrenceActiveOnDate(params.recurrence, day)) {
      takenTimeline.push({ date, value: 0 });
      missedTimeline.push({ date, value: 0 });
      continue;
    }

    scheduled += 1;
    const creditStart = getPeriodCreditStart(params.recurrence, day);
    const next = nextScheduledDateAfter(params.recurrence, day);
    const creditEnd = next ? getPeriodCreditStart(params.recurrence, next) : Number.POSITIVE_INFINITY;
    const wasTaken = completions.some((ts) => ts >= creditStart && ts < creditEnd);
    const dayStart = startOfLocalDay(day).getTime();
    const isToday = dayStart === today.getTime();
    const isPast = dayStart < today.getTime();

    let takenValue = 0;
    let missedValue = 0;
    if (wasTaken) {
      taken += 1;
      takenValue = 1;
    } else if (isPast) {
      missed += 1;
      missedValue = 1;
    } else if (isToday) {
      dueToday += 1;
    }

    takenTimeline.push({ date, value: takenValue });
    missedTimeline.push({ date, value: missedValue });
  }

  return {
    scheduled,
    taken,
    missed,
    dueToday,
    graceDays,
    takenTimeline,
    missedTimeline,
  };
}
