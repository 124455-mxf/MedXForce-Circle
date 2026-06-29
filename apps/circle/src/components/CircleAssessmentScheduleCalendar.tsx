/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
import {
  assessmentScheduleDateKey,
  getAssessmentScheduleCalendar,
  getCareCalendarByDay,
  buildAppleMapsUrl,
  formatCareCalendarTimeRange,
  type AssessmentScheduleDayEvent,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
} from '@medxforce/shared';
import type { AnalyticsMetricId } from '@medxforce/shared';
import {
  assessmentScheduleIdToAnalyticsMetric,
  type CircleAssessmentScheduleContext,
} from '../lib/circleAssessmentScheduleMetrics';
import { cn } from '../lib/utils';

type CircleAssessmentScheduleCalendarProps = {
  schedule: CircleAssessmentScheduleContext;
  careEntries?: CareCalendarEntry[];
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onAddAppointment?: (dateKey?: string) => void;
  onEditAppointment?: (entryId: string) => void;
  compact?: boolean;
};

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekdayLabel(
  t: CircleAssessmentScheduleCalendarProps['t'],
  day: number,
): string {
  return t(`remoteSettings.assessmentSchedule.weekdayShort.${day}`);
}

function daySummary(events: AssessmentScheduleDayEvent[]): {
  due: number;
  upcoming: number;
  completed: number;
} {
  return {
    due: events.filter((e) => e.status === 'due').length,
    upcoming: events.filter((e) => e.status === 'upcoming').length,
    completed: events.filter((e) => e.status === 'completed').length,
  };
}

function assessmentLabel(
  event: AssessmentScheduleDayEvent,
  t: CircleAssessmentScheduleCalendarProps['t'],
): string {
  const metricId = assessmentScheduleIdToAnalyticsMetric(event.id);
  if (metricId) return t(`analytics.metrics.${metricId}`);
  return t(`remoteSettings.assessmentSchedule.items.${event.id}`);
}

export function CircleAssessmentScheduleCalendar({
  schedule,
  careEntries = [],
  t,
  onOpenAssessment,
  onAddAppointment,
  onEditAppointment,
  compact = false,
}: CircleAssessmentScheduleCalendarProps) {
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const today = new Date();
  const todayKey = assessmentScheduleDateKey(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const rangeStart = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const rangeEnd = useMemo(() => new Date(viewYear, viewMonth + 1, 0), [viewYear, viewMonth]);

  const calendarByDay = useMemo(
    () =>
      getAssessmentScheduleCalendar(
        schedule.preferences,
        schedule.histories,
        rangeStart,
        rangeEnd,
        schedule.remoteAssessmentSchedule,
      ),
    [schedule, rangeStart, rangeEnd],
  );

  const careByDay = useMemo(
    () => getCareCalendarByDay(careEntries, rangeStart, rangeEnd),
    [careEntries, rangeStart, rangeEnd],
  );

  const monthCells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedEvents = calendarByDay.get(selectedDateKey) ?? [];
  const selectedCareEvents = careByDay.get(selectedDateKey) ?? [];
  const hasAnyEvents = calendarByDay.size > 0 || careByDay.size > 0;

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  if (!schedule.preferences.featuresVisibility.healthAssessments) return null;

  return (
    <div
      className={cn(
        'h-full min-h-0 rounded-2xl border border-slate-100 bg-white flex flex-col overflow-hidden',
        compact ? 'p-3 sm:p-4' : 'p-5',
      )}
    >
      <div className="shrink-0 flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={compact ? 16 : 18} className="text-blue-600 shrink-0" />
          <div className="min-w-0">
            <p className={cn('font-bold text-slate-800 truncate', compact ? 'text-sm' : 'text-base')}>
              {t('dashboard.assessmentScheduleCalendar.title')}
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('dashboard.assessmentScheduleCalendar.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onAddAppointment && (
            <button
              type="button"
              onClick={() => onAddAppointment(selectedDateKey)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700"
            >
              <Plus size={14} />
              {ct('addShort')}
            </button>
          )}
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50"
            aria-label={t('dashboard.assessmentScheduleCalendar.prevMonth')}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[11px] font-bold text-slate-600 min-w-[6.5rem] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50"
            aria-label={t('dashboard.assessmentScheduleCalendar.nextMonth')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {!hasAnyEvents ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
          <p className="text-xs text-slate-400 text-center">
            {t('dashboard.assessmentScheduleCalendar.emptyMonth')}
          </p>
          {onAddAppointment && (
            <button
              type="button"
              onClick={() => onAddAppointment(selectedDateKey)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700"
            >
              <Plus size={14} />
              {ct('addShort')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-0.5 px-0.5">
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAY_KEYS.map((day) => (
                <div
                  key={day}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-wider py-0.5"
                >
                  {weekdayLabel(t, day)}
                </div>
              ))}
              {monthCells.map((date, index) => {
                if (!date) {
                  return (
                    <div key={`pad-${index}`} className={compact ? 'min-h-[2rem]' : 'min-h-[2.75rem]'} />
                  );
                }
                const dateKey = assessmentScheduleDateKey(date);
                const events = calendarByDay.get(dateKey) ?? [];
                const careEvents = careByDay.get(dateKey) ?? [];
                const summary = daySummary(events);
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDateKey;
                const hasDue = summary.due > 0;
                const hasCare = careEvents.length > 0;
                const hasAssessments = events.length > 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={cn(
                      'rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors',
                      compact ? 'min-h-[2rem] py-0.5' : 'min-h-[2.75rem] py-1',
                      !hasAssessments && !hasCare
                        ? 'border-transparent text-slate-300'
                        : hasCare
                          ? 'border-violet-200 bg-violet-50/70 hover:bg-violet-50'
                          : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/40',
                      isSelected && hasCare && 'ring-1 ring-violet-300/70 border-violet-300',
                      isSelected && !hasCare && 'border-blue-300 bg-blue-50/70 ring-1 ring-blue-200/60',
                      isToday && !isSelected && (hasCare ? 'border-violet-300' : 'border-blue-200'),
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full',
                        isToday && 'bg-blue-600 text-white',
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {(hasAssessments || hasCare) && (
                      <div className="flex gap-0.5">
                        {hasCare && <span className="w-1 h-1 rounded-full bg-violet-500" />}
                        {summary.due > 0 && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                        {summary.upcoming > 0 && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                        {summary.completed > 0 && !hasDue && summary.upcoming === 0 && (
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 mt-2 pt-2 border-t border-slate-100 rounded-xl bg-slate-50 p-2.5 space-y-1.5 max-h-[8.5rem] overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t('dashboard.assessmentScheduleCalendar.dayDetail', {
                date: new Date(selectedDateKey + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                }),
              })}
            </p>
            {selectedCareEvents.length > 0 && (
              <ul className="space-y-1">
                {selectedCareEvents.map((event) => (
                  <CareAppointmentListItem
                    key={`${event.entryId}-${selectedDateKey}`}
                    event={event}
                    t={t}
                    onEdit={() => onEditAppointment?.(event.entryId)}
                  />
                ))}
              </ul>
            )}
            {selectedEvents.length > 0 && (
              <ul className="space-y-1">
                {selectedEvents.map((event) => {
                  const metricId = assessmentScheduleIdToAnalyticsMetric(event.id);
                  return (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-100 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {assessmentLabel(event, t)}
                        </p>
                        <p
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider',
                            event.status === 'due' && 'text-rose-600',
                            event.status === 'upcoming' && 'text-amber-600',
                            event.status === 'completed' && 'text-emerald-600',
                          )}
                        >
                          {t(`dashboard.assessmentScheduleCalendar.status.${event.status}`)}
                        </p>
                      </div>
                      {metricId && onOpenAssessment && event.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => onOpenAssessment(metricId)}
                          className="shrink-0 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          {t('dashboard.assessmentScheduleCalendar.view')}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedEvents.length === 0 && selectedCareEvents.length === 0 && (
              <p className="text-xs text-slate-400">
                {t('dashboard.assessmentScheduleCalendar.noAssessmentsDay')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CareAppointmentListItem({
  event,
  t,
  onEdit,
}: {
  event: CareCalendarDayEvent;
  t: CircleAssessmentScheduleCalendarProps['t'];
  onEdit?: () => void;
}) {
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);
  const timeLabel = formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes);
  const mapsUrl = event.address ? buildAppleMapsUrl(event.address) : null;

  return (
    <li className="rounded-lg bg-violet-50/80 border border-violet-100 px-2 py-1.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{event.title}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700">
            {ct(`kinds.${event.kind}`)}
            {event.source === 'circle' ? ` · ${ct('fromCircle')}` : ''}
          </p>
          {timeLabel && <p className="text-[10px] text-slate-500">{timeLabel}</p>}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-[10px] font-bold text-violet-700 hover:text-violet-800"
          >
            {t('common.edit')}
          </button>
        )}
      </div>
      {event.details && <p className="text-[10px] text-slate-600 line-clamp-2">{event.details}</p>}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 hover:underline"
        >
          <MapPin size={12} />
          {event.address?.label || ct('openMaps')}
        </a>
      )}
    </li>
  );
}
