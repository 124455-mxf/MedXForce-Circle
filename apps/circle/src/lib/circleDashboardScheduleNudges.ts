/** @license SPDX-License-Identifier: Apache-2.0 */
import {
  countPatientAppointmentsRemainingToday,
  countPatientAppointmentsUpcomingWithinDays,
  countUpcomingScheduledAssessmentsWithinDays,
  getScheduledDueAssessments,
  type CareCalendarEntry,
} from '@medxforce/shared';
import type { CircleAssessmentScheduleContext } from './circleAssessmentScheduleMetrics';

export const CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS = 7;

export type CircleScheduleNudgeCounts = {
  dueAssessments: number;
  upcomingAssessments: number;
  appointmentsToday: number;
  upcomingAppointments: number;
};

export function computeCircleScheduleNudgeCounts(params: {
  assessmentSchedule?: CircleAssessmentScheduleContext | null;
  careEntries: CareCalendarEntry[];
  assessmentsEnabled?: boolean;
  now?: Date;
}): CircleScheduleNudgeCounts {
  const now = params.now ?? new Date();
  const assessmentsEnabled = params.assessmentsEnabled !== false;
  const schedule = params.assessmentSchedule;

  let dueAssessments = 0;
  let upcomingAssessments = 0;
  if (assessmentsEnabled && schedule?.preferences.featuresVisibility.healthAssessments) {
    dueAssessments = getScheduledDueAssessments(
      schedule.preferences,
      schedule.histories,
      schedule.remoteAssessmentSchedule,
      now,
    ).length;
    upcomingAssessments = countUpcomingScheduledAssessmentsWithinDays(
      schedule.preferences,
      schedule.histories,
      CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
      schedule.remoteAssessmentSchedule,
      now,
    );
  }

  return {
    dueAssessments,
    upcomingAssessments,
    appointmentsToday: countPatientAppointmentsRemainingToday(params.careEntries, now),
    upcomingAppointments: countPatientAppointmentsUpcomingWithinDays(
      params.careEntries,
      CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
      now,
    ),
  };
}

/** Sample schedule nudge counts for ?previewReminders=1 — fills gaps in live data. */
export function buildPreviewScheduleNudgeCounts(
  live: CircleScheduleNudgeCounts,
): CircleScheduleNudgeCounts {
  return {
    dueAssessments: Math.max(live.dueAssessments, 2),
    upcomingAssessments: Math.max(live.upcomingAssessments, 4),
    appointmentsToday: Math.max(live.appointmentsToday, 1),
    upcomingAppointments: Math.max(live.upcomingAppointments, 3),
  };
}
