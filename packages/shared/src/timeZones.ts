/** @license SPDX-License-Identifier: Apache-2.0 */

const FALLBACK_IANA_TIME_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Warsaw',
  'Europe/Rome',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidIanaTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZoneId(value: unknown, fallback = 'UTC'): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (isValidIanaTimeZone(trimmed)) return trimmed;
  return isValidIanaTimeZone(fallback) ? fallback : 'UTC';
}

export function listIanaTimeZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (supported?.length) {
      return [...new Set(supported.filter(isValidIanaTimeZone))].sort((a, b) =>
        a.localeCompare(b),
      );
    }
  } catch {
    /* ignore */
  }
  return [...FALLBACK_IANA_TIME_ZONES];
}

function formatToPartsMap(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, ...options }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return map;
}

/** Offset of `timeZone` at `date`: wall-clock-as-UTC minus the actual UTC instant. */
export function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = formatToPartsMap(date, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

export function getZonedDateKeyAndMinutes(
  date: Date,
  timeZone: string,
): { dateKey: string; minutes: number } {
  const parts = formatToPartsMap(date, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const year = parts.year.padStart(4, '0');
  const month = parts.month.padStart(2, '0');
  const day = parts.day.padStart(2, '0');
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    dateKey: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

export function formatTimeZoneAbbreviation(timeZone: string, date = new Date()): string {
  try {
    const value = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;
    return value?.trim() || timeZone;
  } catch {
    return timeZone;
  }
}

export function formatUtcOffsetLabel(timeZone: string, date = new Date()): string {
  const offsetMinutes = Math.round(getTimeZoneOffsetMs(timeZone, date) / 60_000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

export function formatTimeZoneCity(timeZone: string): string {
  const city = timeZone.split('/').pop() || timeZone;
  return city.replace(/_/g, ' ');
}

export function formatTimeZoneOptionLabel(timeZone: string, date = new Date()): string {
  const city = formatTimeZoneCity(timeZone);
  const abbr = formatTimeZoneAbbreviation(timeZone, date);
  const offset = formatUtcOffsetLabel(timeZone, date);
  if (abbr && abbr !== timeZone && abbr !== city) {
    return `${city} (${abbr}, ${offset})`;
  }
  return `${city} (${offset})`;
}

export type TimeZoneSelectOption = {
  id: string;
  label: string;
  offsetLabel: string;
  /** Current / device zones stay at the top of the picker. */
  pinned?: boolean;
};

function toTimeZoneSelectOption(id: string, date: Date, pinned = false): TimeZoneSelectOption {
  return {
    id,
    label: formatTimeZoneOptionLabel(id, date),
    offsetLabel: formatUtcOffsetLabel(id, date),
    pinned,
  };
}

function compareTimeZonesByOffsetThenCity(left: string, right: string, date: Date): number {
  const offsetDelta = getTimeZoneOffsetMs(left, date) - getTimeZoneOffsetMs(right, date);
  if (offsetDelta !== 0) return offsetDelta;
  return formatTimeZoneCity(left).localeCompare(formatTimeZoneCity(right));
}

export function buildTimeZoneSelectOptions(
  preferredIds: Array<string | null | undefined> = [],
  date = new Date(),
): TimeZoneSelectOption[] {
  const zones = listIanaTimeZones();
  const preferred: string[] = [];
  for (const raw of [...preferredIds, getBrowserTimeZone()]) {
    const id = typeof raw === 'string' ? raw.trim() : '';
    if (isValidIanaTimeZone(id) && !preferred.includes(id)) preferred.push(id);
  }
  const rest = zones
    .filter((id) => !preferred.includes(id))
    .sort((a, b) => compareTimeZonesByOffsetThenCity(a, b, date));
  return [
    ...preferred.map((id) => toTimeZoneSelectOption(id, date, true)),
    ...rest.map((id) => toTimeZoneSelectOption(id, date)),
  ];
}

export function groupTimeZoneSelectOptions(options: TimeZoneSelectOption[]): {
  pinned: TimeZoneSelectOption[];
  groups: Array<{ offsetLabel: string; options: TimeZoneSelectOption[] }>;
} {
  const pinned = options.filter((option) => option.pinned);
  const groups: Array<{ offsetLabel: string; options: TimeZoneSelectOption[] }> = [];
  for (const option of options) {
    if (option.pinned) continue;
    const last = groups[groups.length - 1];
    if (last && last.offsetLabel === option.offsetLabel) {
      last.options.push(option);
    } else {
      groups.push({ offsetLabel: option.offsetLabel, options: [option] });
    }
  }
  return { pinned, groups };
}

export function timeZonesShareOffset(
  left: string | null | undefined,
  right: string | null | undefined,
  date = new Date(),
): boolean {
  if (!isValidIanaTimeZone(left) || !isValidIanaTimeZone(right)) return false;
  if (left === right) return true;
  return getTimeZoneOffsetMs(left, date) === getTimeZoneOffsetMs(right, date);
}
