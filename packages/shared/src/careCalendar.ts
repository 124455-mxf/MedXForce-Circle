/** @license SPDX-License-Identifier: Apache-2.0 */

import type {
  CareCalendarAppointmentTask,
  CareCalendarVisitSubtype,
} from './careCalendarAppointment';

export type CareCalendarEntryKind = 'doctor' | 'wellness' | 'rehab' | 'other';

export type CareCalendarRecurrence =
  | { type: 'once' }
  | { type: 'daily'; untilDateKey?: string }
  | { type: 'weekly'; daysOfWeek: number[]; untilDateKey?: string }
  | { type: 'monthly'; untilDateKey?: string };

export type CareCalendarAddress = {
  label: string;
  line1?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type CareCalendarAttendeeRole = 'proxy' | 'caregiver' | 'family' | 'friend' | 'patient' | 'other';

export type CareCalendarAttendeeResponse = 'pending' | 'accepted' | 'declined';

export type CareCalendarAttendee = {
  contactId: string;
  name: string;
  role: CareCalendarAttendeeRole;
  proxyTier?: 'primary' | 'backup';
  response?: CareCalendarAttendeeResponse;
  respondedAt?: number;
  respondedByUid?: string;
};

export type CareCalendarAttendeeResponseRecord = {
  response: Exclude<CareCalendarAttendeeResponse, 'pending'>;
  respondedAt: number;
  respondedByUid: string;
};

export type CareCalendarAttendeeResponseSummary = Record<
  string,
  CareCalendarAttendeeResponseRecord
>;

export type CareCalendarEntry = {
  id: string;
  patientId: string;
  kind: CareCalendarEntryKind;
  title: string;
  details?: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  recurrence: CareCalendarRecurrence;
  address?: CareCalendarAddress;
  attendees?: CareCalendarAttendee[];
  attendeeResponseSummary?: CareCalendarAttendeeResponseSummary;
  inviteeContactIds?: string[];
  inviteeMemberUids?: string[];
  /** contactId → circle member uid; used for RSVP permission on multi-invitee appointments. */
  inviteeMemberUidByContactId?: Record<string, string>;
  visitSubtype?: CareCalendarVisitSubtype;
  supportingNotes?: string;
  appointmentTasks?: CareCalendarAppointmentTask[];
  doctorName?: string;
  source: 'patient' | 'circle';
  createdByUid: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
  cancelledAt?: number;
};

export type CareCalendarDayEvent = {
  entryId: string;
  kind: CareCalendarEntryKind;
  title: string;
  details?: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  address?: CareCalendarAddress;
  attendees?: CareCalendarAttendee[];
  attendeeResponseSummary?: CareCalendarAttendeeResponseSummary;
  inviteeContactIds?: string[];
  inviteeMemberUidByContactId?: Record<string, string>;
  visitSubtype?: CareCalendarVisitSubtype;
  supportingNotes?: string;
  appointmentTasks?: CareCalendarAppointmentTask[];
  doctorName?: string;
  recurrence: CareCalendarRecurrence;
  source: 'patient' | 'circle';
  createdByName: string;
  status: 'past' | 'today' | 'upcoming';
};

export const CARE_CALENDAR_KINDS: CareCalendarEntryKind[] = [
  'doctor',
  'rehab',
  'wellness',
  'other',
];

export function careCalendarDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseCareCalendarDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

/** True when the appointment start (or end of slot on that day) is already in the past. */
export function isCareCalendarAppointmentPast(
  startDateKey: string,
  startTimeMinutes?: number,
  endTimeMinutes?: number,
  now = new Date(),
): boolean {
  const todayKey = careCalendarDateKey(now);
  if (startDateKey < todayKey) return true;
  if (startDateKey > todayKey) return false;
  const slotEndMinutes = endTimeMinutes ?? startTimeMinutes;
  if (slotEndMinutes == null) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotEndMinutes <= nowMinutes;
}

/** Pending/declined RSVP badges are hidden once the appointment is in the past. */
export function shouldShowAttendeeInviteResponseBadge(
  response: CareCalendarAttendeeResponse,
  options: {
    eventStatus?: CareCalendarDayEvent['status'];
    startDateKey?: string;
    startTimeMinutes?: number;
    endTimeMinutes?: number;
    now?: Date;
  },
): boolean {
  if (response === 'accepted') return true;
  const isPast =
    options.eventStatus === 'past' ||
    (options.startDateKey
      ? isCareCalendarAppointmentPast(
          options.startDateKey,
          options.startTimeMinutes,
          options.endTimeMinutes,
          options.now,
        )
      : false);
  return !isPast;
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function formatCareCalendarTime(minutes?: number): string | null {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatCareCalendarTimeRange(
  startMinutes?: number,
  endMinutes?: number,
): string | null {
  const start = formatCareCalendarTime(startMinutes);
  if (!start) return null;
  const end = formatCareCalendarTime(endMinutes);
  return end ? `${start} – ${end}` : start;
}

export function buildAppleMapsUrl(address: CareCalendarAddress): string {
  if (address.latitude != null && address.longitude != null) {
    const q = encodeURIComponent(address.label || 'Location');
    return `https://maps.apple.com/?ll=${address.latitude},${address.longitude}&q=${q}`;
  }
  const parts = formatCareCalendarAddressParts(address);
  const query = encodeURIComponent(parts.join(', ') || address.label || 'Location');
  return `https://maps.apple.com/?address=${query}`;
}

export function buildGoogleMapsUrl(address: CareCalendarAddress): string {
  if (address.latitude != null && address.longitude != null) {
    const q = encodeURIComponent(address.label || 'Location');
    return `https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}(${q})`;
  }
  const parts = formatCareCalendarAddressParts(address);
  const query = encodeURIComponent(parts.join(', ') || address.label || 'Location');
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function formatCareCalendarStreetLine(address: CareCalendarAddress): string | undefined {
  const line1 = address.line1?.trim();
  const suite = address.suite?.trim();
  if (!line1 && !suite) return undefined;
  if (line1 && suite) {
    const suiteText = /^(suite|ste|unit|#)/i.test(suite) ? suite : `Suite ${suite}`;
    return `${line1}, ${suiteText}`;
  }
  return line1 || suite;
}

export function formatCareCalendarAddressParts(address: CareCalendarAddress): string[] {
  return [
    formatCareCalendarStreetLine(address),
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter((p) => !!String(p || '').trim()) as string[];
}

export function formatCareCalendarAddressDisplayLines(address: CareCalendarAddress): string[] {
  const lines: string[] = [];
  const label = address.label?.trim();
  const street = formatCareCalendarStreetLine(address);
  const city = address.city?.trim();
  const state = address.state?.trim();
  const postal = address.postalCode?.trim();
  const country = address.country?.trim();
  const cityState = [city, state].filter(Boolean).join(', ');
  const cityLine = [cityState, postal].filter(Boolean).join(' ');
  const streetLead = street?.split(',')[0]?.trim().toLowerCase();
  const labelNorm = label?.toLowerCase();

  if (label && (!streetLead || labelNorm !== streetLead)) {
    lines.push(label);
  }
  if (street) lines.push(street);
  if (cityLine) lines.push(cityLine);
  if (country && !['US', 'USA', 'United States'].includes(country)) {
    lines.push(country);
  }
  if (!lines.length && label) lines.push(label);
  return lines;
}

export function hasCareCalendarAddress(address: CareCalendarAddress): boolean {
  return !!(
    address.label.trim() ||
    address.line1?.trim() ||
    address.suite?.trim() ||
    address.city?.trim() ||
    (address.latitude != null && address.longitude != null)
  );
}

/** Firestore rejects `undefined`; normalize address fields before write. */
export function sanitizeCareCalendarAddressForFirestore(
  address?: CareCalendarAddress | null,
): Record<string, string | number | null> | null {
  if (!address || !hasCareCalendarAddress(address)) return null;

  const payload: Record<string, string | number | null> = {
    label: address.label.trim() || address.line1?.trim() || 'Location',
    latitude: address.latitude != null ? address.latitude : null,
    longitude: address.longitude != null ? address.longitude : null,
  };

  const line1 = address.line1?.trim();
  if (line1) payload.line1 = line1;
  const suite = address.suite?.trim();
  if (suite) payload.suite = suite;
  const city = address.city?.trim();
  if (city) payload.city = city;
  const state = address.state?.trim();
  if (state) payload.state = state;
  const postalCode = address.postalCode?.trim();
  if (postalCode) payload.postalCode = postalCode;
  const country = address.country?.trim();
  if (country) payload.country = country;

  return payload;
}

export function prefersAppleMapsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent);
}

export type CareCalendarAddressSuggestion = {
  label: string;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  formatted: string;
};

export function suggestionToCareCalendarAddress(
  suggestion: CareCalendarAddressSuggestion,
): CareCalendarAddress {
  return {
    label: suggestion.label,
    line1: suggestion.line1,
    city: suggestion.city,
    state: suggestion.state,
    postalCode: suggestion.postalCode,
    country: suggestion.country,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}

export function expandCareEntryDateKeys(
  entry: CareCalendarEntry,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  if (entry.cancelledAt) return [];

  const rangeStartKey = careCalendarDateKey(rangeStart);
  const rangeEndKey = careCalendarDateKey(rangeEnd);
  const untilKey =
    entry.recurrence.type !== 'once' && entry.recurrence.untilDateKey
      ? entry.recurrence.untilDateKey
      : rangeEndKey;
  const effectiveEnd =
    compareDateKeys(untilKey, rangeEndKey) < 0 ? untilKey : rangeEndKey;

  if (compareDateKeys(entry.startDateKey, effectiveEnd) > 0) return [];

  const keys: string[] = [];
  const rec = entry.recurrence;

  if (rec.type === 'once') {
    if (
      compareDateKeys(entry.startDateKey, rangeStartKey) >= 0 &&
      compareDateKeys(entry.startDateKey, rangeEndKey) <= 0
    ) {
      keys.push(entry.startDateKey);
    }
    return keys;
  }

  const cursorStartKey =
    compareDateKeys(entry.startDateKey, rangeStartKey) > 0
      ? entry.startDateKey
      : rangeStartKey;
  let cursor = parseCareCalendarDateKey(cursorStartKey);
  const end = parseCareCalendarDateKey(effectiveEnd);
  const monthlyDay = parseCareCalendarDateKey(entry.startDateKey).getDate();

  while (cursor <= end) {
    const key = careCalendarDateKey(cursor);
    if (compareDateKeys(key, entry.startDateKey) < 0) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    let matches = false;
    if (rec.type === 'daily') {
      matches = true;
    } else if (rec.type === 'weekly') {
      matches = rec.daysOfWeek.includes(cursor.getDay());
    } else if (rec.type === 'monthly') {
      matches = cursor.getDate() === monthlyDay;
    }

    if (matches) keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function getCareCalendarByDay(
  entries: CareCalendarEntry[],
  rangeStart: Date,
  rangeEnd: Date,
): Map<string, CareCalendarDayEvent[]> {
  const map = new Map<string, CareCalendarDayEvent[]>();
  const todayKey = careCalendarDateKey(new Date());

  for (const entry of entries) {
    for (const dateKey of expandCareEntryDateKeys(entry, rangeStart, rangeEnd)) {
      const status: CareCalendarDayEvent['status'] =
        dateKey < todayKey ? 'past' : dateKey === todayKey ? 'today' : 'upcoming';
      const event: CareCalendarDayEvent = {
        entryId: entry.id,
        kind: entry.kind,
        title: entry.title,
        details: entry.details,
        startTimeMinutes: entry.startTimeMinutes,
        endTimeMinutes: entry.endTimeMinutes,
        address: entry.address,
        attendees: entry.attendees,
        attendeeResponseSummary: entry.attendeeResponseSummary,
        inviteeContactIds: entry.inviteeContactIds,
        inviteeMemberUidByContactId: entry.inviteeMemberUidByContactId,
        visitSubtype: entry.visitSubtype,
        supportingNotes: entry.supportingNotes,
        appointmentTasks: entry.appointmentTasks,
        doctorName: entry.doctorName,
        recurrence: entry.recurrence,
        source: entry.source,
        createdByName: entry.createdByName,
        status,
      };
      const list = map.get(dateKey) ?? [];
      list.push(event);
      map.set(dateKey, list);
    }
  }

  for (const [key, list] of map) {
    list.sort((a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0));
    map.set(key, list);
  }

  return map;
}

export function defaultWeeklyRecurrenceDays(dateKey: string): number[] {
  return [parseCareCalendarDateKey(dateKey).getDay()];
}

export const CARE_CALENDAR_TIME_STEP_MINUTES = 15;
export const CARE_CALENDAR_MIN_DURATION_MINUTES = 15;
export const CARE_CALENDAR_TIME_INPUT_STEP_SECONDS = 900;

const CARE_CALENDAR_TIME_OPTIONS = Array.from(
  { length: (24 * 60) / CARE_CALENDAR_TIME_STEP_MINUTES },
  (_, index) => index * CARE_CALENDAR_TIME_STEP_MINUTES,
);

export function buildCareCalendarTimeOptions(minMinutes?: number): number[] {
  if (minMinutes == null) return [...CARE_CALENDAR_TIME_OPTIONS];
  return CARE_CALENDAR_TIME_OPTIONS.filter((minutes) => minutes >= minMinutes);
}

/** Always use a 15-minute select — native `<input type="time" step>` is ignored on iOS and most desktop browsers. */
export function prefersCareCalendarTimeSelect(): boolean {
  return true;
}

export function snapCareCalendarTimeInput(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return value;
  const total = h * 60 + m;
  const snapped = Math.min(
    Math.round(total / CARE_CALENDAR_TIME_STEP_MINUTES) * CARE_CALENDAR_TIME_STEP_MINUTES,
    23 * 60 + (60 - CARE_CALENDAR_TIME_STEP_MINUTES),
  );
  return careCalendarTimeInputValue(snapped);
}

export function defaultCareCalendarStartMinutesForDate(
  dateKey: string,
  now = new Date(),
): number {
  if (dateKey !== careCalendarDateKey(now)) return 9 * 60;
  const total = now.getHours() * 60 + now.getMinutes();
  const snapped =
    Math.ceil(total / CARE_CALENDAR_TIME_STEP_MINUTES) * CARE_CALENDAR_TIME_STEP_MINUTES;
  const lastSlot = 23 * 60 + (60 - CARE_CALENDAR_TIME_STEP_MINUTES);
  return Math.min(snapped, lastSlot);
}

export function defaultCareCalendarStartTimeForDate(dateKey: string, now = new Date()): string {
  return careCalendarTimeInputValue(defaultCareCalendarStartMinutesForDate(dateKey, now));
}

export function parseCareCalendarTimeInput(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return undefined;
  if (m % CARE_CALENDAR_TIME_STEP_MINUTES !== 0) return undefined;
  return h * 60 + m;
}

export function careCalendarTimeInputValue(minutes?: number): string {
  if (minutes == null || Number.isNaN(minutes)) return '';
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function defaultCareCalendarEndMinutes(startMinutes: number): number {
  return Math.min(
    startMinutes + CARE_CALENDAR_MIN_DURATION_MINUTES,
    23 * 60 + (60 - CARE_CALENDAR_TIME_STEP_MINUTES),
  );
}

export function buildCareCalendarDurationOptions(startMinutes?: number): number[] {
  const start = startMinutes ?? 0;
  const maxDuration = 24 * 60 - start;
  const options: number[] = [];
  for (
    let duration = CARE_CALENDAR_MIN_DURATION_MINUTES;
    duration <= maxDuration;
    duration += CARE_CALENDAR_TIME_STEP_MINUTES
  ) {
    options.push(duration);
  }
  return options.length ? options : [CARE_CALENDAR_MIN_DURATION_MINUTES];
}

export function careCalendarDurationFromRange(
  startMinutes?: number,
  endMinutes?: number,
): number {
  if (startMinutes == null || endMinutes == null) {
    return CARE_CALENDAR_MIN_DURATION_MINUTES;
  }
  const duration = endMinutes - startMinutes;
  if (duration < CARE_CALENDAR_MIN_DURATION_MINUTES) {
    return CARE_CALENDAR_MIN_DURATION_MINUTES;
  }
  const snapped =
    Math.round(duration / CARE_CALENDAR_TIME_STEP_MINUTES) * CARE_CALENDAR_TIME_STEP_MINUTES;
  return Math.max(snapped, CARE_CALENDAR_MIN_DURATION_MINUTES);
}

export function careCalendarEndMinutesFromDuration(
  startMinutes: number,
  durationMinutes: number,
): number {
  return startMinutes + durationMinutes;
}

export function formatCareCalendarDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  const hourLabel = hours === 1 ? '1 hr' : `${hours} hr`;
  return `${hourLabel} ${mins} min`;
}

export function clampCareCalendarDurationMinutes(
  startMinutes: number | undefined,
  durationMinutes: number,
): number {
  const options = buildCareCalendarDurationOptions(startMinutes);
  if (!options.length) return CARE_CALENDAR_MIN_DURATION_MINUTES;
  if (options.includes(durationMinutes)) return durationMinutes;
  const max = options[options.length - 1];
  return durationMinutes > max ? max : options[0];
}

export function minCareCalendarEndTimeInput(startTimeInput: string): string | undefined {
  const start = parseCareCalendarTimeInput(startTimeInput);
  if (start == null) return undefined;
  return careCalendarTimeInputValue(defaultCareCalendarEndMinutes(start));
}

export function isValidCareCalendarEndTime(
  startMinutes?: number,
  endMinutes?: number,
): boolean {
  if (startMinutes == null || endMinutes == null) return true;
  return endMinutes >= startMinutes + CARE_CALENDAR_MIN_DURATION_MINUTES;
}

export function getCalendarWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export const SCHEDULE_DAY_VIEW_START_HOUR = 6;
export const SCHEDULE_DAY_VIEW_END_HOUR = 22;
export const SCHEDULE_SLOT_MINUTES = 30;

export function buildScheduleTimeSlots(
  startHour = SCHEDULE_DAY_VIEW_START_HOUR,
  endHour = SCHEDULE_DAY_VIEW_END_HOUR,
  slotMinutes = SCHEDULE_SLOT_MINUTES,
): number[] {
  const slots: number[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += slotMinutes) {
    slots.push(m);
  }
  return slots;
}
