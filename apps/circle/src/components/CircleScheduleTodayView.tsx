/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import {
  careCalendarAttendeeRoleLabelKey,
  findImminentCareCalendarDayEvents,
  formatCareCalendarTime,
  formatCareCalendarTimeRange,
  mergeAttendeeResponses,
  partitionCareDayEventsByPast,
  sortCareDayEventsForTodayView,
  SCHEDULE_IMMINENT_BANNER_REFRESH_MS,
  shouldShowAttendeeInviteResponseBadge,
  careCalendarCardTimingBorderClasses,
  careCalendarPrepBorderClasses,
  resolveAppointmentPrepHighlight,
  resolveCareCalendarAppointmentTiming,
  type AppointmentPrepHighlight,
  type AssessmentScheduleDayEvent,
  type CareCalendarDayEvent,
} from '@medxforce/shared';
import type { Firestore } from 'firebase/firestore';
import type { AnalyticsMetricId } from '@medxforce/shared';
import { assessmentScheduleIdToAnalyticsMetric, type CircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { CircleCareCalendarInviteRsvpBar } from './CircleCareCalendarInviteRsvpBar';
import { CircleScheduleImminentBanner } from './CircleScheduleImminentBanner';
import { CircleCareCalendarAssessmentNudgeHint } from './CircleCareCalendarAssessmentNudgesList';
import { CircleCareCalendarPrepStatusBadge } from './CircleCareCalendarPrepStatusBadge';
import {
  CircleScheduleAppointmentDetailSheet,
  type CircleScheduleAppointmentSelection,
} from './CircleScheduleWeekView';
import { cn } from '../lib/utils';

type CircleScheduleTodayViewProps = {
  dateKey: string;
  isActualToday: boolean;
  careEvents: CareCalendarDayEvent[];
  assessmentEvents: AssessmentScheduleDayEvent[];
  t: (path: string, params?: Record<string, unknown>) => string;
  assessmentLabel: (event: AssessmentScheduleDayEvent) => string;
  onEditAppointment?: (entryId: string) => void;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onAppointmentTasksChange?: (
    entryId: string,
    kind: CareCalendarDayEvent['kind'],
    tasks: import('@medxforce/shared').CareCalendarAppointmentTask[],
  ) => void | Promise<void>;
  db?: Firestore;
  patientId?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  currentUserUid?: string;
  assessmentSchedule?: CircleAssessmentScheduleContext;
};

export function CircleScheduleTodayView({
  dateKey,
  isActualToday,
  careEvents,
  assessmentEvents,
  t,
  assessmentLabel,
  onEditAppointment,
  onOpenAssessment,
  onAppointmentTasksChange,
  db,
  patientId,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  currentUserUid,
  assessmentSchedule,
}: CircleScheduleTodayViewProps) {
  const [selection, setSelection] = useState<CircleScheduleAppointmentSelection | null>(null);
  const [pastExpanded, setPastExpanded] = useState(false);

  useEffect(() => {
    setPastExpanded(false);
  }, [dateKey]);
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const dayLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timedCare = [...careEvents].sort(
    (a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0),
  );
  const hasContent = timedCare.length > 0 || assessmentEvents.length > 0;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isActualToday) return;
    const id = window.setInterval(() => setNow(new Date()), SCHEDULE_IMMINENT_BANNER_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [isActualToday]);

  const imminentItems = useMemo(
    () =>
      isActualToday ? findImminentCareCalendarDayEvents(timedCare, dateKey, { now }) : [],
    [dateKey, isActualToday, now, timedCare],
  );

  const { upcoming: upcomingCare, past: pastCare } = useMemo(() => {
    if (!isActualToday) {
      return { upcoming: timedCare, past: [] as CareCalendarDayEvent[] };
    }
    const split = partitionCareDayEventsByPast(timedCare, dateKey, now);
    return {
      upcoming: sortCareDayEventsForTodayView(split.upcoming, dateKey, now),
      past: split.past,
    };
  }, [dateKey, isActualToday, now, timedCare]);

  const openImminentAppointment = (entryId: string) => {
    const event = timedCare.find((item) => item.entryId === entryId);
    if (event) setSelection({ dateKey, event });
  };

  return (
    <div className="space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
          {isActualToday ? t('schedulePage.views.today') : t('schedulePage.views.day')}
        </p>
        <p className="text-lg font-bold text-slate-900 mt-1">{dayLabel}</p>
      </div>

      {isActualToday ? (
        <CircleScheduleImminentBanner
          items={imminentItems}
          t={t}
          onSelect={openImminentAppointment}
        />
      ) : null}

      {!hasContent ? (
        <p className="text-sm text-slate-400 text-center py-10">
          {t('schedulePage.views.emptyDay')}
        </p>
      ) : (
        <div className="space-y-6 pb-2">
          {timedCare.length > 0 && (
            <section className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                {ct('dayAppointments')}
              </p>
              {isActualToday && upcomingCare.length === 0 && pastCare.length > 0 ? (
                <p className="text-sm text-slate-500">{t('schedulePage.views.noMoreAppointmentsToday')}</p>
              ) : null}
              {upcomingCare.length > 0 ? (
                <ul className="space-y-3">
                  {upcomingCare.map((event) => (
                    <CircleScheduleDayAppointmentCard
                      key={`${event.entryId}-${dateKey}`}
                      event={event}
                      ct={ct}
                      t={t}
                      now={now}
                      showTimingHighlight={isActualToday}
                      onOpen={() => setSelection({ dateKey, event })}
                      onEdit={
                        onEditAppointment ? () => onEditAppointment(event.entryId) : undefined
                      }
                      db={db}
                      patientId={patientId}
                      memberContactId={memberContactId}
                      memberDocContactId={memberDocContactId}
                      inviteContactId={inviteContactId}
                      memberDisplayName={memberDisplayName}
                      memberRole={memberRole}
                      currentUserUid={currentUserUid}
                      assessmentSchedule={assessmentSchedule}
                      dateKey={dateKey}
                    />
                  ))}
                </ul>
              ) : null}
              {isActualToday && pastCare.length > 0 ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setPastExpanded((open) => !open)}
                    aria-expanded={pastExpanded}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left hover:bg-slate-100/80 transition-colors text-sm"
                  >
                    <span className="font-semibold text-slate-600">
                      {t('schedulePage.views.pastAppointmentsToday', { count: pastCare.length })}
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn(
                        'shrink-0 text-slate-400 transition-transform',
                        pastExpanded && 'rotate-180',
                      )}
                    />
                  </button>
                  {pastExpanded ? (
                    <ul className="mt-3 space-y-3">
                      {pastCare.map((event) => (
                        <CircleScheduleDayAppointmentCard
                          key={`past-${event.entryId}-${dateKey}`}
                          event={event}
                          ct={ct}
                          t={t}
                          onOpen={() => setSelection({ dateKey, event })}
                          onEdit={
                            onEditAppointment ? () => onEditAppointment(event.entryId) : undefined
                          }
                          db={db}
                          patientId={patientId}
                          memberContactId={memberContactId}
                          memberDocContactId={memberDocContactId}
                          inviteContactId={inviteContactId}
                          memberDisplayName={memberDisplayName}
                          memberRole={memberRole}
                          currentUserUid={currentUserUid}
                          dateKey={dateKey}
                          muted
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>
          )}

          {assessmentEvents.length > 0 && (
            <section className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {ct('dayAssessments')}
              </p>
              <ul className="space-y-3">
                {assessmentEvents.map((event) => {
                  const metricId = assessmentScheduleIdToAnalyticsMetric(event.id);
                  return (
                    <li
                      key={event.id}
                      className="flex items-stretch gap-4 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                    >
                      <div className="shrink-0 w-16 bg-slate-50 border-r border-slate-100 flex items-center justify-center px-2">
                        <span className="text-[10px] font-bold text-slate-500 text-center">
                          {t('schedulePage.views.allDay')}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3 py-4 pr-4 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{assessmentLabel(event)}</p>
                          <p
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider mt-1',
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
                            className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                          >
                            {t('dashboard.assessmentScheduleCalendar.view')}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {selection ? (
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
      ) : null}
    </div>
  );
}

function CircleScheduleDayAppointmentCard({
  event,
  ct,
  t,
  onOpen,
  onEdit,
  db,
  patientId,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  currentUserUid,
  dateKey,
  assessmentSchedule,
  muted = false,
  now,
  showTimingHighlight = false,
  showPrepBorder = true,
}: {
  event: CareCalendarDayEvent;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: CircleScheduleTodayViewProps['t'];
  onOpen: () => void;
  onEdit?: () => void;
  db?: Firestore;
  patientId?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  currentUserUid?: string;
  dateKey: string;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  muted?: boolean;
  now?: Date;
  showTimingHighlight?: boolean;
  showPrepBorder?: boolean;
}) {
  const timeLabel =
    formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes) ||
    formatCareCalendarTime(event.startTimeMinutes) ||
    '';

  const timing = resolveCareCalendarAppointmentTiming(event, dateKey, {
    now,
    highlightTodayTiming: showTimingHighlight,
    forcePast: muted,
  });
  const inProgress = timing === 'in_progress';
  const upcoming = timing === 'upcoming' || timing === 'unscheduled';
  const isPast = timing === 'past';
  const prepHighlight: AppointmentPrepHighlight =
    showPrepBorder !== false && assessmentSchedule
      ? resolveAppointmentPrepHighlight(event, dateKey, timing, {
          preferences: assessmentSchedule.preferences,
          histories: assessmentSchedule.histories,
        })
      : 'none';

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'flex items-stretch gap-4 rounded-2xl border-2 shadow-sm overflow-hidden transition-shadow cursor-pointer',
        isPast && 'opacity-80 bg-slate-50/80',
        !isPast && inProgress && 'bg-emerald-50/70 shadow-md shadow-emerald-100',
        !isPast && upcoming && !inProgress && 'bg-violet-50/80 shadow-md shadow-violet-100/80',
        prepHighlight !== 'none'
          ? careCalendarPrepBorderClasses(prepHighlight, 'card')
          : careCalendarCardTimingBorderClasses(timing, prepHighlight),
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
      )}
    >
      <div
        className={cn(
          'shrink-0 w-16 border-r flex flex-col items-center justify-center px-2 py-4 pointer-events-none',
          isPast && 'bg-slate-100/90 border-slate-200',
          !isPast && inProgress && 'bg-emerald-100/90 border-emerald-200',
          !isPast && upcoming && !inProgress && 'bg-violet-100/90 border-violet-200',
        )}
      >
        <span
          className={cn(
            'text-xs font-bold text-center leading-tight',
            isPast && 'text-slate-600',
            !isPast && inProgress && 'text-emerald-900',
            !isPast && upcoming && !inProgress && 'text-violet-900',
          )}
        >
          {timeLabel.split(' – ')[0]}
        </span>
        {timeLabel.includes(' – ') && (
          <span
            className={cn(
              'text-[10px] mt-1 text-center',
              isPast && 'text-slate-500',
              !isPast && inProgress && 'text-emerald-700',
              !isPast && upcoming && !inProgress && 'text-violet-700',
            )}
          >
            {timeLabel.split(' – ')[1]}
          </span>
        )}
      </div>
      <div className="flex-1 py-4 pr-4 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 text-left space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isPast ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-500 text-white">
                  {t('schedulePage.views.past')}
                </span>
              ) : null}
              {!isPast && (inProgress || upcoming) ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    inProgress && 'bg-emerald-600 text-white',
                    upcoming && !inProgress && 'bg-violet-600 text-white',
                  )}
                >
                  {inProgress ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden />
                  ) : null}
                  {t(`schedulePage.views.${inProgress ? 'inProgress' : 'upcoming'}`)}
                </span>
              ) : null}
              {!isPast && assessmentSchedule ? (
                <CircleCareCalendarPrepStatusBadge
                  event={event}
                  dateKey={dateKey}
                  t={t}
                  preferences={assessmentSchedule.preferences}
                  histories={assessmentSchedule.histories}
                  now={now}
                  highlightTodayTiming={showTimingHighlight}
                />
              ) : null}
            </div>
            <p className="text-base font-bold text-slate-900">{event.title}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mt-0.5">
              {ct(`kinds.${event.kind}`)}
              {event.visitSubtype ? ` · ${ct(`visitSubtype.${event.visitSubtype}`)}` : ''}
              {event.source === 'circle' ? ` · ${ct('fromCircle')}` : ''}
            </p>
            {event.details ? (
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{event.details}</p>
            ) : null}
            {assessmentSchedule ? (
              <CircleCareCalendarAssessmentNudgeHint
                event={event}
                dateKey={dateKey}
                preferences={assessmentSchedule.preferences}
                histories={assessmentSchedule.histories}
                ct={ct}
              />
            ) : null}
          </div>
          {onEdit ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-700 text-xs font-bold"
            >
              {t('common.edit')}
            </button>
          ) : null}
        </div>
        {event.attendees?.length ? (
          <AppointmentAttendeeResponses event={event} dateKey={dateKey} ct={ct} t={t} />
        ) : null}
        {db && patientId ? (
          <CircleCareCalendarInviteRsvpBar
            db={db}
            patientId={patientId}
            entryId={event.entryId}
            attendees={event.attendees}
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
        {event.address ? <CircleCareCalendarMapsLinks address={event.address} ct={ct} /> : null}
      </div>
    </li>
  );
}

export { CircleScheduleDayAppointmentCard };

function AppointmentAttendeeResponses({
  event,
  dateKey,
  ct,
  t,
}: {
  event: CareCalendarDayEvent;
  dateKey: string;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: CircleScheduleTodayViewProps['t'];
}) {
  const attendees =
    mergeAttendeeResponses(
      event.attendees,
      event.attendeeResponseSummary,
      event.inviteeMemberUidByContactId,
    ) ?? event.attendees;
  if (!attendees?.length) return null;

  const inviteTiming = {
    eventStatus: event.status,
    startDateKey: dateKey,
    startTimeMinutes: event.startTimeMinutes,
    endTimeMinutes: event.endTimeMinutes,
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {ct('fields.attendeesWith')}
      </p>
      <ul className="space-y-1">
        {attendees.map((attendee) => {
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
  );
}
