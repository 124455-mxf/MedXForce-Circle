import assert from 'node:assert/strict';
import {
  careCalendarWallTimeToUtcMs,
  defaultCareCalendarTimezoneId,
  formatCareCalendarTimeRangeWithZone,
  formatCareCalendarViewerTimeRange,
  isCareCalendarOccurrencePast,
} from './careCalendarTimeZone';
import { isValidIanaTimeZone, normalizeTimeZoneId } from './timeZones';

assert.equal(isValidIanaTimeZone('America/Los_Angeles'), true);
assert.equal(isValidIanaTimeZone('Not/AZone'), false);
assert.equal(normalizeTimeZoneId('America/New_York'), 'America/New_York');
assert.equal(normalizeTimeZoneId('bogus', 'UTC'), 'UTC');

assert.equal(
  defaultCareCalendarTimezoneId({
    kind: 'doctor',
    patientTimezoneId: 'America/Los_Angeles',
    organizerTimezoneId: 'America/New_York',
  }),
  'America/Los_Angeles',
);
assert.equal(
  defaultCareCalendarTimezoneId({
    kind: 'wellness',
    patientTimezoneId: 'America/Los_Angeles',
    organizerTimezoneId: 'America/New_York',
  }),
  'America/New_York',
);
assert.equal(
  defaultCareCalendarTimezoneId({
    kind: 'wellness',
    patientTimezoneId: 'America/Los_Angeles',
    fallbackTimezoneId: 'UTC',
  }),
  'UTC',
);

const tenAmPt = careCalendarWallTimeToUtcMs(
  '2026-08-26',
  10 * 60,
  'America/Los_Angeles',
);
assert.ok(tenAmPt != null);
assert.equal(new Date(tenAmPt!).toISOString(), '2026-08-26T17:00:00.000Z');

const elevenAmPt = careCalendarWallTimeToUtcMs(
  '2026-08-26',
  11 * 60,
  'America/Los_Angeles',
);
assert.equal(new Date(elevenAmPt!).toISOString(), '2026-08-26T18:00:00.000Z');

assert.equal(
  isCareCalendarOccurrencePast({
    startDateKey: '2026-08-26',
    startTimeMinutes: 10 * 60,
    endTimeMinutes: 11 * 60,
    now: new Date('2026-08-26T17:30:00.000Z'),
    timeZoneId: 'America/Los_Angeles',
  }),
  false,
);
assert.equal(
  isCareCalendarOccurrencePast({
    startDateKey: '2026-08-26',
    startTimeMinutes: 10 * 60,
    endTimeMinutes: 11 * 60,
    now: new Date('2026-08-26T18:00:00.000Z'),
    timeZoneId: 'America/Los_Angeles',
  }),
  true,
);

const ranged = formatCareCalendarTimeRangeWithZone(
  10 * 60,
  11 * 60,
  'America/Los_Angeles',
  new Date('2026-08-26T17:00:00.000Z'),
);
assert.ok(ranged && ranged.includes('PDT'));

assert.equal(
  formatCareCalendarViewerTimeRange({
    dateKey: '2026-08-26',
    startMinutes: 10 * 60,
    endMinutes: 11 * 60,
    eventTimeZoneId: 'America/Los_Angeles',
    viewerTimeZoneId: 'America/Los_Angeles',
    forYouLabel: 'for you',
  }),
  null,
);
assert.equal(
  formatCareCalendarViewerTimeRange({
    dateKey: '2026-08-26',
    startMinutes: 10 * 60,
    endMinutes: 11 * 60,
    eventTimeZoneId: 'America/Los_Angeles',
    viewerTimeZoneId: 'America/Phoenix',
    forYouLabel: 'for you',
  }),
  null,
);
assert.equal(
  formatCareCalendarViewerTimeRange({
    dateKey: '2026-08-26',
    startMinutes: 10 * 60,
    eventTimeZoneId: undefined,
    viewerTimeZoneId: 'America/New_York',
    forYouLabel: 'for you',
  }),
  null,
);

const viewerRange = formatCareCalendarViewerTimeRange({
  dateKey: '2026-08-26',
  startMinutes: 10 * 60,
  endMinutes: 11 * 60,
  eventTimeZoneId: 'America/Los_Angeles',
  viewerTimeZoneId: 'America/New_York',
  forYouLabel: 'for you',
});
assert.ok(viewerRange);
assert.ok(viewerRange.endsWith('for you'));
const expectedViewerStart = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
}).format(new Date('2026-08-26T17:00:00.000Z'));
assert.ok(viewerRange.includes(expectedViewerStart));

console.log('care calendar timezone tests ok');
