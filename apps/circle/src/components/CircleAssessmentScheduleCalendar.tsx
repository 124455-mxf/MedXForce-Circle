/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  assessmentScheduleDateKey,
  getAssessmentScheduleCalendar,
  getCalendarWeekDays,
  getCareCalendarByDay,
  formatCareCalendarTimeRange,
  parseCareCalendarDateKey,
  careCalendarDateKey,
  type AssessmentScheduleDayEvent,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
  type CareCalendarAppointmentTask,
} from '@medxforce/shared';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { CircleScheduleTodayView } from './CircleScheduleTodayView';
import {
  CircleScheduleAppointmentDetailSheet,
  type CircleScheduleAppointmentSelection,
} from './CircleScheduleWeekView';
import { CircleScheduleWeekView } from './CircleScheduleWeekView';
import { CircleScheduleSelectedDayDetailPanel } from './CircleScheduleSelectedDayDetailPanel';
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
  onAppointmentTasksChange?: (
    entryId: string,
    kind: CareCalendarDayEvent['kind'],
    tasks: CareCalendarAppointmentTask[],
  ) => void | Promise<void>;
  currentUserUid?: string;
  patientId?: string;
  db?: Firestore;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  compact?: boolean;
  hideHeader?: boolean;
  enableViewModes?: boolean;
};

type ScheduleViewMode = 'today' | 'week' | 'month';

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;
const VIEW_MODES: ScheduleViewMode[] = ['today', 'week', 'month'];
const EMPTY_ASSESSMENT_CALENDAR = new Map<string, AssessmentScheduleDayEvent[]>();

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
  onAppointmentTasksChange,
  currentUserUid,
  patientId,
  db,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  compact = false,
  hideHeader = false,
  enableViewModes = false,
}: CircleAssessmentScheduleCalendarProps) {
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const today = new Date();
  const todayKey = assessmentScheduleDateKey(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(enableViewModes ? 'today' : 'month');
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [appointmentSelection, setAppointmentSelection] =
    useState<CircleScheduleAppointmentSelection | null>(null);

  const rangeStart = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const rangeEnd = useMemo(() => new Date(viewYear, viewMonth + 1, 0), [viewYear, viewMonth]);

  const weekRangeStart = useMemo(() => getCalendarWeekDays(weekAnchor)[0]!, [weekAnchor]);
  const weekRangeEnd = useMemo(() => getCalendarWeekDays(weekAnchor)[6]!, [weekAnchor]);

  const todayRangeStart = useMemo(() => {
    const d = parseCareCalendarDateKey(selectedDateKey);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [selectedDateKey]);
  const todayRangeEnd = todayRangeStart;

  const activeRangeStart = enableViewModes
    ? viewMode === 'today'
      ? todayRangeStart
      : viewMode === 'week'
        ? weekRangeStart
        : rangeStart
    : rangeStart;
  const activeRangeEnd = enableViewModes
    ? viewMode === 'today'
      ? todayRangeEnd
      : viewMode === 'week'
        ? weekRangeEnd
        : rangeEnd
    : rangeEnd;

  const calendarByDay = useMemo(
    () =>
      getAssessmentScheduleCalendar(
        schedule.preferences,
        schedule.histories,
        activeRangeStart,
        activeRangeEnd,
        schedule.remoteAssessmentSchedule,
      ),
    [schedule, activeRangeStart, activeRangeEnd],
  );

  const careByDay = useMemo(
    () => getCareCalendarByDay(careEntries, activeRangeStart, activeRangeEnd),
    [careEntries, activeRangeStart, activeRangeEnd],
  );

  const monthCalendarByDay = useMemo(
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

  const monthCareByDay = useMemo(
    () => getCareCalendarByDay(careEntries, rangeStart, rangeEnd),
    [careEntries, rangeStart, rangeEnd],
  );

  const monthCells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const assessmentsEnabled = schedule.preferences.featuresVisibility.healthAssessments;
  const visibleCalendarByDay = assessmentsEnabled ? calendarByDay : EMPTY_ASSESSMENT_CALENDAR;
  const visibleMonthCalendarByDay = assessmentsEnabled ? monthCalendarByDay : EMPTY_ASSESSMENT_CALENDAR;

  const selectedEvents = visibleMonthCalendarByDay.get(selectedDateKey) ?? [];
  const selectedCareEvents = monthCareByDay.get(selectedDateKey) ?? [];
  const dayCareEvents = careByDay.get(selectedDateKey) ?? [];
  const dayAssessmentEvents = visibleCalendarByDay.get(selectedDateKey) ?? [];
  const hasAnyEvents = visibleMonthCalendarByDay.size > 0 || monthCareByDay.size > 0;

  const weekDayKeys = useMemo(
    () => getCalendarWeekDays(weekAnchor).map((d) => careCalendarDateKey(d)),
    [weekAnchor],
  );

  useEffect(() => {
    if (viewMode !== 'week') return;
    setSelectedDateKey((current) => {
      if (weekDayKeys.includes(current)) return current;
      if (weekDayKeys.includes(todayKey)) return todayKey;
      return weekDayKeys[0] ?? current;
    });
  }, [viewMode, weekAnchor, weekDayKeys, todayKey]);

  const weekDetailCareEvents = useMemo(() => {
    return [...(careByDay.get(selectedDateKey) ?? [])].sort(
      (a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0),
    );
  }, [careByDay, selectedDateKey]);

  const weekDetailAssessmentEvents = visibleCalendarByDay.get(selectedDateKey) ?? [];

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const shiftWeek = (delta: number) => {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + delta * 7);
    setWeekAnchor(next);
  };

  const shiftDay = (delta: number) => {
    const next = parseCareCalendarDateKey(selectedDateKey);
    next.setDate(next.getDate() + delta);
    setSelectedDateKey(careCalendarDateKey(next));
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const dayLabel = new Date(selectedDateKey + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const addDateKey = selectedDateKey;

  const weekDays = useMemo(() => getCalendarWeekDays(weekAnchor), [weekAnchor]);
  const weekLabel = `${weekDays[0].toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${weekDays[6].toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
  const isCurrentWeek = weekDays.some((day) => assessmentScheduleDateKey(day) === todayKey);

  const viewModeSelector = enableViewModes ? (
    <div className="flex w-full rounded-xl border border-slate-100 p-0.5 bg-slate-50 shrink-0">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          className={cn(
            'flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs font-bold leading-none whitespace-nowrap text-center transition-colors',
            viewMode === mode
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {t(`schedulePage.views.${mode}`)}
        </button>
      ))}
    </div>
  ) : null;

  const dateNavButtonClass =
    'shrink-0 p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50';
  const dateNavLabelClass =
    'flex-1 min-w-0 px-1 text-xs font-bold text-slate-700 text-center truncate';
  const dateNavJumpClass =
    'shrink-0 px-2.5 py-1.5 rounded-xl border border-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap';

  const dateNavigation = enableViewModes ? (
    <div className="flex flex-row items-center justify-center gap-1 w-full min-w-0">
      {viewMode === 'today' && (
        <>
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className={dateNavButtonClass}
            aria-label={t('schedulePage.views.prevDay')}
          >
            <ChevronLeft size={18} />
          </button>
          {selectedDateKey !== todayKey ? (
            <button
              type="button"
              onClick={() => setSelectedDateKey(todayKey)}
              className={dateNavJumpClass}
            >
              {t('schedulePage.views.goToday')}
            </button>
          ) : null}
          <span className={dateNavLabelClass}>{dayLabel}</span>
          <button
            type="button"
            onClick={() => shiftDay(1)}
            className={dateNavButtonClass}
            aria-label={t('schedulePage.views.nextDay')}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
      {viewMode === 'month' && (
        <>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className={dateNavButtonClass}
            aria-label={t('dashboard.assessmentScheduleCalendar.prevMonth')}
          >
            <ChevronLeft size={18} />
          </button>
          <span className={dateNavLabelClass}>{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className={dateNavButtonClass}
            aria-label={t('dashboard.assessmentScheduleCalendar.nextMonth')}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
      {viewMode === 'week' && (
        <>
          {!isCurrentWeek ? (
            <button
              type="button"
              onClick={() => setWeekAnchor(today)}
              className={dateNavJumpClass}
            >
              {t('schedulePage.views.thisWeek')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className={dateNavButtonClass}
            aria-label={t('schedulePage.views.prevWeek')}
          >
            <ChevronLeft size={18} />
          </button>
          <span className={dateNavLabelClass}>{weekLabel}</span>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className={dateNavButtonClass}
            aria-label={t('schedulePage.views.nextWeek')}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  ) : null;

  if (!enableViewModes) {
    return (
      <div
        className={cn(
          'h-full min-h-0 rounded-2xl border border-slate-100 bg-white flex flex-col overflow-hidden',
          compact ? 'p-3 sm:p-4' : 'p-5',
        )}
      >
        <div className={cn('shrink-0 flex items-start justify-between gap-2', hideHeader ? 'mb-2' : 'mb-3')}>
          {!hideHeader ? (
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
          ) : (
            <div className="min-w-0" />
          )}
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
          <MonthCalendarBody
            compact={compact}
            t={t}
            monthCells={monthCells}
            monthCalendarByDay={visibleMonthCalendarByDay}
            monthCareByDay={monthCareByDay}
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            selectedCareEvents={selectedCareEvents}
            selectedEvents={selectedEvents}
            onSelectDate={setSelectedDateKey}
            onEditAppointment={onEditAppointment}
            onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
            onSelectAppointment={setAppointmentSelection}
          />
        )}

        {appointmentSelection ? (
          <CircleScheduleAppointmentDetailSheet
            selection={appointmentSelection}
            ct={ct}
            t={t}
            onClose={() => setAppointmentSelection(null)}
            onEdit={
              onEditAppointment
                ? () => {
                    const entryId = appointmentSelection.event.entryId;
                    setAppointmentSelection(null);
                    onEditAppointment(entryId);
                  }
                : undefined
            }
            onAppointmentTasksChange={onAppointmentTasksChange}
            currentUserUid={currentUserUid}
            patientId={patientId}
            db={db}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            assessmentSchedule={assessmentsEnabled ? schedule : undefined}
            onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full min-h-0 rounded-2xl border border-slate-100 bg-white flex flex-col overflow-hidden p-5 space-y-4',
        viewMode === 'week' && 'min-h-0 tablet-portrait:min-h-0',
      )}
    >
      <div
        className={cn(
          'shrink-0 space-y-2',
          viewMode === 'week' && 'border-b border-slate-100 pb-3',
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">{viewModeSelector}</div>
          {onAddAppointment && (
            <button
              type="button"
              onClick={() => onAddAppointment(addDateKey)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700"
            >
              <Plus size={16} />
              {ct('addShort')}
            </button>
          )}
        </div>
        {dateNavigation}
      </div>

      {viewMode === 'today' && (
        <CircleScheduleTodayView
          dateKey={selectedDateKey}
          isActualToday={selectedDateKey === todayKey}
          careEvents={dayCareEvents}
          assessmentEvents={dayAssessmentEvents}
          t={t}
          assessmentLabel={(event) => assessmentLabel(event, t)}
          onEditAppointment={onEditAppointment}
          onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
          onAppointmentTasksChange={onAppointmentTasksChange}
          db={db}
          patientId={patientId}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          currentUserUid={currentUserUid}
          assessmentSchedule={assessmentsEnabled ? schedule : undefined}
        />
      )}

      {viewMode === 'week' && (
        <>
          <CircleScheduleWeekView
            weekAnchor={weekAnchor}
            calendarByDay={visibleCalendarByDay}
            careByDay={careByDay}
            todayKey={todayKey}
            selectedDayDateKey={selectedDateKey}
            onSelectedDayChange={setSelectedDateKey}
            preferences={schedule.preferences}
            histories={schedule.histories}
            t={t}
            onEditAppointment={onEditAppointment}
            onAppointmentTasksChange={onAppointmentTasksChange}
            currentUserUid={currentUserUid}
            patientId={patientId}
            db={db}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            assessmentSchedule={assessmentsEnabled ? schedule : undefined}
            onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
          />
          <CircleScheduleSelectedDayDetailPanel
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            careEvents={weekDetailCareEvents}
            assessmentEvents={weekDetailAssessmentEvents}
            t={t}
            assessmentLabel={(event) => assessmentLabel(event, t)}
            onOpenAppointment={(event) =>
              setAppointmentSelection({ dateKey: selectedDateKey, event })
            }
            onEditAppointment={onEditAppointment}
            onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
            assessmentSchedule={assessmentsEnabled ? schedule : undefined}
            db={db}
            patientId={patientId}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            currentUserUid={currentUserUid}
            className="shrink-0 mt-3 tablet-portrait:mt-2 tablet-portrait:flex-1 tablet-portrait:min-h-0 tablet-portrait:overflow-y-auto"
          />
        </>
      )}

      {viewMode === 'month' && !hasAnyEvents ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <p className="text-sm text-slate-400 text-center">
            {t('dashboard.assessmentScheduleCalendar.emptyMonth')}
          </p>
          {onAddAppointment && (
            <button
              type="button"
              onClick={() => onAddAppointment(selectedDateKey)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700"
            >
              <Plus size={16} />
              {ct('addShort')}
            </button>
          )}
        </div>
      ) : viewMode === 'month' ? (
        <MonthCalendarBody
          compact={false}
          t={t}
          monthCells={monthCells}
          monthCalendarByDay={visibleMonthCalendarByDay}
          monthCareByDay={monthCareByDay}
          selectedDateKey={selectedDateKey}
          todayKey={todayKey}
          selectedCareEvents={selectedCareEvents}
          selectedEvents={selectedEvents}
          onSelectDate={setSelectedDateKey}
          onEditAppointment={onEditAppointment}
          onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
          onSelectAppointment={setAppointmentSelection}
          fullSize
        />
      ) : null}

      {appointmentSelection ? (
        <CircleScheduleAppointmentDetailSheet
          selection={appointmentSelection}
          ct={ct}
          t={t}
          onClose={() => setAppointmentSelection(null)}
          onEdit={
            onEditAppointment
              ? () => {
                  const entryId = appointmentSelection.event.entryId;
                  setAppointmentSelection(null);
                  onEditAppointment(entryId);
                }
              : undefined
          }
          onAppointmentTasksChange={onAppointmentTasksChange}
          currentUserUid={currentUserUid}
          patientId={patientId}
          db={db}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          assessmentSchedule={assessmentsEnabled ? schedule : undefined}
          onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
        />
      ) : null}
    </div>
  );
}

function MonthCalendarBody({
  compact,
  fullSize = false,
  t,
  monthCells,
  monthCalendarByDay,
  monthCareByDay,
  selectedDateKey,
  todayKey,
  selectedCareEvents,
  selectedEvents,
  onSelectDate,
  onEditAppointment,
  onOpenAssessment,
  onSelectAppointment,
}: {
  compact: boolean;
  fullSize?: boolean;
  t: CircleAssessmentScheduleCalendarProps['t'];
  monthCells: (Date | null)[];
  monthCalendarByDay: Map<string, AssessmentScheduleDayEvent[]>;
  monthCareByDay: Map<string, CareCalendarDayEvent[]>;
  selectedDateKey: string;
  todayKey: string;
  selectedCareEvents: CareCalendarDayEvent[];
  selectedEvents: AssessmentScheduleDayEvent[];
  onSelectDate: (dateKey: string) => void;
  onEditAppointment?: (entryId: string) => void;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onSelectAppointment?: (selection: CircleScheduleAppointmentSelection) => void;
}) {
  return (
    <>
      <div className="shrink-0 -mx-0.5 px-0.5">
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAY_KEYS.map((day) => (
            <div
              key={day}
              className={cn(
                'font-bold text-slate-400 uppercase tracking-wider py-0.5',
                fullSize ? 'text-[10px]' : 'text-[9px]',
              )}
            >
              {weekdayLabel(t, day)}
            </div>
          ))}
          {monthCells.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`pad-${index}`}
                  className={compact ? 'min-h-[2rem]' : fullSize ? 'min-h-[3rem]' : 'min-h-[2.75rem]'}
                />
              );
            }
            const dateKey = assessmentScheduleDateKey(date);
            const events = monthCalendarByDay.get(dateKey) ?? [];
            const careEvents = monthCareByDay.get(dateKey) ?? [];
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
                onClick={() => onSelectDate(dateKey)}
                className={cn(
                  'rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors',
                  compact ? 'min-h-[2rem] py-0.5' : fullSize ? 'min-h-[3rem] py-1' : 'min-h-[2.75rem] py-1',
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
                    'font-bold flex items-center justify-center rounded-full',
                    fullSize ? 'text-sm w-7 h-7' : 'text-[11px] w-5 h-5',
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

      <div
        className={cn(
          'flex-1 min-h-0 mt-2 pt-2 border-t border-slate-100 rounded-xl bg-slate-50 space-y-1.5 overflow-y-auto overscroll-contain',
          fullSize ? 'p-3' : 'p-2.5',
        )}
      >
        <p
          className={cn(
            'font-bold text-slate-500 uppercase tracking-wider',
            fullSize ? 'text-xs' : 'text-[10px]',
          )}
        >
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
                onOpen={
                  onSelectAppointment
                    ? () => onSelectAppointment({ dateKey: selectedDateKey, event })
                    : undefined
                }
                onEdit={() => onEditAppointment?.(event.entryId)}
                fullSize={fullSize}
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
                    <p className={cn('font-semibold text-slate-800 truncate', fullSize ? 'text-sm' : 'text-xs')}>
                      {assessmentLabel(event, t)}
                    </p>
                    <p
                      className={cn(
                        'font-bold uppercase tracking-wider',
                        fullSize ? 'text-[10px]' : 'text-[9px]',
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
                      className={cn(
                        'shrink-0 font-bold text-blue-600 hover:text-blue-700',
                        fullSize ? 'text-xs' : 'text-[10px]',
                      )}
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
          <p className={cn('text-slate-400', fullSize ? 'text-sm' : 'text-xs')}>
            {t('dashboard.assessmentScheduleCalendar.noAssessmentsDay')}
          </p>
        )}
      </div>
    </>
  );
}

function CareAppointmentListItem({
  event,
  t,
  onOpen,
  onEdit,
  fullSize = false,
}: {
  event: CareCalendarDayEvent;
  t: CircleAssessmentScheduleCalendarProps['t'];
  onOpen?: () => void;
  onEdit?: () => void;
  fullSize?: boolean;
}) {
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);
  const timeLabel = formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes);

  return (
    <li className="rounded-lg bg-violet-50/80 border border-violet-100 px-2 py-1.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className={cn(
            'flex-1 min-w-0 text-left rounded-md -m-0.5 p-0.5',
            onOpen ? 'hover:bg-violet-100/60 transition-colors' : '',
          )}
        >
          <p className={cn('font-semibold text-slate-800 truncate', fullSize ? 'text-sm' : 'text-xs')}>
            {event.title}
          </p>
          <p
            className={cn(
              'font-bold uppercase tracking-wider text-violet-700',
              fullSize ? 'text-[10px]' : 'text-[9px]',
            )}
          >
            {ct(`kinds.${event.kind}`)}
            {event.visitSubtype ? ` · ${ct(`visitSubtype.${event.visitSubtype}`)}` : ''}
            {event.source === 'circle' ? ` · ${ct('fromCircle')}` : ''}
          </p>
          {timeLabel && (
            <p className={cn('text-slate-500', fullSize ? 'text-xs' : 'text-[10px]')}>{timeLabel}</p>
          )}
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              'shrink-0 font-bold text-violet-700 hover:text-violet-800',
              fullSize ? 'text-xs' : 'text-[10px]',
            )}
          >
            {t('common.edit')}
          </button>
        )}
      </div>
      {event.details && (
        <p className={cn('text-slate-600 line-clamp-2', fullSize ? 'text-xs' : 'text-[10px]')}>
          {event.details}
        </p>
      )}
      {event.address && <CircleCareCalendarMapsLinks address={event.address} ct={ct} />}
    </li>
  );
}
