/** @license SPDX-License-Identifier: Apache-2.0 */

import type { AssessmentHistoryMap } from './assessmentSchedule';
import {
  appointmentTasksForPhase,
  supportsCareCalendarAppointmentEpisode,
} from './careCalendarAppointment';
import {
  countRecommendedCareCalendarAssessmentNudges,
  getCareCalendarAssessmentNudges,
} from './careCalendarAssessmentNudges';
import type { CareCalendarDayEvent } from './careCalendar';
import {
  careCalendarDayEventTiming,
  type CareCalendarDayEventTiming,
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

export function countOpenPreTasksForPatientOnEvent(event: CareCalendarDayEvent): number {
  const preTasks = appointmentTasksForPhase(event.appointmentTasks, 'pre');
  return preTasks.filter((task) => task.status === 'open' && task.assignee === 'patient').length;
}

export function countAppointmentPrepRemaining(
  event: CareCalendarDayEvent,
  dateKey: string,
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
  } = {},
): AppointmentPrepCounts {
  if (!supportsCareCalendarAppointmentEpisode(event.kind)) {
    return { openTasks: 0, openNudges: 0, total: 0 };
  }
  const openTasks = countOpenPreTasksForPatientOnEvent(event);
  let openNudges = 0;
  if (options.preferences) {
    const nudges = getCareCalendarAssessmentNudges(
      event,
      dateKey,
      'pre',
      options.preferences,
      options.histories ?? {},
    );
    openNudges = countRecommendedCareCalendarAssessmentNudges(nudges);
  }
  return { openTasks, openNudges, total: openTasks + openNudges };
}

export type AppointmentPrepHighlight = 'none' | 'ready' | 'needed';

export function resolveAppointmentPrepHighlight(
  event: CareCalendarDayEvent,
  dateKey: string,
  timing: CareCalendarDayEventTiming,
  options: {
    preferences?: Record<string, unknown>;
    histories?: AssessmentHistoryMap;
  } = {},
): AppointmentPrepHighlight {
  if (timing === 'past') return 'none';
  if (!supportsCareCalendarAppointmentEpisode(event.kind)) return 'none';
  const prep = countAppointmentPrepRemaining(event, dateKey, options);
  return prep.total > 0 ? 'needed' : 'ready';
}

export function careCalendarPrepBorderClasses(
  highlight: AppointmentPrepHighlight,
  variant: 'card' | 'week' = 'card',
): string {
  if (highlight === 'none') return '';
  if (highlight === 'needed') {
    return variant === 'week'
      ? 'border-2 !border-amber-300 animate-prep-border shadow-amber-200/40'
      : 'border-2 border-amber-400 animate-prep-border ring-2 ring-amber-200/50 shadow-amber-100/80';
  }
  return variant === 'week'
    ? 'border-2 !border-emerald-300 shadow-emerald-200/30'
    : 'border-2 border-emerald-400 ring-2 ring-emerald-200/60 shadow-emerald-100/50';
}

export function careCalendarCardTimingBorderClasses(
  timing: CareCalendarDayEventTiming,
  prepHighlight: AppointmentPrepHighlight,
): string {
  if (prepHighlight !== 'none') return '';
  if (timing === 'past') return 'border-slate-200';
  if (timing === 'in_progress') return 'border-emerald-300 ring-2 ring-emerald-300/80';
  return 'border-violet-200 ring-2 ring-violet-200';
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
