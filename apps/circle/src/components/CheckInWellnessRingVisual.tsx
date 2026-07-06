/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import {
  buildCheckInWellnessRingMetricsFromValues,
  formatCheckInDayOffsetLabel,
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
const SELECT_TWEEN_SEC = 0.38;

const AXES = {
  mood: { angle: -Math.PI / 2, key: 'mood' as const },
  sleep: { angle: Math.PI / 6, key: 'sleep' as const },
  pain: { angle: (5 * Math.PI) / 6, key: 'pain' as const },
};

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

function formatMetricShort(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(1);
}

function markerFill(wellness: number): string {
  if (wellness >= 0.66) return '#4ade80';
  if (wellness >= 0.33) return '#fbbf24';
  return '#f87171';
}

function metricsFromFrame(frame: CheckInWellnessRingFrame): CheckInWellnessRingMetric[] {
  return buildCheckInWellnessRingMetricsFromValues(frame);
}

function frameHasMetrics(frame: CheckInWellnessRingFrame | null): boolean {
  if (!frame?.hasCheckIn) return false;
  return metricsFromFrame(frame).some((metric) => metric.samples > 0 && metric.value != null);
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
  const markerGlowId = `checkInWellnessMarkerGlow-${uid}`;

  const weekFrames = frames;
  const weekFrameKey = useMemo(
    () => weekFrames.map((frame) => `${frame.date}:${frame.hasCheckIn}:${frame.mood}:${frame.pain}:${frame.sleep}`).join('|'),
    [weekFrames],
  );

  const defaultIndex = Math.max(0, weekFrames.length - 1);
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  useEffect(() => {
    setSelectedIndex(Math.max(0, weekFrames.length - 1));
  }, [weekFrameKey, weekFrames.length]);

  const activeFrame = weekFrames[selectedIndex] ?? null;
  const hasAnyCheckIn = weekFrames.some((frame) => frame.hasCheckIn);
  const hasDayData = frameHasMetrics(activeFrame);
  const metrics = hasDayData && activeFrame ? metricsFromFrame(activeFrame) : [];

  const metricByKey = useMemo(() => {
    const map = new Map<string, CheckInWellnessRingMetric>();
    for (const metric of metrics) map.set(metric.key, metric);
    return map;
  }, [metrics]);

  const dayLabel = activeFrame
    ? formatCheckInDayOffsetLabel(activeFrame.dayOffset, t)
    : t('dashboard.checkInWellnessRing.dayToday');

  return (
    <div
      className={cn(
        'relative',
        weekFrames.length > 0 && (compact ? 'pb-9' : 'pb-11'),
        className,
      )}
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
          <filter id={markerGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="400" height="400" fill="#ffffff" rx="32" />
        <circle cx={CX} cy={CY} r={OUTER_R} fill={`url(#${gradientId})`} />

        {(Object.values(AXES) as { angle: number; key: 'mood' | 'sleep' | 'pain' }[]).map((axis) => {
          const inner = polarPoint(INNER_R, axis.angle);
          const outer = polarPoint(OUTER_R + 6, axis.angle);
          const axisNamePoint = polarPoint(OUTER_R + (compact ? 14 : 22), axis.angle);
          const valueLabelPoint = polarPoint(OUTER_R + (compact ? 30 : 38), axis.angle);
          const metric = metricByKey.get(axis.key);
          const marker =
            metric?.wellness != null && metric.samples > 0
              ? polarPoint(wellnessRadius(metric.wellness), axis.angle)
              : null;
          const valueLabel = formatMetricShort(metric?.value ?? null);

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
              <text
                x={axisNamePoint.x}
                y={axisNamePoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  'pointer-events-none font-medium',
                  compact
                    ? 'fill-white/70 text-[7px] uppercase tracking-wide'
                    : 'fill-slate-500 text-[9px]',
                )}
                style={compact ? { textShadow: '0 0 4px rgba(15,23,42,0.45)' } : undefined}
              >
                {t(`dashboard.checkInWellnessRing.${axis.key}`)}
              </text>
              {marker ? (
                <>
                  <motion.g
                    initial={false}
                    animate={{ x: marker.x, y: marker.y }}
                    transition={{
                      type: 'tween',
                      duration: SELECT_TWEEN_SEC,
                      ease: [0.45, 0, 0.25, 1],
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
                    <motion.circle
                      cx={0}
                      cy={0}
                      r={compact ? 4 : 5}
                      animate={{ fill: markerFill(metric?.wellness ?? 0) }}
                      transition={{ type: 'tween', duration: SELECT_TWEEN_SEC, ease: 'easeInOut' }}
                    />
                  </motion.g>
                  <text
                    x={valueLabelPoint.x}
                    y={valueLabelPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-600 text-[10px] font-semibold pointer-events-none tabular-nums"
                    style={{ textShadow: '0 0 8px rgba(255,255,255,0.98)' }}
                  >
                    {valueLabel}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {!hasAnyCheckIn && (
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

      {weekFrames.length > 0 && (
        <div
          className={cn(
            'absolute left-0 right-0 flex flex-col items-center',
            compact ? 'bottom-0' : 'bottom-1',
          )}
        >
          {hasAnyCheckIn && activeFrame ? (
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-slate-800 text-white shadow-sm mb-1.5',
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
              )}
            >
              <span className="font-black tabular-nums">{dayLabel}</span>
              <span className="font-semibold uppercase tracking-wide text-white/70 text-[9px]">
                {hasDayData
                  ? t('dashboard.checkInWellnessRing.playbackDaily')
                  : t('dashboard.checkInWellnessRing.noCheckInShort')}
              </span>
            </div>
          ) : (
            <p
              className={cn(
                'text-center font-medium mb-1.5',
                compact ? 'text-[8px] text-slate-400' : 'text-[10px] text-slate-400',
              )}
            >
              {t('dashboard.checkInWellnessRing.selectWeekHint')}
            </p>
          )}

          <div
            className={cn(
              'grid w-full max-w-[17rem] mx-auto',
              compact ? 'grid-cols-7 gap-0.5' : 'grid-cols-7 gap-1',
            )}
            role="tablist"
            aria-label={t('dashboard.checkInWellnessRing.weekPicker')}
          >
            {weekFrames.map((frame, index) => {
              const isSelected = index === selectedIndex;
              const dayLabelItem = formatCheckInDayOffsetLabel(frame.dayOffset, t);

              return (
                <button
                  key={frame.date}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={dayLabelItem}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedIndex(index);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg transition-colors',
                    compact ? 'py-0.5 px-0' : 'py-1 px-0.5',
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full border-2 transition-colors',
                      compact ? 'w-2 h-2' : 'w-2.5 h-2.5',
                      frame.hasCheckIn
                        ? isSelected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-slate-400 border-slate-400'
                        : isSelected
                          ? 'bg-white border-emerald-400'
                          : 'bg-white border-slate-200',
                    )}
                  />
                  <span
                    className={cn(
                      'font-bold tabular-nums leading-none whitespace-nowrap',
                      compact ? 'text-[7px]' : 'text-[8px]',
                      isSelected
                        ? 'text-emerald-700'
                        : frame.hasCheckIn
                          ? 'text-slate-500'
                          : 'text-slate-300',
                    )}
                  >
                    {dayLabelItem}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
