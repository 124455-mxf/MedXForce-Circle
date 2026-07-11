/** @license SPDX-License-Identifier: Apache-2.0 */
import { Calendar, ClipboardList, type LucideIcon } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
  type CircleScheduleNudgeCounts,
} from '../lib/circleDashboardScheduleNudges';
import { DASHBOARD_RECENCY_TINT_CLASSES } from '../lib/circleDashboardStats';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';

function ScheduleNudgeTile({
  label,
  icon: Icon,
  primaryCount,
  primaryLabel,
  secondaryCount,
  secondaryLabel,
  hint,
  needsAction,
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
  onClick?: () => void;
}) {
  const recencyTint = needsAction ? 'orange' : 'green';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full min-h-[10.5rem] flex flex-col items-start justify-between gap-2 p-3 sm:p-4 rounded-2xl border text-left transition-colors',
        DASHBOARD_RECENCY_TINT_CLASSES[recencyTint],
        !onClick && 'cursor-default',
      )}
    >
      <div className="flex items-center gap-2 w-full min-w-0">
        <Icon size={16} className="shrink-0 text-blue-600" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
          {label}
        </span>
      </div>
      <div className="w-full">
        <span className="font-bold tabular-nums leading-none text-4xl text-slate-800">
          {formatCircleBadgeCount(primaryCount)}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">
          {primaryLabel}
        </p>
      </div>
      <div className="w-full pt-3 border-t border-slate-200/80">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          {secondaryLabel}
        </p>
        <p className="font-bold tabular-nums text-2xl text-slate-700">
          {formatCircleBadgeCount(secondaryCount)}
        </p>
      </div>
      <span className="text-[11px] text-slate-500 leading-snug">{hint}</span>
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
    counts.appointmentsToday > 0 || counts.upcomingAppointments > 0;

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
          needsAction={counts.appointmentsToday > 0}
          hint={hint}
          onClick={onOpenSchedule}
        />
      ) : null}
    </>
  );
}
