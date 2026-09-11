import './nodeWindowShim';
import assert from 'node:assert/strict';
import { resolveAlertAttentionMessageDisplay } from './alertAttentionNotificationCopy';

const dayMs = 24 * 60 * 60 * 1000;

const recent = resolveAlertAttentionMessageDisplay(
  {
    type: 'emergency',
    createdAt: Date.now() - dayMs,
  },
  'English',
  'Demo',
);
assert.equal(recent?.subject, 'Emergency alert');
assert.match(recent?.text ?? '', /Please check on Demo now/);

const older = resolveAlertAttentionMessageDisplay(
  {
    type: 'emergency',
    createdAt: Date.now() - 8 * dayMs,
    text: 'Please check on Demo now. This is an emergency alert from MedXForce.',
  },
  'English',
  'Demo',
);
assert.equal(older?.subject, 'Emergency alert');
assert.equal(older?.text, '');

const olderAttention = resolveAlertAttentionMessageDisplay(
  {
    type: 'attention',
    createdAt: Date.now() - 10 * dayMs,
  },
  'English',
  'Demo',
);
assert.equal(olderAttention?.subject, 'Attention request');
assert.equal(olderAttention?.text, '');

console.log('alertAttentionNotificationCopy.test.ts passed');
