/** @license SPDX-License-Identifier: Apache-2.0 */
import { Calendar, ClipboardList, Clock, ListTodo, type LucideIcon } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import {
  CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS,
  type CircleScheduleNudgeCounts,
} from '../lib/circleDashboardScheduleNudges';
import type { CircleScheduleViewIntent } from '../lib/circleSchedulePreferences';
import { DASHBOARD_RECENCY_TINT_CLASSES } from '../lib/circleDashboardStats';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { dashboardTileTitleClass } from '../lib/circleSectionStyles';

function NudgeAlertBar({
  count,
  label,
  icon: Icon,
  tone,
}: {
  count: number;
  label: string;
  icon: LucideIcon;
  tone: 'amber' | 'violet';
}) {
  const toneClass =
    tone === 'amber'
      ? {
          wrap: 'border-amber-200 bg-amber-50',
          icon: 'text-amber-700',
          label: 'text-amber-800',
          count: 'text-amber-900',
        }
      : {
          wrap: 'border-violet-200 bg-violet-50',
          icon: 'text-violet-700',
          label: 'text-violet-800',
          count: 'text-violet-900',
        };

  return (
    <div className={cn('w-full rounded-xl border px-2.5 py-1.5 flex items-center gap-1.5', toneClass.wrap)}>
      <Icon size={12} className={cn('shrink-0', toneClass.icon)} aria-hidden />
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider truncate',
          toneClass.label,
        )}
      >
        {label}
      </span>
      <span className={cn('ml-auto font-bold tabular-nums text-sm', toneClass.count)}>
        {formatCircleBadgeCount(count)}
      </span>
    </div>
  );
}

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
  visitTasksCount = 0,
  visitTasksLabel,
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
  visitTasksCount?: number;
  visitTasksLabel?: string;
  onClick?: () => void;
}) {
  const recencyTint = needsAction ? 'orange' : 'green';
  const showStartingSoon = startingSoonCount > 0 && !!startingSoonLabel;
  const showVisitTasks = visitTasksCount > 0 && !!visitTasksLabel;

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
          <NudgeAlertBar
            count={startingSoonCount}
            label={startingSoonLabel!}
            icon={Clock}
            tone="amber"
          />
        ) : null}
        {showVisitTasks ? (
          <NudgeAlertBar
            count={visitTasksCount}
            label={visitTasksLabel!}
            icon={ListTodo}
            tone="violet"
          />
        ) : null}
        <span className="text-[11px] text-slate-500 leading-snug">{hint}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 w-full items-start sm:w-56 sm:shrink-0 sm:pl-4 sm:border-l sm:border-slate-200/80">
        <div className="min-w-0">
          <p className="font-bold tabular-nums leading-none text-3xl text-slate-800">
            {formatCircleBadgeCount(primaryCount)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 leading-snug">
            {primaryLabel}
          </p>
        </div>
        <div className="min-w-0">
          <p className="font-bold tabular-nums leading-none text-3xl text-slate-800">
            {formatCircleBadgeCount(secondaryCount)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 leading-snug">
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
  onOpenSchedule?: (view?: CircleScheduleViewIntent) => void;
}) {
  const t = useCircleT();
  const hint = t('dashboard.attentionScheduleNudgeHint');

  const showAssessments =
    scheduleEnabled && (counts.dueAssessments > 0 || counts.upcomingAssessments > 0);
  const showAppointments =
    counts.appointmentsToday > 0
    || counts.upcomingAppointments > 0
    || counts.imminentAppointments > 0
    || counts.openVisitTasks > 0;

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
          onClick={() => onOpenSchedule?.(counts.dueAssessments > 0 ? 'today' : undefined)}
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
          needsAction={
            counts.appointmentsToday > 0
            || counts.imminentAppointments > 0
            || counts.openVisitTasks > 0
          }
          startingSoonCount={counts.imminentAppointments}
          startingSoonLabel={t('dashboard.attentionAppointmentsStartingSoon')}
          visitTasksCount={counts.openVisitTasks}
          visitTasksLabel={t('dashboard.attentionAppointmentsVisitTasks')}
          hint={hint}
          onClick={() =>
            onOpenSchedule?.(counts.openVisitTasks > 0 ? 'tasks' : undefined)
          }
        />
      ) : null}
    </>
  );
}
