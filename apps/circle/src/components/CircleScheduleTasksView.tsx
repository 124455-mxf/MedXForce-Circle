/** @license SPDX-License-Identifier: Apache-2.0 */

import { ClipboardList } from 'lucide-react';
import {
  collectSchedulePostTaskRows,
  collectSchedulePreTaskRows,
  formatCareCalendarTimeRange,
  type AssessmentHistoryMap,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
  type ScheduleTaskAppointmentRow,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleScheduleTasksViewProps = {
  careEntries: CareCalendarEntry[];
  preferences: Record<string, unknown>;
  histories: AssessmentHistoryMap;
  memberRole?: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAppointment: (dateKey: string, event: CareCalendarDayEvent) => void;
  compact?: boolean;
};

function formatAppointmentWhen(row: ScheduleTaskAppointmentRow): string {
  const dateLabel = new Date(`${row.dateKey}T12:00:00`).toLocaleDateString(undefined, {
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
}: {
  title: string;
  emptyLabel: string;
  rows: ScheduleTaskAppointmentRow[];
  countLabel: (count: number) => string;
  onOpen: (row: ScheduleTaskAppointmentRow) => void;
  compact?: boolean;
}) {
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
                className="w-full text-left rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:border-violet-200 hover:bg-violet-50/40 transition-colors"
              >
                <p className={cn('font-bold text-slate-800', compact ? 'text-sm' : 'text-base')}>
                  {row.event.title}
                </p>
                <p className={cn('text-slate-500 mt-0.5', compact ? 'text-xs' : 'text-sm')}>
                  {formatAppointmentWhen(row)}
                </p>
                <p className={cn('text-violet-700 font-semibold mt-1.5', compact ? 'text-xs' : 'text-sm')}>
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
  t,
  onOpenAppointment,
  compact = false,
}: CircleScheduleTasksViewProps) {
  const preRows = collectSchedulePreTaskRows(careEntries, {
    preferences,
    histories,
    memberRole,
    limit: 5,
  });
  const postRows = collectSchedulePostTaskRows(careEntries, {
    preferences,
    histories,
    memberRole,
    limit: 3,
  });
  const isEmpty = preRows.length === 0 && postRows.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
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
    <div className="space-y-6 py-1">
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
