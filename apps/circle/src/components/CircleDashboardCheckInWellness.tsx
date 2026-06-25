/** @license SPDX-License-Identifier: Apache-2.0 */
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BarChart3, X } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  formatMoodAverage,
  formatSleepAverage,
  moodToneTextClass,
  painLevelTextClass,
  sleepToneTextClass,
  type CheckInWellnessRingFrame,
  type DailyCheckInMetricAverages,
} from '../lib/circleCheckInWellnessMetrics';
import { CheckInWellnessRingVisual } from './CheckInWellnessRingVisual';

type CircleDashboardCheckInWellnessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  averages: DailyCheckInMetricAverages;
  frames?: CheckInWellnessRingFrame[];
  onOpenDetails?: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export function CircleDashboardCheckInWellnessModal({
  isOpen,
  onClose,
  averages,
  frames,
  onOpenDetails,
  t,
}: CircleDashboardCheckInWellnessModalProps) {
  if (!isOpen) return null;

  const moodTone = formatMoodAverage(averages.mood);
  const sleepTone = formatSleepAverage(averages.sleep);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-emerald-100 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-wider">
                  <Activity size={12} />
                  {t('dashboard.checkInWellnessRing.badge')}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {t('dashboard.checkInWellnessRing.title')}
                </h2>
                <p className="text-sm text-slate-500 max-w-md">
                  {t('dashboard.checkInWellnessRing.subtitle', { days: averages.windowDays })}
                </p>
                <p className="text-xs text-emerald-700/90 font-medium max-w-md">
                  {t('dashboard.checkInWellnessRing.replayHint', { days: averages.windowDays })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-white/80 border border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
              <CheckInWellnessRingVisual
                averages={averages}
                frames={frames}
                t={t}
                className="aspect-square max-h-[min(62vh,520px)] mx-auto"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-100 text-xs font-bold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                {t('dashboard.checkInWellnessRing.mood')}
                <span className={cn(moodToneTextClass(moodTone))}>
                  {averages.mood != null ? averages.mood.toFixed(1) : '—'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-100 text-xs font-bold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                {t('dashboard.checkInWellnessRing.pain')}
                <span className={cn(painLevelTextClass(averages.pain))}>
                  {averages.pain != null ? averages.pain.toFixed(1) : '—'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-100 text-xs font-bold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                {t('dashboard.checkInWellnessRing.sleep')}
                <span className={cn(sleepToneTextClass(sleepTone))}>
                  {averages.sleep != null ? averages.sleep.toFixed(1) : '—'}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetails();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  <BarChart3 size={16} />
                  {t('dashboard.checkInWellnessRing.viewDetails')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
