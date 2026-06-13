import type { CircleMemberThreadKind, CircleMemberThreadPost } from '@medxforce/shared';
import { getCirclePostLatestActivityAt } from './circlePostInboxViews';

const PREFIX = 'circlePostThreadRead:';
const CHANGE_EVENT = 'circle-post-thread-read';

let readSnapshot = 0;

function storageKey(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): string {
  return `${PREFIX}${patientId}:${userId}:${threadKind}:${postId}`;
}

function notifyReadChange(): void {
  readSnapshot += 1;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getCirclePostThreadReadSnapshot(): number {
  return readSnapshot;
}

export function getCirclePostThreadLastReadAt(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): number {
  try {
    const raw = localStorage.getItem(storageKey(patientId, userId, threadKind, postId));
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function markCirclePostThreadRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  at = Date.now(),
): void {
  try {
    localStorage.setItem(storageKey(patientId, userId, threadKind, postId), String(at));
    notifyReadChange();
  } catch {
    /* ignore */
  }
}

export function markCirclePostThreadReadThroughActivity(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  activityAt: number,
): void {
  const current = getCirclePostThreadLastReadAt(patientId, userId, threadKind, postId);
  markCirclePostThreadRead(
    patientId,
    userId,
    threadKind,
    postId,
    Math.max(current, activityAt, Date.now()),
  );
}

export function markCirclePostsRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  posts: CircleMemberThreadPost[],
): void {
  for (const post of posts) {
    markCirclePostThreadReadThroughActivity(
      patientId,
      userId,
      threadKind,
      post.id,
      getCirclePostLatestActivityAt(post),
    );
  }
}

export function subscribeCirclePostThreadRead(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
