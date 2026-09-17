import './nodeWindowShim';
import assert from 'node:assert/strict';
import { formatPatientLocaleTime } from './circleLocaleDisplayPreferences';

/** 05:23 America/Los_Angeles on 12 Sep 2026 (PDT). */
const lastSeen = new Date('2026-09-12T12:23:00.000Z');

const twelveHour = formatPatientLocaleTime('America/Los_Angeles', '12h', lastSeen);
const twentyFourHour = formatPatientLocaleTime('America/Los_Angeles', '24h', lastSeen);

assert.match(twelveHour, /AM|am|a\.m\./i, `12-hour should include AM, got ${twelveHour}`);
assert.doesNotMatch(
  twentyFourHour,
  /AM|PM|am|pm|a\.m\.|p\.m\./i,
  `24-hour should not include AM/PM, got ${twentyFourHour}`,
);
assert.match(twentyFourHour, /5:23/, `24-hour should show 5:23, got ${twentyFourHour}`);

console.log('circleLocaleDisplayPreferences.test.ts passed');
