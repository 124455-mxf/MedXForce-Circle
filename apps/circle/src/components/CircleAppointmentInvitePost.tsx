import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { Calendar, Mic, NotebookPen } from 'lucide-react';
import {
  APPOINTMENT_INVITE_POST_MARKER,
  appointmentInviteAttendeesFromPost,
  applyCareCalendarAttendeeDisplayNames,
  canOfferRecordVisitForAppointmentOnDate,
  canOfferVisitNotesForAppointmentOnDate,
  formatCareCalendarAttendeeSummary,
  formatCareCalendarTimeRange,
  hasCareCalendarAddress,
  mergeAttendeeResponses,
  parseAttendeeResponseSummary,
  parseAppointmentInvitePost,
  type CareCalendarAddress,
  type CareCalendarAttendee,
  type CareCalendarEntryKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { formatCircleDate } from '../lib/circleLanguages';
import { useCareCalendarAttendeeOptions } from '../hooks/useCareCalendarAttendeeOptions';
import { CircleCareCalendarInviteRsvpBar } from './CircleCareCalendarInviteRsvpBar';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { CircleTranslatedUserText } from './CircleTranslatedUserText';
import { CircleCareCalendarForYouLine } from './CircleCareCalendarForYouLine';
import { cn } from '../lib/utils';
import { useCircleMemberTimeZone } from '../hooks/useCircleMemberTimeZone';

type LoadedCareCalendarEntry = {
  title: string;
  kind: CareCalendarEntryKind;
  details?: string;
  visitSubtype?: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  timezoneId?: string;
  attendees?: CareCalendarAttendee[];
  attendeeResponseSummary?: ReturnType<typeof parseAttendeeResponseSummary>;
  inviteeContactIds?: string[];
  inviteeMemberUidByContactId?: Record<string, string>;
  address?: CareCalendarAddress;
  supportingNotes?: string;
};

function parseAddressField(raw: unknown): CareCalendarAddress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const line1 = row.line1 != null ? String(row.line1).trim() : '';
  const suite = row.suite != null ? String(row.suite).trim() : row.line2 != null ? String(row.line2).trim() : '';
  const label = String(row.label || line1 || suite || '').trim();
  if (!label && !line1 && !suite) return undefined;
  const address: CareCalendarAddress = { label: label || line1 || suite || 'Location' };
  if (line1) address.line1 = line1;
  if (suite) address.suite = suite;
  if (row.city != null && String(row.city).trim()) address.city = String(row.city).trim();
  if (row.state != null && String(row.state).trim()) address.state = String(row.state).trim();
  if (row.postalCode != null && String(row.postalCode).trim()) {
    address.postalCode = String(row.postalCode).trim();
  }
  if (row.country != null && String(row.country).trim()) address.country = String(row.country).trim();
  const lat = row.latitude ?? row.lat;
  const lng = row.longitude ?? row.lng;
  if (lat != null && Number.isFinite(Number(lat))) address.latitude = Number(lat);
  if (lng != null && Number.isFinite(Number(lng))) address.longitude = Number(lng);
  return hasCareCalendarAddress(address) ? address : undefined;
}

function parseLoadedEntry(data: Record<string, unknown>): LoadedCareCalendarEntry {
  const kind = (['doctor', 'wellness', 'rehab', 'other'].includes(String(data.kind))
    ? data.kind
    : 'other') as CareCalendarEntryKind;
  return {
    title: String(data.title || '').trim(),
    kind,
    details: data.details ? String(data.details).trim() : undefined,
    visitSubtype: data.visitSubtype ? String(data.visitSubtype).trim() : undefined,
    startDateKey: String(data.startDateKey || ''),
    startTimeMinutes:
      data.startTimeMinutes != null ? Number(data.startTimeMinutes) : undefined,
    endTimeMinutes: data.endTimeMinutes != null ? Number(data.endTimeMinutes) : undefined,
    timezoneId:
      typeof data.timezoneId === 'string' && data.timezoneId.trim()
        ? data.timezoneId.trim()
        : undefined,
    attendees: Array.isArray(data.attendees)
      ? (data.attendees as CareCalendarAttendee[])
      : undefined,
    attendeeResponseSummary: parseAttendeeResponseSummary(data.attendeeResponseSummary),
    inviteeContactIds: Array.isArray(data.inviteeContactIds)
      ? data.inviteeContactIds.map((id) => String(id)).filter(Boolean)
      : undefined,
    inviteeMemberUidByContactId:
      data.inviteeMemberUidByContactId &&
      typeof data.inviteeMemberUidByContactId === 'object' &&
      !Array.isArray(data.inviteeMemberUidByContactId)
        ? Object.fromEntries(
            Object.entries(data.inviteeMemberUidByContactId as Record<string, unknown>)
              .map(([key, value]) => [key, String(value)])
              .filter(([, value]) => Boolean(value)),
          )
        : undefined,
    address: parseAddressField(data.address),
    supportingNotes: data.supportingNotes ? String(data.supportingNotes).trim() : undefined,
  };
}

function fallbackLinesFromPost(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('entry:');
  });
}

export function CircleAppointmentInvitePost({
  post,
  db,
  patientId,
  memberUid,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  t,
  disableTruncate = false,
  onRecordVisit,
  onTakeNotes,
}: {
  post: CircleMemberThreadPost;
  db: Firestore;
  patientId: string;
  memberUid: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  t: CircleTranslator;
  disableTruncate?: boolean;
  onRecordVisit?: (entryId?: string) => void;
  onTakeNotes?: (entryId: string, dateKey: string) => void;
}) {
  const parsed = useMemo(() => parseAppointmentInvitePost(post), [post]);
  const [entry, setEntry] = useState<LoadedCareCalendarEntry | null>(null);
  const [entryLoaded, setEntryLoaded] = useState(false);

  const { language } = useCircleI18nContext();
  const { timezoneId: viewerTimezoneId } = useCircleMemberTimeZone(db, { uid: memberUid });
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);
  const attendeeOptions = useCareCalendarAttendeeOptions(db, patientId);
  const nameByContactId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of attendeeOptions) {
      if (option.contactId && option.name) map[option.contactId] = option.name;
    }
    return map;
  }, [attendeeOptions]);

  const entryId = post.careCalendarEntryId || parsed?.entryId || '';
  const fallbackAttendees = useMemo(
    () => appointmentInviteAttendeesFromPost(post, parsed),
    [parsed, post],
  );
  const rsvpAttendees = useMemo(
    () =>
      applyCareCalendarAttendeeDisplayNames(
        mergeAttendeeResponses(
          entry?.attendees ?? fallbackAttendees,
          entry?.attendeeResponseSummary,
          entry?.inviteeMemberUidByContactId,
        ) ?? fallbackAttendees,
        {
          nameByContactId,
          selfContactIds: [memberContactId, memberDocContactId, inviteContactId].filter(
            (id): id is string => Boolean(id),
          ),
          selfDisplayName: memberDisplayName,
        },
      ),
    [
      entry?.attendeeResponseSummary,
      entry?.attendees,
      entry?.inviteeMemberUidByContactId,
      fallbackAttendees,
      inviteContactId,
      memberContactId,
      memberDisplayName,
      memberDocContactId,
      nameByContactId,
    ],
  );
  const inviteeContactIds = entry?.inviteeContactIds?.length
    ? entry.inviteeContactIds
    : post.inviteeContactIds;

  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setEntryLoaded(true);
      return;
    }
    setEntryLoaded(false);
    const ref = doc(db, 'patients', patientId, 'care_calendar', entryId);
    return onSnapshot(
      ref,
      (snap) => {
        setEntry(snap.exists() ? parseLoadedEntry(snap.data() as Record<string, unknown>) : null);
        setEntryLoaded(true);
      },
      () => {
        setEntry(null);
        setEntryLoaded(true);
      },
    );
  }, [db, entryId, patientId]);

  const rawTitle = entry?.title || parsed?.title || '';
  const displayTitle = rawTitle || post.authorName;
  const kindLabel = ct(`kinds.${entry?.kind ?? parsed?.kind ?? 'doctor'}`);
  const visitSubtype = entry?.visitSubtype ?? parsed?.visitSubtype;

  const scheduleLine = useMemo(() => {
    if (!entry?.startDateKey) return null;
    const dateLabel = formatCircleDate(new Date(`${entry.startDateKey}T12:00:00`), language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeLabel = formatCareCalendarTimeRange(
      entry.startTimeMinutes,
      entry.endTimeMinutes,
      entry.timezoneId,
    );
    return `${dateLabel}${timeLabel ? ` · ${timeLabel}` : ''}`;
  }, [entry, language]);

  const goingWith = rsvpAttendees?.length
    ? formatCareCalendarAttendeeSummary(rsvpAttendees, { excludePatient: true })
    : parsed?.inviteeNames.length
      ? parsed.inviteeNames.join(', ')
      : '';

  const fallbackLines = useMemo(() => fallbackLinesFromPost(post.text), [post.text]);

  const showRecordVisit = useMemo(() => {
    if (!onRecordVisit || !entryId || !entry?.startDateKey) return false;
    return canOfferRecordVisitForAppointmentOnDate(
      entry.kind,
      entry.startDateKey,
      entry.startTimeMinutes,
      entry.endTimeMinutes,
    );
  }, [entry, entryId, onRecordVisit]);

  const showTakeNotes = useMemo(() => {
    if (!onTakeNotes || !entryId || !entry?.startDateKey) return false;
    return canOfferVisitNotesForAppointmentOnDate(
      entry.kind,
      entry.startDateKey,
      entry.startTimeMinutes,
      entry.endTimeMinutes,
    );
  }, [entry, entryId, onTakeNotes]);

  const visitActions =
    showRecordVisit || showTakeNotes ? (
      <div className={cn('grid gap-2', showRecordVisit && showTakeNotes && 'grid-cols-2')}>
        {showRecordVisit ? (
          <button
            type="button"
            onClick={() => onRecordVisit?.(entryId)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200/80"
          >
            <Mic size={16} className="shrink-0" aria-hidden />
            {ct('episode.recordVisit')}
          </button>
        ) : null}
        {showTakeNotes ? (
          <button
            type="button"
            onClick={() => onTakeNotes?.(entryId, entry?.startDateKey ?? '')}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors',
              showRecordVisit
                ? 'border-2 border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/80',
            )}
          >
            <NotebookPen size={16} className="shrink-0" aria-hidden />
            {ct('episode.takeNotes')}
          </button>
        ) : null}
      </div>
    ) : null;

  if (!parsed && !entryLoaded) {
    return (
      <p
        className={cn(
          'text-slate-700 font-medium whitespace-pre-wrap',
          disableTruncate ? '' : 'line-clamp-6',
        )}
      >
        {post.text}
      </p>
    );
  }

  if (!entry && entryLoaded) {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
          {t('dashboard.careCalendar.legendAppointment')}
        </p>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-lg bg-violet-100 p-1.5 text-violet-700">
            <Calendar size={14} aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            {fallbackLines.map((line, index) => {
              const displayLine =
                index === 0 && line.startsWith(APPOINTMENT_INVITE_POST_MARKER)
                  ? line.slice(APPOINTMENT_INVITE_POST_MARKER.length).trim()
                  : line;
              return (
                <CircleTranslatedUserText
                  key={`${index}-${line}`}
                  text={displayLine}
                  className={cn(
                    'text-slate-700',
                    index === 0 ? 'font-bold text-slate-900' : 'text-sm font-medium',
                    !disableTruncate && index > 0 ? 'line-clamp-2' : '',
                  )}
                />
              );
            })}
          </div>
        </div>
        {entryId ? (
          <CircleCareCalendarInviteRsvpBar
            db={db}
            patientId={patientId}
            entryId={entryId}
            attendees={rsvpAttendees}
            memberUid={memberUid}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            inviteeContactIds={inviteeContactIds}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
            t={t}
          />
        ) : null}
      </div>
    );
  }

  const timeRangeLabel =
    formatCareCalendarTimeRange(entry?.startTimeMinutes, entry?.endTimeMinutes, entry?.timezoneId) ?? '';

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 overflow-hidden">
        {scheduleLine && timeRangeLabel ? (
          <div className="flex items-stretch gap-0 border-b border-violet-100">
            <div className="shrink-0 w-16 bg-violet-100/80 border-r border-violet-100 flex flex-col items-center justify-center px-2 py-3">
              <span className="text-xs font-bold text-violet-800 text-center leading-tight">
                {timeRangeLabel.split(' – ')[0]}
              </span>
              {timeRangeLabel.includes(' – ') ? (
                <span className="text-[10px] text-violet-600 mt-1 text-center">
                  {timeRangeLabel.split(' – ')[1]}
                </span>
              ) : null}
            </div>
            <div className="flex-1 py-3 px-3 min-w-0">
              {rawTitle ? (
                <CircleTranslatedUserText
                  text={rawTitle}
                  className="text-base font-bold text-slate-900"
                />
              ) : (
                <p className="text-base font-bold text-slate-900">{displayTitle}</p>
              )}
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mt-0.5">
                {kindLabel}
                {visitSubtype ? ` · ${ct(`visitSubtype.${visitSubtype}`)}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 border-b border-violet-100">
            {rawTitle ? (
              <CircleTranslatedUserText
                text={rawTitle}
                className="text-base font-bold text-slate-900"
              />
            ) : (
              <p className="text-base font-bold text-slate-900">{displayTitle}</p>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mt-0.5">
              {kindLabel}
              {visitSubtype ? ` · ${ct(`visitSubtype.${visitSubtype}`)}` : ''}
            </p>
          </div>
        )}

        <div className="px-3 py-3 space-y-2">
          {entry?.startDateKey ? (
            <CircleCareCalendarForYouLine
              dateKey={entry.startDateKey}
              startMinutes={entry.startTimeMinutes}
              endMinutes={entry.endTimeMinutes}
              eventTimeZoneId={entry.timezoneId}
              viewerTimeZoneId={viewerTimezoneId}
              t={t}
            />
          ) : null}
          {entry?.details ? (
            <CircleTranslatedUserText
              text={entry.details}
              className={cn(
                'text-sm text-slate-600 whitespace-pre-wrap',
                disableTruncate ? '' : 'line-clamp-6',
              )}
            />
          ) : null}
          {goingWith ? (
            <p className="text-sm text-slate-600">
              {ct('fields.attendeesWith')}: {goingWith}
            </p>
          ) : null}
          {entry?.supportingNotes ? (
            <CircleTranslatedUserText
              text={entry.supportingNotes}
              className={cn(
                'text-sm text-slate-500 whitespace-pre-wrap',
                disableTruncate ? '' : 'line-clamp-4',
              )}
            />
          ) : null}
          {entry?.address ? <CircleCareCalendarMapsLinks address={entry.address} ct={ct} /> : null}
        </div>
      </div>

      {visitActions}

      {entryId ? (
        <CircleCareCalendarInviteRsvpBar
          db={db}
          patientId={patientId}
          entryId={entryId}
          attendees={rsvpAttendees}
          memberUid={memberUid}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          inviteeContactIds={inviteeContactIds}
          inviteeMemberUidByContactId={entry?.inviteeMemberUidByContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
          startDateKey={entry?.startDateKey}
          startTimeMinutes={entry?.startTimeMinutes}
          endTimeMinutes={entry?.endTimeMinutes}
          timezoneId={entry?.timezoneId}
          t={t}
        />
      ) : null}
    </div>
  );
}
