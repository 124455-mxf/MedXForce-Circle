import type { CircleMemberThreadKind } from '@medxforce/shared';
import { getCircleThreadLastReadAt } from './circleMemberThreadRead';
import type { CirclePostInboxView } from './circlePostInboxViews';

const PREFIX = 'circlePostInboxRead:';
const CHANGE_EVENT = 'circle-post-inbox-read';

function storageKey(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  view: CirclePostInboxView,
): string {
  return `${PREFIX}${patientId}:${userId}:${threadKind}:${view}`;
}

export function getCirclePostInboxLastReadAt(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  view: CirclePostInboxView,
): number {
  try {
    const raw = localStorage.getItem(storageKey(patientId, userId, threadKind, view));
    if (raw) return Number(raw) || 0;
    if (view === 'hidden') return 0;
    return getCircleThreadLastReadAt(patientId, userId, threadKind);
  } catch {
    return 0;
  }
}

export function markCirclePostInboxRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  view: CirclePostInboxView,
  at = Date.now(),
): void {
  try {
    localStorage.setItem(storageKey(patientId, userId, threadKind, view), String(at));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function markCirclePostInboxReadThroughPost(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  view: CirclePostInboxView,
  postCreatedAt: number,
): void {
  const current = getCirclePostInboxLastReadAt(patientId, userId, threadKind, view);
  markCirclePostInboxRead(
    patientId,
    userId,
    threadKind,
    view,
    Math.max(current, postCreatedAt, Date.now()),
  );
}

export function subscribeCirclePostInboxRead(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
