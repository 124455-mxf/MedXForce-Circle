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
  label: string;
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  moodSamples: number;
  painSamples: number;
  sleepSamples: number;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function sliceTrend(
  answerTrend: DailyCheckInAnswerTrendPoint[] | undefined,
  windowDays: number,
): DailyCheckInAnswerTrendPoint[] {
  const trend = Array.isArray(answerTrend) ? answerTrend : [];
  if (trend.length === 0) return [];
  return trend.slice(-windowDays);
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
  const trend = sliceTrend(answerTrend, windowDays);
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

export function buildCheckInWellnessAnimationFramesFromTrend(
  answerTrend: DailyCheckInAnswerTrendPoint[] | undefined,
  windowDays = 30,
): CheckInWellnessRingFrame[] {
  const trend = sliceTrend(answerTrend, windowDays);
  if (trend.length === 0) return [];

  const moodAcc: number[] = [];
  const painAcc: number[] = [];
  const sleepAcc: number[] = [];
  const frames: CheckInWellnessRingFrame[] = [];

  for (const point of trend) {
    if (point.mood != null) moodAcc.push(point.mood);
    if (point.pain != null) painAcc.push(point.pain);
    if (point.sleep != null) sleepAcc.push(point.sleep);

    if (moodAcc.length + painAcc.length + sleepAcc.length === 0) continue;

    frames.push({
      label: point.label,
      mood: average(moodAcc),
      pain: average(painAcc),
      sleep: average(sleepAcc),
      moodSamples: moodAcc.length,
      painSamples: painAcc.length,
      sleepSamples: sleepAcc.length,
    });
  }

  return frames;
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
    {
      label: '01/08',
      mood: 2.0,
      pain: 6.2,
      sleep: 1.8,
      moodSamples: 1,
      painSamples: 1,
      sleepSamples: 1,
    },
    {
      label: '01/15',
      mood: 2.2,
      pain: 5.1,
      sleep: 2.1,
      moodSamples: 2,
      painSamples: 2,
      sleepSamples: 2,
    },
    {
      label: '01/22',
      mood: 2.5,
      pain: 4.0,
      sleep: 2.3,
      moodSamples: 3,
      painSamples: 3,
      sleepSamples: 3,
    },
    {
      label: '01/29',
      mood: 2.6,
      pain: 3.4,
      sleep: 2.2,
      moodSamples: 4,
      painSamples: 4,
      sleepSamples: 4,
    },
  ];
}
