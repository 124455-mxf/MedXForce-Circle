import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  attendeeNeedsAppointmentInvite,
  findCareCalendarAttendeeForMember,
  isCareCalendarAppointmentPast,
  respondToCareCalendarInvite,
  type CareCalendarAttendee,
  type CareCalendarMemberInviteContext,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

export function CircleCareCalendarInviteRsvpBar({
  db,
  patientId,
  entryId,
  attendees,
  memberUid,
  memberContactId,
  memberDocContactId,
  memberDisplayName,
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
  memberDisplayName?: string;
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
      displayName: memberDisplayName,
    }),
    [memberContactId, memberDisplayName, memberDocContactId, memberUid],
  );

  const self = findCareCalendarAttendeeForMember(attendees, inviteContext);
  const resolvedContactId = self?.contactId;
  const [response, setResponse] = useState(self?.response ?? 'pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryTiming, setEntryTiming] = useState({
    startDateKey: startDateKey ?? '',
    startTimeMinutes,
    endTimeMinutes,
  });

  useEffect(() => {
    setResponse(self?.response ?? 'pending');
  }, [self?.response]);

  useEffect(() => {
    if (!entryId) return;
    const ref = doc(db, 'patients', patientId, 'care_calendar', entryId);
    return onSnapshot(ref, (snap) => {
      const data = snap.data();
      const summary = data?.attendeeResponseSummary as
        | Record<string, { response?: string }>
        | undefined;
      if (resolvedContactId) {
        const fromSummary = summary?.[resolvedContactId]?.response;
        if (fromSummary === 'accepted' || fromSummary === 'declined') {
          setResponse(fromSummary);
        }
      }
      if (data) {
        setEntryTiming({
          startDateKey: String(data.startDateKey || startDateKey || ''),
          startTimeMinutes:
            data.startTimeMinutes != null ? Number(data.startTimeMinutes) : startTimeMinutes,
          endTimeMinutes:
            data.endTimeMinutes != null ? Number(data.endTimeMinutes) : endTimeMinutes,
        });
      }
    });
  }, [
    db,
    endTimeMinutes,
    entryId,
    patientId,
    resolvedContactId,
    startDateKey,
    startTimeMinutes,
  ]);

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
    if (busy) return;
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
      );
      setResponse(next);
    } catch (err) {
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
