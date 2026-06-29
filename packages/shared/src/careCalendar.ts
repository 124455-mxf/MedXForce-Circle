/** @license SPDX-License-Identifier: Apache-2.0 */

export type CareCalendarEntryKind = 'doctor' | 'wellness' | 'rehab' | 'other';

export type CareCalendarRecurrence =
  | { type: 'once' }
  | { type: 'daily'; untilDateKey?: string }
  | { type: 'weekly'; daysOfWeek: number[]; untilDateKey?: string }
  | { type: 'monthly'; untilDateKey?: string };

export type CareCalendarAddress = {
  label: string;
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

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
  recurrence: CareCalendarRecurrence;
  source: 'patient' | 'circle';
  createdByName: string;
  status: 'past' | 'today' | 'upcoming';
};

export const CARE_CALENDAR_KINDS: CareCalendarEntryKind[] = [
  'doctor',
  'wellness',
  'rehab',
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
  const parts = [
    address.line1,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter((p) => !!String(p || '').trim());
  const query = encodeURIComponent(parts.join(', ') || address.label || 'Location');
  return `https://maps.apple.com/?address=${query}`;
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
