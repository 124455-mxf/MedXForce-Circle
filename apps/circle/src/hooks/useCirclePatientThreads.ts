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
  isPatientReplyVisibleToCircleMember,
  normalizeInviteEmail,
  shouldShowCircleThreadInInbox,
  isCirclePatientMessageActive,
} from '@medxforce/shared';
import {
  CIRCLE_MSG_READ_CHANGED,
  isCommunicationLogSummaryUnread,
  threadHasUnreadPatientReply,
} from '../lib/circleMessageRead';
import { isIcuDailySummary } from '../lib/circleCommunicationLog';

export type IcuSummaryEntry = {
  text: string;
  timestamp: number;
  source?: 'save' | 'speak';
};

export type CircleThreadMessage = {
  id: string;
  subject?: string;
  text: string;
  senderUid: string;
  senderName: string;
  status?: string;
  type?: string;
  circleMemberUids?: string[];
  recipientEmails?: string[];
  translations?: { language: string; text: string; subject?: string }[];
  createdAt: number;
  updatedAt: number;
  summaryEntries?: IcuSummaryEntry[];
};

export type CircleThreadReply = {
  id: string;
  patientId: string;
  messageId: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  isPatient: boolean;
  channel: 'app' | 'email';
  recipientEmails?: string[];
  circleMemberUids?: string[];
  timestamp: number;
};

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

export function useCirclePatientThreads(
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
  const [hiddenAtByMessageId, setHiddenAtByMessageId] = useState<Record<string, number>>({});
  const [repliesByMessageId, setRepliesByMessageId] = useState<
    Record<string, CircleThreadReply[]>
  >({});

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
      setHiddenAtByMessageId({});
      setRepliesByMessageId({});
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
          },
          (err) => {
            setError(err.message || 'Could not load messages.');
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

  useEffect(() => {
    if (!patientId || !user.uid) {
      setHiddenAtByMessageId({});
      return;
    }

    const hiddenRef = collection(db, 'patients', patientId, 'message_inbox', user.uid, 'hidden');
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
        console.warn('[useCirclePatientThreads] hidden inbox', err);
      },
    );
  }, [db, patientId, user.uid]);

  const messages = useMemo(() => {
    return rawMessages.filter((msg) => {
      if (isIcuDailySummary(msg)) return true;
      const hiddenAt = hiddenAtByMessageId[msg.id];
      if (isCirclePatientMessageActive(msg.status)) {
        return shouldShowCircleThreadInInbox(hiddenAt, repliesByMessageId[msg.id] || []);
      }
      return true;
    });
  }, [rawMessages, hiddenAtByMessageId, repliesByMessageId]);

  useEffect(() => {
    if (!patientId || rawMessages.length === 0) {
      setRepliesByMessageId({});
      return;
    }

    const unsubs = rawMessages.filter((msg) => msg.type !== 'icu_daily_summary').map((msg) => {
      const q = query(
        collection(db, 'patients', patientId, 'messages', msg.id, 'replies'),
        orderBy('timestamp', 'asc'),
      );
      return onSnapshot(q, (snap) => {
        const replies = snap.docs.map(
          (d) => d.data() as CircleThreadReply,
        );
        setRepliesByMessageId((prev) => ({ ...prev, [msg.id]: replies }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [db, patientId, rawMessages]);

  const [readTick, setReadTick] = useState(0);

  useEffect(() => {
    const onReadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (!detail?.patientId || detail.patientId === patientId) {
        setReadTick((v) => v + 1);
      }
    };
    window.addEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
    return () => window.removeEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
  }, [patientId]);

  const memberAudience = useMemo(
    () => ({ uid: user.uid, email: normalizedEmail }),
    [normalizedEmail, user.uid],
  );

  const repliesVisibleToMember = useCallback(
    (replies: CircleThreadReply[] = []) =>
      replies.filter((reply) => isPatientReplyVisibleToCircleMember(reply, memberAudience)),
    [memberAudience],
  );

  const unreadCount = useMemo(() => {
    return messages.filter((m) => {
      if (isIcuDailySummary(m)) {
        return isCommunicationLogSummaryUnread(m, patientId, m.id);
      }
      if (!isCirclePatientMessageActive(m.status)) return false;
      return threadHasUnreadPatientReply(
        repliesVisibleToMember(repliesByMessageId[m.id] || []),
        patientId,
        m.id,
        m,
      );
    }).length;
  }, [messages, repliesByMessageId, patientId, readTick, repliesVisibleToMember]);

  return {
    loading,
    error,
    messages,
    rawMessages,
    hiddenAtByMessageId,
    repliesByMessageId,
    unreadCount,
  };
}
