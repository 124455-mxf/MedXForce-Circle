import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  canViewCommunicationLog,
  isCirclePatientMessageActive,
  isPatientReplyVisibleToCircleMember,
  normalizeInviteEmail,
  shouldShowCircleThreadInInbox,
} from '@medxforce/shared';
import { isIcuDailySummary } from '../lib/circleCommunicationLog';
import {
  isCommunicationLogSummaryUnread,
  threadHasUnreadPatientReply,
} from '../lib/circleMessageRead';
import {
  circleMessageAlertAttentionKind,
  isUrgentUnreadAlertAttentionMessage,
} from '../lib/circleAlertAttentionUrgency';
import type { CircleThreadMessage, CircleThreadReply } from './circlePatientMessagingTypes';

/** Cap reply listeners — collectionGroup is blocked by Firestore rules for Circle members. */
export const MAX_PATIENT_REPLY_LISTENERS = 25;

function selectMessagesForReplyListeners(
  rawMessages: CircleThreadMessage[],
): CircleThreadMessage[] {
  return [...rawMessages]
    .filter((msg) => msg.type !== 'icu_daily_summary')
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, MAX_PATIENT_REPLY_LISTENERS);
}

export type { CircleThreadMessage, CircleThreadReply } from './circlePatientMessagingTypes';

function parseThreadMessage(
  id: string,
  data: Omit<CircleThreadMessage, 'id'>,
): CircleThreadMessage {
  return { id, ...data };
}

function sortThreadMessages(items: CircleThreadMessage[]): CircleThreadMessage[] {
  return [...items].sort(
    (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt),
  );
}

export function useCirclePatientRawMessages(
  db: Firestore,
  patientId: string,
  user: User,
) {
  const normalizedEmail = useMemo(
    () => (user.email ? normalizeInviteEmail(user.email) : ''),
    [user.email],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawMessages, setRawMessages] = useState<CircleThreadMessage[]>([]);

  const matchesRecipient = useCallback(
    (m: CircleThreadMessage) => {
      const memberUids = Array.isArray(m.circleMemberUids) ? m.circleMemberUids : [];
      const recipientEmails = Array.isArray(m.recipientEmails) ? m.recipientEmails : [];
      return (
        memberUids.includes(user.uid) ||
        (normalizedEmail.length > 0 && recipientEmails.includes(normalizedEmail))
      );
    },
    [normalizedEmail, user.uid],
  );

  useEffect(() => {
    if (!patientId) {
      setRawMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ref = collection(db, 'patients', patientId, 'messages');
    const buckets = new Map<string, CircleThreadMessage[]>();
    const unsubs: Array<() => void> = [];

    const emit = () => {
      const byId = new Map<string, CircleThreadMessage>();
      for (const list of buckets.values()) {
        for (const item of list) {
          byId.set(item.id, item);
        }
      }
      setRawMessages(sortThreadMessages([...byId.values()].filter(matchesRecipient)));
      setLoading(false);
    };

    const attach = (key: string, q: ReturnType<typeof query>) => {
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            buckets.set(
              key,
              snap.docs.map((d) =>
                parseThreadMessage(
                  d.id,
                  d.data() as Omit<CircleThreadMessage, 'id'>,
                ),
              ),
            );
            emit();
            setError(null);
          },
          (err) => {
            console.warn(`[circlePatientMessagingCore] ${key} listener`, err);
            buckets.set(key, []);
            emit();
            const hasAnyMessages = [...buckets.values()].some((list) => list.length > 0);
            if (!hasAnyMessages) {
              setError(err.message || 'Could not load messages.');
            } else {
              setError(null);
            }
            setLoading(false);
          },
        ),
      );
    };

    attach(
      'byUid',
      query(ref, where('circleMemberUids', 'array-contains', user.uid)),
    );

    if (normalizedEmail) {
      attach(
        'byEmail',
        query(ref, where('recipientEmails', 'array-contains', normalizedEmail)),
      );
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [db, patientId, normalizedEmail, user.uid, matchesRecipient]);

  return { loading, error, rawMessages, normalizedEmail };
}

export function useCirclePatientHiddenInbox(
  db: Firestore,
  patientId: string,
  userId: string,
) {
  const [hiddenAtByMessageId, setHiddenAtByMessageId] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!patientId || !userId) {
      setHiddenAtByMessageId({});
      return;
    }

    const hiddenRef = collection(db, 'patients', patientId, 'message_inbox', userId, 'hidden');
    return onSnapshot(
      hiddenRef,
      (snap) => {
        const next: Record<string, number> = {};
        for (const row of snap.docs) {
          const hiddenAt = row.data().hiddenAt;
          if (typeof hiddenAt === 'number' && hiddenAt > 0) {
            next[row.id] = hiddenAt;
          }
        }
        setHiddenAtByMessageId(next);
      },
      (err) => {
        console.warn('[circlePatientMessagingCore] hidden inbox', err);
      },
    );
  }, [db, patientId, userId]);

  return hiddenAtByMessageId;
}

/** Per-message reply listeners (rules-safe path under patients/.../messages/.../replies). */
export function useCirclePatientRepliesByMessageId(
  db: Firestore,
  patientId: string,
  rawMessages: CircleThreadMessage[],
) {
  const [repliesByMessageId, setRepliesByMessageId] = useState<
    Record<string, CircleThreadReply[]>
  >({});

  const listenedMessages = useMemo(
    () => selectMessagesForReplyListeners(rawMessages),
    [rawMessages],
  );

  useEffect(() => {
    if (!patientId || listenedMessages.length === 0) {
      setRepliesByMessageId({});
      return;
    }

    const listenedIds = new Set(listenedMessages.map((msg) => msg.id));

    const unsubs = listenedMessages.map((msg) => {
      const q = query(
        collection(db, 'patients', patientId, 'messages', msg.id, 'replies'),
        orderBy('timestamp', 'asc'),
      );
      return onSnapshot(
        q,
        (snap) => {
          const replies = snap.docs.map(
            (d) => d.data() as CircleThreadReply,
          );
          setRepliesByMessageId((prev) => {
            const next = { ...prev, [msg.id]: replies };
            for (const messageId of Object.keys(next)) {
              if (!listenedIds.has(messageId)) {
                delete next[messageId];
              }
            }
            return next;
          });
        },
        (err) => {
          console.warn('[circlePatientMessagingCore] replies', msg.id, err);
        },
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [db, listenedMessages, patientId]);

  return repliesByMessageId;
}

export function buildCirclePatientInboxMessages(
  rawMessages: CircleThreadMessage[],
  hiddenAtByMessageId: Record<string, number>,
  repliesByMessageId: Record<string, CircleThreadReply[]>,
  memberRole: string,
): CircleThreadMessage[] {
  const showCommunicationLog = canViewCommunicationLog(memberRole);
  return rawMessages.filter((msg) => {
    if (isIcuDailySummary(msg)) return showCommunicationLog;
    const hiddenAt = hiddenAtByMessageId[msg.id];
    if (isCirclePatientMessageActive(msg.status)) {
      return shouldShowCircleThreadInInbox(hiddenAt, repliesByMessageId[msg.id] || []);
    }
    return true;
  });
}

export function computeCirclePatientMessageUnreadCount(params: {
  messages: CircleThreadMessage[];
  repliesByMessageId: Record<string, CircleThreadReply[]>;
  patientId: string;
  memberRole: string;
  user: User;
  normalizedEmail: string;
  readTick?: number;
}): number {
  const { messages, repliesByMessageId, patientId, memberRole, user, normalizedEmail } = params;
  void params.readTick;

  const showCommunicationLog = canViewCommunicationLog(memberRole);
  const memberAudience = { uid: user.uid, email: normalizedEmail };

  return messages.filter((m) => {
    if (isIcuDailySummary(m)) {
      return showCommunicationLog && isCommunicationLogSummaryUnread(m, patientId, m.id);
    }
    if (!isCirclePatientMessageActive(m.status)) return false;
    const visibleReplies = (repliesByMessageId[m.id] || []).filter((reply) =>
      isPatientReplyVisibleToCircleMember(reply, memberAudience),
    );
    return threadHasUnreadPatientReply(visibleReplies, patientId, m.id, m);
  }).length;
}

export function computeCirclePatientHasUrgentAlert(params: {
  messages: CircleThreadMessage[];
  repliesByMessageId: Record<string, CircleThreadReply[]>;
  patientId: string;
  now?: number;
}): boolean {
  const { messages, repliesByMessageId, patientId } = params;
  const now = params.now ?? Date.now();

  for (const msg of messages) {
    if (!circleMessageAlertAttentionKind(msg)) continue;
    const replies = repliesByMessageId[msg.id] || [];
    if (isUrgentUnreadAlertAttentionMessage(msg, patientId, msg.id, replies, now)) {
      return true;
    }
  }
  return false;
}
