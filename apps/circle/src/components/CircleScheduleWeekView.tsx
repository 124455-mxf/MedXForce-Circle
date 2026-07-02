/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Maximize2, Users, X } from 'lucide-react';
import {
  assessmentScheduleDateKey,
  careCalendarAttendeeRoleLabelKey,
  careCalendarDateKey,
  formatCareCalendarTime,
  formatCareCalendarTimeRange,
  getCalendarWeekDays,
  buildScheduleWeekTimeSlots,
  SCHEDULE_WEEK_VIEW_START_HOUR,
  SCHEDULE_WEEK_VIEW_END_HOUR,
  SCHEDULE_WEEK_SLOT_MINUTES,
  mergeAttendeeResponses,
  parseAttendeeResponseSummary,
  shouldShowAttendeeInviteResponseBadge,
  careCalendarWeekEventBlockClasses,
  careCalendarPrepBorderClasses,
  countAppointmentPrepRemaining,
  appointmentPrepHighlightIsNeeded,
  appointmentPrepHighlightIsReady,
  resolveAppointmentPrepHighlight,
  resolveCareCalendarAppointmentTiming,
  type AssessmentHistoryMap,
  type AssessmentScheduleDayEvent,
  type CareCalendarAttendee,
  type CareCalendarDayEvent,
} from '@medxforce/shared';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { CircleCareCalendarAppointmentEpisodePanel } from './CircleCareCalendarAppointmentEpisodePanel';
import { CircleCareCalendarInviteRsvpBar } from './CircleCareCalendarInviteRsvpBar';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';
import type { CareCalendarAppointmentTask } from '@medxforce/shared';
import type { CircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import type { AnalyticsMetricId } from '@medxforce/shared';
import {
  CIRCLE_SCHEDULE_WEEK_SCROLL_CLASS,
  CIRCLE_SCHEDULE_WEEK_VIEW_SHELL_CLASS,
} from '../lib/circleScheduleLayout';
import { cn } from '../lib/utils';

const DAY_START_MINUTES = SCHEDULE_WEEK_VIEW_START_HOUR * 60;
const DAY_END_MINUTES = SCHEDULE_WEEK_VIEW_END_HOUR * 60;
const SLOT_HEIGHT_PX = 48;
const MOBILE_VISIBLE_DAYS = 3;

export type CircleScheduleAppointmentSelection = {
  dateKey: string;
  event: CareCalendarDayEvent;
};

type CircleScheduleWeekViewProps = {
  weekAnchor: Date;
  calendarByDay: Map<string, AssessmentScheduleDayEvent[]>;
  careByDay: Map<string, CareCalendarDayEvent[]>;
  todayKey: string;
  selectedDayDateKey?: string;
  onSelectedDayChange?: (dateKey: string) => void;
  preferences?: Record<string, unknown>;
  histories?: AssessmentHistoryMap;
  t: (path: string, params?: Record<string, unknown>) => string;
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
  assessmentSchedule?: CircleAssessmentScheduleContext;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
};

function buildWeekTimeSlots(): number[] {
  return buildScheduleWeekTimeSlots();
}

function minutesToTop(minutes: number): number {
  return ((minutes - DAY_START_MINUTES) / SCHEDULE_WEEK_SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

function eventBlockHeight(startMinutes: number, endMinutes: number | undefined): number {
  const end = endMinutes ?? startMinutes + SCHEDULE_WEEK_SLOT_MINUTES;
  const duration = Math.max(end - startMinutes, SCHEDULE_WEEK_SLOT_MINUTES);
  return (duration / SCHEDULE_WEEK_SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

function defaultMobileDayOffset(weekDays: Date[], todayKey: string): number {
  const todayIdx = weekDays.findIndex((day) => assessmentScheduleDateKey(day) === todayKey);
  if (todayIdx < 0) return 0;
  return Math.max(0, Math.min(todayIdx - 1, weekDays.length - MOBILE_VISIBLE_DAYS));
}

function useLiveMergedAttendees(
  db: Firestore | undefined,
  patientId: string | undefined,
  entryId: string,
  fallback?: CareCalendarAttendee[],
  inviteeMemberUidByContactId?: Record<string, string>,
): CareCalendarAttendee[] | undefined {
  const [attendees, setAttendees] = useState(fallback);

  useEffect(() => {
    setAttendees(fallback);
  }, [entryId, fallback]);

  useEffect(() => {
    if (!db || !patientId || !entryId) return;
    const entryRef = doc(db, 'patients', patientId, 'care_calendar', entryId);
    return onSnapshot(
      entryRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const rawAttendees = Array.isArray(data.attendees)
          ? (data.attendees as CareCalendarAttendee[])
          : fallback;
        const summary = parseAttendeeResponseSummary(data.attendeeResponseSummary);
        const uidMap =
          data.inviteeMemberUidByContactId &&
          typeof data.inviteeMemberUidByContactId === 'object' &&
          !Array.isArray(data.inviteeMemberUidByContactId)
            ? Object.fromEntries(
                Object.entries(data.inviteeMemberUidByContactId as Record<string, unknown>)
                  .map(([contactId, uid]) => [String(contactId), String(uid)])
                  .filter(([contactId, uid]) => Boolean(contactId) && Boolean(uid)),
              )
            : inviteeMemberUidByContactId;
        setAttendees(mergeAttendeeResponses(rawAttendees, summary, uidMap) ?? fallback);
      },
      () => {
        /* read may be denied for legacy entries */
      },
    );
  }, [db, entryId, fallback, inviteeMemberUidByContactId, patientId]);

  return attendees ?? fallback;
}

export function CircleScheduleWeekView({
  weekAnchor,
  calendarByDay,
  careByDay,
  todayKey,
  selectedDayDateKey,
  onSelectedDayChange,
  preferences,
  histories = {},
  t,
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
  assessmentSchedule,
  onOpenAssessment,
}: CircleScheduleWeekViewProps) {
  const [selection, setSelection] = useState<CircleScheduleAppointmentSelection | null>(null);
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const weekDays = useMemo(() => getCalendarWeekDays(weekAnchor), [weekAnchor]);
  const timeSlots = buildWeekTimeSlots();
  const gridHeight = timeSlots.length * SLOT_HEIGHT_PX;
  const maxMobileDayOffset = Math.max(0, weekDays.length - MOBILE_VISIBLE_DAYS);

  const [mobileDayOffset, setMobileDayOffset] = useState(() =>
    defaultMobileDayOffset(weekDays, todayKey),
  );

  useEffect(() => {
    setMobileDayOffset(defaultMobileDayOffset(weekDays, todayKey));
  }, [weekDays, todayKey]);

  const mobileVisibleDays = weekDays.slice(
    mobileDayOffset,
    mobileDayOffset + MOBILE_VISIBLE_DAYS,
  );
  const mobileRangeLabel = `${mobileVisibleDays[0].toLocaleDateString(undefined, {
    weekday: 'short',
  })} – ${mobileVisibleDays[mobileVisibleDays.length - 1].toLocaleDateString(undefined, {
    weekday: 'short',
  })}`;

  return (
    <div className={CIRCLE_SCHEDULE_WEEK_VIEW_SHELL_CLASS}>
      <p className="text-xs text-slate-400 text-center shrink-0 mb-2">
        {t('schedulePage.views.weekScrollHint')}
      </p>

      <div className="md:hidden shrink-0 flex items-center justify-center gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMobileDayOffset((offset) => Math.max(0, offset - 1))}
          disabled={mobileDayOffset === 0}
          className={cn(
            'shrink-0 p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50',
            mobileDayOffset === 0 && 'opacity-40 pointer-events-none',
          )}
          aria-label={t('schedulePage.views.weekPrevDays')}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="flex-1 min-w-0 text-xs font-bold text-slate-600 text-center truncate px-1">
          {mobileRangeLabel}
        </span>
        <button
          type="button"
          onClick={() =>
            setMobileDayOffset((offset) => Math.min(maxMobileDayOffset, offset + 1))
          }
          disabled={mobileDayOffset >= maxMobileDayOffset}
          className={cn(
            'shrink-0 p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50',
            mobileDayOffset >= maxMobileDayOffset && 'opacity-40 pointer-events-none',
          )}
          aria-label={t('schedulePage.views.weekNextDays')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={CIRCLE_SCHEDULE_WEEK_SCROLL_CLASS}>
        <div className="md:hidden">
          <WeekDaysGrid
            days={mobileVisibleDays}
            dayColumnCount={MOBILE_VISIBLE_DAYS}
            timeColumnWidth="3rem"
            compactHeaders
            gridHeight={gridHeight}
            timeSlots={timeSlots}
            calendarByDay={calendarByDay}
            careByDay={careByDay}
            todayKey={todayKey}
            selectedDayDateKey={selectedDayDateKey}
            selection={selection}
            preferences={preferences}
            histories={histories}
            t={t}
            onSelectedDayChange={onSelectedDayChange}
            onSelectAppointment={setSelection}
          />
        </div>

        <div className="hidden md:block">
          <WeekDaysGrid
            days={weekDays}
            dayColumnCount={7}
            timeColumnWidth="3.5rem"
            gridHeight={gridHeight}
            timeSlots={timeSlots}
            calendarByDay={calendarByDay}
            careByDay={careByDay}
            todayKey={todayKey}
            selectedDayDateKey={selectedDayDateKey}
            selection={selection}
            preferences={preferences}
            histories={histories}
            t={t}
            onSelectedDayChange={onSelectedDayChange}
            onSelectAppointment={setSelection}
          />
        </div>
      </div>

      {selection && (
        <CircleScheduleAppointmentDetailSheet
          selection={selection}
          ct={ct}
          t={t}
          onClose={() => setSelection(null)}
          onEdit={
            onEditAppointment
              ? () => {
                  const entryId = selection.event.entryId;
                  setSelection(null);
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
          assessmentSchedule={assessmentSchedule}
          onOpenAssessment={onOpenAssessment}
        />
      )}
    </div>
  );
}

function WeekDaysGrid({
  days,
  dayColumnCount,
  timeColumnWidth,
  compactHeaders = false,
  gridHeight,
  timeSlots,
  calendarByDay,
  careByDay,
  todayKey,
  selectedDayDateKey,
  selection,
  preferences,
  histories = {},
  t,
  onSelectedDayChange,
  onSelectAppointment,
}: {
  days: Date[];
  dayColumnCount: number;
  timeColumnWidth: string;
  compactHeaders?: boolean;
  gridHeight: number;
  timeSlots: number[];
  calendarByDay: Map<string, AssessmentScheduleDayEvent[]>;
  careByDay: Map<string, CareCalendarDayEvent[]>;
  todayKey: string;
  selectedDayDateKey?: string;
  selection: CircleScheduleAppointmentSelection | null;
  preferences?: Record<string, unknown>;
  histories?: AssessmentHistoryMap;
  t: CircleScheduleWeekViewProps['t'];
  onSelectedDayChange?: (dateKey: string) => void;
  onSelectAppointment: (selection: CircleScheduleAppointmentSelection) => void;
}) {
  return (
    <div
      className="grid gap-px bg-slate-100 w-full"
      style={{
        gridTemplateColumns: `${timeColumnWidth} repeat(${dayColumnCount}, minmax(0, 1fr))`,
      }}
    >
      <div className="sticky top-0 left-0 z-30 bg-white border-b border-slate-100 min-h-[3rem]" />

      {days.map((date) => {
        const dateKey = careCalendarDateKey(date);
        const isToday = dateKey === todayKey;
        const isSelected = dateKey === selectedDayDateKey;
        const assessmentCount = (calendarByDay.get(dateKey) ?? []).length;

        return (
          <button
            key={`header-${dateKey}`}
            type="button"
            onClick={() => onSelectedDayChange?.(dateKey)}
            className={cn(
              'sticky top-0 z-20 bg-white py-1.5 text-center border-b border-slate-100 transition-colors',
              isToday && 'bg-blue-50',
              isSelected && !isToday && 'bg-violet-50',
              isSelected && 'ring-2 ring-inset ring-violet-300/80',
            )}
          >
            <p
              className={cn(
                'font-bold text-slate-400 uppercase',
                compactHeaders ? 'text-[9px]' : 'text-[10px]',
              )}
            >
              {t(`remoteSettings.assessmentSchedule.weekdayShort.${date.getDay()}`)}
            </p>
            <p
              className={cn(
                'font-bold mt-0.5 mx-auto flex items-center justify-center rounded-full',
                compactHeaders ? 'text-xs w-6 h-6' : 'text-sm w-7 h-7',
                isToday && 'bg-blue-600 text-white',
                !isToday && isSelected && 'bg-violet-600 text-white',
                !isToday && !isSelected && 'text-slate-700',
              )}
            >
              {date.getDate()}
            </p>
            {assessmentCount > 0 && (
              <span
                className="inline-block mt-0.5 min-w-[1.1rem] px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-bold"
                title={t('schedulePage.views.weekAssessmentsCount', { count: assessmentCount })}
              >
                {assessmentCount}
              </span>
            )}
          </button>
        );
      })}

      <div
        className="sticky left-0 z-20 bg-white relative shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]"
        style={{ height: gridHeight }}
      >
        {timeSlots.map((minutes, i) => (
          <div
            key={minutes}
            className="absolute left-0 right-0 border-t border-slate-100 text-slate-400 text-[10px] font-medium pr-1 text-right"
            style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
          >
            <span className="relative -top-2 bg-white px-0.5">
              {formatCareCalendarTime(minutes)}
            </span>
          </div>
        ))}
      </div>

      {days.map((date) => {
        const dateKey = assessmentScheduleDateKey(date);
        const careEvents = careByDay.get(dateKey) ?? [];
        const isToday = dateKey === todayKey;
        const isDaySelected = dateKey === selectedDayDateKey;

        return (
          <div
            key={`col-${dateKey}`}
            className={cn(
              'bg-white relative border-l border-slate-50',
              isToday && 'bg-blue-50/30',
              isDaySelected && !isToday && 'bg-violet-50/25',
              isDaySelected && 'ring-2 ring-inset ring-violet-200/90',
            )}
            style={{ height: gridHeight }}
          >
            {timeSlots.map((minutes, i) => (
              <div
                key={minutes}
                className="absolute left-0 right-0 border-t border-slate-100/80"
                style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
              />
            ))}

            {careEvents.map((event) => {
              const start = event.startTimeMinutes ?? 9 * 60;
              if (start < DAY_START_MINUTES || start >= DAY_END_MINUTES) return null;
              const end = event.endTimeMinutes;
              const top = minutesToTop(start);
              const height = eventBlockHeight(start, end);
              const isSelected =
                selection?.event.entryId === event.entryId && selection.dateKey === dateKey;
              const timing = resolveCareCalendarAppointmentTiming(event, dateKey, {
                highlightTodayTiming: isToday,
              });
              const prepHighlight = resolveAppointmentPrepHighlight(event, dateKey, timing, {
                preferences,
                histories,
              });
              const prepRemaining = countAppointmentPrepRemaining(event, dateKey, {
                preferences,
                histories,
              }).total;

              return (
                <button
                  key={`${event.entryId}-${dateKey}`}
                  type="button"
                  onClick={() => {
                    onSelectedDayChange?.(dateKey);
                    onSelectAppointment({ dateKey, event });
                  }}
                  className={cn(
                    'absolute left-0.5 right-0.5 z-10 rounded-lg text-left px-1.5 py-1 overflow-hidden border shadow-sm transition-all',
                    careCalendarWeekEventBlockClasses(timing, isSelected),
                    prepHighlight !== 'none' &&
                      careCalendarPrepBorderClasses(prepHighlight, 'week'),
                  )}
                  style={{ top, height: Math.max(height, SLOT_HEIGHT_PX - 4) }}
                  title={
                    appointmentPrepHighlightIsNeeded(prepHighlight)
                      ? t('schedulePage.views.prepNeededHint', { count: prepRemaining })
                      : appointmentPrepHighlightIsReady(prepHighlight)
                        ? t('schedulePage.views.prepReady')
                        : undefined
                  }
                >
                  <p className="text-[10px] font-bold truncate leading-tight">{event.title}</p>
                  {height >= SLOT_HEIGHT_PX * 1.2 && (
                    <p className="text-[9px] opacity-90 truncate">
                      {formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes) ||
                        formatCareCalendarTime(start)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function CircleScheduleAppointmentDetailSheet({
  selection,
  ct,
  t,
  onClose,
  onEdit,
  onAppointmentTasksChange,
  currentUserUid,
  patientId,
  db,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  assessmentSchedule,
  onOpenAssessment,
}: {
  selection: CircleScheduleAppointmentSelection;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: CircleScheduleWeekViewProps['t'];
  onClose: () => void;
  onEdit?: () => void;
  onAppointmentTasksChange?: CircleScheduleWeekViewProps['onAppointmentTasksChange'];
  currentUserUid?: string;
  patientId?: string;
  db?: Firestore;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div
        className="relative w-full max-h-[min(80dvh,100%)] overflow-y-auto overscroll-contain rounded-t-[24px] border-t border-slate-200 bg-white shadow-2xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        <WeekAppointmentDetail
          selection={selection}
          ct={ct}
          t={t}
          onClose={onClose}
          onEdit={onEdit}
          onAppointmentTasksChange={onAppointmentTasksChange}
          currentUserUid={currentUserUid}
          patientId={patientId}
          db={db}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          assessmentSchedule={assessmentSchedule}
          onOpenAssessment={onOpenAssessment}
        />
      </div>
    </div>,
    document.body,
  );
}

function AppointmentDetailSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </section>
  );
}

function WeekAppointmentDetail({
  selection,
  ct,
  t,
  onClose,
  onEdit,
  onAppointmentTasksChange,
  currentUserUid,
  patientId,
  db,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  assessmentSchedule,
  onOpenAssessment,
}: {
  selection: CircleScheduleAppointmentSelection;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: CircleScheduleWeekViewProps['t'];
  onClose: () => void;
  onEdit?: () => void;
  onAppointmentTasksChange?: CircleScheduleWeekViewProps['onAppointmentTasksChange'];
  currentUserUid?: string;
  patientId?: string;
  db?: Firestore;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
}) {
  const [expandedOpen, setExpandedOpen] = useState(false);
  const { event, dateKey } = selection;
  const displayAttendees = useLiveMergedAttendees(
    db,
    patientId,
    event.entryId,
    mergeAttendeeResponses(
      event.attendees,
      event.attendeeResponseSummary,
      event.inviteeMemberUidByContactId,
    ) ?? event.attendees,
    event.inviteeMemberUidByContactId,
  );
  const timeLabel = formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes);
  const dayLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const dateTimeLabel = [dayLabel, timeLabel].filter(Boolean).join(' · ');
  const inviteTiming = {
    eventStatus: event.status,
    startDateKey: dateKey,
    startTimeMinutes: event.startTimeMinutes,
    endTimeMinutes: event.endTimeMinutes,
  };
  const subtitle = [
    ct('legendAppointment'),
    ct(`kinds.${event.kind}`),
    event.visitSubtype ? ct(`visitSubtype.${event.visitSubtype}`) : null,
    event.source === 'circle' ? ct('fromCircle') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const detailsContent = (
    <>{event.details ? <p className="text-sm text-slate-600">{event.details}</p> : null}</>
  );

  const goingWithBlock = displayAttendees?.length ? (
    <AppointmentDetailSection label={ct('fields.attendeesWith')}>
      <ul className="space-y-1.5">
        {displayAttendees.map((attendee) => {
          const roleKey = careCalendarAttendeeRoleLabelKey(attendee.role);
          const role = roleKey.split('.').pop() ?? attendee.role;
          const tier =
            attendee.proxyTier === 'primary'
              ? ct('fields.attendeeProxyPrimary')
              : attendee.proxyTier === 'backup'
                ? ct('fields.attendeeProxyBackup')
                : null;
          const response = attendee.response ?? 'pending';
          const showResponseBadge =
            attendee.role !== 'patient' &&
            shouldShowAttendeeInviteResponseBadge(response, inviteTiming);
          const declined = response === 'declined' && showResponseBadge;

          return (
            <li
              key={attendee.contactId}
              className={cn('flex items-center gap-2 text-sm text-slate-700', declined && 'opacity-60')}
            >
              <Users size={14} className="shrink-0 text-violet-600" />
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-slate-800">{attendee.name}</span>
                <span className="text-slate-500">
                  {' '}
                  · {tier ? `${t(`dashboard.circleMap.roles.${role}`)} (${tier})` : t(`dashboard.circleMap.roles.${role}`)}
                </span>
                {showResponseBadge ? (
                  <span
                    className={cn(
                      'ml-2 text-[10px] font-bold uppercase tracking-wide',
                      response === 'accepted'
                        ? 'text-emerald-600'
                        : response === 'declined'
                          ? 'text-slate-400'
                          : 'text-amber-600',
                    )}
                  >
                    {ct(
                      `fields.rsvp${response === 'accepted' ? 'Accepted' : response === 'declined' ? 'Declined' : 'Pending'}`,
                    )}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </AppointmentDetailSection>
  ) : null;

  const appointmentBody = (
    <>
      <div className="space-y-5">
        {event.doctorName ? (
          <AppointmentDetailSection label={ct('fields.doctorName')}>
            <p className="text-sm text-slate-700">{event.doctorName}</p>
          </AppointmentDetailSection>
        ) : null}
        <AppointmentDetailSection label={ct('fields.dateTime')}>
          <p className="text-sm text-slate-600">{dateTimeLabel}</p>
        </AppointmentDetailSection>
        {event.address ? (
          <CircleCareCalendarMapsLinks
            address={event.address}
            ct={ct}
            showFullAddress
            sectionHeader={ct('fields.location')}
          />
        ) : null}
        {goingWithBlock}
        {db && patientId ? (
          <CircleCareCalendarInviteRsvpBar
            db={db}
            patientId={patientId}
            entryId={event.entryId}
            attendees={displayAttendees}
            memberUid={currentUserUid}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            inviteeContactIds={event.inviteeContactIds}
            inviteeMemberUidByContactId={event.inviteeMemberUidByContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            startDateKey={dateKey}
            startTimeMinutes={event.startTimeMinutes}
            endTimeMinutes={event.endTimeMinutes}
            eventStatus={event.status}
            t={t}
          />
        ) : null}
      </div>
      <div className="mt-6">
        <CircleCareCalendarAppointmentEpisodePanel
          event={event}
          appointmentDateKey={dateKey}
          ct={ct}
          t={t}
          preferences={assessmentSchedule?.preferences}
          histories={assessmentSchedule?.histories}
          onOpenAssessment={onOpenAssessment}
          currentUserUid={currentUserUid}
          onTasksChange={
            onAppointmentTasksChange
              ? (tasks) => onAppointmentTasksChange(event.entryId, event.kind, tasks)
              : undefined
          }
          detailsContent={detailsContent}
        />
      </div>
    </>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-bold text-slate-900">{event.title}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setExpandedOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              aria-label={t('circle.expandMessage')}
              title={t('circle.expandMessage')}
            >
              <Maximize2 size={18} />
            </button>
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700"
              >
                {t('common.edit')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-50"
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {appointmentBody}
      </div>
      <CircleMessageExpandOverlay
        open={expandedOpen}
        title={event.title}
        subtitle={subtitle}
        onClose={() => setExpandedOpen(false)}
        t={t}
        zClassName="z-[220]"
      >
        {appointmentBody}
      </CircleMessageExpandOverlay>
    </>
  );
}
