/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  buildCheckInWellnessRingMetricsFromValues,
  formatMoodAverage,
  formatSleepAverage,
  type CheckInWellnessRingFrame,
  type CheckInWellnessRingMetric,
  type DailyCheckInMetricAverages,
} from '../lib/circleCheckInWellnessMetrics';

type CheckInWellnessRingVisualProps = {
  averages: DailyCheckInMetricAverages;
  frames?: CheckInWellnessRingFrame[];
  compact?: boolean;
  className?: string;
  t: (key: string, params?: Record<string, unknown>) => string;
};

const CX = 200;
const CY = 200;
const INNER_R = 34;
const OUTER_R = 156;

const AXES = {
  mood: { angle: -Math.PI / 2, key: 'mood' as const },
  sleep: { angle: Math.PI / 6, key: 'sleep' as const },
  pain: { angle: (5 * Math.PI) / 6, key: 'pain' as const },
};

const PLAYBACK_MIN_MS = 1400;
const PLAYBACK_MAX_MS = 2400;
const PLAYBACK_TARGET_TOTAL_MS = 32000;

function playbackIntervalMs(frameCount: number): number {
  if (frameCount <= 2) return PLAYBACK_MAX_MS;
  const evenlySpaced = PLAYBACK_TARGET_TOTAL_MS / frameCount;
  return Math.min(PLAYBACK_MAX_MS, Math.max(PLAYBACK_MIN_MS, evenlySpaced));
}

function wellnessRadius(wellness: number | null): number {
  if (wellness == null) return (INNER_R + OUTER_R) / 2;
  return INNER_R + (1 - wellness) * (OUTER_R - INNER_R);
}

function polarPoint(radius: number, angle: number) {
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function formatMetricValue(
  key: 'mood' | 'pain' | 'sleep',
  value: number | null,
  t: CheckInWellnessRingVisualProps['t'],
): string {
  if (value == null) return '—';
  if (key === 'mood') {
    const tone = formatMoodAverage(value);
    if (tone === 'good') return t('analytics.dailyCheckIn.moodGood');
    if (tone === 'ok') return t('analytics.dailyCheckIn.moodOk');
    if (tone === 'low') return t('analytics.dailyCheckIn.moodBad');
  }
  if (key === 'sleep') {
    const tone = formatSleepAverage(value);
    if (tone === 'well') return t('analytics.dailyCheckIn.sleepWell');
    if (tone === 'ok') return t('analytics.dailyCheckIn.sleepOk');
    if (tone === 'poor') return t('analytics.dailyCheckIn.sleepPoorly');
  }
  return value.toFixed(1);
}

function formatMetricShort(key: 'mood' | 'pain' | 'sleep', value: number | null): string {
  if (value == null) return '—';
  if (key === 'pain') return value.toFixed(1);
  return value.toFixed(1);
}

function metricsFromFrame(frame: CheckInWellnessRingFrame): CheckInWellnessRingMetric[] {
  return buildCheckInWellnessRingMetricsFromValues(frame);
}

export function CheckInWellnessRingVisual({
  averages,
  frames = [],
  compact = false,
  className,
  t,
}: CheckInWellnessRingVisualProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `checkInWellnessGradient-${uid}`;
  const gradientPulseId = `checkInWellnessGradientPulse-${uid}`;
  const markerGlowId = `checkInWellnessMarkerGlow-${uid}`;

  const staticMetrics = useMemo(
    () =>
      buildCheckInWellnessRingMetricsFromValues({
        mood: averages.mood,
        pain: averages.pain,
        sleep: averages.sleep,
        moodSamples: averages.moodSamples,
        painSamples: averages.painSamples,
        sleepSamples: averages.sleepSamples,
      }),
    [averages],
  );

  const playbackFrames = useMemo(() => {
    if (frames.length >= 2) return frames;
    return [];
  }, [frames]);

  const [frameIndex, setFrameIndex] = useState(() =>
    playbackFrames.length > 0 ? playbackFrames.length - 1 : 0,
  );
  const [playbackGeneration, setPlaybackGeneration] = useState(0);

  useEffect(() => {
    setFrameIndex(playbackFrames.length > 0 ? playbackFrames.length - 1 : 0);
  }, [playbackFrames.length]);

  useEffect(() => {
    if (playbackFrames.length < 2) return undefined;

    let index = 0;
    setFrameIndex(0);

    const intervalMs = playbackIntervalMs(playbackFrames.length);

    const interval = window.setInterval(() => {
      index += 1;
      if (index >= playbackFrames.length) {
        index = playbackFrames.length - 1;
        setFrameIndex(index);
        window.clearInterval(interval);
        return;
      }
      setFrameIndex(index);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [playbackFrames, playbackGeneration]);

  const restartPlayback = () => {
    if (playbackFrames.length < 2) return;
    setPlaybackGeneration((value) => value + 1);
  };

  const activeFrame = playbackFrames[frameIndex];
  const metrics = activeFrame ? metricsFromFrame(activeFrame) : staticMetrics;
  const hasData = metrics.some((metric) => metric.samples > 0 && metric.value != null);
  const isAnimating = playbackFrames.length >= 2 && frameIndex < playbackFrames.length - 1;

  const metricByKey = useMemo(() => {
    const map = new Map<string, CheckInWellnessRingMetric>();
    for (const metric of metrics) map.set(metric.key, metric);
    return map;
  }, [metrics]);

  return (
    <div
      className={cn('relative', className)}
      onClick={(event) => {
        event.stopPropagation();
        if (playbackFrames.length >= 2) restartPlayback();
      }}
    >
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label={t('dashboard.checkInWellnessRing.ariaMap')}
      >
        <defs>
          <radialGradient id={gradientId} cx="48%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.82" />
            <stop offset="38%" stopColor="#d9f99d" stopOpacity="0.72" />
            <stop offset="62%" stopColor="#fde68a" stopOpacity="0.68" />
            <stop offset="88%" stopColor="#fecaca" stopOpacity="0.76" />
            <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.82" />
          </radialGradient>
          <radialGradient id={gradientPulseId} cx="54%" cy="52%" r="48%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#fde047" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.3" />
          </radialGradient>
          <filter id={markerGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="400" height="400" fill="#ffffff" rx="32" />

        <motion.g
          animate={{ scale: [1, 1.018, 1], opacity: [0.88, 0.96, 0.88] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
          <circle cx={CX} cy={CY} r={OUTER_R} fill={`url(#${gradientId})`} />
        </motion.g>

        <motion.circle
          cx={CX}
          cy={CY}
          r={OUTER_R}
          fill={`url(#${gradientPulseId})`}
          animate={{ opacity: [0.08, 0.18, 0.08], scale: [0.99, 1.02, 0.99] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />

        {(Object.values(AXES) as { angle: number; key: 'mood' | 'sleep' | 'pain' }[]).map((axis) => {
          const inner = polarPoint(INNER_R, axis.angle);
          const outer = polarPoint(OUTER_R + 6, axis.angle);
          const label = polarPoint(OUTER_R + (compact ? 14 : 22), axis.angle);
          const metric = metricByKey.get(axis.key);
          const marker =
            metric?.wellness != null && metric.samples > 0
              ? polarPoint(wellnessRadius(metric.wellness), axis.angle)
              : null;

          return (
            <g key={axis.key}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#ffffff"
                strokeOpacity={0.32}
                strokeWidth={1.25}
                strokeDasharray="3 5"
              />
              {!compact ? (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-500 text-[9px] font-medium pointer-events-none"
                >
                  {t(`dashboard.checkInWellnessRing.${axis.key}`)}
                </text>
              ) : (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white/70 text-[7px] font-medium pointer-events-none uppercase tracking-wide"
                  style={{ textShadow: '0 0 4px rgba(15,23,42,0.45)' }}
                >
                  {t(`dashboard.checkInWellnessRing.${axis.key}`)}
                </text>
              )}
              {marker ? (
                <motion.g
                  layout
                  animate={{ x: marker.x, y: marker.y }}
                  transition={{
                    type: 'spring',
                    stiffness: isAnimating ? 90 : 160,
                    damping: isAnimating ? 26 : 22,
                  }}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={compact ? 9 : 11}
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1.75"
                    filter={`url(#${markerGlowId})`}
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={compact ? 4 : 5}
                    fill={
                      (metric?.wellness ?? 0) >= 0.66
                        ? '#4ade80'
                        : (metric?.wellness ?? 0) >= 0.33
                          ? '#fbbf24'
                          : '#f87171'
                    }
                  />
                  <text
                    x={0}
                    y={compact ? -16 : -18}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10px] font-semibold pointer-events-none"
                    style={{ textShadow: '0 0 8px rgba(255,255,255,0.98)' }}
                  >
                    {compact || isAnimating
                      ? formatMetricShort(axis.key, metric?.value ?? null)
                      : formatMetricValue(axis.key, metric?.value ?? null, t)}
                  </text>
                </motion.g>
              ) : null}
            </g>
          );
        })}

        {!hasData && (
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/95 text-[12px] font-medium pointer-events-none"
          >
            {t('dashboard.checkInWellnessRing.noData')}
          </text>
        )}
      </svg>

      {hasData && activeFrame && playbackFrames.length >= 2 && (
        <AnimatePresence mode="sync">
          <motion.p
            key={`${activeFrame.label}-${frameIndex}`}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.35 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={cn(
              'absolute left-0 right-0 text-center font-normal pointer-events-none',
              compact
                ? 'bottom-0 text-[8px] text-slate-400/80'
                : 'bottom-1 text-[10px] text-slate-400/75',
            )}
          >
            {isAnimating
              ? t('dashboard.checkInWellnessRing.playbackDay', { label: activeFrame.label })
              : t('dashboard.checkInWellnessRing.playbackComplete', { days: averages.windowDays })}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}
