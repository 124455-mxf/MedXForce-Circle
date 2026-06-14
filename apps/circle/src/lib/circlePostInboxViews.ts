import {
  isAnnouncementThreadPost,
  isCircleThreadPostHiddenForUser,
  isDropInThreadPost,
  isVisitCaptureThreadPost,
  canParticipateInCircleOpenThread,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
  type CircleThreadPostHiddenRecord,
} from '@medxforce/shared';

export type CirclePostInboxView =
  | 'discussion'
  | 'announcements'
  | 'drop_ins'
  | 'visit_captures'
  | 'hidden';

export type CirclePostCategory = Exclude<CirclePostInboxView, 'hidden'>;

/** Folders shown as icon-only tabs at the start of the Circle inbox strip. */
export const CIRCLE_POST_INBOX_ICON_VIEWS: readonly CirclePostInboxView[] = [
  'announcements',
  'visit_captures',
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
  return 'discussion';
}

export function circlePostInboxViewsForThread(
  threadKind: CircleMemberThreadKind,
  memberRole: string,
): CirclePostInboxView[] {
  if (threadKind === 'open') {
    const views: CirclePostInboxView[] = ['discussion', 'announcements'];
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
): boolean {
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
): CircleMemberThreadPost[] {
  return posts.filter((post) => postMatchesInboxView(post, view, hiddenByPostId, threadKind));
}

export function countPostsForInboxView(
  posts: CircleMemberThreadPost[],
  view: CirclePostInboxView,
  hiddenByPostId: Record<string, CircleThreadPostHiddenRecord>,
  threadKind: CircleMemberThreadKind,
): number {
  return filterPostsForInboxView(posts, view, hiddenByPostId, threadKind).length;
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
): number {
  return filterPostsForInboxView(posts, view, hiddenByPostId, threadKind).filter((post) =>
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
        ),
      0,
    );
}
