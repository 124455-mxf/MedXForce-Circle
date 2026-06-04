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
import { normalizeInviteEmail } from '@medxforce/shared';
import { threadHasUnreadPatientReply } from '../lib/circleMessageRead';

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
  createdAt: number;
  updatedAt: number;
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
  const [messages, setMessages] = useState<CircleThreadMessage[]>([]);
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
      setMessages([]);
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
      setMessages(sortThreadMessages([...byId.values()].filter(matchesRecipient)));
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
    if (!patientId || messages.length === 0) {
      setRepliesByMessageId({});
      return;
    }

    const unsubs = messages.map((msg) => {
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
  }, [db, patientId, messages]);

  const unreadCount = useMemo(() => {
    return messages.filter((m) =>
      threadHasUnreadPatientReply(
        repliesByMessageId[m.id] || [],
        patientId,
        m.id,
        m,
      ),
    ).length;
  }, [messages, repliesByMessageId, patientId]);

  return {
    loading,
    error,
    messages,
    repliesByMessageId,
    unreadCount,
  };
}
