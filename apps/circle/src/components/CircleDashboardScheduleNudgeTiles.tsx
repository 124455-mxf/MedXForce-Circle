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
  onStartingSoonClick,
  onVisitTasksClick,
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
  onStartingSoonClick?: () => void;
  onVisitTasksClick?: () => void;
}) {
  const recencyTint = needsAction ? 'orange' : 'green';
  const showStartingSoon = startingSoonCount > 0 && !!startingSoonLabel;
  const showVisitTasks = visitTasksCount > 0 && !!visitTasksLabel;
  const startingSoonClick = onStartingSoonClick ?? onClick;
  const visitTasksClick = onVisitTasksClick ?? onClick;

  return (
    <div
      className={cn(
        'w-full min-h-[7.5rem] flex flex-col sm:flex-row sm:items-stretch gap-3 p-3 sm:p-4 rounded-2xl border text-left',
        DASHBOARD_RECENCY_TINT_CLASSES[recencyTint],
      )}
    >
      <div className="flex flex-col gap-2 min-w-0 sm:flex-1 sm:justify-between">
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={cn(
            'flex items-center gap-2 w-full min-w-0 text-left rounded-lg',
            !onClick && 'cursor-default',
          )}
        >
          <Icon size={16} className="shrink-0 text-blue-600" aria-hidden />
          <span className={cn(dashboardTileTitleClass, 'truncate')}>
            {label}
          </span>
        </button>
        {showStartingSoon ? (
          <button
            type="button"
            onClick={startingSoonClick}
            disabled={!startingSoonClick}
            className={cn('w-full text-left', !startingSoonClick && 'cursor-default')}
          >
            <NudgeAlertBar
              count={startingSoonCount}
              label={startingSoonLabel!}
              icon={Clock}
              tone="amber"
            />
          </button>
        ) : null}
        {showVisitTasks ? (
          <button
            type="button"
            onClick={visitTasksClick}
            disabled={!visitTasksClick}
            className={cn('w-full text-left', !visitTasksClick && 'cursor-default')}
          >
            <NudgeAlertBar
              count={visitTasksCount}
              label={visitTasksLabel!}
              icon={ListTodo}
              tone="violet"
            />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={cn(
            'text-[11px] text-slate-500 leading-snug text-left',
            !onClick && 'cursor-default',
          )}
        >
          {hint}
        </button>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'grid grid-cols-2 gap-x-4 w-full items-start sm:w-56 sm:shrink-0 sm:pl-4 sm:border-l sm:border-slate-200/80 text-left',
          !onClick && 'cursor-default',
        )}
      >
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
      </button>
    </div>
  );
}

function CompactNudgeChip({
  count,
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  count: number;
  label: string;
  icon: LucideIcon;
  tone: 'amber' | 'violet';
  onClick?: () => void;
}) {
  const toneClass =
    tone === 'amber'
      ? {
          wrap: 'border-amber-200 bg-amber-50',
          icon: 'text-amber-700',
          text: 'text-amber-800',
        }
      : {
          wrap: 'border-violet-200 bg-violet-50',
          icon: 'text-violet-700',
          text: 'text-violet-800',
        };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      disabled={!onClick}
      className={cn(
        'inline-flex items-center gap-1 max-w-full rounded-full border px-2 py-0.5 text-left',
        toneClass.wrap,
        !onClick && 'cursor-default',
      )}
    >
      <Icon size={10} className={cn('shrink-0', toneClass.icon)} aria-hidden />
      <span className={cn('text-[10px] font-bold uppercase tracking-wide truncate', toneClass.text)}>
        {label}
      </span>
      <span className={cn('font-bold tabular-nums text-[11px]', toneClass.text)}>
        {formatCircleBadgeCount(count)}
      </span>
    </button>
  );
}

function CompactScheduleNudgeTile({
  label,
  icon: Icon,
  primaryCount,
  primaryLabel,
  upcomingLabel,
  needsAction,
  startingSoonCount = 0,
  startingSoonLabel,
  visitTasksCount = 0,
  visitTasksLabel,
  fullWidth = false,
  onClick,
  onStartingSoonClick,
  onVisitTasksClick,
}: {
  label: string;
  icon: LucideIcon;
  primaryCount: number;
  primaryLabel: string;
  upcomingLabel: string;
  needsAction: boolean;
  startingSoonCount?: number;
  startingSoonLabel?: string;
  visitTasksCount?: number;
  visitTasksLabel?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  onStartingSoonClick?: () => void;
  onVisitTasksClick?: () => void;
}) {
  const recencyTint = needsAction ? 'orange' : 'green';
  const showStartingSoon = startingSoonCount > 0 && !!startingSoonLabel;
  const showVisitTasks = visitTasksCount > 0 && !!visitTasksLabel;

  return (
    <div
      className={cn(
        'min-h-[7.5rem] flex flex-col gap-2 p-3 rounded-2xl border text-left',
        DASHBOARD_RECENCY_TINT_CLASSES[recencyTint],
        fullWidth && 'col-span-2',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'flex flex-col gap-2 min-w-0 w-full text-left rounded-lg flex-1',
          !onClick && 'cursor-default',
        )}
      >
        <span className="flex items-center gap-2 w-full min-w-0">
          <Icon size={16} className="shrink-0 text-blue-600" aria-hidden />
          <span className={cn(dashboardTileTitleClass, 'truncate')}>{label}</span>
        </span>
        <span className="font-bold tabular-nums leading-none text-4xl text-slate-800">
          {formatCircleBadgeCount(primaryCount)}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-snug">
          {primaryLabel}
        </span>
        <span className="text-[11px] text-slate-500 leading-snug">{upcomingLabel}</span>
      </button>
      {showVisitTasks || showStartingSoon ? (
        <div className="flex flex-wrap gap-1.5">
          {showVisitTasks ? (
            <CompactNudgeChip
              count={visitTasksCount}
              label={visitTasksLabel!}
              icon={ListTodo}
              tone="violet"
              onClick={onVisitTasksClick ?? onClick}
            />
          ) : null}
          {showStartingSoon ? (
            <CompactNudgeChip
              count={startingSoonCount}
              label={startingSoonLabel!}
              icon={Clock}
              tone="amber"
              onClick={onStartingSoonClick ?? onClick}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CircleDashboardScheduleNudgeTiles({
  counts,
  scheduleEnabled = true,
  compact = false,
  onOpenSchedule,
}: {
  counts: CircleScheduleNudgeCounts;
  scheduleEnabled?: boolean;
  compact?: boolean;
  onOpenSchedule?: (view?: CircleScheduleViewIntent) => void;
}) {
  const t = useCircleT();
  const hint = t('dashboard.attentionScheduleNudgeHint');
  const upcomingDays = CIRCLE_SCHEDULE_NUDGE_UPCOMING_DAYS;

  const showAssessments =
    scheduleEnabled && (counts.dueAssessments > 0 || counts.upcomingAssessments > 0);
  const showAppointments =
    counts.appointmentsToday > 0
    || counts.upcomingAppointments > 0
    || counts.imminentAppointments > 0
    || counts.openVisitTasks > 0;

  if (!showAssessments && !showAppointments) return null;

  const tileCount = (showAssessments ? 1 : 0) + (showAppointments ? 1 : 0);
  const fullWidth = compact && tileCount === 1;

  if (compact) {
    return (
      <>
        {showAssessments ? (
          <CompactScheduleNudgeTile
            label={t('dashboard.attentionAssessments')}
            icon={ClipboardList}
            primaryCount={counts.dueAssessments}
            primaryLabel={t('dashboard.attentionAssessmentsDueNow')}
            upcomingLabel={t('dashboard.attentionUpcomingInDays', {
              count: formatCircleBadgeCount(counts.upcomingAssessments),
              days: upcomingDays,
            })}
            needsAction={counts.dueAssessments > 0}
            fullWidth={fullWidth}
            onClick={() => onOpenSchedule?.(counts.dueAssessments > 0 ? 'today' : undefined)}
          />
        ) : null}
        {showAppointments ? (
          <CompactScheduleNudgeTile
            label={t('dashboard.attentionAppointments')}
            icon={Calendar}
            primaryCount={counts.appointmentsToday}
            primaryLabel={t('dashboard.attentionAppointmentsToday')}
            upcomingLabel={t('dashboard.attentionUpcomingInDays', {
              count: formatCircleBadgeCount(counts.upcomingAppointments),
              days: upcomingDays,
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
            fullWidth={fullWidth}
            onClick={() => onOpenSchedule?.('week')}
            onStartingSoonClick={() => onOpenSchedule?.('today')}
            onVisitTasksClick={() => onOpenSchedule?.('tasks')}
          />
        ) : null}
      </>
    );
  }

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
            days: upcomingDays,
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
            days: upcomingDays,
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
          onClick={() => onOpenSchedule?.('week')}
          onStartingSoonClick={() => onOpenSchedule?.('today')}
          onVisitTasksClick={() => onOpenSchedule?.('tasks')}
        />
      ) : null}
    </>
  );
}
