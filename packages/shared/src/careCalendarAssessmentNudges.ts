/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  SCHEDULABLE_ASSESSMENTS,
  isAssessmentDueForRecurrence,
  resolveEffectiveAssessmentScheduleRules,
  type AssessmentHistoryMap,
  type AssessmentScheduleId,
  type RemoteAssessmentSchedule,
  type SchedulableAssessmentMeta,
} from './assessmentSchedule';
import {
  careCalendarDateKey,
  isCareCalendarAppointmentPast,
  parseCareCalendarDateKey,
  type CareCalendarDayEvent,
} from './careCalendar';
import {
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarVisitSubtype,
} from './careCalendarAppointment';
import { SCHEDULE_PREP_TASK_HORIZON_DAYS } from './careCalendarScheduleActions';

export type CareCalendarAssessmentNudgePhase = 'pre' | 'post';

export type CareCalendarAssessmentNudge = {
  assessmentId: AssessmentScheduleId;
  modal: NonNullable<SchedulableAssessmentMeta['modal']>;
  titleKey: string;
  descriptionKey: string;
  phase: CareCalendarAssessmentNudgePhase;
  /** Highlight when not completed for the current schedule period */
  recommended: boolean;
};

const VISIT_SUBTYPE_NUDGES: Partial<
  Record<CareCalendarVisitSubtype, Partial<Record<CareCalendarAssessmentNudgePhase, AssessmentScheduleId[]>>>
> = {
  ophthalmology: { pre: ['vision'], post: ['vision'] },
  neurology: { pre: ['neurological'], post: ['neurological'] },
  psychology: { pre: ['psychological'], post: ['psychological'] },
  pain_physical: { pre: ['physical', 'impact'], post: ['physical'] },
  primary_care: { pre: ['impact'] },
  balance: { pre: ['mobility'] },
  pt: { pre: ['mobility', 'strength-reflex'], post: ['mobility'] },
  ot: { pre: ['mobility'] },
};

const MS_DAY = 24 * 60 * 60 * 1000;

export function assessmentIdsForVisitSubtype(
  subtype: CareCalendarVisitSubtype | undefined,
  phase: CareCalendarAssessmentNudgePhase,
): AssessmentScheduleId[] {
  if (!subtype) return [];
  return VISIT_SUBTYPE_NUDGES[subtype]?.[phase] ?? [];
}

function daysBetweenDateKeys(earlierKey: string, laterKey: string): number {
  const earlier = parseCareCalendarDateKey(earlierKey);
  const later = parseCareCalendarDateKey(laterKey);
  return Math.round((later.getTime() - earlier.getTime()) / MS_DAY);
}

export function isAppointmentInPreVisitNudgeWindow(
  dateKey: string,
  startTimeMinutes: number | undefined,
  endTimeMinutes: number | undefined,
  now = new Date(),
  horizonDays = SCHEDULE_PREP_TASK_HORIZON_DAYS,
): boolean {
  if (isCareCalendarAppointmentPast(dateKey, startTimeMinutes, endTimeMinutes, now)) {
    return false;
  }
  const todayKey = careCalendarDateKey(now);
  const daysUntil = daysBetweenDateKeys(todayKey, dateKey);
  return daysUntil >= 0 && daysUntil <= horizonDays;
}

export function isAppointmentInPostVisitNudgeWindow(
  dateKey: string,
  startTimeMinutes: number | undefined,
  endTimeMinutes: number | undefined,
  now = new Date(),
  horizonDays = SCHEDULE_PREP_TASK_HORIZON_DAYS,
): boolean {
  if (!isCareCalendarAppointmentPast(dateKey, startTimeMinutes, endTimeMinutes, now)) {
    return false;
  }
  const todayKey = careCalendarDateKey(now);
  const daysSince = daysBetweenDateKeys(dateKey, todayKey);
  return daysSince >= 0 && daysSince <= horizonDays;
}

function isFeatureEnabled(
  preferences: { featuresVisibility?: Record<string, unknown> },
  featureKey: string,
): boolean {
  const fv = preferences.featuresVisibility;
  if (!fv) return true;
  const value = fv[featureKey];
  return value === undefined ? true : !!value;
}

function latestTimestamp(entries: { timestamp: number }[] | undefined): number | null {
  if (!entries?.length) return null;
  return Math.max(...entries.map((entry) => entry.timestamp));
}

function resolveNudgeMeta(assessmentId: AssessmentScheduleId): SchedulableAssessmentMeta | undefined {
  return SCHEDULABLE_ASSESSMENTS.find((item) => item.id === assessmentId);
}

export function getCareCalendarAssessmentNudges(
  event: Pick<
    CareCalendarDayEvent,
    'kind' | 'visitSubtype' | 'startTimeMinutes' | 'endTimeMinutes'
  >,
  dateKey: string,
  phase: CareCalendarAssessmentNudgePhase,
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  },
  histories: AssessmentHistoryMap,
  remoteAssessmentSchedule?: RemoteAssessmentSchedule,
  now = new Date(),
): CareCalendarAssessmentNudge[] {
  if (!preferences.featuresVisibility?.healthAssessments) return [];
  if (!supportsCareCalendarAppointmentEpisode(event.kind)) return [];
  if (!event.visitSubtype) return [];

  const inWindow =
    phase === 'pre'
      ? isAppointmentInPreVisitNudgeWindow(
          dateKey,
          event.startTimeMinutes,
          event.endTimeMinutes,
          now,
        )
      : isAppointmentInPostVisitNudgeWindow(
          dateKey,
          event.startTimeMinutes,
          event.endTimeMinutes,
          now,
        );
  if (!inWindow) return [];

  const assessmentIds = assessmentIdsForVisitSubtype(event.visitSubtype, phase);
  if (!assessmentIds.length) return [];

  const rules = resolveEffectiveAssessmentScheduleRules({ preferences, remoteAssessmentSchedule });
  const nudges: CareCalendarAssessmentNudge[] = [];

  for (const assessmentId of assessmentIds) {
    const meta = resolveNudgeMeta(assessmentId);
    if (!meta?.released || !meta.modal) continue;
    if (!isFeatureEnabled(preferences, meta.featureKey)) continue;

    const rule = rules[assessmentId];
    if (!rule?.enabled) continue;

    const latest =
      meta.historyKey != null ? latestTimestamp(histories[meta.historyKey]) : null;
    const recommended =
      meta.historyKey != null
        ? isAssessmentDueForRecurrence(latest, rule.recurrence, now)
        : true;

    nudges.push({
      assessmentId,
      modal: meta.modal,
      titleKey: meta.titleKey,
      descriptionKey: meta.descriptionKey,
      phase,
      recommended,
    });
  }

  return nudges;
}

export function countRecommendedCareCalendarAssessmentNudges(
  nudges: CareCalendarAssessmentNudge[],
): number {
  return nudges.filter((nudge) => nudge.recommended).length;
}

export function careCalendarAssessmentNudgeShortTitleKey(titleKey: string): string {
  const match = titleKey.match(/assessments\.items\.([^.]+)\./);
  if (!match) return titleKey;
  const key = match[1] === 'strengthReflex' ? 'strengthReflex' : match[1];
  return `assessments.items.${key}.shortTitle`;
}
