/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import type {
  CheckInWellnessRingFrame,
  DailyCheckInMetricAverages,
} from '../lib/circleCheckInWellnessMetrics';
import { useCheckInWellnessDayPlayback } from '../hooks/useCheckInWellnessDayPlayback';
import {
  CheckInWellnessRingVisual,
  CheckInWellnessWeekControls,
} from './CheckInWellnessRingVisual';

type CircleDashboardCheckInWellnessTileProps = {
  averages: DailyCheckInMetricAverages;
  frames?: CheckInWellnessRingFrame[];
  /** Full-row layout: title + day picker left, larger ring right. */
  wide?: boolean;
  onOpenModal?: () => void;
  onOpenDetails?: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  titleClassName?: string;
  bodyClassName?: string;
  className?: string;
};

export function CircleDashboardCheckInWellnessTile({
  averages,
  frames = [],
  wide = false,
  onOpenModal,
  onOpenDetails,
  t,
  titleClassName,
  bodyClassName,
  className,
}: CircleDashboardCheckInWellnessTileProps) {
  const weekFrameKey = useMemo(
    () =>
      frames
        .map((frame) => `${frame.date}:${frame.hasCheckIn}:${frame.mood}:${frame.pain}:${frame.sleep}`)
        .join('|'),
    [frames],
  );
  const { selectedIndex, setSelectedIndex } = useCheckInWellnessDayPlayback(
    frames.length,
    weekFrameKey,
    frames.length > 0,
  );

  const cta = onOpenDetails ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenDetails();
      }}
      className={cn(
        'relative z-20 pointer-events-auto text-left text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors',
        !wide && 'mt-2',
        bodyClassName,
      )}
    >
      {t('dashboard.checkInWellnessRing.tileCta')}
    </button>
  ) : (
    <p
      className={cn(
        'relative text-[11px] font-bold uppercase tracking-wider text-emerald-600',
        !wide && 'mt-2',
        bodyClassName,
      )}
    >
      {t('dashboard.checkInWellnessRing.tileCta')}
    </p>
  );

  return (
    <div
      className={cn(
        'relative p-4 sm:p-5 w-full h-full flex bg-white rounded-[28px] border border-emerald-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group overflow-hidden',
        wide ? 'flex-row items-stretch gap-3 sm:gap-5' : 'flex-col',
        className,
      )}
    >
      {onOpenModal ? (
        <button
          type="button"
          onClick={onOpenModal}
          className="absolute inset-0 z-0 rounded-[28px] cursor-pointer"
          aria-label={t('dashboard.checkInWellnessRing.openModal')}
        />
      ) : null}

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.06),transparent_55%)]" />

      <div
        className={cn(
          'relative z-10 flex min-w-0',
          wide
            ? 'w-[42%] sm:w-[40%] flex-col justify-between shrink-0 gap-3'
            : 'flex-col h-full pointer-events-none',
        )}
      >
        <div className={cn('flex min-w-0', wide ? 'flex-col gap-3' : 'items-center gap-3 mb-2')}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
            <Activity size={20} />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                'font-bold text-slate-800 text-sm sm:text-base leading-snug',
                titleClassName,
              )}
            >
              {t('dashboard.checkInWellnessRing.title')}
            </p>
          </div>
        </div>

        {wide && frames.length > 0 ? (
          <div className="relative z-20 pointer-events-auto">
            <CheckInWellnessWeekControls
              frames={frames}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              compact
              aside
              t={t}
            />
          </div>
        ) : null}

        {wide ? <div className="mt-auto">{cta}</div> : null}

        {!wide ? (
          <>
            <div className="relative z-20 flex-1 min-h-0 -mx-2 pointer-events-auto">
              <CheckInWellnessRingVisual
                averages={averages}
                frames={frames}
                compact
                selectedIndex={selectedIndex}
                onSelectedIndexChange={setSelectedIndex}
                t={t}
                className="h-full"
              />
            </div>
            {cta}
          </>
        ) : null}
      </div>

      {wide ? (
        <div className="relative z-20 flex-1 min-h-0 min-w-0 -my-2 -mr-2 sm:-my-2.5 sm:-mr-2.5 pointer-events-auto">
          <CheckInWellnessRingVisual
            averages={averages}
            frames={frames}
            compact
            hideWeekControls
            selectedIndex={selectedIndex}
            onSelectedIndexChange={setSelectedIndex}
            t={t}
            className="h-full"
          />
        </div>
      ) : null}
    </div>
  );
}
