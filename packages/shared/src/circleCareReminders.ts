import type { CircleMemberRole } from './patientPermissions';
import { normalizeMemberRole } from './patientPermissions';
import type { PatientAnalyticsSummary } from './analyticsSummaries';
import type { AnalyticsMetricDetail } from './analyticsMetricDetail';

export const ASSESSMENT_AFTER_FIRST_COMMUNICATION_MS = 14 * 24 * 60 * 60 * 1000;

/** Assessment metrics used for the post-engagement care reminder. */
export const CARE_REMINDER_ASSESSMENT_METRIC_IDS = [
  'impact',
  'pain',
  'strength-reflex',
  'mobility',
  'numbness',
  'temperature',
  'balance',
  'vision',
  'hearing',
  'speech',
  'neurological',
  'physiological',
  'psychological',
  'stroke',
] as const;

export function canSeeCareTeamDashboardReminders(role: CircleMemberRole | string): boolean {
  const normalized = normalizeMemberRole(role);
  return normalized === 'proxy' || normalized === 'caregiver';
}

function dateKeyToTimestamp(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day).getTime();
}

function pushTimelineDates(out: number[], timeline: Array<{ date: string }> | undefined): void {
  if (!timeline) return;
  for (const point of timeline) {
    const ts = dateKeyToTimestamp(point.date);
    if (ts != null) out.push(ts);
  }
}

/** Collect assessment timestamps from synced analytics summaries. */
export function assessmentTimestampsFromSummary(summary: PatientAnalyticsSummary): number[] {
  const timestamps: number[] = [];
  if (summary.latestAt != null && Number.isFinite(summary.latestAt)) {
    timestamps.push(summary.latestAt);
  }

  const detail = summary.detail as AnalyticsMetricDetail | undefined;
  if (!detail) return timestamps;

  switch (detail.kind) {
    case 'assessment_count':
      for (const point of detail.timeline ?? []) {
        if (point.count > 0) {
          const ts = dateKeyToTimestamp(point.date);
          if (ts != null) timestamps.push(ts);
        }
      }
      break;
    case 'vision':
    case 'neurological':
    case 'psychological':
    case 'vitality_game':
      pushTimelineDates(
        timestamps,
        detail.timeline as Array<{ date: string }> | undefined,
      );
      break;
    default:
      break;
  }

  return timestamps;
}

export function hasAssessmentInWindow(
  byMetricId: Map<string, PatientAnalyticsSummary>,
  windowStart: number,
  windowEnd: number,
  metricIds: readonly string[] = CARE_REMINDER_ASSESSMENT_METRIC_IDS,
): boolean {
  for (const metricId of metricIds) {
    const summary = byMetricId.get(metricId);
    if (!summary) continue;
    for (const ts of assessmentTimestampsFromSummary(summary)) {
      if (ts >= windowStart && ts <= windowEnd) return true;
    }
  }
  return false;
}

export function shouldShowAssessmentAfterFirstCommReminder(input: {
  enabled: boolean;
  firstEngagementAt: number | null;
  hasAssessmentInInitialWindow: boolean;
  snoozedUntil: number | undefined;
  now?: number;
}): boolean {
  if (!input.enabled) return false;
  const firstAt = input.firstEngagementAt;
  if (firstAt == null || firstAt <= 0) return false;

  const now = input.now ?? Date.now();
  if (input.snoozedUntil != null && input.snoozedUntil > now) return false;

  const windowEnd = firstAt + ASSESSMENT_AFTER_FIRST_COMMUNICATION_MS;
  if (now < windowEnd) return false;
  if (input.hasAssessmentInInitialWindow) return false;
  return true;
}

export function shouldShowProfileIncompleteReminder(input: {
  enabled: boolean;
  profileComplete: boolean;
  snoozedUntil: number | undefined;
  now?: number;
}): boolean {
  if (!input.enabled || input.profileComplete) return false;
  const now = input.now ?? Date.now();
  if (input.snoozedUntil != null && input.snoozedUntil > now) return false;
  return true;
}
