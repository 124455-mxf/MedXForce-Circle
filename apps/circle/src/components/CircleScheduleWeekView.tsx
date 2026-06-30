/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Firestore } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import {
  assessmentScheduleDateKey,
  careCalendarAttendeeRoleLabelKey,
  careCalendarDateKey,
  formatCareCalendarTime,
  formatCareCalendarTimeRange,
  getCalendarWeekDays,
  shouldShowAttendeeInviteResponseBadge,
  type AssessmentScheduleDayEvent,
  type CareCalendarDayEvent,
} from '@medxforce/shared';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { CircleCareCalendarAppointmentEpisodePanel } from './CircleCareCalendarAppointmentEpisodePanel';
import { CircleCareCalendarInviteRsvpBar } from './CircleCareCalendarInviteRsvpBar';
import type { CareCalendarAppointmentTask } from '@medxforce/shared';
import { cn } from '../lib/utils';

const WEEK_START_HOUR = 7;
const WEEK_END_HOUR = 20;
const WEEK_SLOT_MINUTES = 60;
const DAY_START_MINUTES = WEEK_START_HOUR * 60;
const DAY_END_MINUTES = WEEK_END_HOUR * 60;
const SLOT_HEIGHT_PX = 52;
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
  t: (path: string, params?: Record<string, unknown>) => string;
  onDayClick?: (dateKey: string) => void;
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
  memberDisplayName?: string;
};

function buildWeekTimeSlots(): number[] {
  const slots: number[] = [];
  for (let m = DAY_START_MINUTES; m < DAY_END_MINUTES; m += WEEK_SLOT_MINUTES) {
    slots.push(m);
  }
  return slots;
}

function minutesToTop(minutes: number): number {
  return ((minutes - DAY_START_MINUTES) / WEEK_SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

function eventBlockHeight(startMinutes: number, endMinutes: number | undefined): number {
  const end = endMinutes ?? startMinutes + WEEK_SLOT_MINUTES;
  const duration = Math.max(end - startMinutes, WEEK_SLOT_MINUTES);
  return (duration / WEEK_SLOT_MINUTES) * SLOT_HEIGHT_PX;
}

function defaultMobileDayOffset(weekDays: Date[], todayKey: string): number {
  const todayIdx = weekDays.findIndex((day) => assessmentScheduleDateKey(day) === todayKey);
  if (todayIdx < 0) return 0;
  return Math.max(0, Math.min(todayIdx - 1, weekDays.length - MOBILE_VISIBLE_DAYS));
}

export function CircleScheduleWeekView({
  weekAnchor,
  calendarByDay,
  careByDay,
  todayKey,
  t,
  onDayClick,
  onEditAppointment,
  onAppointmentTasksChange,
  currentUserUid,
  patientId,
  db,
  memberContactId,
  memberDocContactId,
  memberDisplayName,
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
    <div className="flex flex-col flex-1 min-h-0">
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

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-slate-100 md:overflow-auto"
        style={{ maxHeight: 'min(32rem, calc(100dvh - 14rem))' }}
      >
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
            selection={selection}
            t={t}
            onDayClick={onDayClick}
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
            selection={selection}
            t={t}
            onDayClick={onDayClick}
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
          memberDisplayName={memberDisplayName}
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
  selection,
  t,
  onDayClick,
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
  selection: CircleScheduleAppointmentSelection | null;
  t: CircleScheduleWeekViewProps['t'];
  onDayClick?: (dateKey: string) => void;
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
        const assessmentCount = (calendarByDay.get(dateKey) ?? []).length;

        return (
          <button
            key={`header-${dateKey}`}
            type="button"
            onClick={() => onDayClick?.(dateKey)}
            className={cn(
              'sticky top-0 z-20 bg-white py-1.5 text-center border-b border-slate-100',
              isToday && 'bg-blue-50',
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
                !isToday && 'text-slate-700',
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

        return (
          <div
            key={`col-${dateKey}`}
            className={cn('bg-white relative border-l border-slate-50', isToday && 'bg-blue-50/30')}
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

              return (
                <button
                  key={`${event.entryId}-${dateKey}`}
                  type="button"
                  onClick={() => onSelectAppointment({ dateKey, event })}
                  className={cn(
                    'absolute left-0.5 right-0.5 z-10 rounded-lg text-left px-1.5 py-1 overflow-hidden border shadow-sm transition-all',
                    isSelected
                      ? 'bg-violet-700 border-violet-800 text-white ring-2 ring-violet-300'
                      : 'bg-violet-500 border-violet-600 text-white hover:bg-violet-600',
                  )}
                  style={{ top, height: Math.max(height, SLOT_HEIGHT_PX - 4) }}
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
  memberDisplayName,
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
  memberDisplayName?: string;
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
          memberDisplayName={memberDisplayName}
        />
      </div>
    </div>,
    document.body,
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
  memberDisplayName,
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
  memberDisplayName?: string;
}) {
  const { event, dateKey } = selection;
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

  const detailsContent = (
    <>{event.details ? <p className="text-sm text-slate-600">{event.details}</p> : null}</>
  );

  const goingWithBlock = event.attendees?.length ? (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {ct('fields.attendeesWith')}
      </p>
      <ul className="space-y-1">
        {event.attendees.map((attendee) => {
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
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-2">
          <p className="text-lg font-bold text-slate-900">{event.title}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
            {ct('legendAppointment')} · {ct(`kinds.${event.kind}`)}
            {event.visitSubtype ? ` · ${ct(`visitSubtype.${event.visitSubtype}`)}` : ''}
            {event.source === 'circle' ? ` · ${ct('fromCircle')}` : ''}
          </p>
          {event.doctorName ? (
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {ct('fields.doctorName')}
              </p>
              <p className="text-sm text-slate-700">{event.doctorName}</p>
            </div>
          ) : null}
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {ct('fields.dateTime')}
            </p>
            <p className="text-sm text-slate-600">{dateTimeLabel}</p>
          </div>
          {event.address ? (
            <CircleCareCalendarMapsLinks
              address={event.address}
              ct={ct}
              showFullAddress
              sectionHeader={ct('fields.location')}
            />
          ) : null}
          {goingWithBlock ? <div className="pt-2">{goingWithBlock}</div> : null}
          {db && patientId ? (
            <CircleCareCalendarInviteRsvpBar
              db={db}
              patientId={patientId}
              entryId={event.entryId}
              attendees={event.attendees}
              memberUid={currentUserUid}
              memberContactId={memberContactId}
              memberDocContactId={memberDocContactId}
              memberDisplayName={memberDisplayName}
              startDateKey={dateKey}
              startTimeMinutes={event.startTimeMinutes}
              endTimeMinutes={event.endTimeMinutes}
              eventStatus={event.status}
              t={t}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
      <CircleCareCalendarAppointmentEpisodePanel
        event={event}
        ct={ct}
        currentUserUid={currentUserUid}
        onTasksChange={
          onAppointmentTasksChange
            ? (tasks) => onAppointmentTasksChange(event.entryId, event.kind, tasks)
            : undefined
        }
        detailsContent={detailsContent}
      />
    </div>
  );
}
