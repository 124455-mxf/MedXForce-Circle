import {
  analyticsDetailRangeDays,
  analyticsDetailRangeGrain,
  isAnalyticsRangeDetailKind,
  parseAnalyticsDetailRangeId,
  type AlertAttentionTimelinePoint,
  type AnalyticsDetailChartGrain,
  type AnalyticsDetailRangeId,
  type AnalyticsMetricDetail,
  type AssessmentCountTimelinePoint,
  type DailyCheckInAnswerTrendPoint,
  type DailyCheckInTimelinePoint,
  type PatientAnalyticsSummary,
} from '@medxforce/shared';
import { timelinePointToTimestamp } from './circleAnalyticsChart';

export {
  analyticsDetailRangeDays,
  analyticsDetailRangeGrain,
  isAnalyticsRangeDetailKind,
  parseAnalyticsDetailRangeId,
};
export type { AnalyticsDetailChartGrain, AnalyticsDetailRangeId };

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = 'mxf.analyticsDetailRange.';
const rangeByPatient = new Map<string, AnalyticsDetailRangeId>();

const SCOPED_VISIT_BRIEF_METRIC_IDS = [
  'impact',
  'pain',
  'strength-reflex',
  'mobility',
  'numbness',
  'temperature',
  'vision',
  'speech',
  'neurological',
  'psychological',
  'daily-check-in',
] as const;

type DatedPoint = { date: string; label?: string };

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function pointTimestamp(point: DatedPoint): number | null {
  return timelinePointToTimestamp(point.date, point.label);
}

function bucketKey(ts: number, grain: AnalyticsDetailChartGrain): string {
  const d = new Date(ts);
  if (grain === 'day') return isoFromDate(d);
  if (grain === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const day = startOfLocalDay(d);
  const weekday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - weekday);
  return isoFromDate(day);
}

function bucketLabel(key: string, grain: AnalyticsDetailChartGrain): string {
  if (grain === 'month') {
    const [year, month] = key.split('-').map(Number);
    if (!year || !month) return key;
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'short',
      year: '2-digit',
    });
  }
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function seriesSpanDays(points: DatedPoint[] | undefined, now = new Date()): number {
  if (!points?.length) return 1;
  let minTs: number | null = null;
  for (const point of points) {
    const ts = pointTimestamp(point);
    if (ts == null) continue;
    if (minTs == null || ts < minTs) minTs = ts;
  }
  if (minTs == null) return 1;
  const today = startOfLocalDay(now).getTime();
  return Math.max(1, Math.round((today - startOfLocalDay(new Date(minTs)).getTime()) / DAY_MS) + 1);
}

export function resolveAnalyticsDetailWindowDays(
  rangeId: AnalyticsDetailRangeId,
  points: DatedPoint[] | undefined,
  now = new Date(),
): number {
  return analyticsDetailRangeDays(rangeId, seriesSpanDays(points, now));
}

export function filterTimelinePointsToRange<T extends DatedPoint>(
  points: T[] | undefined,
  rangeId: AnalyticsDetailRangeId,
  now = new Date(),
): T[] {
  if (!Array.isArray(points) || points.length === 0) return [];
  const windowDays = resolveAnalyticsDetailWindowDays(rangeId, points, now);
  const today = startOfLocalDay(now);
  const cutoff = addLocalDays(today, -(windowDays - 1)).getTime();
  return points.filter((point) => {
    const ts = pointTimestamp(point);
    return ts != null && ts >= cutoff;
  });
}

function coarsenByGrain<T extends DatedPoint>(
  points: T[],
  grain: AnalyticsDetailChartGrain,
  merge: (bucketKey: string, label: string, group: T[]) => T,
): T[] {
  if (grain === 'day' || points.length === 0) {
    return [...points].sort((a, b) => (pointTimestamp(a) ?? 0) - (pointTimestamp(b) ?? 0));
  }
  const groups = new Map<string, T[]>();
  for (const point of points) {
    const ts = pointTimestamp(point);
    if (ts == null) continue;
    const key = bucketKey(ts, grain);
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, group]) => merge(key, bucketLabel(key, grain), group));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function previousWindowPoints<T extends DatedPoint>(
  points: T[] | undefined,
  rangeId: AnalyticsDetailRangeId,
  now = new Date(),
): T[] {
  if (!Array.isArray(points) || points.length === 0) return [];
  const windowDays = resolveAnalyticsDetailWindowDays(rangeId, points, now);
  const today = startOfLocalDay(now);
  const currentStart = addLocalDays(today, -(windowDays - 1)).getTime();
  const prevStart = addLocalDays(today, -(windowDays * 2 - 1)).getTime();
  return points.filter((point) => {
    const ts = pointTimestamp(point);
    return ts != null && ts >= prevStart && ts < currentStart;
  });
}

function sumAlertAttention(points: AlertAttentionTimelinePoint[]): { alerts: number; attentions: number } {
  return points.reduce(
    (sum, point) => ({
      alerts: sum.alerts + Math.max(0, Number(point.alert) || 0),
      attentions: sum.attentions + Math.max(0, Number(point.attention) || 0),
    }),
    { alerts: 0, attentions: 0 },
  );
}

function fillAlertAttentionWindow(
  points: AlertAttentionTimelinePoint[],
  windowDays: number,
  now = new Date(),
): AlertAttentionTimelinePoint[] {
  const today = startOfLocalDay(now);
  const byIso = new Map<string, AlertAttentionTimelinePoint>();
  for (const point of points) {
    const ts = pointTimestamp(point);
    if (ts == null) continue;
    const iso = isoFromDate(new Date(ts));
    const existing = byIso.get(iso);
    if (existing) {
      existing.alert += Math.max(0, Number(point.alert) || 0);
      existing.attention += Math.max(0, Number(point.attention) || 0);
      continue;
    }
    byIso.set(iso, {
      date: iso,
      alert: Math.max(0, Number(point.alert) || 0),
      attention: Math.max(0, Number(point.attention) || 0),
    });
  }
  const filled: AlertAttentionTimelinePoint[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = addLocalDays(today, -i);
    const iso = isoFromDate(day);
    filled.push(byIso.get(iso) ?? { date: iso, alert: 0, attention: 0 });
  }
  return filled;
}

function coarsenAlertAttentionTimeline(
  points: AlertAttentionTimelinePoint[],
  grain: AnalyticsDetailChartGrain,
): AlertAttentionTimelinePoint[] {
  return coarsenByGrain(points, grain, (key, _label, group) => ({
    date: grain === 'month' ? `${key}-01` : key,
    alert: group.reduce((sum, point) => sum + (Number(point.alert) || 0), 0),
    attention: group.reduce((sum, point) => sum + (Number(point.attention) || 0), 0),
  }));
}

function fillDailyCheckInWindow(
  points: DailyCheckInTimelinePoint[],
  windowDays: number,
  now = new Date(),
): DailyCheckInTimelinePoint[] {
  const today = startOfLocalDay(now);
  const byIso = new Map<string, DailyCheckInTimelinePoint>();
  for (const point of points) {
    const ts = pointTimestamp(point);
    if (ts == null) continue;
    byIso.set(isoFromDate(new Date(ts)), point);
  }
  const filled: DailyCheckInTimelinePoint[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const day = addLocalDays(today, -i);
    const iso = isoFromDate(day);
    const existing = byIso.get(iso);
    filled.push(
      existing ?? {
        date: iso,
        label: bucketLabel(iso, 'day'),
        completed: 0,
        skipped: 0,
      },
    );
  }
  return filled;
}

function coarsenSumTimeline<T extends DatedPoint>(
  points: T[],
  grain: AnalyticsDetailChartGrain,
  keys: Array<keyof T>,
): T[] {
  return coarsenByGrain(points, grain, (key, label, group) => {
    const merged = {
      ...group[group.length - 1],
      date: grain === 'month' ? `${key}-01` : key,
      label,
    };
    for (const field of keys) {
      let sum = 0;
      for (const point of group) {
        const value = point[field];
        if (typeof value === 'number' && Number.isFinite(value)) sum += value;
      }
      (merged as DatedPoint & Record<string, unknown>)[field as string] = sum;
    }
    return merged;
  });
}

function trendFromWindowTotals(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous > 0) {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }
  return current > 0 ? 'up' : 'stable';
}

function trendFromAverages(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0 && current === 0) return 'stable';
  if (Math.abs(current - previous) < 0.25) return current === previous ? 'stable' : current > previous ? 'up' : 'down';
  return current > previous ? 'up' : 'down';
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function coarsenCheckInTimeline(
  points: DailyCheckInTimelinePoint[],
  grain: AnalyticsDetailChartGrain,
): DailyCheckInTimelinePoint[] {
  return coarsenByGrain(points, grain, (key, label, group) => ({
    date: grain === 'month' ? `${key}-01` : key,
    label,
    completed: group.reduce((sum, point) => sum + (point.completed > 0 ? 1 : point.completed), 0),
    skipped: group.reduce((sum, point) => sum + (point.skipped > 0 ? 1 : point.skipped), 0),
    notTaken: group.filter((point) => !(point.completed > 0) && !(point.skipped > 0)).length,
  }));
}

function coarsenAssessmentCountTimeline(
  points: AssessmentCountTimelinePoint[],
  grain: AnalyticsDetailChartGrain,
): AssessmentCountTimelinePoint[] {
  return coarsenByGrain(points, grain, (key, label, group) => {
    const count = group.reduce((sum, point) => sum + point.count, 0);
    const weighted: number[] = [];
    for (const point of group) {
      if (typeof point.score !== 'number' || !Number.isFinite(point.score)) continue;
      const weight = Math.max(1, point.count);
      for (let i = 0; i < weight; i++) weighted.push(point.score);
    }
    const next: AssessmentCountTimelinePoint = {
      date: grain === 'month' ? `${key}-01` : key,
      label,
      count,
    };
    if (weighted.length > 0) next.score = mean(weighted);
    return next;
  });
}

function coarsenNumericTimeline<T extends DatedPoint>(
  points: T[],
  grain: AnalyticsDetailChartGrain,
  keys: Array<keyof T>,
): T[] {
  return coarsenByGrain(points, grain, (key, label, group) => {
    const merged = {
      ...group[group.length - 1],
      date: grain === 'month' ? `${key}-01` : key,
      label,
    };
    for (const field of keys) {
      const values: number[] = [];
      for (const point of group) {
        const value = point[field];
        if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
      }
      (merged as DatedPoint & Record<string, unknown>)[field as string] = mean(values);
    }
    return merged;
  });
}

function coarsenAnswerTrend(
  points: DailyCheckInAnswerTrendPoint[],
  grain: AnalyticsDetailChartGrain,
): DailyCheckInAnswerTrendPoint[] {
  return coarsenByGrain(points, grain, (key, label, group) => {
    const pick = (field: 'mood' | 'pain' | 'sleep' | 'vitality') => {
      const values = group
        .map((point) => point[field])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      return values.length > 0 ? mean(values) : undefined;
    };
    const next: DailyCheckInAnswerTrendPoint = {
      date: grain === 'month' ? `${key}-01` : key,
      label,
    };
    const mood = pick('mood');
    const pain = pick('pain');
    const sleep = pick('sleep');
    const vitality = pick('vitality');
    if (mood != null) next.mood = mood;
    if (pain != null) next.pain = pain;
    if (sleep != null) next.sleep = sleep;
    if (vitality != null) next.vitality = vitality;
    return next;
  });
}

export function readAnalyticsDetailRange(patientId: string): AnalyticsDetailRangeId {
  const fromMemory = rangeByPatient.get(patientId);
  if (fromMemory) return fromMemory;
  try {
    if (typeof sessionStorage === 'undefined') return '30';
    return parseAnalyticsDetailRangeId(sessionStorage.getItem(`${STORAGE_PREFIX}${patientId}`));
  } catch {
    return '30';
  }
}

export function writeAnalyticsDetailRange(patientId: string, rangeId: AnalyticsDetailRangeId): void {
  rangeByPatient.set(patientId, rangeId);
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(`${STORAGE_PREFIX}${patientId}`, rangeId);
  } catch {
    /* ignore quota / private mode */
  }
}

export type AppliedAnalyticsDetailRange = {
  detail: AnalyticsMetricDetail;
  windowDays: number;
  grain: AnalyticsDetailChartGrain;
  adherenceTimeline: Array<{ date: string; label?: string; count?: number }>;
};

function checkInActivityCount(points: DailyCheckInTimelinePoint[]): number {
  return points.reduce(
    (sum, point) => sum + (point.completed > 0 ? 1 : 0) + (point.skipped > 0 ? 1 : 0),
    0,
  );
}

function synthesizeCheckInTimelineFromAnswers(
  answers: DailyCheckInAnswerTrendPoint[] | undefined,
): DailyCheckInTimelinePoint[] {
  if (!Array.isArray(answers) || answers.length === 0) return [];
  return answers.map((point) => ({
    date: point.date,
    label: point.label,
    completed: 1,
    skipped: 0,
  }));
}

function checkInStatsFromTimeline(points: DailyCheckInTimelinePoint[]) {
  const completed = points.reduce((sum, point) => sum + Math.max(0, Number(point.completed) || 0), 0);
  const skipped = points.reduce((sum, point) => sum + Math.max(0, Number(point.skipped) || 0), 0);
  const total = completed + skipped;
  return {
    completed,
    skipped,
    total,
    skipRate: total > 0 ? Math.round((skipped / total) * 100) : 0,
  };
}

function assessmentAverageFromTimeline(points: AssessmentCountTimelinePoint[]): number | undefined {
  const weighted: number[] = [];
  for (const point of points) {
    if (typeof point.score !== 'number' || !Number.isFinite(point.score) || point.count <= 0) continue;
    for (let i = 0; i < point.count; i++) weighted.push(point.score);
  }
  return weighted.length > 0 ? mean(weighted) : undefined;
}

export function applyAnalyticsDetailRange(
  detail: AnalyticsMetricDetail,
  rangeId: AnalyticsDetailRangeId,
  now = new Date(),
): AppliedAnalyticsDetailRange {
  const grain = analyticsDetailRangeGrain(rangeId);

  if (detail.kind === 'alert_attention') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(
      rangeId,
      filtered.length > 0 ? filtered : detail.timeline,
      now,
    );
    const filled = fillAlertAttentionWindow(filtered, windowDays, now);
    const stats = sumAlertAttention(filled);
    const previous = sumAlertAttention(previousWindowPoints(detail.timeline, rangeId, now));
    const currentTotal = stats.alerts + stats.attentions;
    const previousTotal = previous.alerts + previous.attentions;
    const next: AnalyticsMetricDetail = {
      ...detail,
      ...stats,
      trend:
        previousTotal > 0
          ? currentTotal > previousTotal
            ? 'up'
            : currentTotal < previousTotal
              ? 'down'
              : 'stable'
          : currentTotal > 0
            ? 'up'
            : 'stable',
      timeline: coarsenAlertAttentionTimeline(filled, grain),
    };
    return { detail: next, windowDays, grain, adherenceTimeline: [] };
  }

  if (detail.kind === 'daily_check_in') {
    let participation = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    if (checkInActivityCount(participation) === 0) {
      participation = synthesizeCheckInTimelineFromAnswers(
        filterTimelinePointsToRange(detail.answerTrend, rangeId, now),
      );
    }
    const windowDays = resolveAnalyticsDetailWindowDays(
      rangeId,
      participation.length > 0 ? participation : detail.timeline,
      now,
    );
    const filled = fillDailyCheckInWindow(participation, windowDays, now);
    const stats = checkInStatsFromTimeline(filled);
    const answerFiltered = filterTimelinePointsToRange(detail.answerTrend, rangeId, now);
    const next: AnalyticsMetricDetail = {
      ...detail,
      ...stats,
      timeline: coarsenCheckInTimeline(filled, grain),
      answerTrend: coarsenAnswerTrend(answerFiltered, grain),
    };
    return {
      detail: next,
      windowDays,
      grain,
      adherenceTimeline: next.timeline ?? [],
    };
  }

  if (detail.kind === 'assessment_count') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenAssessmentCountTimeline(filtered, grain);
    const count = filtered.reduce((sum, point) => sum + point.count, 0);
    const average = assessmentAverageFromTimeline(filtered) ?? (rangeId === '30' ? detail.average : undefined);
    const next: AnalyticsMetricDetail = {
      ...detail,
      count,
      ...(average !== undefined ? { average } : {}),
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: coarsened };
  }

  if (detail.kind === 'vision') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenNumericTimeline(filtered, grain, [
      'fieldIssues',
      'focusIssues',
      'motorIssues',
      'severity',
      'colorScore',
      'contrastScore',
    ]);
    const average = filtered.length > 0 ? mean(filtered.map((point) => point.severity)) : 0;
    const previous = previousWindowPoints(detail.timeline, rangeId, now);
    const prevAverage = previous.length > 0 ? mean(previous.map((point) => point.severity)) : 0;
    const meanIssues = (
      points: typeof filtered,
      key: 'fieldIssues' | 'focusIssues' | 'motorIssues',
    ) => (points.length > 0 ? mean(points.map((point) => Number(point[key]) || 0)) : 0);
    const next: AnalyticsMetricDetail = {
      ...detail,
      count: filtered.length,
      average: round1(average),
      trend: trendFromAverages(average, prevAverage),
      timeline: coarsened,
      categoryTrends: {
        focus: {
          current: round1(meanIssues(filtered, 'focusIssues')),
          trend: trendFromAverages(meanIssues(filtered, 'focusIssues'), meanIssues(previous, 'focusIssues')),
        },
        field: {
          current: round1(meanIssues(filtered, 'fieldIssues')),
          trend: trendFromAverages(meanIssues(filtered, 'fieldIssues'), meanIssues(previous, 'fieldIssues')),
        },
        motor: {
          current: round1(meanIssues(filtered, 'motorIssues')),
          trend: trendFromAverages(meanIssues(filtered, 'motorIssues'), meanIssues(previous, 'motorIssues')),
        },
      },
    };
    return { detail: next, windowDays, grain, adherenceTimeline: coarsened };
  }

  if (detail.kind === 'neurological') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenNumericTimeline(filtered, grain, [
      'overall',
      'executive',
      'language',
      'attention',
    ]);
    const next: AnalyticsMetricDetail = {
      ...detail,
      count: filtered.length,
      average: filtered.length > 0 ? mean(filtered.map((point) => point.overall)) : 0,
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: coarsened };
  }

  if (detail.kind === 'psychological') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenNumericTimeline(filtered, grain, [
      'mood',
      'anxiety',
      'stress',
      'sleep',
      'energy',
    ]);
    const next: AnalyticsMetricDetail = {
      ...detail,
      count: filtered.length,
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: coarsened };
  }

  if (detail.kind === 'speech_language') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenNumericTimeline(filtered, grain, [
      'overall',
      'spontaneousSpeech',
      'naming',
      'repetition',
      'readingWriting',
      'oralMotor',
    ]);
    const next: AnalyticsMetricDetail = {
      ...detail,
      count: filtered.length,
      average: filtered.length > 0 ? mean(filtered.map((point) => point.overall)) : 0,
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: coarsened };
  }

  if (detail.kind === 'companion') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenSumTimeline(filtered, grain, [
      'conversations',
      'interactions',
      'detected',
      'started',
      'resumed',
    ]);
    const conversations = filtered.reduce((sum, point) => sum + (Number(point.conversations) || 0), 0);
    const interactions = filtered.reduce((sum, point) => sum + (Number(point.interactions) || 0), 0);
    const detected = filtered.reduce((sum, point) => sum + (Number(point.detected) || 0), 0);
    const started = filtered.reduce((sum, point) => sum + (Number(point.started) || 0), 0);
    const resumed = filtered.reduce((sum, point) => sum + (Number(point.resumed) || 0), 0);
    const hasStartedResumed = filtered.some(
      (point) => typeof point.started === 'number' || typeof point.resumed === 'number',
    );
    const previous = previousWindowPoints(detail.timeline, rangeId, now);
    const prevTotal = previous.reduce(
      (sum, point) => sum + (Number(point.conversations) || 0) + (Number(point.interactions) || 0),
      0,
    );
    const next: AnalyticsMetricDetail = {
      ...detail,
      conversations,
      interactions,
      detected,
      newCount: hasStartedResumed ? started : detail.newCount,
      resumed: hasStartedResumed ? resumed : detail.resumed,
      total: conversations + interactions,
      avgInteractions: conversations > 0 ? (interactions / conversations).toFixed(1) : '0',
      trend: trendFromWindowTotals(conversations + interactions, prevTotal),
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: [] };
  }

  if (detail.kind === 'messages') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenSumTimeline(filtered, grain, [
      'communication',
      'messaging',
      'sent',
      'replies',
    ]);
    const communication = filtered.reduce((sum, point) => sum + (Number(point.communication) || 0), 0);
    const messaging = filtered.reduce((sum, point) => sum + (Number(point.messaging) || 0), 0);
    const sent = filtered.reduce((sum, point) => sum + (Number(point.sent) || 0), 0);
    const replies = filtered.reduce((sum, point) => sum + (Number(point.replies) || 0), 0);
    const previous = previousWindowPoints(detail.timeline, rangeId, now);
    const prevTotal = previous.reduce(
      (sum, point) => sum + (Number(point.communication) || 0) + (Number(point.messaging) || 0),
      0,
    );
    const next: AnalyticsMetricDetail = {
      ...detail,
      communication,
      messaging,
      trend: trendFromWindowTotals(communication + messaging, prevTotal),
      messagingBreakdown: {
        sent,
        replies,
        conversations: detail.messagingBreakdown?.conversations ?? 0,
        updates: detail.messagingBreakdown?.updates ?? 0,
        drafts: detail.messagingBreakdown?.drafts ?? 0,
        notes: detail.messagingBreakdown?.notes ?? 0,
        deletions: detail.messagingBreakdown?.deletions ?? 0,
      },
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: [] };
  }

  if (detail.kind === 'diary') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenSumTimeline(filtered, grain, ['entries', 'milestones']);
    const entryCount = filtered.reduce((sum, point) => sum + (Number(point.entries) || 0), 0);
    const milestoneCount = filtered.reduce((sum, point) => sum + (Number(point.milestones) || 0), 0);
    const previous = previousWindowPoints(detail.timeline, rangeId, now);
    const prevTotal = previous.reduce((sum, point) => sum + (Number(point.entries) || 0), 0);
    const next: AnalyticsMetricDetail = {
      ...detail,
      entryCount,
      milestoneCount,
      trend: trendFromWindowTotals(entryCount, prevTotal),
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: [] };
  }

  if (detail.kind === 'vitality_game') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenByGrain(filtered, grain, (key, label, group) => {
      const games = group.reduce((sum, point) => sum + (Number(point.games) || 0), 0);
      const weighted: number[] = [];
      for (const point of group) {
        if (point.games > 0 && Number.isFinite(point.accuracy)) {
          for (let i = 0; i < Math.max(1, point.games); i++) weighted.push(point.accuracy);
        }
      }
      return {
        date: grain === 'month' ? `${key}-01` : key,
        label,
        games,
        accuracy: weighted.length > 0 ? mean(weighted) : 0,
      };
    });
    const gamesPlayed = filtered.reduce((sum, point) => sum + (Number(point.games) || 0), 0);
    const accuracyValues = filtered.flatMap((point) =>
      point.games > 0 && Number.isFinite(point.accuracy) ? [point.accuracy] : [],
    );
    const previous = previousWindowPoints(detail.timeline, rangeId, now);
    const prevGames = previous.reduce((sum, point) => sum + (Number(point.games) || 0), 0);
    const next: AnalyticsMetricDetail = {
      ...detail,
      gamesPlayed,
      avgAccuracy: accuracyValues.length > 0 ? Math.round(mean(accuracyValues)) : 0,
      trend: trendFromWindowTotals(gamesPlayed, prevGames),
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: [] };
  }

  if (detail.kind === 'soul_gallery') {
    const filtered = filterTimelinePointsToRange(detail.timeline, rangeId, now);
    const windowDays = resolveAnalyticsDetailWindowDays(rangeId, detail.timeline, now);
    const coarsened = coarsenSumTimeline(filtered, grain, ['photos', 'videos', 'reactions']);
    const photoCount = filtered.reduce((sum, point) => sum + (Number(point.photos) || 0), 0);
    const videoCount = filtered.reduce((sum, point) => sum + (Number(point.videos) || 0), 0);
    const reactionCount = filtered.reduce((sum, point) => sum + (Number(point.reactions) || 0), 0);
    const previous = previousWindowPoints(detail.timeline, rangeId, now);
    const prevTotal = previous.reduce(
      (sum, point) => sum + (Number(point.photos) || 0) + (Number(point.videos) || 0),
      0,
    );
    const next: AnalyticsMetricDetail = {
      ...detail,
      photoCount,
      videoCount,
      reactionCount,
      totalPhotoCount: photoCount,
      trend: trendFromWindowTotals(photoCount + videoCount, prevTotal),
      timeline: coarsened,
    };
    return { detail: next, windowDays, grain, adherenceTimeline: [] };
  }

  return {
    detail,
    windowDays: 30,
    grain: 'day',
    adherenceTimeline: [],
  };
}

export type VisitBriefAnalyticsStat = {
  metricId: string;
  title: string;
  count?: number;
  average?: number;
  completed?: number;
  skipped?: number;
  skipRate?: number;
};

export type VisitBriefAnalyticsContext = {
  rangeId: AnalyticsDetailRangeId;
  windowDays: number;
  stats: VisitBriefAnalyticsStat[];
};

export function buildVisitBriefAnalyticsContext(
  summaries: PatientAnalyticsSummary[] | undefined,
  patientId: string,
): VisitBriefAnalyticsContext {
  const rangeId = readAnalyticsDetailRange(patientId);
  const byId = new Map((summaries ?? []).map((summary) => [summary.metricId, summary]));
  const stats: VisitBriefAnalyticsStat[] = [];
  let windowDays = analyticsDetailRangeDays(rangeId);

  for (const metricId of SCOPED_VISIT_BRIEF_METRIC_IDS) {
    const summary = byId.get(metricId);
    const detail = summary?.detail;
    if (!detail || !isAnalyticsRangeDetailKind(detail.kind)) continue;
    const applied = applyAnalyticsDetailRange(detail, rangeId);
    windowDays = applied.windowDays;
    if (applied.detail.kind === 'daily_check_in') {
      stats.push({
        metricId,
        title: summary.title,
        completed: applied.detail.completed,
        skipped: applied.detail.skipped,
        skipRate: applied.detail.skipRate,
        count: applied.detail.total,
      });
      continue;
    }
    if (applied.detail.kind === 'assessment_count') {
      stats.push({
        metricId,
        title: summary.title,
        count: applied.detail.count,
        ...(applied.detail.average != null ? { average: applied.detail.average } : {}),
      });
      continue;
    }
    if (
      applied.detail.kind === 'vision' ||
      applied.detail.kind === 'neurological' ||
      applied.detail.kind === 'speech_language'
    ) {
      stats.push({
        metricId,
        title: summary.title,
        count: applied.detail.count,
        average: applied.detail.average,
      });
      continue;
    }
    if (applied.detail.kind === 'psychological') {
      stats.push({
        metricId,
        title: summary.title,
        count: applied.detail.count,
      });
    }
  }

  return { rangeId, windowDays, stats };
}

export function coarsenAdherenceTimeline(
  points: Array<{ date: string; value: number }>,
  grain: AnalyticsDetailChartGrain,
): Array<{ date: string; value: number }> {
  if (grain === 'day' || points.length === 0) return points;
  return coarsenByGrain(
    points.map((point) => ({ date: point.date, label: point.date, value: point.value })),
    grain,
    (key, label, group) => ({
      date: label,
      label,
      value: group.reduce((sum, point) => sum + point.value, 0),
    }),
  ).map((point) => ({ date: point.date, value: point.value }));
}
