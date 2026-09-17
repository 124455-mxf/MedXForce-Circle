/** @license SPDX-License-Identifier: Apache-2.0 */

import type { CareCalendarEntryKind } from './careCalendar';
import {
  formatTimeZoneAbbreviation,
  getBrowserTimeZone,
  getTimeZoneOffsetMs,
  getZonedDateKeyAndMinutes,
  isValidIanaTimeZone,
  normalizeTimeZoneId,
  timeZonesShareOffset,
} from './timeZones';

function parseDateKeyParts(
  dateKey: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Instant for a wall-clock time on `dateKey` in `timeZoneId`. Falls back to device local. */
export function careCalendarWallTimeToUtcMs(
  dateKey: string,
  minutesFromMidnight: number,
  timeZoneId?: string | null,
): number | null {
  const parts = parseDateKeyParts(dateKey);
  if (!parts || !Number.isFinite(minutesFromMidnight)) return null;
  const hour = Math.floor(minutesFromMidnight / 60) % 24;
  const minute = ((minutesFromMidnight % 60) + 60) % 60;
  if (!isValidIanaTimeZone(timeZoneId)) {
    return new Date(parts.year, parts.month - 1, parts.day, hour, minute, 0, 0).getTime();
  }
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0, 0);
  const offset1 = getTimeZoneOffsetMs(timeZoneId, new Date(utcGuess));
  let utcMs = utcGuess - offset1;
  const offset2 = getTimeZoneOffsetMs(timeZoneId, new Date(utcMs));
  if (offset2 !== offset1) {
    utcMs = utcGuess - offset2;
  }
  return utcMs;
}

export function defaultCareCalendarTimezoneId(args: {
  kind: CareCalendarEntryKind;
  patientTimezoneId?: string | null;
  organizerTimezoneId?: string | null;
  fallbackTimezoneId?: string | null;
}): string {
  const fallback = normalizeTimeZoneId(args.fallbackTimezoneId, getBrowserTimeZone());
  if (args.kind === 'wellness') {
    return isValidIanaTimeZone(args.organizerTimezoneId)
      ? args.organizerTimezoneId.trim()
      : fallback;
  }
  return isValidIanaTimeZone(args.patientTimezoneId)
    ? args.patientTimezoneId.trim()
    : fallback;
}

function formatMinutesWallClock(
  minutesFromMidnight: number,
  hour12?: boolean,
): string {
  const h = Math.floor(minutesFromMidnight / 60) % 24;
  const m = minutesFromMidnight % 60;
  const d = new Date(2000, 0, 1, h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  });
}

export function formatCareCalendarTimeWithZone(
  minutes?: number,
  timeZoneId?: string | null,
  atDate = new Date(),
): string | null {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const clock = formatMinutesWallClock(minutes);
  if (!isValidIanaTimeZone(timeZoneId)) return clock;
  return `${clock} ${formatTimeZoneAbbreviation(timeZoneId, atDate)}`;
}

export function formatCareCalendarTimeRangeWithZone(
  startMinutes?: number,
  endMinutes?: number,
  timeZoneId?: string | null,
  atDate = new Date(),
): string | null {
  if (startMinutes == null || Number.isNaN(startMinutes)) return null;
  const startLabel = formatMinutesWallClock(startMinutes);
  const endLabel =
    endMinutes != null && !Number.isNaN(endMinutes)
      ? formatMinutesWallClock(endMinutes)
      : null;
  const range = endLabel ? `${startLabel} – ${endLabel}` : startLabel;
  if (!isValidIanaTimeZone(timeZoneId)) return range;
  return `${range} ${formatTimeZoneAbbreviation(timeZoneId, atDate)}`;
}

export function formatCareCalendarViewerTimeRange(args: {
  dateKey: string;
  startMinutes?: number;
  endMinutes?: number;
  eventTimeZoneId?: string | null;
  viewerTimeZoneId?: string | null;
  forYouLabel: string;
}): string | null {
  const eventTz = args.eventTimeZoneId;
  const viewerTz = args.viewerTimeZoneId;
  if (!isValidIanaTimeZone(eventTz) || !isValidIanaTimeZone(viewerTz)) return null;
  if (args.startMinutes == null || Number.isNaN(args.startMinutes)) return null;
  const startUtc = careCalendarWallTimeToUtcMs(args.dateKey, args.startMinutes, eventTz);
  if (startUtc == null) return null;
  const startDate = new Date(startUtc);
  if (timeZonesShareOffset(eventTz, viewerTz, startDate)) return null;

  const hour12 = undefined;
  const startLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
    timeZone: viewerTz,
    timeZoneName: 'short',
  }).format(startDate);

  if (args.endMinutes == null || Number.isNaN(args.endMinutes)) {
    return `${startLabel} ${args.forYouLabel}`;
  }
  const endUtc = careCalendarWallTimeToUtcMs(args.dateKey, args.endMinutes, eventTz);
  if (endUtc == null) return `${startLabel} ${args.forYouLabel}`;
  const endLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
    timeZone: viewerTz,
    timeZoneName: 'short',
  }).format(new Date(endUtc));
  return `${startLabel} – ${endLabel} ${args.forYouLabel}`;
}

export function isCareCalendarOccurrencePast(args: {
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  now?: Date;
  timeZoneId?: string | null;
}): boolean {
  const now = args.now ?? new Date();
  const zoned = isValidIanaTimeZone(args.timeZoneId)
    ? getZonedDateKeyAndMinutes(now, args.timeZoneId)
    : {
        dateKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        minutes: now.getHours() * 60 + now.getMinutes(),
      };
  if (args.startDateKey < zoned.dateKey) return true;
  if (args.startDateKey > zoned.dateKey) return false;
  const slotEndMinutes = args.endTimeMinutes ?? args.startTimeMinutes;
  if (slotEndMinutes == null) return false;
  return slotEndMinutes <= zoned.minutes;
}
