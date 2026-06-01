import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
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

  const visibleFilter = useCallback(
    (m: CircleThreadMessage) => {
      const memberUids = Array.isArray(m.circleMemberUids) ? m.circleMemberUids : [];
      const recipientEmails = Array.isArray(m.recipientEmails) ? m.recipientEmails : [];
      return (
        memberUids.includes(user.uid) ||
        (normalizedEmail && recipientEmails.includes(normalizedEmail))
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
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<CircleThreadMessage, 'id'>) }))
          .filter(visibleFilter)
          .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
        setMessages(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load messages.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, patientId, visibleFilter]);

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
      threadHasUnreadPatientReply(repliesByMessageId[m.id] || [], patientId, m.id),
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
