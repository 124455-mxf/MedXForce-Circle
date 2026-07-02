import { useEffect, useMemo, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  attendeeNeedsAppointmentInvite,
  findCareCalendarAttendeeForMember,
  isCareCalendarAppointmentPast,
  mergeAttendeeResponses,
  parseAttendeeResponseSummary,
  respondToCareCalendarInvite,
  resolveCareCalendarRsvpContactIdForEntry,
  type CareCalendarAttendee,
  type CareCalendarAttendeeResponse,
  type CareCalendarMemberInviteContext,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

function attendeesSignature(attendees: CareCalendarAttendee[] | undefined): string {
  if (!attendees?.length) return '';
  return attendees
    .map(
      (attendee) =>
        `${attendee.contactId}:${attendee.response ?? 'pending'}:${attendee.respondedAt ?? ''}:${attendee.respondedByUid ?? ''}`,
    )
    .join('|');
}

function entryTimingSignature(timing: {
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
}): string {
  return `${timing.startDateKey}|${timing.startTimeMinutes ?? ''}|${timing.endTimeMinutes ?? ''}`;
}

export function CircleCareCalendarInviteRsvpBar({
  db,
  patientId,
  entryId,
  attendees,
  memberUid,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  inviteeContactIds,
  inviteeMemberUidByContactId,
  memberRole,
  startDateKey,
  startTimeMinutes,
  endTimeMinutes,
  eventStatus,
  t,
  className,
}: {
  db: Firestore;
  patientId: string;
  entryId: string;
  attendees?: CareCalendarAttendee[];
  memberUid?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  inviteeContactIds?: string[];
  inviteeMemberUidByContactId?: Record<string, string>;
  memberRole?: string;
  startDateKey?: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  eventStatus?: 'past' | 'today' | 'upcoming';
  t: (path: string, params?: Record<string, unknown>) => string;
  className?: string;
}) {
  const inviteContext = useMemo<CareCalendarMemberInviteContext>(
    () => ({
      memberUid: memberUid ?? '',
      contactId: memberContactId,
      memberDocContactId,
      inviteContactId,
      displayName: memberDisplayName,
    }),
    [inviteContactId, memberContactId, memberDisplayName, memberDocContactId, memberUid],
  );

  const [liveAttendees, setLiveAttendees] = useState<CareCalendarAttendee[] | undefined>(attendees);
  const [response, setResponse] = useState<CareCalendarAttendeeResponse>('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryTiming, setEntryTiming] = useState({
    startDateKey: startDateKey ?? '',
    startTimeMinutes,
    endTimeMinutes,
  });

  const inviteContextRef = useRef(inviteContext);
  inviteContextRef.current = inviteContext;
  const attendeesFallbackRef = useRef(attendees);
  attendeesFallbackRef.current = attendees;
  const inviteeUidMapRef = useRef(inviteeMemberUidByContactId);
  inviteeUidMapRef.current = inviteeMemberUidByContactId;
  const timingPropsRef = useRef({ startDateKey, startTimeMinutes, endTimeMinutes });
  timingPropsRef.current = { startDateKey, startTimeMinutes, endTimeMinutes };
  const liveAttendeesSigRef = useRef(attendeesSignature(attendees));
  const entryTimingSigRef = useRef(entryTimingSignature(entryTiming));
  const responseRef = useRef<CareCalendarAttendeeResponse>('pending');

  const mergedAttendees = liveAttendees;

  const resolvedContactId = useMemo(
    () =>
      resolveCareCalendarRsvpContactIdForEntry(
        {
          inviteeContactIds,
          inviteeMemberUidByContactId,
          attendees: mergedAttendees,
        },
        inviteContext,
      ),
    [inviteContext, inviteeContactIds, inviteeMemberUidByContactId, mergedAttendees],
  );

  const self = findCareCalendarAttendeeForMember(mergedAttendees, inviteContext);

  useEffect(() => {
    if (!entryId) return;
    const ref = doc(db, 'patients', patientId, 'care_calendar', entryId);
    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        if (!data) return;
        const rawAttendees = Array.isArray(data.attendees)
          ? (data.attendees as CareCalendarAttendee[])
          : attendeesFallbackRef.current;
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
        const merged = mergeAttendeeResponses(rawAttendees, summary, uidMap);
        const mergedSig = attendeesSignature(merged);
        if (mergedSig !== liveAttendeesSigRef.current) {
          liveAttendeesSigRef.current = mergedSig;
          setLiveAttendees(merged);
        }

        const liveSelf = findCareCalendarAttendeeForMember(merged, inviteContextRef.current);
        const liveResponse = liveSelf?.response ?? 'pending';
        if (liveResponse !== responseRef.current) {
          responseRef.current = liveResponse;
          setResponse(liveResponse);
        }

        const timingProps = timingPropsRef.current;
        const nextTiming = {
          startDateKey: String(data.startDateKey || timingProps.startDateKey || ''),
          startTimeMinutes:
            data.startTimeMinutes != null ? Number(data.startTimeMinutes) : timingProps.startTimeMinutes,
          endTimeMinutes:
            data.endTimeMinutes != null ? Number(data.endTimeMinutes) : timingProps.endTimeMinutes,
        };
        const nextTimingSig = entryTimingSignature(nextTiming);
        if (nextTimingSig !== entryTimingSigRef.current) {
          entryTimingSigRef.current = nextTimingSig;
          setEntryTiming(nextTiming);
        }
      },
      () => {
        // Read may be denied for legacy entries; RSVP still works via attendeeResponseSummary update.
      },
    );
  }, [db, entryId, patientId]);

  const isPast =
    eventStatus === 'past' ||
    (entryTiming.startDateKey
      ? isCareCalendarAppointmentPast(
          entryTiming.startDateKey,
          entryTiming.startTimeMinutes,
          entryTiming.endTimeMinutes,
        )
      : false);

  if (
    isPast ||
    !self ||
    !resolvedContactId ||
    !memberUid ||
    !attendeeNeedsAppointmentInvite(self)
  ) {
    return null;
  }

  const handleRespond = async (next: 'accepted' | 'declined') => {
    if (busy || !resolvedContactId) return;
    setBusy(true);
    setError(null);
    try {
      await respondToCareCalendarInvite(
        db,
        patientId,
        entryId,
        resolvedContactId,
        memberUid,
        next,
        {
          managedContactId: memberContactId,
          memberDocContactId,
          inviteContactId,
          displayName: memberDisplayName,
          memberRole,
        },
      );
    } catch (err) {
      responseRef.current = 'pending';
      setResponse('pending');
      setError(err instanceof Error ? err.message : t('circle.appointmentInviteRespondFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (response === 'accepted' || response === 'declined') {
    return (
      <p className={cn('text-sm font-semibold text-slate-700', className)}>
        {response === 'accepted'
          ? t('circle.appointmentInviteYouAccepted')
          : t('circle.appointmentInviteYouDeclined')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-2 rounded-xl border border-violet-100 bg-violet-50/70 p-3', className)}>
      <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
        {t('dashboard.careCalendar.legendAppointment')}
      </p>
      <p className="text-sm text-slate-700">{t('circle.appointmentInviteRespondPrompt')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRespond('accepted')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : null}
          {t('circle.appointmentInviteAccept')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRespond('declined')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {t('circle.appointmentInviteDecline')}
        </button>
      </div>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
