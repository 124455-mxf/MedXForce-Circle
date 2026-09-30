import type { CircleMemberThreadKind, CircleMemberThreadPost } from '@medxforce/shared';
import { getCirclePostLatestActivityAt } from './circlePostInboxViews';

const PREFIX = 'circlePostThreadRead:';
export const CIRCLE_POST_THREAD_READ_CHANGED = 'circle-post-thread-read';

export type CirclePostThreadReadChangedDetail = {
  patientId: string;
  userId: string;
  threadKind?: CircleMemberThreadKind;
  postId?: string;
  at?: number;
  /** When false, listeners should refresh UI but skip a cloud write (remote merge). */
  persist?: boolean;
};

let readSnapshot = 0;
const memoryCache = new Map<string, number>();

function storageKey(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): string {
  return `${PREFIX}${patientId}:${userId}:${threadKind}:${postId}`;
}

function cacheKey(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): string {
  return `${patientId}:${userId}:${threadKind}:${postId}`;
}

function readStored(
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

function writeStored(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  at: number,
): void {
  try {
    localStorage.setItem(storageKey(patientId, userId, threadKind, postId), String(at));
  } catch {
    /* ignore */
  }
}

function notifyReadChange(detail?: CirclePostThreadReadChangedDetail): void {
  readSnapshot += 1;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CirclePostThreadReadChangedDetail>(CIRCLE_POST_THREAD_READ_CHANGED, {
      detail: detail ?? { patientId: '', userId: '', persist: false },
    }),
  );
}

function rememberPostRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  at: number,
  persist: boolean,
  notify = true,
): boolean {
  if (!patientId || !userId || !postId || !Number.isFinite(at) || at <= 0) return false;
  const current = getCirclePostThreadLastReadAt(patientId, userId, threadKind, postId);
  if (at <= current) return false;
  memoryCache.set(cacheKey(patientId, userId, threadKind, postId), at);
  writeStored(patientId, userId, threadKind, postId, at);
  if (notify) notifyReadChange({ patientId, userId, threadKind, postId, at, persist });
  return true;
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
  if (!patientId || !userId || !postId) return 0;
  const mem = memoryCache.get(cacheKey(patientId, userId, threadKind, postId)) ?? 0;
  return Math.max(mem, readStored(patientId, userId, threadKind, postId));
}

export function markCirclePostThreadRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
  at = Date.now(),
): void {
  rememberPostRead(patientId, userId, threadKind, postId, at, true);
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

/** Merge last-read timestamps from Firestore without scheduling another cloud write. */
export function mergeRemoteCirclePostThreadReads(
  patientId: string,
  userId: string,
  records: {
    postId: string;
    threadKind: CircleMemberThreadKind;
    lastReadAt: number;
  }[],
): boolean {
  let changed = false;
  for (const row of records) {
    if (
      rememberPostRead(
        patientId,
        userId,
        row.threadKind,
        row.postId,
        row.lastReadAt,
        false,
        false,
      )
    ) {
      changed = true;
    }
  }
  if (changed) notifyReadChange({ patientId, userId, persist: false });
  return changed;
}

export function listLocalCirclePostThreadReads(
  patientId: string,
  userId: string,
): { postId: string; threadKind: CircleMemberThreadKind; lastReadAt: number }[] {
  if (!patientId || !userId) return [];
  const byKey = new Map<string, { postId: string; threadKind: CircleMemberThreadKind; lastReadAt: number }>();
  const prefix = `${PREFIX}${patientId}:${userId}:`;

  const remember = (
    threadKind: CircleMemberThreadKind,
    postId: string,
    lastReadAt: number,
  ) => {
    if (!postId || lastReadAt <= 0) return;
    const key = `${threadKind}:${postId}`;
    const prev = byKey.get(key);
    if (!prev || lastReadAt > prev.lastReadAt) {
      byKey.set(key, { postId, threadKind, lastReadAt });
    }
  };

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      let threadKind: CircleMemberThreadKind | null = null;
      let postId = '';
      if (rest.startsWith('open:')) {
        threadKind = 'open';
        postId = rest.slice('open:'.length);
      } else if (rest.startsWith('restricted:')) {
        threadKind = 'restricted';
        postId = rest.slice('restricted:'.length);
      }
      if (!threadKind) continue;
      const at = Number(localStorage.getItem(key)) || 0;
      remember(threadKind, postId, at);
    }
  } catch {
    /* ignore */
  }

  const memPrefix = `${patientId}:${userId}:`;
  for (const [key, at] of memoryCache) {
    if (!key.startsWith(memPrefix) || at <= 0) continue;
    const rest = key.slice(memPrefix.length);
    let threadKind: CircleMemberThreadKind | null = null;
    let postId = '';
    if (rest.startsWith('open:')) {
      threadKind = 'open';
      postId = rest.slice('open:'.length);
    } else if (rest.startsWith('restricted:')) {
      threadKind = 'restricted';
      postId = rest.slice('restricted:'.length);
    }
    if (!threadKind) continue;
    remember(threadKind, postId, at);
  }

  return [...byKey.values()];
}

export function subscribeCirclePostThreadRead(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener(CIRCLE_POST_THREAD_READ_CHANGED, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CIRCLE_POST_THREAD_READ_CHANGED, handler);
    window.removeEventListener('storage', handler);
  };
}
