/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { MapPin, X } from 'lucide-react';
import {
  CARE_CALENDAR_KINDS,
  careCalendarDateKey,
  defaultWeeklyRecurrenceDays,
  type CareCalendarAddress,
  type CareCalendarEntry,
  type CareCalendarEntryKind,
  type CareCalendarRecurrence,
} from '@medxforce/shared';
import {
  cancelCareCalendarEntry,
  createCareCalendarEntry,
  updateCareCalendarEntry,
  type CareCalendarEntryInput,
} from '../services/careCalendarService';
import { cn } from '../lib/utils';

type CircleCareCalendarEntryModalProps = {
  open: boolean;
  db: Firestore;
  patientId: string;
  authorName: string;
  initialDateKey?: string;
  editingEntry?: CareCalendarEntry | null;
  t: (path: string, params?: Record<string, unknown>) => string;
  onClose: () => void;
  onSaved?: () => void;
};

type RecurrenceMode = 'once' | 'daily' | 'weekly' | 'monthly';

function timeInputValue(minutes?: number): string {
  if (minutes == null || Number.isNaN(minutes)) return '';
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeInput(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return undefined;
  return h * 60 + m;
}

function emptyAddress(): CareCalendarAddress {
  return { label: '', line1: '', city: '', state: '', postalCode: '', country: '' };
}

export function CircleCareCalendarEntryModal({
  open,
  db,
  patientId,
  authorName,
  initialDateKey,
  editingEntry,
  t,
  onClose,
  onSaved,
}: CircleCareCalendarEntryModalProps) {
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const todayKey = careCalendarDateKey(new Date());
  const [kind, setKind] = useState<CareCalendarEntryKind>('doctor');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [startDateKey, setStartDateKey] = useState(todayKey);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('once');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([new Date().getDay()]);
  const [untilDateKey, setUntilDateKey] = useState('');
  const [address, setAddress] = useState<CareCalendarAddress>(emptyAddress());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingEntry) {
      setKind(editingEntry.kind);
      setTitle(editingEntry.title);
      setDetails(editingEntry.details || '');
      setStartDateKey(editingEntry.startDateKey);
      setStartTime(timeInputValue(editingEntry.startTimeMinutes) || '09:00');
      setEndTime(timeInputValue(editingEntry.endTimeMinutes));
      if (editingEntry.recurrence.type === 'daily') setRecurrenceMode('daily');
      else if (editingEntry.recurrence.type === 'weekly') setRecurrenceMode('weekly');
      else if (editingEntry.recurrence.type === 'monthly') setRecurrenceMode('monthly');
      else setRecurrenceMode('once');
      setWeeklyDays(
        editingEntry.recurrence.type === 'weekly'
          ? editingEntry.recurrence.daysOfWeek
          : defaultWeeklyRecurrenceDays(editingEntry.startDateKey),
      );
      const until =
        editingEntry.recurrence.type !== 'once'
          ? editingEntry.recurrence.untilDateKey || ''
          : '';
      setUntilDateKey(until);
      setAddress(editingEntry.address ? { ...emptyAddress(), ...editingEntry.address } : emptyAddress());
    } else {
      setKind('doctor');
      setTitle('');
      setDetails('');
      const dateKey = initialDateKey || todayKey;
      setStartDateKey(dateKey);
      setStartTime('09:00');
      setEndTime('');
      setRecurrenceMode('once');
      setWeeklyDays(defaultWeeklyRecurrenceDays(dateKey));
      setUntilDateKey('');
      setAddress(emptyAddress());
    }
  }, [open, editingEntry, initialDateKey, todayKey]);

  const recurrence = useMemo((): CareCalendarRecurrence => {
    if (recurrenceMode === 'daily') {
      return { type: 'daily', untilDateKey: untilDateKey || undefined };
    }
    if (recurrenceMode === 'weekly') {
      return {
        type: 'weekly',
        daysOfWeek: weeklyDays.length ? weeklyDays : defaultWeeklyRecurrenceDays(startDateKey),
        untilDateKey: untilDateKey || undefined,
      };
    }
    if (recurrenceMode === 'monthly') {
      return { type: 'monthly', untilDateKey: untilDateKey || undefined };
    }
    return { type: 'once' };
  }, [recurrenceMode, weeklyDays, untilDateKey, startDateKey]);

  const buildInput = (): CareCalendarEntryInput => ({
    kind,
    title,
    details,
    startDateKey,
    startTimeMinutes: parseTimeInput(startTime),
    endTimeMinutes: parseTimeInput(endTime),
    recurrence,
    address: address.label.trim()
      ? {
          label: address.label.trim(),
          line1: address.line1?.trim() || undefined,
          city: address.city?.trim() || undefined,
          state: address.state?.trim() || undefined,
          postalCode: address.postalCode?.trim() || undefined,
          country: address.country?.trim() || undefined,
        }
      : undefined,
    source: 'circle',
    createdByName: authorName,
  });

  const handleSave = async () => {
    if (!title.trim()) {
      setError(ct('errors.titleRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = buildInput();
      if (editingEntry) {
        await updateCareCalendarEntry(db, patientId, editingEntry.id, input);
      } else {
        await createCareCalendarEntry(db, patientId, input);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : ct('errors.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEntry = async () => {
    if (!editingEntry) return;
    setBusy(true);
    try {
      await cancelCareCalendarEntry(db, patientId, editingEntry.id);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : ct('errors.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingEntry ? ct('editTitle') : ct('addTitle')}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                {CARE_CALENDAR_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors',
                      kind === k
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-slate-50 text-slate-600 border-slate-100',
                    )}
                  >
                    {ct(`kinds.${k}`)}
                  </button>
                ))}
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700">{ct('fields.title')}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  placeholder={ct('fields.titlePlaceholder')}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700">{ct('fields.details')}</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 resize-none"
                  placeholder={ct('fields.detailsPlaceholder')}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block space-y-1.5 sm:col-span-1">
                  <span className="text-sm font-bold text-slate-700">{ct('fields.date')}</span>
                  <input
                    type="date"
                    value={startDateKey}
                    onChange={(e) => setStartDateKey(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-slate-700">{ct('fields.startTime')}</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-slate-700">{ct('fields.endTime')}</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-700">{ct('fields.recurrence')}</span>
                <div className="flex flex-wrap gap-2">
                  {(['once', 'daily', 'weekly', 'monthly'] as RecurrenceMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRecurrenceMode(mode)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-bold border',
                        recurrenceMode === mode
                          ? 'bg-violet-100 text-violet-700 border-violet-200'
                          : 'bg-white text-slate-500 border-slate-100',
                      )}
                    >
                      {ct(`recurrence.${mode}`)}
                    </button>
                  ))}
                </div>
                {recurrenceMode === 'weekly' && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekday(day)}
                        className={cn(
                          'w-10 h-10 rounded-xl text-xs font-bold',
                          weeklyDays.includes(day)
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        {t(`remoteSettings.assessmentSchedule.weekdayShort.${day}`)}
                      </button>
                    ))}
                  </div>
                )}
                {recurrenceMode !== 'once' && (
                  <label className="block space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-slate-500">{ct('fields.until')}</span>
                    <input
                      type="date"
                      value={untilDateKey}
                      onChange={(e) => setUntilDateKey(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <MapPin size={18} />
                  <span>{ct('fields.location')}</span>
                </div>
                <input
                  value={address.label}
                  onChange={(e) => setAddress((a) => ({ ...a, label: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  placeholder={ct('fields.locationLabel')}
                />
                <input
                  value={address.line1 || ''}
                  onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                  placeholder={ct('fields.addressLine')}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={address.city || ''}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                    placeholder={ct('fields.city')}
                  />
                  <input
                    value={address.state || ''}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                    placeholder={ct('fields.state')}
                  />
                </div>
              </div>

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {editingEntry && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCancelEntry()}
                    className="px-4 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 disabled:opacity-50"
                  >
                    {ct('cancelEntry')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSave()}
                  className="flex-1 px-4 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-50"
                >
                  {busy ? ct('saving') : ct('save')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
