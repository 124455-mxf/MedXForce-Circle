/** @license SPDX-License-Identifier: Apache-2.0 */

import type { AssessmentHistoryMap } from './assessmentSchedule';
import {
  careCalendarDateKey,
  getCareCalendarByDay,
  isCareCalendarAppointmentPast,
  parseCareCalendarDateKey,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
} from './careCalendar';
import {
  countAppointmentPostFollowUpRemaining,
  countAppointmentPrepRemaining,
} from './careCalendarAppointmentDisplay';
import { isAppointmentInviteThreadPost } from './careCalendarInvite';
import {
  SCHEDULE_PREP_LIGHT_NUDGE_DAYS,
  SCHEDULE_PREP_TASK_HORIZON_DAYS,
  type ScheduleTaskViewerRole,
} from './careCalendarScheduleActions';

export type ScheduleTaskAppointmentRow = {
  entryId: string;
  dateKey: string;
  event: CareCalendarDayEvent;
  openPreTasks: number;
  openPreNudges: number;
  openPostTasks: number;
  openPostNudges: number;
  totalOpen: number;
};

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const date = parseCareCalendarDateKey(dateKey);
  date.setDate(date.getDate() + deltaDays);
  return careCalendarDateKey(date);
}

function collectRowsFromRange(
  entries: CareCalendarEntry[],
  rangeStart: Date,
  rangeEnd: Date,
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
    now?: Date;
    phase: 'pre' | 'post';
    memberRole?: ScheduleTaskViewerRole;
  },
): ScheduleTaskAppointmentRow[] {
  const now = options.now ?? new Date();
  const byDay = getCareCalendarByDay(entries, rangeStart, rangeEnd);
  const rows: ScheduleTaskAppointmentRow[] = [];

  for (const [dateKey, events] of byDay) {
    for (const event of events) {
      const taskScope =
        options.memberRole && options.memberRole !== 'patient' ? 'viewer' : 'all';
      const counts =
        options.phase === 'pre'
          ? countAppointmentPrepRemaining(event, dateKey, {
              preferences: options.preferences,
              histories: options.histories,
              now,
              memberRole: options.memberRole,
              taskScope,
            })
          : countAppointmentPostFollowUpRemaining(event, dateKey, {
              preferences: options.preferences,
              histories: options.histories,
              now,
              memberRole: options.memberRole,
              taskScope,
            });
      if (counts.total <= 0) continue;
      rows.push({
        entryId: event.entryId,
        dateKey,
        event,
        openPreTasks: options.phase === 'pre' ? counts.openTasks : 0,
        openPreNudges: options.phase === 'pre' ? counts.openNudges : 0,
        openPostTasks: options.phase === 'post' ? counts.openTasks : 0,
        openPostNudges: options.phase === 'post' ? counts.openNudges : 0,
        totalOpen: counts.total,
      });
    }
  }

  rows.sort((a, b) => {
    const dateCmp = a.dateKey.localeCompare(b.dateKey);
    if (dateCmp !== 0) return dateCmp;
    return (a.event.startTimeMinutes ?? 0) - (b.event.startTimeMinutes ?? 0);
  });
  return rows;
}

export function collectSchedulePreTaskRows(
  entries: CareCalendarEntry[],
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
    now?: Date;
    limit?: number;
    memberRole?: ScheduleTaskViewerRole;
  } = {},
): ScheduleTaskAppointmentRow[] {
  const now = options.now ?? new Date();
  const todayKey = careCalendarDateKey(now);
  const rangeStart = parseCareCalendarDateKey(todayKey);
  const rangeEnd = parseCareCalendarDateKey(addDaysToDateKey(todayKey, SCHEDULE_PREP_LIGHT_NUDGE_DAYS));
  const rows = collectRowsFromRange(entries, rangeStart, rangeEnd, {
    ...options,
    now,
    phase: 'pre',
  }).filter(
    (row) =>
      !isCareCalendarAppointmentPast(
        row.dateKey,
        row.event.startTimeMinutes,
        row.event.endTimeMinutes,
        now,
      ),
  );
  return options.limit ? rows.slice(0, options.limit) : rows;
}

export function collectSchedulePostTaskRows(
  entries: CareCalendarEntry[],
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
    now?: Date;
    limit?: number;
    memberRole?: ScheduleTaskViewerRole;
  } = {},
): ScheduleTaskAppointmentRow[] {
  const now = options.now ?? new Date();
  const todayKey = careCalendarDateKey(now);
  const rangeStart = parseCareCalendarDateKey(
    addDaysToDateKey(todayKey, -SCHEDULE_PREP_TASK_HORIZON_DAYS),
  );
  const rangeEnd = parseCareCalendarDateKey(todayKey);
  const rows = collectRowsFromRange(entries, rangeStart, rangeEnd, {
    ...options,
    now,
    phase: 'post',
  })
    .filter((row) =>
      isCareCalendarAppointmentPast(
        row.dateKey,
        row.event.startTimeMinutes,
        row.event.endTimeMinutes,
        now,
      ),
    )
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return options.limit ? rows.slice(0, options.limit) : rows;
}

export function collectUpcomingAppointmentsInHorizon(
  entries: CareCalendarEntry[],
  horizonDays: number,
  now = new Date(),
): { dateKey: string; event: CareCalendarDayEvent }[] {
  const todayKey = careCalendarDateKey(now);
  const rangeStart = parseCareCalendarDateKey(todayKey);
  const rangeEnd = parseCareCalendarDateKey(addDaysToDateKey(todayKey, horizonDays));
  const byDay = getCareCalendarByDay(entries, rangeStart, rangeEnd);
  const items: { dateKey: string; event: CareCalendarDayEvent }[] = [];
  for (const [dateKey, events] of byDay) {
    for (const event of events) {
      if (
        isCareCalendarAppointmentPast(
          dateKey,
          event.startTimeMinutes,
          event.endTimeMinutes,
          now,
        )
      ) {
        continue;
      }
      items.push({ dateKey, event });
    }
  }
  items.sort((a, b) => {
    const dateCmp = a.dateKey.localeCompare(b.dateKey);
    if (dateCmp !== 0) return dateCmp;
    return (a.event.startTimeMinutes ?? 0) - (b.event.startTimeMinutes ?? 0);
  });
  return items;
}

export function isPastAppointmentInvitePost(
  post: { postKind?: string; text: string; careCalendarEntryId?: string },
  entryById: ReadonlyMap<
    string,
    Pick<CareCalendarEntry, 'startDateKey' | 'startTimeMinutes' | 'endTimeMinutes'>
  >,
  now = new Date(),
): boolean {
  if (!isAppointmentInviteThreadPost(post)) return false;
  const entryId = post.careCalendarEntryId;
  if (!entryId) return false;
  const entry = entryById.get(entryId);
  if (!entry) return false;
  return isCareCalendarAppointmentPast(
    entry.startDateKey,
    entry.startTimeMinutes,
    entry.endTimeMinutes,
    now,
  );
}
