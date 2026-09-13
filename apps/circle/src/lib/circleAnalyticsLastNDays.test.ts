import './nodeWindowShim';
import assert from 'node:assert/strict';
import { applyAnalyticsDetailRange } from './circleAnalyticsDetailRange';
import { filterPointsToLastNLocalDays } from './circleAnalyticsChart';
import { sumCompanionLastNExcludingDetected, sumMessagesLastN } from './circleDashboardStats';

const now = new Date();

function isoDaysAgo(days: number): string {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const sparseCompanion = [
  { date: isoDaysAgo(40), conversations: 10, interactions: 20, detected: 0, started: 10, resumed: 0 },
  { date: isoDaysAgo(20), conversations: 8, interactions: 12, detected: 0, started: 8, resumed: 0 },
  { date: isoDaysAgo(2), conversations: 1, interactions: 2, detected: 0, started: 1, resumed: 0 },
];

assert.equal(filterPointsToLastNLocalDays(sparseCompanion, 7, now).length, 1);
assert.equal(sumCompanionLastNExcludingDetected(sparseCompanion, 7), 3);
assert.notEqual(
  sparseCompanion.slice(-7).reduce((sum, point) => sum + point.conversations + point.interactions, 0),
  3,
);

const applied = applyAnalyticsDetailRange(
  {
    kind: 'companion',
    total: 51,
    conversations: 19,
    interactions: 32,
    newCount: 18,
    resumed: 0,
    detected: 0,
    avgInteractions: '1.7',
    trend: 'up',
    topTopics: [{ label: 'pain', count: 4 }],
    timeline: sparseCompanion,
  },
  '7',
  now,
);

assert.equal(applied.detail.kind, 'companion');
if (applied.detail.kind === 'companion') {
  assert.equal(applied.detail.conversations, 1);
  assert.equal(applied.detail.interactions, 2);
  assert.equal(applied.detail.total, 3);
  assert.equal(applied.detail.newCount, 1);
  assert.equal(applied.detail.topTopics?.length ?? 0, 0);
}

const sparseMessages = [
  { date: isoDaysAgo(21), communication: 4, messaging: 10, sent: 6, replies: 4 },
  { date: isoDaysAgo(1), communication: 1, messaging: 2, sent: 1, replies: 1 },
];
assert.deepEqual(sumMessagesLastN(sparseMessages, 7), {
  communication: 1,
  messaging: 2,
  total: 3,
});

console.log('circleAnalyticsLastNDays.test.ts passed');
