/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { CalendarClock, MapPin, Stethoscope, Users, X, type LucideIcon } from 'lucide-react';
import {
  applyCareCalendarAttendeeDisplayNames,
  careCalendarAttendeeRoleLabelKey,
  formatCareCalendarTimeRange,
  mergeAttendeeResponses,
  parseAttendeeResponseSummary,
  shouldShowAttendeeInviteResponseBadge,
  type AnalyticsMetricId,
  type AssessmentHistoryMap,
  type AssessmentScheduleDayEvent,
  type CareCalendarAttendee,
  type CareCalendarAppointmentTask,
  type CareCalendarDayEvent,
  type CareCalendarVisitDebrief,
} from '@medxforce/shared';
import { CircleCareCalendarKindMeta } from './CircleCareCalendarKindMeta';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { CircleCareCalendarAppointmentEpisodePanel } from './CircleCareCalendarAppointmentEpisodePanel';
import { CircleExpandableTextPreview } from './CircleExpandableTextPreview';
import { CircleCareCalendarInviteRsvpBar } from './CircleCareCalendarInviteRsvpBar';
import {
  CircleLiveTranslatingLabel,
  CircleLiveTranslationToggle,
  CircleTranslatedUserText,
} from './CircleTranslatedUserText';
import { useCircleLiveTranslatedText } from '../hooks/useCircleLiveTranslatedText';
import { useCareCalendarAttendeeOptions } from '../hooks/useCareCalendarAttendeeOptions';
import type { CircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import { cn } from '../lib/utils';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { formatCircleDate } from '../lib/circleLanguages';
import { CircleScheduleWeekAgenda } from './CircleScheduleWeekAgenda';

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
  assessmentSchedule?: CircleAssessmentScheduleContext;
  assessmentLabel: (event: AssessmentScheduleDayEvent) => string;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onRecordVisit?: (entryId: string) => void;
};

function attendeesSignature(attendees: CareCalendarAttendee[] | undefined): string {
  if (!attendees?.length) return '';
  return attendees
    .map(
      (attendee) =>
        `${attendee.contactId}:${attendee.response ?? 'pending'}:${attendee.respondedAt ?? ''}:${attendee.respondedByUid ?? ''}`,
    )
    .join('|');
}

function inviteeUidMapSignature(map: Record<string, string> | undefined): string {
  if (!map) return '';
  return Object.entries(map)
    .map(([contactId, uid]) => `${contactId}:${uid}`)
    .sort()
    .join('|');
}

/**
 * Live-merge attendee RSVP badges from the care_calendar doc.
 * Keep fallback/uid-map out of effect deps — callers often pass freshly merged
 * arrays each render, and resetting to a stale selection.event caused PENDING↔GOING flicker.
 */
function useLiveMergedAttendees(
  db: Firestore | undefined,
  patientId: string | undefined,
  entryId: string,
  fallback?: CareCalendarAttendee[],
  inviteeMemberUidByContactId?: Record<string, string>,
): CareCalendarAttendee[] | undefined {
  const [attendees, setAttendees] = useState(fallback);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const inviteeUidMapRef = useRef(inviteeMemberUidByContactId);
  inviteeUidMapRef.current = inviteeMemberUidByContactId;
  const attendeesSigRef = useRef(attendeesSignature(fallback));
  const inviteeUidMapSigRef = useRef(inviteeUidMapSignature(inviteeMemberUidByContactId));

  useEffect(() => {
    setAttendees(fallbackRef.current);
    attendeesSigRef.current = attendeesSignature(fallbackRef.current);
    inviteeUidMapSigRef.current = inviteeUidMapSignature(inviteeUidMapRef.current);
  }, [entryId]);

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
          : fallbackRef.current;
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
            : inviteeUidMapRef.current;
        const merged = mergeAttendeeResponses(rawAttendees, summary, uidMap) ?? fallbackRef.current;
        const mergedSig = attendeesSignature(merged);
        const uidMapSig = inviteeUidMapSignature(uidMap);
        if (
          mergedSig === attendeesSigRef.current &&
          uidMapSig === inviteeUidMapSigRef.current
        ) {
          return;
        }
        attendeesSigRef.current = mergedSig;
        inviteeUidMapSigRef.current = uidMapSig;
        setAttendees(merged);
      },
      () => {
        /* read may be denied for legacy entries */
      },
    );
  }, [db, entryId, patientId]);

  return attendees ?? fallback;
}

export function CircleScheduleWeekView({
  weekAnchor,
  calendarByDay,
  careByDay,
  todayKey,
  t,
  assessmentLabel,
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
  assessmentSchedule,
  onOpenAssessment,
  onRecordVisit,
}: CircleScheduleWeekViewProps) {
  const [selection, setSelection] = useState<CircleScheduleAppointmentSelection | null>(null);
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  return (
    <>
      <CircleScheduleWeekAgenda
        weekAnchor={weekAnchor}
        calendarByDay={calendarByDay}
        careByDay={careByDay}
        todayKey={todayKey}
        t={t}
        assessmentLabel={assessmentLabel}
        onOpenAppointment={setSelection}
        onEditAppointment={onEditAppointment}
        onOpenAssessment={onOpenAssessment}
        assessmentSchedule={assessmentSchedule}
        db={db}
        patientId={patientId}
        currentUserUid={currentUserUid}
        memberContactId={memberContactId}
        memberDocContactId={memberDocContactId}
        inviteContactId={inviteContactId}
        memberDisplayName={memberDisplayName}
        memberRole={memberRole}
      />
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
          assessmentSchedule={assessmentSchedule}
          onOpenAssessment={onOpenAssessment}
          onRecordVisit={onRecordVisit}
        />
      ) : null}
    </>
  );
}

export function CircleScheduleAppointmentDetailSheet({
  selection,
  ct,
  t,
  onClose,
  onEdit,
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
  assessmentSchedule,
  onOpenAssessment,
  onRecordVisit,
}: {
  selection: CircleScheduleAppointmentSelection;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: CircleScheduleWeekViewProps['t'];
  onClose: () => void;
  onEdit?: () => void;
  onAppointmentTasksChange?: CircleScheduleWeekViewProps['onAppointmentTasksChange'];
  onClinicalReferenceIdsChange?: CircleScheduleWeekViewProps['onClinicalReferenceIdsChange'];
  onManageClinicalReferences?: CircleScheduleWeekViewProps['onManageClinicalReferences'];
  onVisitDebriefChange?: CircleScheduleWeekViewProps['onVisitDebriefChange'];
  currentUserUid?: string;
  currentUserName?: string;
  patientId?: string;
  db?: Firestore;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onRecordVisit?: (entryId: string) => void;
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
        className="relative flex h-[min(80dvh,100%)] w-full flex-col overflow-hidden rounded-t-[24px] border-t border-slate-200 bg-white shadow-2xl pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-5 h-1 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2">
          <WeekAppointmentDetail
            selection={selection}
            ct={ct}
            t={t}
            onClose={onClose}
            onEdit={onEdit}
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
            assessmentSchedule={assessmentSchedule}
            onOpenAssessment={onOpenAssessment}
            onRecordVisit={onRecordVisit}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AppointmentDetailSection({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
        {Icon ? <Icon size={14} className="shrink-0 text-violet-600" aria-hidden /> : null}
        {label}
      </p>
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
  assessmentSchedule,
  onOpenAssessment,
  onRecordVisit,
}: {
  selection: CircleScheduleAppointmentSelection;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: CircleScheduleWeekViewProps['t'];
  onClose: () => void;
  onEdit?: () => void;
  onAppointmentTasksChange?: CircleScheduleWeekViewProps['onAppointmentTasksChange'];
  onClinicalReferenceIdsChange?: CircleScheduleWeekViewProps['onClinicalReferenceIdsChange'];
  onManageClinicalReferences?: CircleScheduleWeekViewProps['onManageClinicalReferences'];
  onVisitDebriefChange?: CircleScheduleWeekViewProps['onVisitDebriefChange'];
  currentUserUid?: string;
  currentUserName?: string;
  patientId?: string;
  db?: Firestore;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onRecordVisit?: (entryId: string) => void;
}) {
  const { language } = useCircleI18nContext();
  const { event, dateKey } = selection;
  const attendeeOptions = useCareCalendarAttendeeOptions(db, patientId);
  const nameByContactId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of attendeeOptions) {
      if (option.contactId && option.name) map[option.contactId] = option.name;
    }
    return map;
  }, [attendeeOptions]);
  const fallbackAttendees = useMemo(
    () =>
      mergeAttendeeResponses(
        event.attendees,
        event.attendeeResponseSummary,
        event.inviteeMemberUidByContactId,
      ) ?? event.attendees,
    [
      event.attendeeResponseSummary,
      event.attendees,
      event.inviteeMemberUidByContactId,
    ],
  );
  const liveAttendees = useLiveMergedAttendees(
    db,
    patientId,
    event.entryId,
    fallbackAttendees,
    event.inviteeMemberUidByContactId,
  );
  const displayAttendees = useMemo(
    () =>
      applyCareCalendarAttendeeDisplayNames(liveAttendees, {
        nameByContactId,
        selfContactIds: [memberContactId, memberDocContactId, inviteContactId].filter(
          (id): id is string => Boolean(id),
        ),
        selfDisplayName: memberDisplayName,
      }),
    [
      inviteContactId,
      liveAttendees,
      memberContactId,
      memberDisplayName,
      memberDocContactId,
      nameByContactId,
    ],
  );
  const timeLabel = formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes);
  const dayLabel = formatCircleDate(new Date(dateKey + 'T12:00:00'), language, {
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
  const titleTranslation = useCircleLiveTranslatedText(event.title);
  const detailsContent = event.details ? (
    <CircleExpandableTextPreview
      label={ct('fields.details')}
      text={event.details}
      t={t}
      previewChars={Number.MAX_SAFE_INTEGER}
    />
  ) : null;

  const goingWithBlock = displayAttendees?.length ? (
    <AppointmentDetailSection label={ct('fields.attendeesWith')} icon={Users}>
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
          <AppointmentDetailSection label={ct('fields.doctorName')} icon={Stethoscope}>
            <p className="text-sm text-slate-700">{event.doctorName}</p>
          </AppointmentDetailSection>
        ) : null}
        <AppointmentDetailSection label={ct('fields.dateTime')} icon={CalendarClock}>
          <p className="text-sm text-slate-600">{dateTimeLabel}</p>
        </AppointmentDetailSection>
        {event.address ? (
          <CircleCareCalendarMapsLinks
            address={event.address}
            ct={ct}
            showFullAddress
            sectionHeader={ct('fields.location')}
            sectionHeaderIcon={MapPin}
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
          currentUserName={currentUserName}
          onTasksChange={
            onAppointmentTasksChange
              ? (tasks) => onAppointmentTasksChange(event.entryId, event.kind, tasks)
              : undefined
          }
          patientId={patientId}
          db={db}
          onClinicalReferenceIdsChange={
            onClinicalReferenceIdsChange
              ? (ids) => onClinicalReferenceIdsChange(event.entryId, event.kind, ids)
              : undefined
          }
          onVisitDebriefChange={
            onVisitDebriefChange
              ? (debrief) => onVisitDebriefChange(event.entryId, event.kind, debrief)
              : undefined
          }
          onManageClinicalReferences={onManageClinicalReferences}
          detailsContent={detailsContent}
          onRecordVisit={onRecordVisit}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {titleTranslation.isTranslating && !titleTranslation.showOriginal ? (
            <CircleLiveTranslatingLabel />
          ) : null}
          <p className="text-lg font-bold text-slate-900">{titleTranslation.displayText}</p>
          {titleTranslation.hasTranslation ? (
            <CircleLiveTranslationToggle
              showOriginal={titleTranslation.showOriginal}
              onToggle={titleTranslation.toggleOriginal}
            />
          ) : null}
          <CircleCareCalendarKindMeta
            kind={event.kind}
            visitSubtype={event.visitSubtype}
            source={event.source}
            ct={ct}
            className="mt-0"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
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
  );
}
