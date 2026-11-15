/** @license SPDX-License-Identifier: Apache-2.0 */
import type { DailyCheckInAnswerTrendPoint } from '@medxforce/shared';

export type DailyCheckInMetricAverages = {
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  moodSamples: number;
  painSamples: number;
  sleepSamples: number;
  windowDays: number;
};

export type CheckInWellnessRingFrame = {
  date: string;
  /** Days before today: 0 = today, 1 = yesterday, etc. */
  dayOffset: number;
  label: string;
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  moodSamples: number;
  painSamples: number;
  sleepSamples: number;
  hasCheckIn: boolean;
};

export const CHECK_IN_WELLNESS_WEEK_DAYS = 7;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function todayDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateKeyToUtcMs(dateKey: string): number {
  return Date.parse(`${dateKey}T12:00:00`);
}

function dateKeyDaysAgo(dayOffset: number, todayKey = todayDateKey()): string {
  const ms = dateKeyToUtcMs(todayKey) - dayOffset * 24 * 60 * 60 * 1000;
  return todayDateKey(new Date(ms));
}

export function daysAgoFromToday(dateKey: string, todayKey = todayDateKey()): number {
  const diffMs = dateKeyToUtcMs(todayKey) - dateKeyToUtcMs(dateKey);
  return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
}

export function formatCheckInDayOffsetLabel(
  dayOffset: number,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (dayOffset === 0) return t('dashboard.checkInWellnessRing.dayToday');
  return `-${dayOffset}`;
}

function collectMetricValues(
  points: DailyCheckInAnswerTrendPoint[],
  key: 'mood' | 'pain' | 'sleep',
): number[] {
  return points
    .map((point) => point[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

export function getCheckInWellnessAveragesFromTrend(
  answerTrend: DailyCheckInAnswerTrendPoint[] | undefined,
  windowDays = 30,
): DailyCheckInMetricAverages {
  const trend = Array.isArray(answerTrend) ? answerTrend.slice(-windowDays) : [];
  const moodValues = collectMetricValues(trend, 'mood');
  const painValues = collectMetricValues(trend, 'pain');
  const sleepValues = collectMetricValues(trend, 'sleep');

  return {
    mood: average(moodValues),
    pain: average(painValues),
    sleep: average(sleepValues),
    moodSamples: moodValues.length,
    painSamples: painValues.length,
    sleepSamples: sleepValues.length,
    windowDays,
  };
}

function trendPointToFrame(
  point: DailyCheckInAnswerTrendPoint,
  todayKey: string,
): CheckInWellnessRingFrame {
  const dayOffset = daysAgoFromToday(point.date, todayKey);
  return {
    date: point.date,
    dayOffset,
    label: point.label,
    mood: point.mood ?? null,
    pain: point.pain ?? null,
    sleep: point.sleep ?? null,
    moodSamples: point.mood != null ? 1 : 0,
    painSamples: point.pain != null ? 1 : 0,
    sleepSamples: point.sleep != null ? 1 : 0,
    hasCheckIn: true,
  };
}

function emptyWeekFrame(dayOffset: number, todayKey: string): CheckInWellnessRingFrame {
  const date = dateKeyDaysAgo(dayOffset, todayKey);
  return {
    date,
    dayOffset,
    label: date.slice(5).replace('-', '/'),
    mood: null,
    pain: null,
    sleep: null,
    moodSamples: 0,
    painSamples: 0,
    sleepSamples: 0,
    hasCheckIn: false,
  };
}

/** Last 7 calendar days (oldest → today), with check-in data merged where available. */
export function buildCheckInWellnessWeekFramesFromTrend(
  answerTrend: DailyCheckInAnswerTrendPoint[] | undefined,
): CheckInWellnessRingFrame[] {
  const todayKey = todayDateKey();
  const trend = Array.isArray(answerTrend) ? answerTrend : [];
  const byDate = new Map(trend.map((point) => [point.date, point]));
  const frames: CheckInWellnessRingFrame[] = [];

  for (let dayOffset = CHECK_IN_WELLNESS_WEEK_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = dateKeyDaysAgo(dayOffset, todayKey);
    const point = byDate.get(date);
    frames.push(point ? trendPointToFrame(point, todayKey) : emptyWeekFrame(dayOffset, todayKey));
  }

  return frames;
}

/** @deprecated Use buildCheckInWellnessWeekFramesFromTrend */
export function buildCheckInWellnessAnimationFramesFromTrend(
  answerTrend: DailyCheckInAnswerTrendPoint[] | undefined,
  _windowDays = 30,
): CheckInWellnessRingFrame[] {
  return buildCheckInWellnessWeekFramesFromTrend(answerTrend);
}

export function formatMoodAverage(score: number | null): 'good' | 'ok' | 'low' | null {
  if (score == null) return null;
  if (score >= 2.4) return 'good';
  if (score >= 1.75) return 'ok';
  return 'low';
}

export function formatSleepAverage(score: number | null): 'well' | 'ok' | 'poor' | null {
  if (score == null) return null;
  if (score >= 2.4) return 'well';
  if (score >= 1.75) return 'ok';
  return 'poor';
}

export function moodToneTextClass(tone: ReturnType<typeof formatMoodAverage>): string {
  if (tone === 'good') return 'text-emerald-600';
  if (tone === 'ok') return 'text-amber-600';
  if (tone === 'low') return 'text-rose-600';
  return 'text-slate-400';
}

export function sleepToneTextClass(tone: ReturnType<typeof formatSleepAverage>): string {
  if (tone === 'well') return 'text-indigo-600';
  if (tone === 'ok') return 'text-amber-600';
  if (tone === 'poor') return 'text-rose-600';
  return 'text-slate-400';
}

export function painLevelTextClass(pain: number | null): string {
  if (pain == null) return 'text-slate-400';
  if (pain <= 3) return 'text-emerald-600';
  if (pain <= 6) return 'text-amber-600';
  return 'text-rose-600';
}

export function checkInWellnessFraction(
  value: number | null,
  min: number,
  max: number,
  higherIsBetter: boolean,
): number | null {
  if (value == null || max <= min) return null;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return higherIsBetter ? normalized : 1 - normalized;
}

export type CheckInWellnessRingMetric = {
  key: 'mood' | 'pain' | 'sleep';
  value: number | null;
  samples: number;
  min: number;
  max: number;
  higherIsBetter: boolean;
  wellness: number | null;
};

const WELLNESS_METRIC_DEFS: Omit<CheckInWellnessRingMetric, 'value' | 'samples' | 'wellness'>[] = [
  { key: 'mood', min: 1, max: 3, higherIsBetter: true },
  { key: 'sleep', min: 1, max: 3, higherIsBetter: true },
  { key: 'pain', min: 1, max: 10, higherIsBetter: false },
];

export function buildCheckInWellnessRingMetricsFromValues(values: {
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  moodSamples: number;
  painSamples: number;
  sleepSamples: number;
}): CheckInWellnessRingMetric[] {
  return WELLNESS_METRIC_DEFS.map((def) => {
    const value = values[def.key];
    const samples = values[`${def.key}Samples` as keyof typeof values] as number;
    return {
      ...def,
      value,
      samples,
      wellness: checkInWellnessFraction(value, def.min, def.max, def.higherIsBetter),
    };
  });
}

export function buildCheckInWellnessPreviewFrames(): CheckInWellnessRingFrame[] {
  return [
    { date: '2026-06-28', dayOffset: 6, label: '06/28', mood: 1.0, pain: 9.0, sleep: 1.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
    { date: '2026-06-29', dayOffset: 5, label: '06/29', mood: 2.0, pain: 8.0, sleep: 1.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
    { date: '2026-06-30', dayOffset: 4, label: '06/30', mood: 1.0, pain: 10.0, sleep: 2.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
    { date: '2026-07-01', dayOffset: 3, label: '07/01', mood: 2.0, pain: 10.0, sleep: 2.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
    { date: '2026-07-02', dayOffset: 2, label: '07/02', mood: 1.0, pain: 8.0, sleep: 2.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
    { date: '2026-07-03', dayOffset: 1, label: '07/03', mood: 1.0, pain: 10.0, sleep: 2.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
    { date: '2026-07-04', dayOffset: 0, label: '07/04', mood: 3.0, pain: 2.0, sleep: 3.0, moodSamples: 1, painSamples: 1, sleepSamples: 1, hasCheckIn: true },
  ];
}
