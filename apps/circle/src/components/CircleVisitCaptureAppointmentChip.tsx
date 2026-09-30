/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { Calendar } from 'lucide-react';
import { formatCareCalendarTimeRange } from '@medxforce/shared';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { formatCircleDate } from '../lib/circleLanguages';

type LinkedAppointment = {
  title: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  timezoneId?: string;
};

export function CircleVisitCaptureAppointmentChip({
  db,
  patientId,
  entryId,
  t,
  onOpen,
}: {
  db: Firestore;
  patientId: string;
  entryId: string;
  t: CircleTranslator;
  onOpen?: (entryId: string, dateKey: string) => void;
}) {
  const { language } = useCircleI18nContext();
  const [entry, setEntry] = useState<LinkedAppointment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const trimmed = entryId.trim();
    if (!trimmed) {
      setEntry(null);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    const ref = doc(db, 'patients', patientId, 'care_calendar', trimmed);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setEntry(null);
          setLoaded(true);
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        const startDateKey = String(data.startDateKey || '').trim();
        const title = String(data.title || '').trim();
        if (!startDateKey && !title) {
          setEntry(null);
          setLoaded(true);
          return;
        }
        const startTimeMinutes =
          data.startTimeMinutes != null && Number.isFinite(Number(data.startTimeMinutes))
            ? Number(data.startTimeMinutes)
            : undefined;
        const endTimeMinutes =
          data.endTimeMinutes != null && Number.isFinite(Number(data.endTimeMinutes))
            ? Number(data.endTimeMinutes)
            : undefined;
        const timezoneId = data.timezoneId ? String(data.timezoneId).trim() : undefined;
        setEntry({
          title,
          startDateKey,
          ...(startTimeMinutes != null ? { startTimeMinutes } : {}),
          ...(endTimeMinutes != null ? { endTimeMinutes } : {}),
          ...(timezoneId ? { timezoneId } : {}),
        });
        setLoaded(true);
      },
      () => {
        setEntry(null);
        setLoaded(true);
      },
    );
  }, [db, entryId, patientId]);

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

  if (!loaded) return null;

  if (!entry) {
    return (
      <p className="text-xs font-medium text-slate-500">
        {t('circle.captureAppointmentMissing')}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
        {t('circle.captureLinkedAppointment')}
      </p>
      <div className="min-w-0">
        {entry.title ? (
          <p className="text-sm font-bold text-slate-900 leading-snug">{entry.title}</p>
        ) : null}
        {scheduleLine ? (
          <p className="text-xs text-slate-600 font-medium mt-0.5">{scheduleLine}</p>
        ) : null}
      </div>
      {onOpen && entry.startDateKey ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(entryId, entry.startDateKey);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-50 transition-colors"
        >
          <Calendar size={14} className="shrink-0" aria-hidden />
          {t('circle.captureOpenAppointment')}
        </button>
      ) : null}
    </div>
  );
}
