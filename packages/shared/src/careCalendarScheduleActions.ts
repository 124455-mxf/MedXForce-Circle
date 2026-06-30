/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  appointmentTasksForPhase,
  type CareCalendarAppointmentTask,
  type CareCalendarAppointmentTaskAssignee,
} from './careCalendarAppointment';
import {
  careCalendarDateKey,
  expandCareEntryDateKeys,
  isCareCalendarAppointmentPast,
  parseCareCalendarDateKey,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
} from './careCalendar';
import {
  attendeeNeedsAppointmentInvite,
  findCareCalendarAttendeeForMember,
  mergeAttendeeResponses,
  type CareCalendarMemberInviteContext,
} from './careCalendarInvite';
import { normalizeMemberRole } from './patientPermissions';

/** Open prep tasks count appointments occurring within this many days (inclusive). */
export const SCHEDULE_PREP_TASK_HORIZON_DAYS = 7;

/** Today view banner: appointments starting within this many minutes. */
export const SCHEDULE_IMMINENT_MINUTES = 45;

/** How often the Today imminent banner re-evaluates (no Firestore reads). */
export const SCHEDULE_IMMINENT_BANNER_REFRESH_MS = 5 * 60 * 1000;

/** Split today's appointments into still-upcoming vs already ended (by slot end time). */
export function partitionCareDayEventsByPast(
  events: CareCalendarDayEvent[],
  dateKey: string,
  now = new Date(),
): { upcoming: CareCalendarDayEvent[]; past: CareCalendarDayEvent[] } {
  const upcoming: CareCalendarDayEvent[] = [];
  const past: CareCalendarDayEvent[] = [];
  for (const event of events) {
    if (
      isCareCalendarAppointmentPast(
        dateKey,
        event.startTimeMinutes,
        event.endTimeMinutes,
        now,
      )
    ) {
      past.push(event);
    } else {
      upcoming.push(event);
    }
  }
  return { upcoming, past };
}

export type CareCalendarDayEventTiming = 'upcoming' | 'in_progress' | 'past' | 'unscheduled';

export function careCalendarDayEventTiming(
  dateKey: string,
  startTimeMinutes?: number,
  endTimeMinutes?: number,
  now = new Date(),
): CareCalendarDayEventTiming {
  if (
    isCareCalendarAppointmentPast(dateKey, startTimeMinutes, endTimeMinutes, now)
  ) {
    return 'past';
  }
  if (startTimeMinutes == null) return 'unscheduled';
  const todayKey = careCalendarDateKey(now);
  if (dateKey !== todayKey) return 'upcoming';
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes >= startTimeMinutes) return 'in_progress';
  return 'upcoming';
}

export function sortCareDayEventsForTodayView(
  events: CareCalendarDayEvent[],
  dateKey: string,
  now = new Date(),
): CareCalendarDayEvent[] {
  return [...events].sort((a, b) => {
    const timingA = careCalendarDayEventTiming(
      dateKey,
      a.startTimeMinutes,
      a.endTimeMinutes,
      now,
    );
    const timingB = careCalendarDayEventTiming(
      dateKey,
      b.startTimeMinutes,
      b.endTimeMinutes,
      now,
    );
    const rank = (timing: CareCalendarDayEventTiming) =>
      timing === 'in_progress' ? 0 : timing === 'upcoming' || timing === 'unscheduled' ? 1 : 2;
    const rankDiff = rank(timingA) - rank(timingB);
    if (rankDiff !== 0) return rankDiff;
    return (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0);
  });
}

export type ScheduleTaskViewerRole = 'patient' | string;

export function taskAssigneesForScheduleViewer(
  viewerRole: ScheduleTaskViewerRole,
): CareCalendarAppointmentTaskAssignee[] {
  if (viewerRole === 'patient') return ['patient'];
  const role = normalizeMemberRole(viewerRole);
  if (role === 'caregiver') return ['caregiver'];
  if (role === 'family') return ['family'];
  if (role === 'proxy') return ['proxy'];
  return [];
}

function taskMatchesScheduleViewer(
  task: CareCalendarAppointmentTask,
  assignees: CareCalendarAppointmentTaskAssignee[],
  entry: CareCalendarEntry,
  viewerUid?: string,
): boolean {
  if (assignees.includes(task.assignee)) return true;
  return task.assignee === 'creator' && !!viewerUid && entry.createdByUid === viewerUid;
}

export function entryOccurrencesInHorizon(
  entry: CareCalendarEntry,
  horizonDays: number,
  now = new Date(),
): string[] {
  const todayKey = careCalendarDateKey(now);
  const rangeStart = parseCareCalendarDateKey(todayKey);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + Math.max(0, horizonDays));
  return expandCareEntryDateKeys(entry, rangeStart, rangeEnd).filter(
    (key) =>
      !isCareCalendarAppointmentPast(
        key,
        entry.startTimeMinutes,
        entry.endTimeMinutes,
        now,
      ),
  );
}

function inviteResponseForMember(
  entry: CareCalendarEntry,
  context: CareCalendarMemberInviteContext,
): 'pending' | 'accepted' | 'declined' {
  const attendees = mergeAttendeeResponses(entry.attendees, entry.attendeeResponseSummary);
  const self = findCareCalendarAttendeeForMember(attendees, context);
  return self?.response ?? 'pending';
}

export function countPendingAppointmentInvitesForMember(
  entries: CareCalendarEntry[],
  context: CareCalendarMemberInviteContext,
  horizonDays = SCHEDULE_PREP_TASK_HORIZON_DAYS,
  now = new Date(),
): number {
  if (!context.memberUid) return 0;

  let count = 0;
  for (const entry of entries) {
    if (entry.cancelledAt) continue;
    if (!entryOccurrencesInHorizon(entry, horizonDays, now).length) continue;

    const attendees = mergeAttendeeResponses(entry.attendees, entry.attendeeResponseSummary);
    const invitedByUid = (entry.inviteeMemberUids ?? []).includes(context.memberUid);
    const self = findCareCalendarAttendeeForMember(attendees, context);
    if (!invitedByUid && (!self || !attendeeNeedsAppointmentInvite(self))) continue;

    const response = inviteResponseForMember(entry, context);
    if (response !== 'accepted' && response !== 'declined') count++;
  }
  return count;
}

export function countOpenPreTasksForMemberInHorizon(
  entries: CareCalendarEntry[],
  options: {
    taskAssignees: CareCalendarAppointmentTaskAssignee[];
    viewerUid?: string;
    horizonDays?: number;
    now?: Date;
  },
): number {
  const horizonDays = options.horizonDays ?? SCHEDULE_PREP_TASK_HORIZON_DAYS;
  const now = options.now ?? new Date();
  const { taskAssignees, viewerUid } = options;
  if (!taskAssignees.length) return 0;

  let count = 0;
  for (const entry of entries) {
    if (entry.cancelledAt) continue;
    if (!entryOccurrencesInHorizon(entry, horizonDays, now).length) continue;

    const preTasks = appointmentTasksForPhase(entry.appointmentTasks, 'pre');
    for (const task of preTasks) {
      if (task.status !== 'open') continue;
      if (taskMatchesScheduleViewer(task, taskAssignees, entry, viewerUid)) {
        count++;
      }
    }
  }
  return count;
}

export function countScheduleTabBadge(
  entries: CareCalendarEntry[],
  options: {
    inviteContext?: CareCalendarMemberInviteContext;
    memberRole?: ScheduleTaskViewerRole;
    viewerUid?: string;
    horizonDays?: number;
    now?: Date;
  },
): number {
  const horizonDays = options.horizonDays ?? SCHEDULE_PREP_TASK_HORIZON_DAYS;
  const now = options.now ?? new Date();
  const taskAssignees = taskAssigneesForScheduleViewer(
    options.memberRole === 'patient' ? 'patient' : options.memberRole ?? 'friend',
  );

  const pending =
    options.inviteContext && options.inviteContext.memberUid
      ? countPendingAppointmentInvitesForMember(
          entries,
          options.inviteContext,
          horizonDays,
          now,
        )
      : 0;

  const prepTasks = countOpenPreTasksForMemberInHorizon(entries, {
    taskAssignees,
    viewerUid: options.viewerUid,
    horizonDays,
    now,
  });

  return pending + prepTasks;
}

export type ImminentCareCalendarAppointment = {
  entryId: string;
  title: string;
  dateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  minutesUntilStart: number;
};

function appointmentStartMs(dateKey: string, startTimeMinutes: number): number {
  const start = parseCareCalendarDateKey(dateKey);
  start.setHours(Math.floor(startTimeMinutes / 60), startTimeMinutes % 60, 0, 0);
  return start.getTime();
}

export function findImminentCareCalendarAppointments(
  entries: CareCalendarEntry[],
  options: {
    withinMinutes?: number;
    dateKey?: string;
    now?: Date;
  } = {},
): ImminentCareCalendarAppointment[] {
  const now = options.now ?? new Date();
  const withinMinutes = options.withinMinutes ?? SCHEDULE_IMMINENT_MINUTES;
  const targetDateKey = options.dateKey ?? careCalendarDateKey(now);
  const rangeStart = parseCareCalendarDateKey(targetDateKey);
  const nowMs = now.getTime();
  const results: ImminentCareCalendarAppointment[] = [];

  for (const entry of entries) {
    if (entry.cancelledAt) continue;
    const dateKeys = expandCareEntryDateKeys(entry, rangeStart, rangeStart);
    if (!dateKeys.includes(targetDateKey)) continue;
    if (
      isCareCalendarAppointmentPast(
        targetDateKey,
        entry.startTimeMinutes,
        entry.endTimeMinutes,
        now,
      )
    ) {
      continue;
    }
    if (entry.startTimeMinutes == null) continue;

    const startMs = appointmentStartMs(targetDateKey, entry.startTimeMinutes);
    const minutesUntil = (startMs - nowMs) / 60_000;
    if (minutesUntil > 0 && minutesUntil <= withinMinutes) {
      results.push({
        entryId: entry.id,
        title: entry.title,
        dateKey: targetDateKey,
        startTimeMinutes: entry.startTimeMinutes,
        endTimeMinutes: entry.endTimeMinutes,
        minutesUntilStart: Math.max(1, Math.ceil(minutesUntil)),
      });
    }
  }

  return results.sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);
}

export function findImminentCareCalendarDayEvents(
  events: CareCalendarDayEvent[],
  dateKey: string,
  options: {
    withinMinutes?: number;
    now?: Date;
  } = {},
): ImminentCareCalendarAppointment[] {
  const now = options.now ?? new Date();
  const withinMinutes = options.withinMinutes ?? SCHEDULE_IMMINENT_MINUTES;
  const nowMs = now.getTime();
  const results: ImminentCareCalendarAppointment[] = [];

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
    if (event.startTimeMinutes == null) continue;

    const startMs = appointmentStartMs(dateKey, event.startTimeMinutes);
    const minutesUntil = (startMs - nowMs) / 60_000;
    if (minutesUntil > 0 && minutesUntil <= withinMinutes) {
      results.push({
        entryId: event.entryId,
        title: event.title,
        dateKey,
        startTimeMinutes: event.startTimeMinutes,
        endTimeMinutes: event.endTimeMinutes,
        minutesUntilStart: Math.max(1, Math.ceil(minutesUntil)),
      });
    }
  }

  return results.sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);
}
