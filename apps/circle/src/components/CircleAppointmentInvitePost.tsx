import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { Calendar } from 'lucide-react';
import {
  APPOINTMENT_INVITE_POST_MARKER,
  formatCareCalendarAttendeeSummary,
  formatCareCalendarTimeRange,
  hasCareCalendarAddress,
  parseAppointmentInvitePost,
  type CareCalendarAddress,
  type CareCalendarAttendee,
  type CareCalendarEntryKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { CircleCareCalendarInviteRsvpBar } from './CircleCareCalendarInviteRsvpBar';
import { CircleCareCalendarMapsLinks } from './CircleCareCalendarMapsLinks';
import { cn } from '../lib/utils';

type LoadedCareCalendarEntry = {
  title: string;
  kind: CareCalendarEntryKind;
  details?: string;
  visitSubtype?: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  attendees?: CareCalendarAttendee[];
  address?: CareCalendarAddress;
  supportingNotes?: string;
};

function parseAddressField(raw: unknown): CareCalendarAddress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const address: CareCalendarAddress = {
    ...(row.label ? { label: String(row.label) } : {}),
    ...(row.line1 ? { line1: String(row.line1) } : {}),
    ...(row.line2 ? { line2: String(row.line2) } : {}),
    ...(row.city ? { city: String(row.city) } : {}),
    ...(row.state ? { state: String(row.state) } : {}),
    ...(row.postalCode ? { postalCode: String(row.postalCode) } : {}),
    ...(row.country ? { country: String(row.country) } : {}),
    ...(row.placeId ? { placeId: String(row.placeId) } : {}),
    ...(row.lat != null ? { lat: Number(row.lat) } : {}),
    ...(row.lng != null ? { lng: Number(row.lng) } : {}),
  };
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
    attendees: Array.isArray(data.attendees)
      ? (data.attendees as CareCalendarAttendee[])
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
  memberDisplayName,
  t,
  disableTruncate = false,
}: {
  post: CircleMemberThreadPost;
  db: Firestore;
  patientId: string;
  memberUid: string;
  memberContactId?: string;
  memberDocContactId?: string;
  memberDisplayName?: string;
  t: CircleTranslator;
  disableTruncate?: boolean;
}) {
  const parsed = useMemo(() => parseAppointmentInvitePost(post), [post]);
  const [entry, setEntry] = useState<LoadedCareCalendarEntry | null>(null);
  const [entryLoaded, setEntryLoaded] = useState(false);

  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const entryId = post.careCalendarEntryId || parsed?.entryId || '';

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

  const displayTitle = entry?.title || parsed?.title || post.authorName;
  const kindLabel = ct(`kinds.${entry?.kind ?? parsed?.kind ?? 'doctor'}`);
  const visitSubtype = entry?.visitSubtype ?? parsed?.visitSubtype;

  const scheduleLine = useMemo(() => {
    if (!entry?.startDateKey) return null;
    const dateLabel = new Date(`${entry.startDateKey}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeLabel = formatCareCalendarTimeRange(
      entry.startTimeMinutes,
      entry.endTimeMinutes,
    );
    return `${dateLabel}${timeLabel ? ` · ${timeLabel}` : ''}`;
  }, [entry]);

  const goingWith = entry?.attendees?.length
    ? formatCareCalendarAttendeeSummary(entry.attendees, { excludePatient: true })
    : parsed?.inviteeNames.length
      ? parsed.inviteeNames.join(', ')
      : '';

  const fallbackLines = useMemo(() => fallbackLinesFromPost(post.text), [post.text]);

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
            {fallbackLines.map((line, index) => (
              <p
                key={`${index}-${line}`}
                className={cn(
                  'text-slate-700',
                  index === 0 ? 'font-bold text-slate-900' : 'text-sm font-medium',
                  !disableTruncate && index > 0 ? 'line-clamp-2' : '',
                )}
              >
                {index === 0 && line.startsWith(APPOINTMENT_INVITE_POST_MARKER)
                  ? line.slice(APPOINTMENT_INVITE_POST_MARKER.length).trim()
                  : line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const timeRangeLabel = formatCareCalendarTimeRange(
    entry?.startTimeMinutes,
    entry?.endTimeMinutes,
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 overflow-hidden">
        {scheduleLine ? (
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
              <p className="text-base font-bold text-slate-900">{displayTitle}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mt-0.5">
                {kindLabel}
                {visitSubtype ? ` · ${visitSubtype}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 border-b border-violet-100">
            <p className="text-base font-bold text-slate-900">{displayTitle}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mt-0.5">
              {kindLabel}
              {visitSubtype ? ` · ${visitSubtype}` : ''}
            </p>
          </div>
        )}

        <div className="px-3 py-3 space-y-2">
          {entry?.details ? (
            <p
              className={cn(
                'text-sm text-slate-600 whitespace-pre-wrap',
                disableTruncate ? '' : 'line-clamp-6',
              )}
            >
              {entry.details}
            </p>
          ) : null}
          {goingWith ? (
            <p className="text-sm text-slate-600">
              {ct('fields.attendeesWith')}: {goingWith}
            </p>
          ) : null}
          {entry?.supportingNotes ? (
            <p
              className={cn(
                'text-sm text-slate-500 whitespace-pre-wrap',
                disableTruncate ? '' : 'line-clamp-4',
              )}
            >
              {entry.supportingNotes}
            </p>
          ) : null}
          {entry?.address ? <CircleCareCalendarMapsLinks address={entry.address} ct={ct} /> : null}
        </div>
      </div>

      {entryId ? (
        <CircleCareCalendarInviteRsvpBar
          db={db}
          patientId={patientId}
          entryId={entryId}
          attendees={entry?.attendees}
          memberUid={memberUid}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          memberDisplayName={memberDisplayName}
          startDateKey={entry?.startDateKey}
          startTimeMinutes={entry?.startTimeMinutes}
          endTimeMinutes={entry?.endTimeMinutes}
          t={t}
        />
      ) : null}
    </div>
  );
}
