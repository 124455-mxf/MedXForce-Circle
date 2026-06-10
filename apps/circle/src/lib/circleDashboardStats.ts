import type {
  AlertAttentionTimelinePoint,
  AssessmentCountTimelinePoint,
  CompanionTimelinePoint,
  DailyCheckInTimelinePoint,
  MessagesTimelinePoint,
  PatientAnalyticsSummary,
  VitalityGameTimelinePoint,
} from '@medxforce/shared';

export const DASHBOARD_STATS_DAYS = 7;

export const DASHBOARD_ASSESSMENT_METRIC_IDS = [
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

function sumTimelineCountLast7(timeline?: AssessmentCountTimelinePoint[]): number {
  return (timeline ?? [])
    .slice(-DASHBOARD_STATS_DAYS)
    .reduce((sum, point) => sum + point.count, 0);
}

function scaleCountToLast7(count: number, windowDays = 30): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.round((count * DASHBOARD_STATS_DAYS) / windowDays));
}

export function sumAlertAttentionLast7(timeline?: AlertAttentionTimelinePoint[]) {
  const slice = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  let alerts = 0;
  let attentions = 0;
  for (const point of slice) {
    alerts += point.alert;
    attentions += point.attention;
  }
  return { alerts, attentions, total: alerts + attentions };
}

export type AlertAttentionRecencyUrgency = 'neutral' | 'green' | 'orange' | 'red';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days since the event (0 = today). */
function calendarDaysSince(ts: number): number {
  const now = new Date();
  const event = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(
    event.getFullYear(),
    event.getMonth(),
    event.getDate(),
  );
  return Math.floor((startOfToday.getTime() - startOfEventDay.getTime()) / DAY_MS);
}

/** Tint for Alerts & attention card from last confirmed alert/attention date. */
export function getAlertAttentionRecencyUrgency(
  latestAt: number | null | undefined,
): AlertAttentionRecencyUrgency {
  if (latestAt == null || !Number.isFinite(latestAt)) return 'neutral';
  const daysAgo = calendarDaysSince(latestAt);
  if (daysAgo <= 3) return 'red';
  if (daysAgo <= 7) return 'orange';
  return 'green';
}

/** Companion sessions + exchanges in the last 7 days, excluding AI-detected opens. */
export function sumCompanionLast7ExcludingDetected(timeline?: CompanionTimelinePoint[]): number {
  const slice = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  let conversations = 0;
  let interactions = 0;
  let detected = 0;
  for (const point of slice) {
    conversations += point.conversations;
    interactions += point.interactions;
    detected += point.detected;
  }
  return Math.max(0, conversations + interactions - detected);
}

export function sumMessagesLast7(timeline?: MessagesTimelinePoint[]) {
  const slice = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  let communication = 0;
  let messaging = 0;
  for (const point of slice) {
    communication += point.communication;
    messaging += point.messaging;
  }
  return { communication, messaging, total: communication + messaging };
}

export function sumVitalityGamesLast7(timeline?: VitalityGameTimelinePoint[]) {
  const slice = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  return slice.reduce((sum, point) => sum + point.games, 0);
}

export function sumDailyCheckInLast7(timeline?: DailyCheckInTimelinePoint[]) {
  const slice = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  let completed = 0;
  let skipped = 0;
  for (const point of slice) {
    completed += point.completed;
    skipped += point.skipped;
  }
  return { completed, skipped, total: completed + skipped };
}

export function resolveDailyCheckInLast7Stats(detail?: {
  completedLast7?: number;
  skippedLast7?: number;
  timeline?: DailyCheckInTimelinePoint[];
} | null) {
  if (
    detail &&
    typeof detail.completedLast7 === 'number' &&
    typeof detail.skippedLast7 === 'number'
  ) {
    const completed = detail.completedLast7;
    const skipped = detail.skippedLast7;
    return { completed, skipped, total: completed + skipped };
  }
  return sumDailyCheckInLast7(detail?.timeline);
}

export type DailyCheckInRecencyInput = {
  completedInWindow: number;
  skippedInWindow: number;
  latestCompletedAt: number | null | undefined;
  hasHistory: boolean;
};

/** Tint for Daily check-in card from last-7-day completion pattern and recency. */
export function getDailyCheckInRecencyUrgency(
  input: DailyCheckInRecencyInput,
): AlertAttentionRecencyUrgency {
  const { completedInWindow, skippedInWindow, latestCompletedAt, hasHistory } = input;

  if (!hasHistory) return 'neutral';

  const daysSinceCompleted =
    latestCompletedAt != null && Number.isFinite(latestCompletedAt)
      ? calendarDaysSince(latestCompletedAt)
      : null;

  const completedTodayOrYesterday =
    daysSinceCompleted != null && daysSinceCompleted <= 1;

  if (completedInWindow >= 5) return 'green';
  if (completedTodayOrYesterday && completedInWindow >= 4) return 'green';

  if (completedInWindow <= 1) return 'red';
  if (daysSinceCompleted == null || daysSinceCompleted >= 5) return 'red';

  if (completedInWindow >= 2 && completedInWindow <= 4) return 'orange';
  if (skippedInWindow > completedInWindow) return 'orange';

  return 'neutral';
}

function assessmentCountLast7(summary: PatientAnalyticsSummary): number {
  if (!summary.detail) return 0;

  const windowDays = summary.windowDays || 30;
  const detail = summary.detail;

  if (detail.kind === 'assessment_count') {
    const fromTimeline = sumTimelineCountLast7(detail.timeline);
    return fromTimeline > 0 ? fromTimeline : scaleCountToLast7(detail.count, windowDays);
  }

  if (
    detail.kind === 'vision' ||
    detail.kind === 'neurological' ||
    detail.kind === 'psychological'
  ) {
    return scaleCountToLast7(detail.count, windowDays);
  }

  return 0;
}

export function sumAssessmentsLast7(byMetricId: Map<string, PatientAnalyticsSummary>): number {
  let total = 0;

  for (const metricId of DASHBOARD_ASSESSMENT_METRIC_IDS) {
    const summary = byMetricId.get(metricId);
    if (!summary) continue;
    total += assessmentCountLast7(summary);
  }

  return total;
}

/** Most recently completed assessment (e.g. Pain, Vision) within the dashboard window. */
export function getLatestAssessment(
  byMetricId: Map<string, PatientAnalyticsSummary>,
): { title: string | null; latestAt: number | null } {
  const windowStart = Date.now() - DASHBOARD_STATS_DAYS * 24 * 60 * 60 * 1000;
  let latestAt = 0;
  let title: string | null = null;

  for (const metricId of DASHBOARD_ASSESSMENT_METRIC_IDS) {
    const summary = byMetricId.get(metricId);
    if (!summary?.latestAt || summary.latestAt < windowStart) continue;
    if (assessmentCountLast7(summary) <= 0 && summary.countInWindow <= 0) continue;
    if (summary.latestAt <= latestAt) continue;

    latestAt = summary.latestAt;
    title = summary.title?.trim() || null;
  }

  if (title) {
    return { title, latestAt: latestAt || null };
  }

  // Fallback: latest assessment overall when 7-day window has counts but timestamps are sparse.
  for (const metricId of DASHBOARD_ASSESSMENT_METRIC_IDS) {
    const summary = byMetricId.get(metricId);
    if (!summary?.latestAt || summary.latestAt <= latestAt) continue;
    if (summary.countInWindow <= 0 && assessmentCountLast7(summary) <= 0) continue;

    latestAt = summary.latestAt;
    title = summary.title?.trim() || null;
  }

  return { title, latestAt: latestAt || null };
}
