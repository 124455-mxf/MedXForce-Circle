/** @license SPDX-License-Identifier: Apache-2.0 */

import { ClipboardList } from 'lucide-react';
import {
  collectScheduleTaskBoard,
  SCHEDULE_TASKS_FOLLOWUP_CARD_LIMIT,
  SCHEDULE_TASKS_PREPARE_CARD_LIMIT,
  formatCareCalendarTimeRange,
  type AssessmentHistoryMap,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
  type CareCalendarMemberInviteContext,
  type ScheduleTaskAppointmentRow,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleTranslatedUserText } from './CircleTranslatedUserText';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { formatCircleDate, type CircleUiLanguage } from '../lib/circleLanguages';

type CircleScheduleTasksViewProps = {
  careEntries: CareCalendarEntry[];
  preferences: Record<string, unknown>;
  histories: AssessmentHistoryMap;
  memberRole?: string;
  inviteContext?: CareCalendarMemberInviteContext;
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAppointment: (dateKey: string, event: CareCalendarDayEvent) => void;
  compact?: boolean;
};

function formatAppointmentWhen(row: ScheduleTaskAppointmentRow, language: CircleUiLanguage): string {
  const dateLabel = formatCircleDate(new Date(`${row.dateKey}T12:00:00`), language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = formatCareCalendarTimeRange(row.event.startTimeMinutes, row.event.endTimeMinutes);
  return time ? `${dateLabel} · ${time}` : dateLabel;
}

function TaskSection({
  title,
  emptyLabel,
  rows,
  countLabel,
  onOpen,
  compact,
  accent = 'violet',
}: {
  title: string;
  emptyLabel: string;
  rows: ScheduleTaskAppointmentRow[];
  countLabel: (count: number) => string;
  onOpen: (row: ScheduleTaskAppointmentRow) => void;
  compact?: boolean;
  accent?: 'violet' | 'amber';
}) {
  const { language } = useCircleI18nContext();
  return (
    <section className="space-y-2">
      <h4
        className={cn(
          'font-bold text-slate-700 uppercase tracking-wide',
          compact ? 'text-[10px]' : 'text-xs',
        )}
      >
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className={cn('text-slate-400 py-3 text-center', compact ? 'text-xs' : 'text-sm')}>
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={`${row.entryId}-${row.dateKey}`}>
              <button
                type="button"
                onClick={() => onOpen(row)}
                className={cn(
                  'w-full text-left rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors',
                  accent === 'amber'
                    ? 'border-amber-100 hover:border-amber-200 hover:bg-amber-50/40'
                    : 'border-slate-100 hover:border-violet-200 hover:bg-violet-50/40',
                )}
              >
                <CircleTranslatedUserText
                  text={row.event.title}
                  className={cn('font-bold text-slate-800', compact ? 'text-sm' : 'text-base')}
                  showToggle={false}
                />
                <p className={cn('text-slate-500 mt-0.5', compact ? 'text-xs' : 'text-sm')}>
                  {formatAppointmentWhen(row, language)}
                </p>
                <p
                  className={cn(
                    'font-semibold mt-1.5',
                    compact ? 'text-xs' : 'text-sm',
                    accent === 'amber' ? 'text-amber-700' : 'text-violet-700',
                  )}
                >
                  {countLabel(row.totalOpen)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CircleScheduleTasksView({
  careEntries,
  preferences,
  histories,
  memberRole,
  inviteContext,
  t,
  onOpenAppointment,
  compact = false,
}: CircleScheduleTasksViewProps) {
  const { awaitingRows, preRows, postRows } = collectScheduleTaskBoard(careEntries, {
    preferences,
    histories,
    memberRole,
    inviteContext,
    preLimit: SCHEDULE_TASKS_PREPARE_CARD_LIMIT,
    postLimit: SCHEDULE_TASKS_FOLLOWUP_CARD_LIMIT,
  });
  const isEmpty = preRows.length === 0 && postRows.length === 0 && awaitingRows.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center py-10 px-4 text-center">
        <div className="p-3 rounded-2xl bg-violet-50 text-violet-600 mb-3">
          <ClipboardList size={compact ? 24 : 28} />
        </div>
        <p className={cn('font-bold text-slate-700', compact ? 'text-sm' : 'text-base')}>
          {t('schedulePage.views.tasksEmptyTitle')}
        </p>
        <p className={cn('text-slate-400 mt-1 max-w-sm', compact ? 'text-xs' : 'text-sm')}>
          {t('schedulePage.views.tasksEmptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-6 py-1 pb-4">
      {inviteContext ? (
        <TaskSection
          title={t('schedulePage.views.tasksAwaitingRsvp')}
          emptyLabel={t('schedulePage.views.tasksAwaitingRsvpEmpty')}
          rows={awaitingRows}
          countLabel={() => t('schedulePage.views.tasksAwaitingRsvpHint')}
          onOpen={(row) => onOpenAppointment(row.dateKey, row.event)}
          compact={compact}
          accent="amber"
        />
      ) : null}
      <TaskSection
        title={t('schedulePage.views.tasksPrepare')}
        emptyLabel={t('schedulePage.views.tasksPrepareEmpty')}
        rows={preRows}
        countLabel={(count) => t('schedulePage.views.tasksOpenPre', { count })}
        onOpen={(row) => onOpenAppointment(row.dateKey, row.event)}
        compact={compact}
      />
      <TaskSection
        title={t('schedulePage.views.tasksFollowUp')}
        emptyLabel={t('schedulePage.views.tasksFollowUpEmpty')}
        rows={postRows}
        countLabel={(count) => t('schedulePage.views.tasksOpenPost', { count })}
        onOpen={(row) => onOpenAppointment(row.dateKey, row.event)}
        compact={compact}
      />
    </div>
  );
}
