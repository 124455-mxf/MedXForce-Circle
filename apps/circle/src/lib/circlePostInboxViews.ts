import {
  isAnnouncementThreadPost,
  isAppointmentInviteThreadPost,
  isAppointmentInviteVisibleToMember,
  isCircleThreadPostHiddenForUser,
  isDropInThreadPost,
  isVisitCaptureThreadPost,
  canParticipateInCircleOpenThread,
  type CareCalendarMemberInviteContext,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
  type CircleThreadPostHiddenRecord,
} from '@medxforce/shared';

export type CirclePostInboxView =
  | 'discussion'
  | 'announcements'
  | 'appointments'
  | 'drop_ins'
  | 'visit_captures'
  | 'hidden';

export type CirclePostCategory = Exclude<CirclePostInboxView, 'hidden'>;

/** Folders shown as icon-only tabs at the start of the Circle inbox strip. */
export const CIRCLE_POST_INBOX_ICON_VIEWS: readonly CirclePostInboxView[] = [
  'announcements',
  'visit_captures',
  'appointments',
  'drop_ins',
];

/** Folders shown as labeled text tabs after the icon group. */
export const CIRCLE_POST_INBOX_TEXT_VIEWS: readonly CirclePostInboxView[] = [
  'discussion',
  'hidden',
];

export function partitionCirclePostInboxViews(views: readonly CirclePostInboxView[]): {
  iconViews: CirclePostInboxView[];
  textViews: CirclePostInboxView[];
} {
  const viewSet = new Set(views);
  return {
    iconViews: CIRCLE_POST_INBOX_ICON_VIEWS.filter((view) => viewSet.has(view)),
    textViews: CIRCLE_POST_INBOX_TEXT_VIEWS.filter((view) => viewSet.has(view)),
  };
}

export function circlePostCategory(post: CircleMemberThreadPost): CirclePostCategory {
  if (isDropInThreadPost(post)) return 'drop_ins';
  if (isVisitCaptureThreadPost(post)) return 'visit_captures';
  if (isAnnouncementThreadPost(post)) return 'announcements';
  if (isAppointmentInviteThreadPost(post)) return 'appointments';
  return 'discussion';
}

export function circlePostInboxViewsForThread(
  threadKind: CircleMemberThreadKind,
  memberRole: string,
): CirclePostInboxView[] {
  if (threadKind === 'open') {
    const views: CirclePostInboxView[] = ['discussion', 'announcements', 'appointments'];
    if (canParticipateInCircleOpenThread(memberRole)) {
      views.push('visit_captures');
    }
    views.push('hidden');
    return views;
  }
  return ['discussion', 'announcements', 'drop_ins', 'visit_captures', 'hidden'];
}

export function postMatchesInboxView(
  post: CircleMemberThreadPost,
  view: CirclePostInboxView,
  hiddenByPostId: Record<string, CircleThreadPostHiddenRecord>,
  threadKind: CircleMemberThreadKind,
  viewerUid: string,
  inviteContext?: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId' | 'displayName'
  >,
): boolean {
  if (!isAppointmentInviteVisibleToMember(post, viewerUid, inviteContext)) return false;
  const isHidden = isCircleThreadPostHiddenForUser(hiddenByPostId, post.id, threadKind);
  if (view === 'hidden') return isHidden;
  if (isHidden) return false;
  return circlePostCategory(post) === view;
}

export function filterPostsForInboxView(
  posts: CircleMemberThreadPost[],
  view: CirclePostInboxView,
  hiddenByPostId: Record<string, CircleThreadPostHiddenRecord>,
  threadKind: CircleMemberThreadKind,
  viewerUid: string,
  inviteContext?: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId' | 'displayName'
  >,
): CircleMemberThreadPost[] {
  return posts.filter((post) =>
    postMatchesInboxView(post, view, hiddenByPostId, threadKind, viewerUid, inviteContext),
  );
}

export function countPostsForInboxView(
  posts: CircleMemberThreadPost[],
  view: CirclePostInboxView,
  hiddenByPostId: Record<string, CircleThreadPostHiddenRecord>,
  threadKind: CircleMemberThreadKind,
  viewerUid: string,
  inviteContext?: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId' | 'displayName'
  >,
): number {
  return filterPostsForInboxView(
    posts,
    view,
    hiddenByPostId,
    threadKind,
    viewerUid,
    inviteContext,
  ).length;
}

export function getCirclePostLatestActivityAt(post: CircleMemberThreadPost): number {
  return Math.max(post.createdAt, post.lastReplyAt ?? 0);
}

export function isCirclePostUnread(
  post: CircleMemberThreadPost,
  userUid: string,
  lastReadAt: number,
): boolean {
  if (post.authorUid !== userUid && post.createdAt > lastReadAt) return true;
  if (
    post.lastReplyAt &&
    post.lastReplyAt > lastReadAt &&
    post.lastReplyAuthorUid &&
    post.lastReplyAuthorUid !== userUid
  ) {
    return true;
  }
  return false;
}

export function countUnreadPostsForInboxView(
  posts: CircleMemberThreadPost[],
  view: CirclePostInboxView,
  hiddenByPostId: Record<string, CircleThreadPostHiddenRecord>,
  threadKind: CircleMemberThreadKind,
  userUid: string,
  getLastReadAtForPost: (postId: string) => number,
  inviteContext?: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId' | 'displayName'
  >,
): number {
  return filterPostsForInboxView(
    posts,
    view,
    hiddenByPostId,
    threadKind,
    userUid,
    inviteContext,
  ).filter((post) =>
    isCirclePostUnread(post, userUid, getLastReadAtForPost(post.id)),
  ).length;
}

export function countUnreadPostsForThread(
  posts: CircleMemberThreadPost[],
  hiddenByPostId: Record<string, CircleThreadPostHiddenRecord>,
  threadKind: CircleMemberThreadKind,
  memberRole: string,
  userUid: string,
  getLastReadAtForPost: (postId: string) => number,
  inviteContext?: Pick<
    CareCalendarMemberInviteContext,
    'contactId' | 'memberDocContactId' | 'inviteContactId' | 'displayName'
  >,
): number {
  return circlePostInboxViewsForThread(threadKind, memberRole)
    .filter((view): view is CirclePostCategory => view !== 'hidden')
    .reduce(
      (total, view) =>
        total +
        countUnreadPostsForInboxView(
          posts,
          view,
          hiddenByPostId,
          threadKind,
          userUid,
          getLastReadAtForPost,
          inviteContext,
        ),
      0,
    );
}

/** Human-readable list of inbox folders that still have unread posts. */
export function summarizeUnreadInboxFolders(
  counts: Partial<Record<CirclePostInboxView, { unread: number }>>,
  labelForView: (view: CirclePostCategory) => string,
): string | null {
  const views: CirclePostCategory[] = [
    'discussion',
    'announcements',
    'appointments',
    'visit_captures',
    'drop_ins',
  ];
  const parts = views
    .map((view) => {
      const unread = counts[view]?.unread ?? 0;
      return unread > 0 ? `${labelForView(view)} (${unread})` : null;
    })
    .filter((part): part is string => !!part);
  return parts.length ? parts.join(' · ') : null;
}
