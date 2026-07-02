/** @license SPDX-License-Identifier: Apache-2.0 */

import type { AssessmentHistoryMap } from './assessmentSchedule';
import {
  appointmentTasksForPhase,
  openAppointmentTaskCount,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTaskAssignee,
} from './careCalendarAppointment';
import {
  countRecommendedCareCalendarAssessmentNudges,
  getCareCalendarAssessmentNudges,
} from './careCalendarAssessmentNudges';
import type { CareCalendarDayEvent } from './careCalendar';
import {
  careCalendarDayEventTiming,
  resolvePrepNudgeTier,
  taskAssigneesForScheduleViewer,
  type CareCalendarDayEventTiming,
  type PrepNudgeTier,
  type ScheduleTaskViewerRole,
} from './careCalendarScheduleActions';

export type AppointmentPrepCounts = {
  openTasks: number;
  openNudges: number;
  total: number;
};

export function resolveCareCalendarAppointmentTiming(
  event: CareCalendarDayEvent,
  dateKey: string,
  options: {
    now?: Date;
    highlightTodayTiming?: boolean;
    forcePast?: boolean;
  } = {},
): CareCalendarDayEventTiming {
  if (options.forcePast || event.status === 'past') return 'past';
  if (options.highlightTodayTiming) {
    return careCalendarDayEventTiming(
      dateKey,
      event.startTimeMinutes,
      event.endTimeMinutes,
      options.now,
    );
  }
  return 'upcoming';
}

function taskAssigneesForViewer(
  memberRole?: ScheduleTaskViewerRole,
): CareCalendarAppointmentTaskAssignee[] {
  if (!memberRole || memberRole === 'patient') return ['patient'];
  return taskAssigneesForScheduleViewer(memberRole);
}

function countOpenTasksForViewerOnEvent(
  event: CareCalendarDayEvent,
  phase: 'pre' | 'post',
  memberRole?: ScheduleTaskViewerRole,
): number {
  const assignees = taskAssigneesForViewer(memberRole);
  const tasks = appointmentTasksForPhase(event.appointmentTasks, phase);
  return tasks.filter((task) => task.status === 'open' && assignees.includes(task.assignee))
    .length;
}

export function countOpenPreTasksForPatientOnEvent(event: CareCalendarDayEvent): number {
  return countOpenTasksForViewerOnEvent(event, 'pre', 'patient');
}

export function countAllOpenPreTasksOnEvent(event: CareCalendarDayEvent): number {
  return openAppointmentTaskCount(appointmentTasksForPhase(event.appointmentTasks, 'pre'));
}

export function countAllOpenPostTasksOnEvent(event: CareCalendarDayEvent): number {
  return openAppointmentTaskCount(appointmentTasksForPhase(event.appointmentTasks, 'post'));
}

export type AppointmentPrepTaskScope = 'all' | 'viewer';

export function countAppointmentPrepRemaining(
  event: CareCalendarDayEvent,
  dateKey: string,
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
    now?: Date;
    tier?: PrepNudgeTier;
    memberRole?: ScheduleTaskViewerRole;
    /** Card/badge uses all roles; member task lists use viewer scope. */
    taskScope?: AppointmentPrepTaskScope;
  } = {},
): AppointmentPrepCounts {
  if (!supportsCareCalendarAppointmentEpisode(event.kind)) {
    return { openTasks: 0, openNudges: 0, total: 0 };
  }
  const now = options.now ?? new Date();
  const tier =
    options.tier ??
    resolvePrepNudgeTier(dateKey, event.startTimeMinutes, event.endTimeMinutes, now);
  const taskScope = options.taskScope ?? 'all';
  const openTasks =
    taskScope === 'viewer'
      ? countOpenTasksForViewerOnEvent(event, 'pre', options.memberRole)
      : countAllOpenPreTasksOnEvent(event);
  let openNudges = 0;
  if (options.preferences && tier === 'strong') {
    const nudges = getCareCalendarAssessmentNudges(
      event,
      dateKey,
      'pre',
      options.preferences,
      options.histories ?? {},
      undefined,
      now,
    );
    openNudges = countRecommendedCareCalendarAssessmentNudges(nudges);
  }
  return { openTasks, openNudges, total: openTasks + openNudges };
}

export function countAppointmentPostFollowUpRemaining(
  event: CareCalendarDayEvent,
  dateKey: string,
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
    now?: Date;
    memberRole?: ScheduleTaskViewerRole;
    taskScope?: AppointmentPrepTaskScope;
  } = {},
): AppointmentPrepCounts {
  if (!supportsCareCalendarAppointmentEpisode(event.kind)) {
    return { openTasks: 0, openNudges: 0, total: 0 };
  }
  const now = options.now ?? new Date();
  const taskScope = options.taskScope ?? 'all';
  const openTasks =
    taskScope === 'viewer'
      ? countOpenTasksForViewerOnEvent(event, 'post', options.memberRole)
      : countAllOpenPostTasksOnEvent(event);
  let openNudges = 0;
  if (options.preferences) {
    const nudges = getCareCalendarAssessmentNudges(
      event,
      dateKey,
      'post',
      options.preferences,
      options.histories ?? {},
      undefined,
      now,
    );
    openNudges = countRecommendedCareCalendarAssessmentNudges(nudges);
  }
  return { openTasks, openNudges, total: openTasks + openNudges };
}

export type AppointmentPrepHighlight =
  | 'none'
  | 'ready_light'
  | 'ready_strong'
  | 'needed_light'
  | 'needed_strong';

export function appointmentPrepHighlightIsNeeded(
  highlight: AppointmentPrepHighlight,
): highlight is 'needed_light' | 'needed_strong' {
  return highlight === 'needed_light' || highlight === 'needed_strong';
}

export function appointmentPrepHighlightIsReady(
  highlight: AppointmentPrepHighlight,
): highlight is 'ready_light' | 'ready_strong' {
  return highlight === 'ready_light' || highlight === 'ready_strong';
}

export function resolveAppointmentPrepHighlight(
  event: CareCalendarDayEvent,
  dateKey: string,
  timing: CareCalendarDayEventTiming,
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
    now?: Date;
  } = {},
): AppointmentPrepHighlight {
  if (timing === 'past') return 'none';
  if (!supportsCareCalendarAppointmentEpisode(event.kind)) return 'none';

  const now = options.now ?? new Date();
  const tier = resolvePrepNudgeTier(
    dateKey,
    event.startTimeMinutes,
    event.endTimeMinutes,
    now,
  );
  if (tier === 'none') return 'none';

  const prep = countAppointmentPrepRemaining(event, dateKey, { ...options, now, tier });
  const suffix = tier === 'light' ? '_light' : '_strong';
  return prep.total > 0
    ? (`needed${suffix}` as AppointmentPrepHighlight)
    : (`ready${suffix}` as AppointmentPrepHighlight);
}

/** Prep-status border for list / week blocks (not month view when disabled via prop). */
export function careCalendarPrepBorderClasses(
  highlight: AppointmentPrepHighlight,
  variant: 'card' | 'week' = 'card',
): string {
  if (highlight === 'none') return '';
  if (variant === 'card') {
    if (highlight === 'needed_light') return 'border-2 border-amber-300';
    if (highlight === 'needed_strong') return 'border-2 border-amber-400 animate-prep-border';
    if (highlight === 'ready_light') return 'border-2 border-emerald-400';
    return 'border-2 border-emerald-500';
  }
  if (highlight === 'needed_light') {
    return 'border-2 border-amber-300 shadow-sm';
  }
  if (highlight === 'needed_strong') {
    return 'border-2 border-amber-400 animate-prep-border ring-1 ring-amber-200/50';
  }
  if (highlight === 'ready_light') {
    return 'border-2 border-emerald-400 shadow-sm shadow-emerald-50/60';
  }
  return 'border-2 border-emerald-500 ring-1 ring-emerald-200/60 shadow-sm shadow-emerald-100/40';
}

export function careCalendarAppointmentCardSurfaceClasses(
  timing: CareCalendarDayEventTiming,
  prepHighlight: AppointmentPrepHighlight,
): string {
  if (prepHighlight !== 'none') {
    if (appointmentPrepHighlightIsNeeded(prepHighlight)) {
      return 'bg-amber-50/70';
    }
    return 'bg-emerald-50/70';
  }
  if (timing === 'past') return 'opacity-80 bg-slate-50/80';
  if (timing === 'in_progress') return 'bg-emerald-50/70';
  return 'bg-violet-50/80';
}

export function careCalendarCardTimingBorderClasses(
  timing: CareCalendarDayEventTiming,
  prepHighlight: AppointmentPrepHighlight,
): string {
  if (prepHighlight !== 'none') return '';
  if (timing === 'past') return 'border border-slate-200';
  if (timing === 'in_progress') return 'border border-emerald-300';
  return 'border border-violet-200';
}

export function careCalendarWeekEventBlockClasses(
  timing: CareCalendarDayEventTiming,
  isSelected: boolean,
): string {
  if (isSelected) {
    if (timing === 'past') {
      return 'bg-slate-600 border-slate-700 text-white ring-2 ring-slate-300';
    }
    if (timing === 'in_progress') {
      return 'bg-emerald-700 border-emerald-800 text-white ring-2 ring-emerald-300';
    }
    return 'bg-violet-700 border-violet-800 text-white ring-2 ring-violet-300';
  }
  if (timing === 'past') {
    return 'bg-slate-400 border-slate-500 text-white hover:bg-slate-500';
  }
  if (timing === 'in_progress') {
    return 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700';
  }
  return 'bg-violet-500 border-violet-600 text-white hover:bg-violet-600';
}
