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
  onOpenModal,
  onOpenDetails,
  t,
  titleClassName,
  bodyClassName,
  className,
}: CircleDashboardCheckInWellnessTileProps) {
  return (
    <div
      className={cn(
        'relative p-4 sm:p-5 w-full h-full flex flex-col bg-white rounded-[28px] border border-emerald-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group overflow-hidden',
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

      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div className="relative flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Activity size={20} />
          </div>
          <div className="min-w-0">
            <p className={cn('font-bold text-slate-800', titleClassName)}>
              {t('dashboard.checkInWellnessRing.title')}
            </p>
            <p className={cn('text-xs text-slate-500', bodyClassName)}>
              {t('dashboard.checkInWellnessRing.tileSubtitle', { days: averages.windowDays })}
            </p>
          </div>
        </div>

        <div className="relative z-20 flex-1 min-h-0 -mx-2 pointer-events-auto">
          <CheckInWellnessRingVisual
            averages={averages}
            frames={frames}
            compact
            t={t}
            className="h-full cursor-pointer"
          />
        </div>

        {onOpenDetails ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails();
            }}
            className={cn(
              'relative z-20 pointer-events-auto text-left mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors',
              bodyClassName,
            )}
          >
            {t('dashboard.checkInWellnessRing.tileCta')}
          </button>
        ) : (
          <p
            className={cn(
              'relative text-[11px] font-bold uppercase tracking-wider text-emerald-600 mt-2',
              bodyClassName,
            )}
          >
            {t('dashboard.checkInWellnessRing.tileCta')}
          </p>
        )}
      </div>
    </div>
  );
}
