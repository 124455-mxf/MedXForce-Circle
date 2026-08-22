/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  assessmentScheduleDateKey,
  getAssessmentScheduleCalendar,
  getCalendarWeekDays,
  getCareCalendarByDay,
  isCareCalendarInternalMeeting,
  isScheduleEnabled,
  parseCareCalendarDateKey,
  careCalendarDateKey,
  normalizeMemberRole,
  countScheduleTabBadge,
  type AssessmentScheduleDayEvent,
  type CareCalendarDayEvent,
  type CareCalendarEntry,
  type CareCalendarAppointmentTask,
  type CareCalendarVisitDebrief,
} from '@medxforce/shared';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { CircleScheduleTodayView, CircleScheduleDayAppointmentCard } from './CircleScheduleTodayView';
import { CircleScheduleTasksView } from './CircleScheduleTasksView';
import {
  CircleScheduleAppointmentDetailSheet,
  resolveCircleScheduleAppointmentSelection,
  type CircleScheduleAppointmentSelection,
} from './CircleScheduleWeekView';
import { CircleScheduleWeekView } from './CircleScheduleWeekView';
import type { AnalyticsMetricId } from '@medxforce/shared';
import {
  assessmentScheduleIdToAnalyticsMetric,
  type CircleAssessmentScheduleContext,
} from '../lib/circleAssessmentScheduleMetrics';
import { cn } from '../lib/utils';
import { circleHeaderActionButtonClass } from '../lib/circleSectionStyles';
import { useCircleScheduleDefaultView } from '../hooks/useCircleScheduleDefaultView';
import { useCircleScheduleShowAppointmentDetails } from '../hooks/useCircleScheduleShowAppointmentDetails';
import { getCircleScheduleDefaultView } from '../lib/circleSchedulePreferences';
import type { CircleScheduleViewIntent } from '../lib/circleSchedulePreferences';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { formatCircleDate } from '../lib/circleLanguages';

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
  onClinicalReferenceIdsChange?: (
    entryId: string,
    kind: CareCalendarDayEvent['kind'],
    ids: string[],
  ) => void | Promise<void>;
  onManageClinicalReferences?: () => void;
  onVisitDebriefChange?: (
    entryId: string,
    kind: CareCalendarDayEvent['kind'],
    debrief: CareCalendarVisitDebrief,
  ) => void | Promise<void>;
  currentUserUid?: string;
  currentUserName?: string;
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
  hideInlineAddButton?: boolean;
  onRecordVisit?: (entryId: string) => void;
  /** Called with the Tasks-screen card count so header / nav can stay in sync. */
  onOpenCountChange?: (count: number) => void;
  viewIntent?: CircleScheduleViewIntent | null;
};

type ScheduleViewMode = 'today' | 'week' | 'month' | 'tasks';

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;
const VIEW_MODES: ScheduleViewMode[] = ['today', 'week', 'month', 'tasks'];
const EMPTY_ASSESSMENT_CALENDAR = new Map<string, AssessmentScheduleDayEvent[]>();

function hideEmptyMonthPrompt(memberRole?: string): boolean {
  const role = memberRole ? normalizeMemberRole(memberRole) : null;
  return role === 'proxy' || role === 'caregiver' || role === 'professional_caregiver';
}

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
  onClinicalReferenceIdsChange,
  onManageClinicalReferences,
  onVisitDebriefChange,
  currentUserUid,
  currentUserName,
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
  hideInlineAddButton = false,
  onRecordVisit,
  onOpenCountChange,
  viewIntent = null,
}: CircleAssessmentScheduleCalendarProps) {
  const { language } = useCircleI18nContext();
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);
  const skipEmptyMonthPrompt = hideEmptyMonthPrompt(memberRole);

  const today = new Date();
  const todayKey = assessmentScheduleDateKey(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const defaultScheduleView = useCircleScheduleDefaultView();
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(() => {
    if (enableViewModes && viewIntent === 'tasks') return 'tasks';
    return enableViewModes ? getCircleScheduleDefaultView() : 'month';
  });
  const appliedViewIntentRef = useRef(viewIntent === 'tasks');
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [appointmentSelection, setAppointmentSelection] =
    useState<CircleScheduleAppointmentSelection | null>(null);

  useEffect(() => {
    if (!enableViewModes) return;
    if (viewIntent === 'tasks') {
      if (!appliedViewIntentRef.current) {
        appliedViewIntentRef.current = true;
        setViewMode('tasks');
      }
      return;
    }
    setViewMode(defaultScheduleView);
  }, [defaultScheduleView, enableViewModes, viewIntent]);

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

  const resolvedAppointmentSelection = useMemo(() => {
    if (!appointmentSelection) return null;
    const dayEvents =
      (viewMode === 'month' ? monthCareByDay : careByDay).get(appointmentSelection.dateKey) ?? [];
    return resolveCircleScheduleAppointmentSelection(appointmentSelection, dayEvents);
  }, [appointmentSelection, careByDay, monthCareByDay, viewMode]);

  const monthCells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const assessmentsEnabled = isScheduleEnabled(schedule.preferences);
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

  const monthLabel = formatCircleDate(new Date(viewYear, viewMonth, 1), language, {
    month: 'long',
    year: 'numeric',
  });

  const dayLabel = formatCircleDate(new Date(selectedDateKey + 'T12:00:00'), language, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const addDateKey = selectedDateKey;

  const weekDays = useMemo(() => getCalendarWeekDays(weekAnchor), [weekAnchor]);
  const weekLabel = `${formatCircleDate(weekDays[0], language, {
    month: 'short',
    day: 'numeric',
  })} – ${formatCircleDate(weekDays[6], language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
  const isCurrentWeek = weekDays.some((day) => assessmentScheduleDateKey(day) === todayKey);
  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const goToCurrentMonth = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateKey(todayKey);
  };

  const inviteContextForBadge = useMemo(
    () =>
      currentUserUid
        ? {
            memberUid: currentUserUid,
            contactId: memberContactId,
            memberDocContactId,
            inviteContactId,
            displayName: memberDisplayName,
          }
        : undefined,
    [
      currentUserUid,
      inviteContactId,
      memberContactId,
      memberDisplayName,
      memberDocContactId,
    ],
  );

  const tasksBadgeCount = useMemo(() => {
    return countScheduleTabBadge(careEntries, {
      inviteContext: inviteContextForBadge,
      memberRole: memberRole ?? 'friend',
      viewerUid: currentUserUid,
      preferences: schedule.preferences,
      histories: schedule.histories,
    });
  }, [
    careEntries,
    currentUserUid,
    inviteContextForBadge,
    memberRole,
    schedule.histories,
    schedule.preferences,
  ]);

  useEffect(() => {
    onOpenCountChange?.(tasksBadgeCount);
  }, [onOpenCountChange, tasksBadgeCount]);

  const viewModeSelector = enableViewModes ? (
    <div className="flex w-full rounded-2xl border border-slate-100 p-1.5 bg-slate-100 shrink-0">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          className={cn(
            'relative flex flex-1 min-w-0 items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm font-bold leading-none whitespace-nowrap text-center transition-colors',
            viewMode === mode
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <span>{t(`schedulePage.views.${mode === 'today' ? 'day' : mode}`)}</span>
          {mode === 'tasks' && tasksBadgeCount > 0 ? (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
              {formatCircleBadgeCount(tasksBadgeCount)}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  ) : null;

  const dateNavButtonClass =
    'shrink-0 p-2.5 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50';
  const dateNavLabelClass =
    'flex-1 min-w-0 px-1 text-sm sm:text-base font-bold text-slate-700 text-center truncate';
  const dateNavJumpClass =
    'shrink-0 px-3 py-2 rounded-xl border border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap';

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
            <ChevronLeft size={20} />
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
            <ChevronRight size={20} />
          </button>
        </>
      )}
      {viewMode === 'month' && (
        <>
          {!isCurrentMonth ? (
            <button
              type="button"
              onClick={goToCurrentMonth}
              className={dateNavJumpClass}
            >
              {t('schedulePage.views.thisMonth')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className={dateNavButtonClass}
            aria-label={t('dashboard.assessmentScheduleCalendar.prevMonth')}
          >
            <ChevronLeft size={20} />
          </button>
          <span className={dateNavLabelClass}>{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className={dateNavButtonClass}
            aria-label={t('dashboard.assessmentScheduleCalendar.nextMonth')}
          >
            <ChevronRight size={20} />
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
            <ChevronLeft size={20} />
          </button>
          <span className={dateNavLabelClass}>{weekLabel}</span>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className={dateNavButtonClass}
            aria-label={t('schedulePage.views.nextWeek')}
          >
            <ChevronRight size={20} />
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
                className={circleHeaderActionButtonClass}
                aria-label={ct('addTitle')}
                title={ct('addTitle')}
              >
                <Plus size={18} className="[@media(max-height:740px)]:size-4" />
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

        {!hasAnyEvents && !skipEmptyMonthPrompt ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4">
            <p className="text-xs text-slate-400 text-center">
              {t('dashboard.assessmentScheduleCalendar.emptyMonth')}
            </p>
            {onAddAppointment && (
              <button
                type="button"
                onClick={() => onAddAppointment(selectedDateKey)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
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
            assessmentSchedule={schedule}
            onRecordVisit={onRecordVisit}
            db={db}
            patientId={patientId}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            currentUserUid={currentUserUid}
          />
        )}

        {resolvedAppointmentSelection ? (
          <CircleScheduleAppointmentDetailSheet
            selection={resolvedAppointmentSelection}
            ct={ct}
            t={t}
            onClose={() => setAppointmentSelection(null)}
            onEdit={
              onEditAppointment
                ? () => {
                    const entryId = resolvedAppointmentSelection.event.entryId;
                    setAppointmentSelection(null);
                    onEditAppointment(entryId);
                  }
                : undefined
            }
            onAppointmentTasksChange={onAppointmentTasksChange}
            onClinicalReferenceIdsChange={onClinicalReferenceIdsChange}
            onManageClinicalReferences={onManageClinicalReferences}
            onVisitDebriefChange={onVisitDebriefChange}
            currentUserUid={currentUserUid}
            currentUserName={currentUserName}
            patientId={patientId}
            db={db}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            assessmentSchedule={schedule}
            onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
            onRecordVisit={onRecordVisit}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full min-h-0 flex flex-col',
        viewMode === 'month'
          ? 'overflow-y-auto overscroll-contain'
          : 'overflow-hidden',
        enableViewModes
          ? 'px-4 pb-4 space-y-4'
          : 'rounded-2xl border border-slate-100 bg-white p-5 space-y-4',
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
          {onAddAppointment && !hideInlineAddButton && (
            <button
              type="button"
              onClick={() => onAddAppointment(addDateKey)}
              className={circleHeaderActionButtonClass}
              aria-label={ct('addTitle')}
              title={ct('addTitle')}
            >
              <Plus size={18} className="[@media(max-height:740px)]:size-4" />
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
          onClinicalReferenceIdsChange={onClinicalReferenceIdsChange}
          onManageClinicalReferences={onManageClinicalReferences}
          onVisitDebriefChange={onVisitDebriefChange}
          db={db}
          patientId={patientId}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          currentUserUid={currentUserUid}
          currentUserName={currentUserName}
          assessmentSchedule={schedule}
          onRecordVisit={onRecordVisit}
        />
      )}

      {viewMode === 'tasks' && (
        <CircleScheduleTasksView
          careEntries={careEntries}
          preferences={schedule.preferences}
          histories={schedule.histories}
          memberRole={memberRole}
          inviteContext={
            currentUserUid
              ? {
                  memberUid: currentUserUid,
                  contactId: memberContactId,
                  memberDocContactId,
                  inviteContactId,
                  displayName: memberDisplayName,
                }
              : undefined
          }
          t={t}
          compact={compact}
          onOpenAppointment={(dateKey, event) => {
            setSelectedDateKey(dateKey);
            setAppointmentSelection({ dateKey, event });
          }}
        />
      )}

      {viewMode === 'week' && (
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
          assessmentLabel={(event) => assessmentLabel(event, t)}
          onEditAppointment={onEditAppointment}
          onAppointmentTasksChange={onAppointmentTasksChange}
          onClinicalReferenceIdsChange={onClinicalReferenceIdsChange}
          onManageClinicalReferences={onManageClinicalReferences}
          onVisitDebriefChange={onVisitDebriefChange}
          currentUserUid={currentUserUid}
          currentUserName={currentUserName}
          patientId={patientId}
          db={db}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          assessmentSchedule={schedule}
          onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
          onRecordVisit={onRecordVisit}
        />
      )}

      {viewMode === 'month' && !hasAnyEvents && !skipEmptyMonthPrompt ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <p className="text-sm text-slate-400 text-center">
            {t('dashboard.assessmentScheduleCalendar.emptyMonth')}
          </p>
          {onAddAppointment && (
            <button
              type="button"
              onClick={() => onAddAppointment(selectedDateKey)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
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
          assessmentSchedule={schedule}
          onRecordVisit={onRecordVisit}
          db={db}
          patientId={patientId}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          currentUserUid={currentUserUid}
          fullSize
        />
      ) : null}

      {resolvedAppointmentSelection ? (
        <CircleScheduleAppointmentDetailSheet
          selection={resolvedAppointmentSelection}
          ct={ct}
          t={t}
          onClose={() => setAppointmentSelection(null)}
          onEdit={
            onEditAppointment
              ? () => {
                  const entryId = resolvedAppointmentSelection.event.entryId;
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
          assessmentSchedule={schedule}
          onOpenAssessment={assessmentsEnabled ? onOpenAssessment : undefined}
          onRecordVisit={onRecordVisit}
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
  assessmentSchedule,
  onRecordVisit,
  db,
  patientId,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  currentUserUid,
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
  assessmentSchedule?: CircleAssessmentScheduleContext;
  onRecordVisit?: (entryId: string) => void;
  db?: Firestore;
  patientId?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  currentUserUid?: string;
}) {
  const { language } = useCircleI18nContext();
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);
  const showAppointmentDetails = useCircleScheduleShowAppointmentDetails();
  const appointmentCompact = !showAppointmentDetails;
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
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDateKey;
            const hasCare = careEvents.length > 0;
            const hasInternal = careEvents.some((event) =>
              isCareCalendarInternalMeeting(event.kind),
            );
            const hasAppointment = careEvents.some(
              (event) => !isCareCalendarInternalMeeting(event.kind),
            );
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
                    : hasInternal && !hasAppointment && !hasAssessments
                      ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50'
                      : hasAppointment
                        ? 'border-pink-200 bg-pink-50/70 hover:bg-pink-50'
                        : 'border-orange-200 bg-orange-50/50 hover:bg-orange-50/80',
                  isSelected && hasInternal && !hasAppointment && 'ring-1 ring-emerald-300/70 border-emerald-300',
                  isSelected && hasAppointment && 'ring-1 ring-pink-300/70 border-pink-300',
                  isSelected && !hasCare && hasAssessments && 'border-orange-300 bg-orange-50/70 ring-1 ring-orange-200/60',
                  isToday &&
                    !isSelected &&
                    (hasInternal && !hasAppointment
                      ? 'border-emerald-300'
                      : hasAppointment
                        ? 'border-pink-300'
                        : hasAssessments
                          ? 'border-orange-300'
                          : 'border-blue-200'),
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
                    {hasAssessments && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    {hasAppointment && <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />}
                    {hasInternal && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div
          className={cn(
            'mt-2 flex flex-wrap gap-3 font-bold uppercase tracking-wider text-slate-500',
            fullSize ? 'text-[10px]' : 'text-[9px]',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {ct('legendAssessment')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            {ct('legendAppointment')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {ct('kinds.wellness')}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'mt-2 pt-2 border-t border-slate-100 rounded-xl bg-slate-50 space-y-1.5',
          fullSize
            ? 'p-3'
            : 'p-2.5 flex-1 min-h-0 overflow-y-auto overscroll-contain',
        )}
      >
        <p
          className={cn(
            'font-bold text-slate-500 uppercase tracking-wider',
            fullSize ? 'text-xs' : 'text-[10px]',
          )}
        >
          {t('dashboard.assessmentScheduleCalendar.dayDetail', {
            date: formatCircleDate(new Date(selectedDateKey + 'T12:00:00'), language, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
          })}
        </p>
        {selectedCareEvents.length > 0 && (
          <div className="space-y-2">
            <p
              className={cn(
                'font-bold text-violet-700 uppercase tracking-wider',
                fullSize ? 'text-xs' : 'text-[10px]',
              )}
            >
              {ct('dayAppointments')}
            </p>
            <ul className="space-y-2">
              {selectedCareEvents.map((event) => (
                <CircleScheduleDayAppointmentCard
                  key={`${event.entryId}-${selectedDateKey}`}
                  event={event}
                  dateKey={selectedDateKey}
                  ct={ct}
                  t={t}
                  compact={appointmentCompact}
                  showTimingHighlight={selectedDateKey === todayKey}
                  assessmentSchedule={assessmentSchedule}
                  onOpen={
                    onSelectAppointment
                      ? () => onSelectAppointment({ dateKey: selectedDateKey, event })
                      : () => {}
                  }
                  onEdit={onEditAppointment ? () => onEditAppointment(event.entryId) : undefined}
                  db={db}
                  patientId={patientId}
                  memberContactId={memberContactId}
                  memberDocContactId={memberDocContactId}
                  inviteContactId={inviteContactId}
                  memberDisplayName={memberDisplayName}
                  memberRole={memberRole}
                  currentUserUid={currentUserUid}
                  onRecordVisit={onRecordVisit}
                />
              ))}
            </ul>
          </div>
        )}
        {selectedEvents.length > 0 && (
          <div className="space-y-2">
            {selectedCareEvents.length > 0 ? (
              <p
                className={cn(
                  'font-bold text-slate-500 uppercase tracking-wider',
                  fullSize ? 'text-xs' : 'text-[10px]',
                )}
              >
                {ct('dayAssessments')}
              </p>
            ) : null}
            <ul className="space-y-2">
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
          </div>
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
