import './nodeWindowShim';
import assert from 'node:assert/strict';
import type { CircleMemberThreadPost } from '@medxforce/shared';
import { splitCirclePostsForOlderArchive } from './circlePostInboxRecency';

const now = Date.parse('2026-09-11T15:00:00Z');
const dayMs = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => now - days * dayMs;

function post(
  overrides: Partial<CircleMemberThreadPost> & Pick<CircleMemberThreadPost, 'id' | 'postKind' | 'createdAt'>,
): CircleMemberThreadPost {
  return {
    patientId: 'p1',
    threadKind: 'open',
    authorUid: 'author',
    authorName: 'Proxy',
    authorRole: 'proxy',
    text: 'Hello',
    ...overrides,
  };
}

function ids(rows: CircleMemberThreadPost[]): string[] {
  return rows.map((row) => row.id);
}

const unreadOldAnnouncement = post({
  id: 'ann-unread-old',
  postKind: 'announcement',
  createdAt: daysAgo(10),
});
const readOldAnnouncement = post({
  id: 'ann-read-old',
  postKind: 'announcement',
  createdAt: daysAgo(10),
});
const readRecentAnnouncement = post({
  id: 'ann-read-recent',
  postKind: 'announcement',
  createdAt: daysAgo(2),
});

const unread = new Set(['ann-unread-old', 'poll-unread-old']);
const isUnread = (row: CircleMemberThreadPost) => unread.has(row.id);

const announcements = splitCirclePostsForOlderArchive(
  [unreadOldAnnouncement, readOldAnnouncement, readRecentAnnouncement],
  'announcements',
  isUnread,
  now,
);
assert.deepEqual(ids(announcements.main), ['ann-unread-old', 'ann-read-recent']);
assert.deepEqual(ids(announcements.older), ['ann-read-old']);

const closedOldRead = post({
  id: 'poll-closed-old',
  postKind: 'poll',
  createdAt: daysAgo(20),
  pollClosedAt: daysAgo(8),
  pollOptions: ['A', 'B'],
});
const closedRecent = post({
  id: 'poll-closed-recent',
  postKind: 'poll',
  createdAt: daysAgo(20),
  pollClosedAt: daysAgo(2),
  pollOptions: ['A', 'B'],
});
const closedOldUnread = post({
  id: 'poll-unread-old',
  postKind: 'poll',
  createdAt: daysAgo(20),
  pollClosedAt: daysAgo(8),
  lastReplyAt: daysAgo(8),
  lastReplyAuthorUid: 'other',
  pollOptions: ['A', 'B'],
});
const openOldPoll = post({
  id: 'poll-open-old',
  postKind: 'poll',
  createdAt: daysAgo(20),
  pollOptions: ['A', 'B'],
});
const oldDiscussion = post({
  id: 'disc-old',
  postKind: 'discussion',
  createdAt: daysAgo(20),
});
const closedOldWithRecentReply = post({
  id: 'poll-closed-replied',
  postKind: 'poll',
  createdAt: daysAgo(20),
  pollClosedAt: daysAgo(10),
  lastReplyAt: daysAgo(1),
  lastReplyAuthorUid: 'other',
  pollOptions: ['A', 'B'],
});

const discussion = splitCirclePostsForOlderArchive(
  [
    closedOldRead,
    closedRecent,
    closedOldUnread,
    openOldPoll,
    oldDiscussion,
    closedOldWithRecentReply,
  ],
  'discussion',
  isUnread,
  now,
);
assert.deepEqual(ids(discussion.older), ['poll-closed-old']);
assert.deepEqual(ids(discussion.main), [
  'poll-closed-recent',
  'poll-unread-old',
  'poll-open-old',
  'disc-old',
  'poll-closed-replied',
]);

const dropIns = splitCirclePostsForOlderArchive(
  [post({ id: 'drop', postKind: 'drop_in', createdAt: daysAgo(20) })],
  'drop_ins',
  () => false,
  now,
);
assert.deepEqual(ids(dropIns.older), []);
assert.deepEqual(ids(dropIns.main), ['drop']);

const appointmentEntries = new Map([
  ['past-old', { startDateKey: '2026-08-26', startTimeMinutes: 9 * 60, endTimeMinutes: 10 * 60 }],
  ['past-recent', { startDateKey: '2026-09-09', startTimeMinutes: 9 * 60, endTimeMinutes: 10 * 60 }],
  ['upcoming', { startDateKey: '2026-09-20', startTimeMinutes: 9 * 60, endTimeMinutes: 10 * 60 }],
]);
const oldInviteUpcoming = post({
  id: 'appt-upcoming',
  postKind: 'appointment_invite',
  createdAt: daysAgo(20),
  careCalendarEntryId: 'upcoming',
});
const oldInvitePastRecent = post({
  id: 'appt-past-recent',
  postKind: 'appointment_invite',
  createdAt: daysAgo(20),
  careCalendarEntryId: 'past-recent',
});
const oldInvitePastOld = post({
  id: 'appt-past-old',
  postKind: 'appointment_invite',
  createdAt: daysAgo(20),
  careCalendarEntryId: 'past-old',
});
const unreadPastOld = post({
  id: 'appt-unread',
  postKind: 'appointment_invite',
  createdAt: daysAgo(20),
  careCalendarEntryId: 'past-old',
});
const appointmentUnread = new Set(['appt-unread']);
const appointments = splitCirclePostsForOlderArchive(
  [oldInviteUpcoming, oldInvitePastRecent, oldInvitePastOld, unreadPastOld],
  'appointments',
  (row) => appointmentUnread.has(row.id),
  now,
  appointmentEntries,
);
assert.deepEqual(ids(appointments.older), ['appt-past-old']);
assert.deepEqual(ids(appointments.main), ['appt-upcoming', 'appt-past-recent', 'appt-unread']);

console.log('circlePostInboxRecency older-archive split ok');
