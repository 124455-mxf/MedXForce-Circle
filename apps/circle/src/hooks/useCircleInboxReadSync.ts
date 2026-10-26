import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  parseCircleMessageReadRecord,
  parseCircleThreadPostReadRecord,
  persistCircleMessageInboxReads,
  persistCircleThreadInboxReads,
} from '@medxforce/shared';
import {
  CIRCLE_MSG_READ_CHANGED,
  getThreadLastReadAt,
  listLocalThreadReads,
  mergeRemoteThreadReads,
  type CircleMsgReadChangedDetail,
} from '../lib/circleMessageRead';
import {
  CIRCLE_POST_THREAD_READ_CHANGED,
  listLocalCirclePostThreadReads,
  mergeRemoteCirclePostThreadReads,
  type CirclePostThreadReadChangedDetail,
} from '../lib/circlePostThreadRead';

const DEBOUNCE_MS = 400;

function postKey(threadKind: string, postId: string): string {
  return `${threadKind}:${postId}`;
}

/**
 * Keep In/Out and Circle post "read" state across devices and iOS home-screen PWAs:
 * localStorage + memory for instant badges, Firestore per-member inbox docs as source of truth.
 */
export function useCircleInboxReadSync(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
): void {
  useEffect(() => {
    if (!patientId || !memberUid) return undefined;

    const remoteMessages = new Map<string, number>();
    const remotePosts = new Map<string, number>();
    const pendingMessageIds = new Set<string>();
    const pendingPostKeys = new Set<string>();
    let messagesReady = false;
    let postsReady = false;
    let messageTimer: number | undefined;
    let postTimer: number | undefined;

    const persistMessages = () => {
      if (!messagesReady || pendingMessageIds.size === 0) return;
      const payload: Record<string, number> = {};
      const ids = [...pendingMessageIds];
      pendingMessageIds.clear();
      for (const messageId of ids) {
        const at = getThreadLastReadAt(patientId, messageId);
        if (at > (remoteMessages.get(messageId) ?? 0)) payload[messageId] = at;
      }
      if (Object.keys(payload).length === 0) return;
      void persistCircleMessageInboxReads(db, patientId, memberUid, payload)
        .then(() => {
          for (const [messageId, at] of Object.entries(payload)) {
            remoteMessages.set(messageId, Math.max(remoteMessages.get(messageId) ?? 0, at));
          }
        })
        .catch((err) => {
          for (const id of Object.keys(payload)) pendingMessageIds.add(id);
          console.warn('[inbox-read] message cloud save failed; kept local read state', err);
        });
    };

    const persistPosts = () => {
      if (!postsReady || pendingPostKeys.size === 0) return;
      const local = listLocalCirclePostThreadReads(patientId, memberUid);
      const wanted = local.filter((row) =>
        pendingPostKeys.has(postKey(row.threadKind, row.postId)),
      );
      pendingPostKeys.clear();
      const records = wanted.filter(
        (row) => row.lastReadAt > (remotePosts.get(postKey(row.threadKind, row.postId)) ?? 0),
      );
      if (records.length === 0) return;
      void persistCircleThreadInboxReads(db, patientId, memberUid, records)
        .then(() => {
          for (const row of records) {
            const key = postKey(row.threadKind, row.postId);
            remotePosts.set(key, Math.max(remotePosts.get(key) ?? 0, row.lastReadAt));
          }
        })
        .catch((err) => {
          for (const row of records) pendingPostKeys.add(postKey(row.threadKind, row.postId));
          console.warn('[inbox-read] post cloud save failed; kept local read state', err);
        });
    };

    const queueLocalMessageAhead = () => {
      const local = listLocalThreadReads(patientId);
      for (const [messageId, at] of Object.entries(local)) {
        if (at > (remoteMessages.get(messageId) ?? 0)) pendingMessageIds.add(messageId);
      }
    };

    const queueLocalPostAhead = () => {
      for (const row of listLocalCirclePostThreadReads(patientId, memberUid)) {
        if (row.lastReadAt > (remotePosts.get(postKey(row.threadKind, row.postId)) ?? 0)) {
          pendingPostKeys.add(postKey(row.threadKind, row.postId));
        }
      }
    };

    const scheduleMessages = (messageId?: string) => {
      if (messageId) pendingMessageIds.add(messageId);
      else queueLocalMessageAhead();
      if (!messagesReady || pendingMessageIds.size === 0) return;
      if (messageTimer) window.clearTimeout(messageTimer);
      messageTimer = window.setTimeout(persistMessages, DEBOUNCE_MS);
    };

    const schedulePosts = (threadKind?: string, postId?: string) => {
      if (threadKind && postId) pendingPostKeys.add(postKey(threadKind, postId));
      else queueLocalPostAhead();
      if (!postsReady || pendingPostKeys.size === 0) return;
      if (postTimer) window.clearTimeout(postTimer);
      postTimer = window.setTimeout(persistPosts, DEBOUNCE_MS);
    };

    const flush = () => {
      if (messageTimer) {
        window.clearTimeout(messageTimer);
        messageTimer = undefined;
      }
      if (postTimer) {
        window.clearTimeout(postTimer);
        postTimer = undefined;
      }
      persistMessages();
      persistPosts();
    };

    const unsubMessages = onSnapshot(
      collection(db, 'patients', patientId, 'message_inbox', memberUid, 'read'),
      (snap) => {
        const incoming: Record<string, number> = {};
        remoteMessages.clear();
        for (const row of snap.docs) {
          const parsed = parseCircleMessageReadRecord(row.id, row.data() as Record<string, unknown>);
          if (!parsed) continue;
          remoteMessages.set(parsed.messageId, parsed.lastReadAt);
          incoming[parsed.messageId] = parsed.lastReadAt;
        }
        mergeRemoteThreadReads(patientId, incoming);
        messagesReady = true;
        scheduleMessages();
      },
      (err) => {
        console.warn('[inbox-read] message snapshot failed', err);
      },
    );

    const unsubPosts = onSnapshot(
      collection(db, 'patients', patientId, 'circle_thread_inbox', memberUid, 'read'),
      (snap) => {
        const incoming: {
          postId: string;
          threadKind: 'open' | 'restricted';
          lastReadAt: number;
        }[] = [];
        remotePosts.clear();
        for (const row of snap.docs) {
          const parsed = parseCircleThreadPostReadRecord(
            row.id,
            row.data() as Record<string, unknown>,
          );
          if (!parsed) continue;
          remotePosts.set(postKey(parsed.threadKind, parsed.postId), parsed.lastReadAt);
          incoming.push(parsed);
        }
        mergeRemoteCirclePostThreadReads(patientId, memberUid, incoming);
        postsReady = true;
        schedulePosts();
      },
      (err) => {
        console.warn('[inbox-read] post snapshot failed', err);
      },
    );

    const onMessageRead = (event: Event) => {
      const detail = (event as CustomEvent<CircleMsgReadChangedDetail>).detail;
      if (!detail?.patientId || detail.patientId !== patientId) return;
      if (detail.persist === false) return;
      scheduleMessages(detail.messageId);
    };

    const onPostRead = (event: Event) => {
      const detail = (event as CustomEvent<CirclePostThreadReadChangedDetail>).detail;
      if (!detail?.patientId || detail.patientId !== patientId) return;
      if (detail.userId && detail.userId !== memberUid) return;
      if (detail.persist === false) return;
      schedulePosts(detail.threadKind, detail.postId);
    };

    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener(CIRCLE_MSG_READ_CHANGED, onMessageRead);
    window.addEventListener(CIRCLE_POST_THREAD_READ_CHANGED, onPostRead);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      unsubMessages();
      unsubPosts();
      window.removeEventListener(CIRCLE_MSG_READ_CHANGED, onMessageRead);
      window.removeEventListener(CIRCLE_POST_THREAD_READ_CHANGED, onPostRead);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [db, memberUid, patientId]);
}
