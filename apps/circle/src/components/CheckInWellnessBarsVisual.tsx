/** @license SPDX-License-Identifier: Apache-2.0 */
import { cn } from '../lib/utils';
import type { CheckInWellnessRingFrame } from '../lib/circleCheckInWellnessMetrics';
import { CheckInWellnessWeekControls } from './CheckInWellnessRingVisual';

type CheckInWellnessBarsVisualProps = {
  frames?: CheckInWellnessRingFrame[];
  compact?: boolean;
  hideWeekControls?: boolean;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  className?: string;
  t: (key: string, params?: Record<string, unknown>) => string;
};

/** Same emojis the patient taps in daily check-in (Good / OK / Bad). */
function moodEmoji(score: number | null): string | null {
  if (score == null || !Number.isFinite(score)) return null;
  const level = Math.round(Math.max(1, Math.min(3, score)));
  if (level >= 3) return '😊';
  if (level <= 1) return '☹️';
  return '😐';
}

/** Same emojis the patient taps in daily check-in (Well / OK / Poor). */
function sleepEmoji(score: number | null): string | null {
  if (score == null || !Number.isFinite(score)) return null;
  const level = Math.round(Math.max(1, Math.min(3, score)));
  if (level >= 3) return '😴';
  if (level <= 1) return '😩';
  return '😐';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const PAIN_GRADIENT =
  'linear-gradient(to right, #6bba8a 0%, #d4c36a 48%, #d47a7a 100%)';
const WELLNESS_GRADIENT =
  'linear-gradient(to right, #d47a7a 0%, #d4c36a 48%, #6bba8a 100%)';

function MetricBar({
  label,
  fillPct,
  icon,
  valueLabel,
  gradient,
  empty,
}: {
  label: string;
  fillPct: number;
  icon?: string | null;
  valueLabel: string;
  gradient?: 'pain' | 'wellness';
  empty: boolean;
}) {
  const width = empty ? 0 : Math.round(clamp01(fillPct) * 100);
  const gradientImage =
    gradient === 'pain' ? PAIN_GRADIENT : gradient === 'wellness' ? WELLNESS_GRADIENT : undefined;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-slate-700 leading-none">
          {icon ? (
            <span className="text-lg leading-none" aria-hidden>
              {icon}
            </span>
          ) : null}
          {valueLabel}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white border border-slate-300 overflow-hidden box-border">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            !gradient && !empty && 'bg-slate-400/75',
          )}
          style={{
            width: `${width}%`,
            ...(gradientImage && width > 0 ? { backgroundImage: gradientImage } : {}),
          }}
        />
      </div>
    </div>
  );
}

export function CheckInWellnessBarsVisual({
  frames = [],
  compact = false,
  hideWeekControls = false,
  selectedIndex = 0,
  onSelectedIndexChange,
  className,
  t,
}: CheckInWellnessBarsVisualProps) {
  const frame = frames[selectedIndex] ?? null;
  const hasDay = !!frame?.hasCheckIn;
  const mood = hasDay ? frame.mood : null;
  const pain = hasDay ? frame.pain : null;
  const sleep = hasDay ? frame.sleep : null;

  const moodIcon = moodEmoji(mood);
  const sleepIcon = sleepEmoji(sleep);
  const painLabel =
    pain == null ? '—' : Number.isInteger(pain) ? String(pain) : pain.toFixed(1);

  return (
    <div className={cn('relative h-full min-h-0 flex flex-col', className)}>
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-4 px-1 sm:px-2 py-1">
        <MetricBar
          label={t('dashboard.checkInWellnessRing.pain')}
          fillPct={pain == null ? 0 : pain / 10}
          valueLabel={painLabel}
          gradient="pain"
          empty={pain == null}
        />
        <MetricBar
          label={t('dashboard.checkInWellnessRing.mood')}
          fillPct={mood == null ? 0 : mood / 3}
          icon={moodIcon}
          valueLabel={moodIcon ? '' : '—'}
          gradient="wellness"
          empty={mood == null}
        />
        <MetricBar
          label={t('dashboard.checkInWellnessRing.sleep')}
          fillPct={sleep == null ? 0 : sleep / 3}
          icon={sleepIcon}
          valueLabel={sleepIcon ? '' : '—'}
          gradient="wellness"
          empty={sleep == null}
        />
      </div>

      {!hideWeekControls && frames.length > 0 && onSelectedIndexChange ? (
        <CheckInWellnessWeekControls
          frames={frames}
          selectedIndex={selectedIndex}
          onSelect={onSelectedIndexChange}
          compact={compact}
          t={t}
        />
      ) : null}
    </div>
  );
}
