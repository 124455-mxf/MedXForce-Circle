/** @license SPDX-License-Identifier: Apache-2.0 */
import { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import {
  buildCheckInWellnessRingMetricsFromValues,
  formatCheckInDayOffsetLabel,
  type CheckInWellnessRingFrame,
  type CheckInWellnessRingMetric,
  type DailyCheckInMetricAverages,
} from '../lib/circleCheckInWellnessMetrics';
import { useCheckInWellnessDayPlayback } from '../hooks/useCheckInWellnessDayPlayback';

type CheckInWellnessRingVisualProps = {
  averages: DailyCheckInMetricAverages;
  frames?: CheckInWellnessRingFrame[];
  compact?: boolean;
  /** Hide the bottom day strip (e.g. when the tile hosts it on the left). */
  hideWeekControls?: boolean;
  /** When omitted, the visual owns day index and auto-plays −6→Today on a loop. */
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  /** Auto-advance days when this visual owns selection (default true). */
  autoPlayDays?: boolean;
  className?: string;
  t: (key: string, params?: Record<string, unknown>) => string;
};

const CX = 200;
const CY = 200;
const INNER_R = 22;
const OUTER_R = 190;
/** Compact tile: large pie — labels live near the outer arc of each slice. */
const OUTER_R_COMPACT = 190;
const ZONE_GAP = 0.14; // thin white seams between Mood / Pain / Sleep
const SELECT_TWEEN_SEC = 0.55;

const AXES = {
  mood: { angle: -Math.PI / 2, key: 'mood' as const },
  sleep: { angle: Math.PI / 6, key: 'sleep' as const },
  pain: { angle: (5 * Math.PI) / 6, key: 'pain' as const },
};

function wellnessRadius(wellness: number | null, outerR: number): number {
  if (wellness == null) return (INNER_R + outerR) / 2;
  return INNER_R + (1 - wellness) * (outerR - INNER_R);
}

function polarPoint(radius: number, angle: number) {
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

/** Pie slice from center hub to outer rim (white gap = ZONE_GAP). */
function pieSlicePath(angle: number, innerR: number, outerR: number, gap: number): string {
  const span = (Math.PI * 2 - 3 * gap) / 3;
  const a0 = angle - span / 2;
  const a1 = angle + span / 2;
  const p0i = polarPoint(innerR, a0);
  const p0o = polarPoint(outerR, a0);
  const p1o = polarPoint(outerR, a1);
  const p1i = polarPoint(innerR, a1);
  const largeArc = span > Math.PI ? 1 : 0;
  return [
    `M ${p0i.x} ${p0i.y}`,
    `L ${p0o.x} ${p0o.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p1o.x} ${p1o.y}`,
    `L ${p1i.x} ${p1i.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p0i.x} ${p0i.y}`,
    'Z',
  ].join(' ');
}

function zoneSpan(gap: number) {
  return (Math.PI * 2 - 3 * gap) / 3;
}

/**
 * Park the section pill off the spoke midline so high (outer) values
 * never sit on top of Mood / Pain / Sleep.
 */
function pillAngleForAxis(angle: number, key: 'mood' | 'sleep' | 'pain', gap: number) {
  const half = zoneSpan(gap) / 2;
  // Bias toward one side of the wedge (still inside the slice).
  const bias =
    key === 'mood' ? -0.55 : key === 'pain' ? -0.5 : 0.5;
  return angle + half * bias;
}

/** Keep values near the dot but toward the center so they never cover the outer pill. */
function valueOffsetFromMarker(markerR: number, angle: number) {
  const along = -Math.min(28, Math.max(16, markerR * 0.22));
  return { x: Math.cos(angle) * along, y: Math.sin(angle) * along };
}

function axisPillSize(title: string, compact: boolean) {
  const pillH = compact ? 30 : 32;
  const charW = compact ? 9.2 : 9.8;
  const pillW = Math.max(compact ? 72 : 78, Math.ceil(title.length * charW) + 24);
  return { pillW, pillH };
}

function formatMetricShort(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(1);
}

/** Brand primary used for primary buttons (violet-600). */
/** Brand primary used for primary buttons (blue-600). */
const MARKER_BLUE = '#2563eb';

function metricsFromFrame(frame: CheckInWellnessRingFrame): CheckInWellnessRingMetric[] {
  return buildCheckInWellnessRingMetricsFromValues(frame);
}

function frameHasMetrics(frame: CheckInWellnessRingFrame | null): boolean {
  if (!frame?.hasCheckIn) return false;
  return metricsFromFrame(frame).some((metric) => metric.samples > 0 && metric.value != null);
}

type WeekControlsProps = {
  frames: CheckInWellnessRingFrame[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  compact?: boolean;
  /** Stack under a left column — left-aligned, no absolute positioning. */
  aside?: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export function CheckInWellnessWeekControls({
  frames,
  selectedIndex,
  onSelect,
  compact = false,
  aside = false,
  t,
}: WeekControlsProps) {
  const activeFrame = frames[selectedIndex] ?? null;
  const hasAnyCheckIn = frames.some((frame) => frame.hasCheckIn);
  const hasDayData = frameHasMetrics(activeFrame);
  const dayLabel = activeFrame
    ? formatCheckInDayOffsetLabel(activeFrame.dayOffset, t)
    : t('dashboard.checkInWellnessRing.dayToday');

  return (
    <div
      className={cn(
        'flex flex-col',
        aside ? 'items-stretch w-full min-w-0' : 'items-center',
        !aside && (compact ? 'absolute left-0 right-0 bottom-0' : 'absolute left-0 right-0 bottom-1'),
      )}
    >
      {hasAnyCheckIn && activeFrame ? (
        <motion.div
          key={activeFrame.date}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className={cn(
            'inline-flex items-center gap-2 rounded-full bg-slate-500 text-white shadow-sm mb-3.5',
            aside ? 'self-start px-2.5 py-1 text-[10px]' : compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
          )}
        >
          <span className="font-black tabular-nums">{dayLabel}</span>
          {activeFrame.dayOffset === 0 ? null : hasDayData ? (
            <span className="font-semibold tracking-wide text-white/85 text-[9px]">
              {t('dashboard.checkInWellnessRing.dayUnit')}
            </span>
          ) : (
            <span className="font-semibold uppercase tracking-wide text-white/70 text-[9px]">
              {t('dashboard.checkInWellnessRing.noCheckInShort')}
            </span>
          )}
        </motion.div>
      ) : (
        <p
          className={cn(
            'font-medium mb-3.5',
            aside ? 'text-left text-[10px] text-slate-400' : 'text-center',
            !aside && (compact ? 'text-[8px] text-slate-400' : 'text-[10px] text-slate-400'),
          )}
        >
          {t('dashboard.checkInWellnessRing.selectWeekHint')}
        </p>
      )}

      <div
        className={cn(
          'flex w-full',
          aside ? 'gap-0.5' : cn('max-w-[17rem] mx-auto', compact ? 'gap-0.5' : 'gap-1'),
        )}
        role="tablist"
        aria-label={t('dashboard.checkInWellnessRing.weekPicker')}
      >
        {frames.map((frame, index) => {
          const isSelected = index === selectedIndex;
          const dayLabelItem = formatCheckInDayOffsetLabel(frame.dayOffset, t);
          const isToday = frame.dayOffset === 0;

          return (
            <button
              key={frame.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={dayLabelItem}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(index);
              }}
              className={cn(
                'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg',
                isToday ? 'flex-[1.35]' : 'flex-1',
                compact || aside ? 'min-h-[2.25rem] py-1 px-0' : 'min-h-[2.5rem] py-1 px-0.5',
                !isSelected && 'hover:bg-slate-50',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-lg bg-blue-50 ring-1 ring-inset ring-blue-500 transition-opacity duration-500 ease-in-out',
                  isSelected ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span
                className={cn(
                  'relative rounded-full border-2 transition-[background-color,border-color] duration-500 ease-in-out',
                  compact || aside ? 'w-2 h-2' : 'w-2.5 h-2.5',
                  frame.hasCheckIn
                    ? isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-slate-400 border-slate-400'
                    : isSelected
                      ? 'bg-white border-blue-400'
                      : 'bg-white border-slate-200',
                )}
              />
              <span
                className={cn(
                  'relative w-full text-center font-bold leading-none transition-colors duration-500 ease-in-out',
                  isToday
                    ? aside
                      ? 'text-[8px] tracking-tight'
                      : compact
                        ? 'text-[6.5px] tracking-tight'
                        : 'text-[7.5px] tracking-tight'
                    : cn(
                        'tabular-nums',
                        aside ? 'text-[9px]' : compact ? 'text-[7px]' : 'text-[8px]',
                      ),
                  isSelected
                    ? 'text-blue-700'
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
  );
}

export function CheckInWellnessRingVisual({
  averages: _averages,
  frames = [],
  compact = false,
  hideWeekControls = false,
  selectedIndex: selectedIndexProp,
  onSelectedIndexChange,
  autoPlayDays = true,
  className,
  t,
}: CheckInWellnessRingVisualProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `checkInWellnessGradient-${uid}`;

  const weekFrames = frames;
  const weekFrameKey = useMemo(
    () =>
      weekFrames
        .map((frame) => `${frame.date}:${frame.hasCheckIn}:${frame.mood}:${frame.pain}:${frame.sleep}`)
        .join('|'),
    [weekFrames],
  );

  const controlled = typeof selectedIndexProp === 'number';
  const playback = useCheckInWellnessDayPlayback(
    weekFrames.length,
    weekFrameKey,
    !controlled && autoPlayDays && weekFrames.length > 0,
  );
  const selectedIndex = controlled ? selectedIndexProp : playback.selectedIndex;

  const setSelectedIndex = (index: number) => {
    if (!controlled) playback.setSelectedIndex(index);
    onSelectedIndexChange?.(index);
  };

  const activeFrame = weekFrames[selectedIndex] ?? null;
  const hasAnyCheckIn = weekFrames.some((frame) => frame.hasCheckIn);
  const metrics = frameHasMetrics(activeFrame) && activeFrame ? metricsFromFrame(activeFrame) : [];

  const metricByKey = useMemo(() => {
    const map = new Map<string, CheckInWellnessRingMetric>();
    for (const metric of metrics) map.set(metric.key, metric);
    return map;
  }, [metrics]);

  const showControlsBelow = weekFrames.length > 0 && !hideWeekControls;
  const outerR = compact ? OUTER_R_COMPACT : OUTER_R;

  return (
    <div
      className={cn(
        'relative',
        showControlsBelow && (compact ? 'pb-9' : 'pb-11'),
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
          {/* userSpaceOnUse: green at chart center → red at rim (not per-slice bounding boxes). */}
          <radialGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            cx={CX}
            cy={CY}
            r={outerR}
          >
            <stop offset="0%" stopColor="#d9f99d" stopOpacity="0.92" />
            <stop offset="38%" stopColor="#ecfccb" stopOpacity="0.9" />
            <stop offset="62%" stopColor="#fef9c3" stopOpacity="0.88" />
            <stop offset="82%" stopColor="#fecdd3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fda4af" stopOpacity="0.9" />
          </radialGradient>
        </defs>

        <rect width="400" height="400" fill="#ffffff" rx="32" />

        {/* Pie slices — thin white seams; gradient is center→rim in chart space. */}
        {(Object.values(AXES) as { angle: number; key: 'mood' | 'sleep' | 'pain' }[]).map((axis) => (
          <path
            key={`zone-${axis.key}`}
            d={pieSlicePath(axis.angle, INNER_R, outerR, ZONE_GAP)}
            fill={`url(#${gradientId})`}
          />
        ))}
        <circle cx={CX} cy={CY} r={INNER_R - 1} fill="#ffffff" />

        {(Object.values(AXES) as { angle: number; key: 'mood' | 'sleep' | 'pain' }[]).map((axis) => {
          // Pill off the spoke midline so outer/high dots stay clear of the label.
          const labelPoint = polarPoint(
            outerR * 0.86,
            pillAngleForAxis(axis.angle, axis.key, ZONE_GAP),
          );
          const metric = metricByKey.get(axis.key);
          const markerR =
            metric?.wellness != null && metric.samples > 0
              ? wellnessRadius(metric.wellness, outerR)
              : null;
          const marker = markerR != null ? polarPoint(markerR, axis.angle) : null;
          const valueNudge =
            markerR != null ? valueOffsetFromMarker(markerR, axis.angle) : { x: 0, y: 0 };
          const valueLabel = formatMetricShort(metric?.value ?? null);
          const axisTitle = t(`dashboard.checkInWellnessRing.${axis.key}`);
          const { pillW, pillH } = axisPillSize(axisTitle, compact);

          return (
            <g key={axis.key}>
              <g transform={`translate(${labelPoint.x}, ${labelPoint.y})`}>
                <rect
                  x={-pillW / 2}
                  y={-pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={pillH / 2}
                  ry={pillH / 2}
                  fill="#bfdbfe"
                  stroke="#93c5fd"
                  strokeWidth={1.25}
                />
                <text
                  x={0}
                  y={0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'pointer-events-none fill-sky-900 font-bold tracking-wide',
                    compact ? 'text-[16px]' : 'text-[17px]',
                  )}
                >
                  {axisTitle}
                </text>
              </g>
              {marker ? (
                <motion.g
                  initial={false}
                  animate={{ x: marker.x, y: marker.y }}
                  transition={{
                    type: 'tween',
                    duration: SELECT_TWEEN_SEC,
                    ease: [0.45, 0, 0.25, 1],
                  }}
                >
                  {/* Soft white halo — no gray ring */}
                  <circle cx={0} cy={0} r={compact ? 10 : 12} fill="#ffffff" />
                  {/* Brand-blue pulse */}
                  <motion.circle
                    cx={0}
                    cy={0}
                    r={compact ? 5 : 6}
                    fill={MARKER_BLUE}
                    animate={{ scale: [1, 1.45, 1], opacity: [1, 0.72, 1] }}
                    transition={{
                      duration: 1.7,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <motion.text
                    key={`${activeFrame?.date ?? 'empty'}-${axis.key}-${valueLabel}`}
                    x={valueNudge.x}
                    y={valueNudge.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={cn(
                      'fill-slate-900 font-black pointer-events-none tabular-nums',
                      compact ? 'text-[18px]' : 'text-[20px]',
                    )}
                    style={{ textShadow: '0 0 8px rgba(255,255,255,1), 0 1px 2px rgba(255,255,255,1)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                  >
                    {valueLabel}
                  </motion.text>
                </motion.g>
              ) : (
                <text
                  x={polarPoint((INNER_R + outerR) / 2, axis.angle).x}
                  y={polarPoint((INNER_R + outerR) / 2, axis.angle).y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    'fill-slate-400 font-bold pointer-events-none tabular-nums',
                    compact ? 'text-[16px]' : 'text-[17px]',
                  )}
                  style={{ textShadow: '0 0 8px rgba(255,255,255,0.98)' }}
                >
                  —
                </text>
              )}
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

      {showControlsBelow ? (
        <CheckInWellnessWeekControls
          frames={weekFrames}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          compact={compact}
          t={t}
        />
      ) : null}
    </div>
  );
}
