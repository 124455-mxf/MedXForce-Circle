import assert from 'node:assert/strict';
import {
  listInactiveCircleMembers,
  shouldShowInactiveMemberReminder,
  INACTIVE_CIRCLE_MEMBER_TILE_AFTER_MS,
} from './circleInactiveMemberReminders';
import type { CircleInviteListItem } from './circleMemberManagement';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-09-23T12:00:00.000Z');

function invite(partial: Partial<CircleInviteListItem> & Pick<CircleInviteListItem, 'id'>): CircleInviteListItem {
  return {
    invitedEmail: `${partial.id}@example.com`,
    role: 'family',
    status: 'accepted',
    updatedAt: now - 20 * DAY,
    createdAt: now - 20 * DAY,
    acceptedByUid: partial.id,
    ...partial,
  };
}

const familyStale = invite({ id: 'fam1', displayName: 'Ada', role: 'family' });
const friendStale = invite({
  id: 'fr1',
  displayName: 'Bea',
  role: 'friend',
  invitedEmail: 'bea@example.com',
});
const caregiverStale = invite({ id: 'cg1', displayName: 'Cara', role: 'caregiver' });
const familyRecent = invite({
  id: 'fam2',
  displayName: 'Dee',
  role: 'family',
  createdAt: now - 20 * DAY,
});
const pendingFamily = invite({
  id: 'pend1',
  status: 'pending',
  acceptedByUid: undefined,
  displayName: 'Eve',
});

const listed = listInactiveCircleMembers({
  invites: [familyStale, friendStale, caregiverStale, familyRecent, pendingFamily],
  lastOpenByUid: {
    fam2: now - 2 * DAY,
  },
  now,
});

assert.deepEqual(
  listed.map((row) => row.uid),
  ['fam1', 'fr1'],
  'family and friends inactive 7+ days; caregivers and recent openers omitted',
);

assert.equal(
  listInactiveCircleMembers({
    invites: [familyStale],
    lastOpenByUid: { fam1: now - 8 * DAY },
    excludeUid: 'fam1',
    now,
  }).length,
  0,
  'viewer is not listed on their own tile',
);

assert.equal(
  listInactiveCircleMembers({
    invites: [familyStale],
    presenceByUid: { fam1: now - 1 * DAY },
    now,
  }).length,
  0,
  'live presence lastSeen within 7 days skips the tile',
);

assert.equal(
  INACTIVE_CIRCLE_MEMBER_TILE_AFTER_MS,
  7 * DAY,
);

assert.equal(
  shouldShowInactiveMemberReminder({
    enabled: true,
    members: listed,
    loading: false,
    snoozes: {},
    now,
  }),
  true,
);

assert.equal(
  shouldShowInactiveMemberReminder({
    enabled: false,
    members: listed,
    loading: false,
    snoozes: {},
    now,
  }),
  false,
  'only the proxy (inviteMembers) sees the tile',
);

assert.equal(
  shouldShowInactiveMemberReminder({
    enabled: true,
    members: listed,
    loading: false,
    snoozes: { inactiveMembers: now + DAY },
    now,
  }),
  false,
);

console.log('circle inactive member reminder tests ok');
