import type { CircleMemberThreadKind } from '@medxforce/shared';

const PREFIX = 'circleThreadRead:';
const CHANGE_EVENT = 'circle-thread-read';

function storageKey(patientId: string, userId: string, threadKind: CircleMemberThreadKind): string {
  return `${PREFIX}${patientId}:${userId}:${threadKind}`;
}

export function getCircleThreadLastReadAt(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
): number {
  try {
    const raw = localStorage.getItem(storageKey(patientId, userId, threadKind));
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function markCircleThreadRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  at = Date.now(),
): void {
  try {
    localStorage.setItem(storageKey(patientId, userId, threadKind), String(at));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeCircleThreadRead(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function countUnreadCircleThreadPosts(
  posts: { authorUid: string; createdAt: number }[],
  userUid: string,
  lastReadAt: number,
): number {
  return posts.filter((p) => p.authorUid !== userUid && p.createdAt > lastReadAt).length;
}
