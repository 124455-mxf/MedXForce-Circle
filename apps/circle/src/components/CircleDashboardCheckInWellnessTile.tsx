/** @license SPDX-License-Identifier: Apache-2.0 */
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import type {
  CheckInWellnessRingFrame,
  DailyCheckInMetricAverages,
} from '../lib/circleCheckInWellnessMetrics';
import { CheckInWellnessRingVisual } from './CheckInWellnessRingVisual';

type CircleDashboardCheckInWellnessTileProps = {
  averages: DailyCheckInMetricAverages;
  frames?: CheckInWellnessRingFrame[];
  /** Full-row layout: title left, larger ring right. */
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
  frames,
  wide = false,
  onOpenModal,
  onOpenDetails,
  t,
  titleClassName,
  bodyClassName,
  className,
}: CircleDashboardCheckInWellnessTileProps) {
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
          'relative z-10 flex min-w-0 pointer-events-none',
          wide
            ? 'w-[42%] sm:w-[38%] flex-col justify-between shrink-0'
            : 'flex-col h-full',
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
            <p className={cn('text-xs text-slate-500 mt-0.5 leading-snug', bodyClassName)}>
              {t('dashboard.checkInWellnessRing.tileSubtitle')}
            </p>
          </div>
        </div>

        {wide ? cta : null}

        {!wide ? (
          <>
            <div className="relative z-20 flex-1 min-h-0 -mx-2 pointer-events-auto">
              <CheckInWellnessRingVisual
                averages={averages}
                frames={frames}
                compact
                t={t}
                className="h-full"
              />
            </div>
            {cta}
          </>
        ) : null}
      </div>

      {wide ? (
        <div className="relative z-20 flex-1 min-h-0 min-w-0 -my-1 -mr-2 pointer-events-auto">
          <CheckInWellnessRingVisual
            averages={averages}
            frames={frames}
            compact
            t={t}
            className="h-full"
          />
        </div>
      ) : null}
    </div>
  );
}
