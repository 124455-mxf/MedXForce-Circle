/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { CircleCareCalendarAddressFields } from './CircleCareCalendarAddressFields';
import { CircleCareCalendarAttendeeFields } from './CircleCareCalendarAttendeeFields';
import { CircleCareCalendarAppointmentEpisodeFields, CircleCareCalendarAppointmentTaskFields } from './CircleCareCalendarAppointmentFields';
import { CareCalendarDiscardConfirmModal } from './CareCalendarDiscardConfirmModal';
import { CircleCareCalendarDurationSelect } from './CircleCareCalendarDurationSelect';
import { CircleCareCalendarTimeSelect } from './CircleCareCalendarTimeSelect';
import {
  CARE_CALENDAR_KINDS,
  CARE_CALENDAR_MIN_DURATION_MINUTES,
  careCalendarDateKey,
  careCalendarDurationFromRange,
  careCalendarEndMinutesFromDuration,
  careCalendarTimeInputValue,
  clampCareCalendarDurationMinutes,
  defaultCareCalendarStartTimeForDate,
  defaultWeeklyRecurrenceDays,
  hasCareCalendarAddress,
  parseCareCalendarTimeInput,
  type CareCalendarAddress,
  type CareCalendarAttendee,
  type CareCalendarEntry,
  type CareCalendarEntryKind,
  type CareCalendarRecurrence,
  defaultNewCircleCareCalendarAttendees,
  sanitizeCareCalendarAttendees,
  defaultAppointmentTasksForSubtype,
  defaultVisitSubtypeForKind,
  sanitizeCareCalendarAppointmentTasks,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTask,
  type CareCalendarVisitSubtype,
  type CircleMemberRole,
} from '@medxforce/shared';
import {
  cancelCareCalendarEntry,
  createCareCalendarEntry,
  updateCareCalendarEntry,
  type CareCalendarEntryInput,
  type CareCalendarInviteContext,
} from '../services/careCalendarService';
import { useCareCalendarAttendeeOptions } from '../hooks/useCareCalendarAttendeeOptions';
import { cn } from '../lib/utils';

type CircleCareCalendarEntryModalProps = {
  open: boolean;
  db: Firestore;
  patientId: string;
  authorName: string;
  authorUid: string;
  authorRole: CircleMemberRole;
  organizerContactId?: string;
  organizerContactReady?: boolean;
  initialDateKey?: string;
  editingEntry?: CareCalendarEntry | null;
  t: (path: string, params?: Record<string, unknown>) => string;
  onClose: () => void;
  onSaved?: () => void;
};

type RecurrenceMode = 'once' | 'daily' | 'weekly' | 'monthly';

function emptyAddress(): CareCalendarAddress {
  return { label: '', line1: '', city: '', state: '', postalCode: '', country: '' };
}

export function CircleCareCalendarEntryModal({
  open,
  db,
  patientId,
  authorName,
  authorUid,
  authorRole,
  organizerContactId,
  organizerContactReady = true,
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
  const [startTime, setStartTime] = useState(() => defaultCareCalendarStartTimeForDate(todayKey));
  const [durationMinutes, setDurationMinutes] = useState(CARE_CALENDAR_MIN_DURATION_MINUTES);
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('once');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([new Date().getDay()]);
  const [untilDateKey, setUntilDateKey] = useState('');
  const [address, setAddress] = useState<CareCalendarAddress>(emptyAddress());
  const [attendees, setAttendees] = useState<CareCalendarAttendee[]>([]);
  const [visitSubtype, setVisitSubtype] = useState<CareCalendarVisitSubtype | undefined>('primary_care');
  const [doctorName, setDoctorName] = useState('');
  const [supportingNotes, setSupportingNotes] = useState('');
  const [appointmentTasks, setAppointmentTasks] = useState<CareCalendarAppointmentTask[]>([]);
  const [busy, setBusy] = useState(false);
  const attendeeOptions = useCareCalendarAttendeeOptions(db, patientId);
  const [error, setError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const hasDraftContent = useMemo(() => {
    if (editingEntry) return false;
    if (title.trim() || details.trim() || supportingNotes.trim() || doctorName.trim()) return true;
    if (attendees.length > 0) return true;
    if (hasCareCalendarAddress(address)) return true;
    if (appointmentTasks.some((task) => task.text?.trim())) return true;
    return false;
  }, [address, appointmentTasks, attendees.length, details, doctorName, editingEntry, supportingNotes, title]);

  const requestClose = () => {
    if (hasDraftContent) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingEntry) {
      setKind(editingEntry.kind);
      setTitle(editingEntry.title);
      setDetails(editingEntry.details || '');
      setStartDateKey(editingEntry.startDateKey);
      setStartTime(careCalendarTimeInputValue(editingEntry.startTimeMinutes) || '09:00');
      setDurationMinutes(
        careCalendarDurationFromRange(
          editingEntry.startTimeMinutes,
          editingEntry.endTimeMinutes,
        ),
      );
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
      setAttendees(
        editingEntry.attendees ? sanitizeCareCalendarAttendees(editingEntry.attendees) : [],
      );
      setVisitSubtype(editingEntry.visitSubtype);
      setDoctorName(editingEntry.doctorName || '');
      setSupportingNotes(editingEntry.supportingNotes || '');
      setAppointmentTasks(editingEntry.appointmentTasks ?? []);
    } else {
      setKind('doctor');
      setTitle('');
      setDetails('');
      const dateKey = initialDateKey || todayKey;
      setStartDateKey(dateKey);
      setStartTime(defaultCareCalendarStartTimeForDate(dateKey));
      setDurationMinutes(CARE_CALENDAR_MIN_DURATION_MINUTES);
      setRecurrenceMode('once');
      setWeeklyDays(defaultWeeklyRecurrenceDays(dateKey));
      setUntilDateKey('');
      setAddress(emptyAddress());
      setAttendees([]);
      const defaultSubtype = defaultVisitSubtypeForKind('doctor');
      setVisitSubtype(defaultSubtype);
      setDoctorName('');
      setSupportingNotes('');
      setAppointmentTasks(defaultAppointmentTasksForSubtype(defaultSubtype));
    }
  }, [open, editingEntry, initialDateKey, todayKey]);

  const handleKindChange = (nextKind: CareCalendarEntryKind) => {
    setKind(nextKind);
    if (!editingEntry && supportsCareCalendarAppointmentEpisode(nextKind)) {
      const subtype = defaultVisitSubtypeForKind(nextKind);
      setVisitSubtype(subtype);
      setAppointmentTasks(defaultAppointmentTasksForSubtype(subtype));
    }
    if (!supportsCareCalendarAppointmentEpisode(nextKind)) {
      setVisitSubtype(undefined);
      setSupportingNotes('');
      setAppointmentTasks([]);
    }
  };

  const handleVisitSubtypeChange = (subtype: CareCalendarVisitSubtype | undefined) => {
    setVisitSubtype(subtype);
    if (!editingEntry && subtype) {
      setAppointmentTasks(defaultAppointmentTasksForSubtype(subtype));
    }
  };

  useEffect(() => {
    if (!open || editingEntry || !organizerContactReady) return;

    const patientOption = attendeeOptions.find((option) => option.role === 'patient');
    if (!patientOption) return;

    if (
      organizerContactId &&
      !attendeeOptions.some((option) => option.contactId === organizerContactId)
    ) {
      return;
    }

    setAttendees((current) => {
      if (current.length > 0) return current;
      return defaultNewCircleCareCalendarAttendees(attendeeOptions, organizerContactId);
    });
  }, [open, editingEntry, attendeeOptions, organizerContactId, organizerContactReady]);

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

  const buildInput = (): CareCalendarEntryInput => {
    const startM = parseCareCalendarTimeInput(startTime);
    return {
      kind,
      title,
      details,
      startDateKey,
      startTimeMinutes: startM,
      endTimeMinutes:
        startM != null
          ? careCalendarEndMinutesFromDuration(startM, durationMinutes)
          : undefined,
    recurrence,
    address: hasCareCalendarAddress(address)
      ? {
          label: address.label.trim() || address.line1?.trim() || 'Location',
          line1: address.line1?.trim() || undefined,
          suite: address.suite?.trim() || undefined,
          city: address.city?.trim() || undefined,
          state: address.state?.trim() || undefined,
          postalCode: address.postalCode?.trim() || undefined,
          country: address.country?.trim() || undefined,
          latitude: address.latitude,
          longitude: address.longitude,
        }
      : undefined,
    attendees: (() => {
      const cleaned = sanitizeCareCalendarAttendees(attendees);
      return cleaned.length ? cleaned : undefined;
    })(),
    visitSubtype: supportsCareCalendarAppointmentEpisode(kind) ? visitSubtype : undefined,
    supportingNotes: supportsCareCalendarAppointmentEpisode(kind) ? supportingNotes : undefined,
    doctorName: kind === 'doctor' ? doctorName.trim() || undefined : undefined,
    appointmentTasks: supportsCareCalendarAppointmentEpisode(kind)
      ? sanitizeCareCalendarAppointmentTasks(appointmentTasks)
      : undefined,
    source: 'circle',
    createdByName: authorName,
    };
  };

  const handleStartDateKeyChange = (dateKey: string) => {
    setStartDateKey(dateKey);
    if (editingEntry) return;
    const nextStart = defaultCareCalendarStartTimeForDate(dateKey);
    setStartTime(nextStart);
    const startM = parseCareCalendarTimeInput(nextStart);
    if (startM != null) {
      setDurationMinutes((current) => clampCareCalendarDurationMinutes(startM, current));
    }
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    const startM = parseCareCalendarTimeInput(value);
    if (startM == null) return;
    setDurationMinutes((current) => clampCareCalendarDurationMinutes(startM, current));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError(ct('errors.titleRequired'));
      return;
    }
    const startM = parseCareCalendarTimeInput(startTime);
    if (startM == null) {
      setError(ct('errors.startTimeRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = buildInput();
      const inviteContext: CareCalendarInviteContext = {
        authorUid,
        authorRole,
        authorName,
        previousAttendees: editingEntry?.attendees,
      };
      if (editingEntry) {
        await updateCareCalendarEntry(db, patientId, editingEntry.id, input, inviteContext);
        onSaved?.();
        onClose();
      } else {
        const result = await createCareCalendarEntry(db, patientId, input, inviteContext);
        onSaved?.();
        if (result.inviteNotifyFailed) {
          setError(ct('errors.inviteNotifyFailed'));
          return;
        }
        onClose();
      }
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
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={requestClose}
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
                onClick={requestClose}
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
                    onClick={() => handleKindChange(k)}
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

              {kind === 'doctor' ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-slate-700">{ct('fields.doctorName')}</span>
                  <input
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    placeholder={ct('fields.doctorNamePlaceholder')}
                  />
                </label>
              ) : null}

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

              <CircleCareCalendarAppointmentEpisodeFields
                kind={kind}
                visitSubtype={visitSubtype}
                onVisitSubtypeChange={handleVisitSubtypeChange}
                supportingNotes={supportingNotes}
                onSupportingNotesChange={setSupportingNotes}
                t={ct}
              />

              <div className="space-y-3">
                <label className="block space-y-1.5 min-w-0">
                  <span className="text-sm font-bold text-slate-700">{ct('fields.date')}</span>
                  <input
                    type="date"
                    value={startDateKey}
                    onChange={(e) => handleStartDateKeyChange(e.target.value)}
                    className="w-full min-w-0 max-w-full box-border px-3 py-3 rounded-xl border border-slate-200"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1.5 min-w-0">
                    <span className="text-sm font-bold text-slate-700">{ct('fields.startTime')}</span>
                    <CircleCareCalendarTimeSelect
                      value={startTime}
                      onChange={handleStartTimeChange}
                      className="w-full min-w-0 max-w-full box-border px-3 py-3 rounded-xl border border-slate-200"
                      aria-label={ct('fields.startTime')}
                    />
                  </label>
                  <label className="block space-y-1.5 min-w-0">
                    <span className="text-sm font-bold text-slate-700">{ct('fields.duration')}</span>
                    <CircleCareCalendarDurationSelect
                      valueMinutes={durationMinutes}
                      onChange={setDurationMinutes}
                      startMinutes={parseCareCalendarTimeInput(startTime) ?? undefined}
                      formatOption={(minutes) =>
                        minutes < 60
                          ? ct('fields.durationMinutes', { count: minutes })
                          : minutes % 60 === 0
                            ? ct('fields.durationHours', { count: minutes / 60 })
                            : ct('fields.durationHoursMinutes', {
                                hours: Math.floor(minutes / 60),
                                minutes: minutes % 60,
                              })
                      }
                      className="w-full min-w-0 max-w-full box-border px-3 py-3 rounded-xl border border-slate-200"
                      aria-label={ct('fields.duration')}
                    />
                  </label>
                </div>
              </div>

              <CircleCareCalendarAttendeeFields
                options={attendeeOptions}
                attendees={attendees}
                onChange={setAttendees}
                translate={ct}
                roleLabel={(key) => {
                  const role = key.replace('circleRoles.', '');
                  return t(`dashboard.circleMap.roles.${role}`);
                }}
                searchPlaceholder={ct('fields.attendeeSearchPlaceholder')}
                searchNoMatches={ct('fields.attendeeSearchNoMatches')}
                caregiversSectionLabel={ct('fields.attendeesCaregiversSection')}
                familySectionLabel={ct('fields.attendeesFamilySection')}
                patientSectionLabel={ct('fields.attendeesPatientSection')}
              />

              <CircleCareCalendarAppointmentTaskFields
                kind={kind}
                visitSubtype={visitSubtype}
                appointmentTasks={appointmentTasks}
                onAppointmentTasksChange={setAppointmentTasks}
                t={ct}
                isEditing={!!editingEntry}
              />

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

              <CircleCareCalendarAddressFields
                address={address}
                onChange={setAddress}
                translate={ct}
              />

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
    <CareCalendarDiscardConfirmModal
      open={discardConfirmOpen}
      title={ct('discardConfirmTitle')}
      message={ct('discardConfirmDesc')}
      confirmLabel={ct('discardAction')}
      cancelLabel={ct('keepEditing')}
      onClose={() => setDiscardConfirmOpen(false)}
      onConfirm={() => {
        setDiscardConfirmOpen(false);
        onClose();
      }}
    />
    </>
  );
}
