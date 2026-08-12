/** @license SPDX-License-Identifier: Apache-2.0 */
import { Calendar, ClipboardList, Clock, type LucideIcon } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
  type CircleScheduleNudgeCounts,
} from '../lib/circleDashboardScheduleNudges';
import { DASHBOARD_RECENCY_TINT_CLASSES } from '../lib/circleDashboardStats';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { dashboardTileTitleClass } from '../lib/circleSectionStyles';

function ScheduleNudgeTile({
  label,
  icon: Icon,
  primaryCount,
  primaryLabel,
  secondaryCount,
  secondaryLabel,
  hint,
  needsAction,
  startingSoonCount = 0,
  startingSoonLabel,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  primaryCount: number;
  primaryLabel: string;
  secondaryCount: number;
  secondaryLabel: string;
  hint: string;
  needsAction: boolean;
  startingSoonCount?: number;
  startingSoonLabel?: string;
  onClick?: () => void;
}) {
  const recencyTint = needsAction ? 'orange' : 'green';
  const showStartingSoon = startingSoonCount > 0 && !!startingSoonLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full min-h-[7.5rem] flex flex-col sm:flex-row sm:items-stretch gap-3 p-3 sm:p-4 rounded-2xl border text-left transition-colors',
        DASHBOARD_RECENCY_TINT_CLASSES[recencyTint],
        !onClick && 'cursor-default',
      )}
    >
      <div className="flex flex-col gap-2 min-w-0 sm:flex-1 sm:justify-between">
        <div className="flex items-center gap-2 w-full min-w-0">
          <Icon size={16} className="shrink-0 text-blue-600" aria-hidden />
          <span className={cn(dashboardTileTitleClass, 'truncate')}>
            {label}
          </span>
        </div>
        {showStartingSoon ? (
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 flex items-center gap-1.5">
            <Clock size={12} className="shrink-0 text-amber-700" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 truncate">
              {startingSoonLabel}
            </span>
            <span className="ml-auto font-bold tabular-nums text-sm text-amber-900">
              {formatCircleBadgeCount(startingSoonCount)}
            </span>
          </div>
        ) : null}
        <span className="text-[11px] text-slate-500 leading-snug">{hint}</span>
      </div>
      <div className="flex items-end gap-4 sm:gap-6 sm:shrink-0 sm:pl-4 sm:border-l sm:border-slate-200/80">
        <div className="min-w-0">
          <span className="font-bold tabular-nums leading-none text-4xl text-slate-800">
            {formatCircleBadgeCount(primaryCount)}
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            {primaryLabel}
          </p>
        </div>
        <div className="min-w-0">
          <span className="font-bold tabular-nums leading-none text-2xl text-slate-700">
            {formatCircleBadgeCount(secondaryCount)}
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            {secondaryLabel}
          </p>
        </div>
      </div>
    </button>
  );
}

export function CircleDashboardScheduleNudgeTiles({
  counts,
  scheduleEnabled = true,
  onOpenSchedule,
}: {
  counts: CircleScheduleNudgeCounts;
  scheduleEnabled?: boolean;
  onOpenSchedule?: () => void;
}) {
  const t = useCircleT();
  const hint = t('dashboard.attentionScheduleNudgeHint');

  const showAssessments =
    scheduleEnabled && (counts.dueAssessments > 0 || counts.upcomingAssessments > 0);
  const showAppointments =
    counts.appointmentsToday > 0
    || counts.upcomingAppointments > 0
    || counts.imminentAppointments > 0;

  if (!showAssessments && !showAppointments) return null;

  return (
    <>
      {showAssessments ? (
        <ScheduleNudgeTile
          label={t('dashboard.attentionAssessments')}
          icon={ClipboardList}
          primaryCount={counts.dueAssessments}
          primaryLabel={t('dashboard.attentionAssessmentsDueNow')}
          secondaryCount={counts.upcomingAssessments}
          secondaryLabel={t('dashboard.attentionAssessmentsUpcoming', {
            days: CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
          })}
          needsAction={counts.dueAssessments > 0}
          hint={hint}
          onClick={onOpenSchedule}
        />
      ) : null}
      {showAppointments ? (
        <ScheduleNudgeTile
          label={t('dashboard.attentionAppointments')}
          icon={Calendar}
          primaryCount={counts.appointmentsToday}
          primaryLabel={t('dashboard.attentionAppointmentsToday')}
          secondaryCount={counts.upcomingAppointments}
          secondaryLabel={t('dashboard.attentionAppointmentsUpcoming', {
            days: CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
          })}
          needsAction={counts.appointmentsToday > 0 || counts.imminentAppointments > 0}
          startingSoonCount={counts.imminentAppointments}
          startingSoonLabel={t('dashboard.attentionAppointmentsStartingSoon')}
          hint={hint}
          onClick={onOpenSchedule}
        />
      ) : null}
    </>
  );
}
