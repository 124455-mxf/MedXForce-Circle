import './nodeWindowShim';
import assert from 'node:assert/strict';
import { EMPTY_CARE_TRANSITION_STATE } from '@medxforce/shared';
import {
  buildIcuDailyBriefDay,
  defaultIcuBriefDateKey,
  remoteFlagsForIcuBrief,
  rollingLast7DateKeys,
} from './circleIcuDailyBrief';

const noon = new Date('2026-09-08T12:00:00');
const keys = rollingLast7DateKeys(noon);
assert.deepEqual(keys, [
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-05',
  '2026-09-06',
  '2026-09-07',
  '2026-09-08',
]);
assert.equal(defaultIcuBriefDateKey(noon), '2026-09-07');

const flagsOff = remoteFlagsForIcuBrief({
  dailyCheckIn: { enabled: false },
  showAlertButton: false,
  showAttentionButton: false,
  featuresVisibility: {
    communication: false,
    intensiveCareSoulMusic: false,
    intensiveCareSoulMediaLibrary: false,
  },
  visibleAreas: {
    phrases: false,
    categories: false,
    emojis: false,
    unicode: false,
  },
} as Parameters<typeof remoteFlagsForIcuBrief>[0]);
assert.equal(flagsOff.dailyCheckIn, false);
assert.equal(flagsOff.alertButton, false);
assert.equal(flagsOff.soulMusic, false);

const flagsOn = remoteFlagsForIcuBrief({
  dailyCheckIn: { enabled: true },
  featuresVisibility: {
    communication: true,
    intensiveCareSoulMusic: true,
    intensiveCareSoulMediaLibrary: true,
  },
} as Parameters<typeof remoteFlagsForIcuBrief>[0]);
assert.equal(flagsOn.dailyCheckIn, true);
assert.equal(flagsOn.alertButton, true);
assert.equal(flagsOn.soulMusic, true);
assert.equal(flagsOn.soulMedia, true);

const yesterday = '2026-09-07';
const day = buildIcuDailyBriefDay({
  dateKey: yesterday,
  indexFromOldest: 5,
  todayKey: '2026-09-08',
  yesterdayKey: yesterday,
  presence: { dateKey: yesterday, firstLoginAt: 1_000, totalOnlineMs: 120_000 },
  alertTimeline: [
    {
      date: yesterday,
      alert: 2,
      attention: 1,
      canceledAlert: 3,
      canceledAttention: 1,
    },
  ],
  checkInTimeline: [{ date: yesterday, completed: 1, skipped: 0, notTaken: 0 }],
  communicationLog: [
    {
      id: `msg_icu_summary_${yesterday}`,
      text: 'log',
      createdAt: 1,
      updatedAt: 1,
      summaryEntries: [
        { text: 'water', timestamp: 1 },
        { text: 'pain', timestamp: 2 },
      ],
    },
  ],
  careTransitionState: {
    ...EMPTY_CARE_TRANSITION_STATE,
    activePackId: 'crisis-icu',
    packLive: true,
  },
  memberRole: 'proxy',
});
assert.equal(day.isYesterday, true);
assert.equal(day.firstLoginAt, 1_000);
assert.equal(day.totalOnlineMs, 120_000);
assert.equal(day.alerts, 2);
assert.equal(day.canceledAlerts, 3);
assert.equal(day.checkInCompleted, 1);
assert.equal(day.commLogCount, 2);
assert.equal(day.packLive, true);
assert.ok(day.packTotal > 0);

const otherPack = buildIcuDailyBriefDay({
  dateKey: yesterday,
  indexFromOldest: 5,
  todayKey: '2026-09-08',
  yesterdayKey: yesterday,
  presence: undefined,
  alertTimeline: undefined,
  checkInTimeline: undefined,
  communicationLog: [],
  careTransitionState: {
    ...EMPTY_CARE_TRANSITION_STATE,
    activePackId: 'icu-to-ward',
    packLive: true,
  },
  memberRole: 'caregiver',
});
assert.equal(otherPack.packLive, false);
assert.equal(otherPack.commLogCount, 0);
assert.equal(otherPack.firstLoginAt, null);
