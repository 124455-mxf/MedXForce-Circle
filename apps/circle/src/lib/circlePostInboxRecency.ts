import {
  careCalendarWallTimeToUtcMs,
  isCirclePollClosed,
  isPastAppointmentInvitePost,
  isPollThreadPost,
  type CareCalendarEntry,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import { isInboxRecentMessage } from './circleMessageInboxRecency';
import { getCirclePostLatestActivityAt, type CirclePostInboxView } from './circlePostInboxViews';

export type CircleAppointmentArchiveEntry = Pick<
  CareCalendarEntry,
  'startDateKey' | 'startTimeMinutes' | 'endTimeMinutes' | 'timezoneId'
>;

/** Age for the older-archive split: last activity, or close time for a finished poll. */
export function circlePostArchiveRecencyAt(
  post: CircleMemberThreadPost,
  now = Date.now(),
): number {
  let at = getCirclePostLatestActivityAt(post);
  if (isPollThreadPost(post) && isCirclePollClosed(post, now)) {
    at = Math.max(at, post.pollClosedAt ?? 0, post.pollClosesAt ?? 0);
  }
  return at;
}

/** Visit end (or start / end of day) — appointments collapse by event time, not invite time. */
export function appointmentInviteArchiveRecencyAt(
  post: Pick<CircleMemberThreadPost, 'careCalendarEntryId'>,
  entryById: ReadonlyMap<string, CircleAppointmentArchiveEntry>,
): number | null {
  const entryId = post.careCalendarEntryId?.trim();
  if (!entryId) return null;
  const entry = entryById.get(entryId);
  if (!entry?.startDateKey) return null;
  const minutes = entry.endTimeMinutes ?? entry.startTimeMinutes ?? 23 * 60 + 59;
  return careCalendarWallTimeToUtcMs(entry.startDateKey, minutes, entry.timezoneId);
}

export function circleInboxViewUsesOlderArchive(view: CirclePostInboxView): boolean {
  return view === 'announcements' || view === 'discussion' || view === 'appointments';
}

function shouldCollapsePastAppointmentInvite(
  post: CircleMemberThreadPost,
  now: number,
  appointmentEntryById?: ReadonlyMap<string, CircleAppointmentArchiveEntry>,
): boolean {
  if (!appointmentEntryById) return false;
  const at = new Date(now);
  if (!isPastAppointmentInvitePost(post, appointmentEntryById, at)) return false;
  const endedAt = appointmentInviteArchiveRecencyAt(post, appointmentEntryById);
  if (endedAt == null) return false;
  return !isInboxRecentMessage(endedAt, now);
}

/**
 * Collapse into the older accordion only when the item is already read
 * (opened, or treated as read by closed-poll / past-appointment / inactive-pack rules)
 * and older than the shared 7-day inbox window.
 */
export function shouldCollapseCirclePostAsOlder(
  post: CircleMemberThreadPost,
  view: CirclePostInboxView,
  isUnread: boolean,
  now = Date.now(),
  appointmentEntryById?: ReadonlyMap<string, CircleAppointmentArchiveEntry>,
): boolean {
  if (isUnread) return false;
  if (view === 'appointments') {
    return shouldCollapsePastAppointmentInvite(post, now, appointmentEntryById);
  }
  if (isInboxRecentMessage(circlePostArchiveRecencyAt(post, now), now)) return false;
  if (view === 'announcements') return true;
  if (view === 'discussion') {
    return isPollThreadPost(post) && isCirclePollClosed(post, now);
  }
  return false;
}

export function splitCirclePostsForOlderArchive(
  posts: readonly CircleMemberThreadPost[],
  view: CirclePostInboxView,
  isUnread: (post: CircleMemberThreadPost) => boolean,
  now = Date.now(),
  appointmentEntryById?: ReadonlyMap<string, CircleAppointmentArchiveEntry>,
): { main: CircleMemberThreadPost[]; older: CircleMemberThreadPost[] } {
  if (!circleInboxViewUsesOlderArchive(view)) {
    return { main: [...posts], older: [] };
  }
  const main: CircleMemberThreadPost[] = [];
  const older: CircleMemberThreadPost[] = [];
  for (const post of posts) {
    if (shouldCollapseCirclePostAsOlder(post, view, isUnread(post), now, appointmentEntryById)) {
      older.push(post);
    } else {
      main.push(post);
    }
  }
  return { main, older };
}
