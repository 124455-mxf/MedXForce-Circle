import type {
  AlertAttentionTimelinePoint,
  AnalyticsMetricId,
  AnalyticsTrendDirection,
  AssessmentCountTimelinePoint,
  CompanionTimelinePoint,
  DailyCheckInTimelinePoint,
  MessagesTimelinePoint,
  PatientAnalyticsSummary,
  VitalityGameTimelinePoint,
} from '@medxforce/shared';
import { timelinePointToTimestamp } from './circleAnalyticsChart';

export const DASHBOARD_STATS_DAYS = 7;
export const DASHBOARD_STATS_DAYS_30 = 30;

export type DashboardActivityDay = {
  dateKey: string;
  isToday: boolean;
  isActive: boolean;
  /** Raw count for that day (drives mini bar height). */
  value: number;
};

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Oldest → today, rolling last 7 calendar days (for week activity bars). */
export function buildRollingLast7ActivityDays(
  valueOnDate: (dateKey: string, dayIndex: number) => number,
): DashboardActivityDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);

  return Array.from({ length: DASHBOARD_STATS_DAYS }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (DASHBOARD_STATS_DAYS - 1 - index));
    const dateKey = localDateKey(day);
    const value = Math.max(0, valueOnDate(dateKey, index) || 0);
    return {
      dateKey,
      isToday: dateKey === todayKey,
      isActive: value > 0,
      value,
    };
  });
}

export function activityDaysFromTimeline<T extends { date: string }>(
  timeline: T[] | undefined,
  valueOf: (point: T) => number,
): DashboardActivityDay[] {
  // Analytics timelines use display labels (e.g. "Aug 11"), not YYYY-MM-DD.
  // They are contiguous day buckets ending today, so align the last 7 by index.
  const last7 = (timeline ?? []).slice(-DASHBOARD_STATS_DAYS);
  const offset = DASHBOARD_STATS_DAYS - last7.length;
  return buildRollingLast7ActivityDays((_dateKey, dayIndex) => {
    const pointIndex = dayIndex - offset;
    if (pointIndex < 0 || pointIndex >= last7.length) return 0;
    return Math.max(0, valueOf(last7[pointIndex]!));
  });
}

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

function timelinePointDateKey(date: string, label?: string): string | null {
  const ts = timelinePointToTimestamp(date, label);
  if (ts == null) return null;
  return localDateKey(new Date(ts));
}

function assessmentPointCount(point: unknown): number {
  if (point && typeof point === 'object' && 'count' in point) {
    const count = (point as { count?: unknown }).count;
    if (typeof count === 'number' && Number.isFinite(count)) {
      return Math.max(0, count);
    }
  }
  return 1;
}

/** Last-7 calendar-day activity across all assessment metrics (sparse timelines). */
export function activityDaysFromAssessmentSummaries(
  byMetricId: Map<string, PatientAnalyticsSummary>,
): DashboardActivityDay[] {
  const totals = new Map<string, number>();

  for (const metricId of DASHBOARD_ASSESSMENT_METRIC_IDS) {
    const detail = byMetricId.get(metricId)?.detail;
    if (!detail || !('timeline' in detail) || !Array.isArray(detail.timeline)) continue;

    for (const point of detail.timeline) {
      if (!point || typeof point.date !== 'string') continue;
      const key = timelinePointDateKey(point.date, 'label' in point ? point.label : undefined);
      if (!key) continue;
      totals.set(key, (totals.get(key) ?? 0) + assessmentPointCount(point));
    }
  }

  return buildRollingLast7ActivityDays((dateKey) => totals.get(dateKey) ?? 0);
}

export function mergeActivityDays(series: DashboardActivityDay[][]): DashboardActivityDay[] {
  const totals = new Map<string, number>();
  for (const days of series) {
    for (const day of days) {
      totals.set(day.dateKey, (totals.get(day.dateKey) ?? 0) + day.value);
    }
  }
  return buildRollingLast7ActivityDays((dateKey) => totals.get(dateKey) ?? 0);
}

function rollingLocalDateKeys(days: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (days - 1 - index));
    return localDateKey(day);
  });
}

/** Completed assessments in the rolling last N calendar days (sparse ISO timelines). */
export function assessmentTakenCountLastN(
  summary: PatientAnalyticsSummary | undefined,
  days: number,
): number {
  const detail = summary?.detail;
  if (!detail || !('timeline' in detail) || !Array.isArray(detail.timeline)) return 0;

  const keys = new Set(rollingLocalDateKeys(days));
  let total = 0;
  for (const point of detail.timeline) {
    if (!point || typeof point.date !== 'string') continue;
    const key = timelinePointDateKey(point.date, 'label' in point ? point.label : undefined);
    if (!key || !keys.has(key)) continue;
    total += assessmentPointCount(point);
  }
  return total;
}

export function assessmentTakenCountLast7(
  summary: PatientAnalyticsSummary | undefined,
): number {
  return assessmentTakenCountLastN(summary, DASHBOARD_STATS_DAYS);
}

/** 30-day assessment trend from the synced summary (count or score, depending on metric). */
export function assessmentThirtyDayTrend(
  summary: PatientAnalyticsSummary | undefined,
): AnalyticsTrendDirection | null {
  if (!summary) return null;
  const detailTrend =
    summary.detail && 'trend' in summary.detail ? summary.detail.trend : undefined;
  if (detailTrend === 'up' || detailTrend === 'down' || detailTrend === 'stable') {
    return detailTrend;
  }
  if (summary.trend === 'up' || summary.trend === 'down') return summary.trend;
  if (summary.trend === 'flat') return 'stable';
  return null;
}

function sumTimelineCountLast7(timeline?: AssessmentCountTimelinePoint[]): number {
  return (timeline ?? [])
    .slice(-DASHBOARD_STATS_DAYS)
    .reduce((sum, point) => sum + point.count, 0);
}

function scaleCountToLast7(count: number, windowDays = 30): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.round((count * DASHBOARD_STATS_DAYS) / windowDays));
}

export function sumAlertAttentionLastN(
  timeline: AlertAttentionTimelinePoint[] | undefined,
  days: number,
) {
  const slice = (timeline ?? []).slice(-days);
  let alerts = 0;
  let attentions = 0;
  for (const point of slice) {
    alerts += point.alert;
    attentions += point.attention;
  }
  return { alerts, attentions, total: alerts + attentions };
}

export function sumAlertAttentionLast7(timeline?: AlertAttentionTimelinePoint[]) {
  return sumAlertAttentionLastN(timeline, DASHBOARD_STATS_DAYS);
}

export type AlertAttentionRecencyUrgency = 'neutral' | 'green' | 'orange' | 'red';

export const DASHBOARD_RECENCY_TINT_CLASSES: Record<AlertAttentionRecencyUrgency, string> = {
  neutral: 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30',
  green: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50/70',
  orange: 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50/70',
  red: 'border-red-200 bg-red-50/50 hover:border-red-300 hover:bg-red-50/70',
};

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

/** Tint when a shared diary entry was added recently (engagement signal). */
export function getDiaryRecencyUrgency(
  latestAt: number | null | undefined,
): AlertAttentionRecencyUrgency {
  if (latestAt == null || !Number.isFinite(latestAt)) return 'neutral';
  const daysAgo = calendarDaysSince(latestAt);
  if (daysAgo <= 3) return 'green';
  if (daysAgo <= 7) return 'orange';
  return 'neutral';
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
export function sumCompanionLastNExcludingDetected(
  timeline: CompanionTimelinePoint[] | undefined,
  days: number,
): number {
  const slice = (timeline ?? []).slice(-days);
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

export function sumCompanionLast7ExcludingDetected(timeline?: CompanionTimelinePoint[]): number {
  return sumCompanionLastNExcludingDetected(timeline, DASHBOARD_STATS_DAYS);
}

export function sumMessagesLastN(timeline: MessagesTimelinePoint[] | undefined, days: number) {
  const slice = (timeline ?? []).slice(-days);
  let communication = 0;
  let messaging = 0;
  for (const point of slice) {
    communication += point.communication;
    messaging += point.messaging;
  }
  return { communication, messaging, total: communication + messaging };
}

export function sumMessagesLast7(timeline?: MessagesTimelinePoint[]) {
  return sumMessagesLastN(timeline, DASHBOARD_STATS_DAYS);
}

export function sumVitalityGamesLastN(
  timeline: VitalityGameTimelinePoint[] | undefined,
  days: number,
) {
  const slice = (timeline ?? []).slice(-days);
  return slice.reduce((sum, point) => sum + point.games, 0);
}

export function sumVitalityGamesLast7(timeline?: VitalityGameTimelinePoint[]) {
  return sumVitalityGamesLastN(timeline, DASHBOARD_STATS_DAYS);
}

export function sumDailyCheckInLastN(
  timeline: DailyCheckInTimelinePoint[] | undefined,
  days: number,
) {
  const slice = (timeline ?? []).slice(-days);
  let completed = 0;
  let skipped = 0;
  for (const point of slice) {
    completed += point.completed;
    skipped += point.skipped;
  }
  return { completed, skipped, total: completed + skipped };
}

export function sumDailyCheckInLast7(timeline?: DailyCheckInTimelinePoint[]) {
  return sumDailyCheckInLastN(timeline, DASHBOARD_STATS_DAYS);
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

export function sumAssessmentsLastN(
  byMetricId: Map<string, PatientAnalyticsSummary>,
  days: number,
): number {
  let total = 0;
  for (const metricId of DASHBOARD_ASSESSMENT_METRIC_IDS) {
    total += assessmentTakenCountLastN(byMetricId.get(metricId), days);
  }
  return total;
}

export function sumAssessmentsLast7(byMetricId: Map<string, PatientAnalyticsSummary>): number {
  return sumAssessmentsLastN(byMetricId, DASHBOARD_STATS_DAYS);
}

/** Assessment types with at least one take in the rolling last N calendar days. */
export function assessmentMetricIdsTakenLastN(
  byMetricId: Map<string, PatientAnalyticsSummary>,
  days: number,
): AnalyticsMetricId[] {
  const ids: AnalyticsMetricId[] = [];
  for (const rawId of DASHBOARD_ASSESSMENT_METRIC_IDS) {
    const metricId = rawId as AnalyticsMetricId;
    if (assessmentTakenCountLastN(byMetricId.get(metricId), days) <= 0) continue;
    ids.push(metricId);
  }
  return ids;
}

export function assessmentMetricIdsTakenLast7(
  byMetricId: Map<string, PatientAnalyticsSummary>,
): AnalyticsMetricId[] {
  return assessmentMetricIdsTakenLastN(byMetricId, DASHBOARD_STATS_DAYS);
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
