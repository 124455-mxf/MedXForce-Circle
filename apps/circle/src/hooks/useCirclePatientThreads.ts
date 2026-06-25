import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { CIRCLE_MSG_READ_CHANGED } from '../lib/circleMessageRead';
import {
  buildCirclePatientInboxMessages,
  computeCirclePatientMessageUnreadCount,
  useCirclePatientHiddenInbox,
  useCirclePatientRawMessages,
  useCirclePatientRepliesByMessageId,
} from './circlePatientMessagingCore';
import type { CircleThreadMessage, CircleThreadReply, IcuSummaryEntry } from './circlePatientMessagingTypes';

export type { CircleThreadMessage, CircleThreadReply, IcuSummaryEntry };

export type CirclePatientThreadsState = {
  loading: boolean;
  error: string | null;
  messages: CircleThreadMessage[];
  rawMessages: CircleThreadMessage[];
  hiddenAtByMessageId: Record<string, number>;
  repliesByMessageId: Record<string, CircleThreadReply[]>;
  unreadCount: number;
};

export function useCirclePatientThreads(
  db: Firestore,
  patientId: string,
  user: User,
  memberRole = 'friend',
): CirclePatientThreadsState {
  const { loading, error, rawMessages, normalizedEmail } = useCirclePatientRawMessages(
    db,
    patientId,
    user,
  );
  const hiddenAtByMessageId = useCirclePatientHiddenInbox(db, patientId, user.uid);
  const repliesByMessageId = useCirclePatientRepliesByMessageId(db, patientId);

  const messages = useMemo(
    () =>
      buildCirclePatientInboxMessages(
        rawMessages,
        hiddenAtByMessageId,
        repliesByMessageId,
        memberRole,
      ),
    [rawMessages, hiddenAtByMessageId, repliesByMessageId, memberRole],
  );

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

  const unreadCount = useMemo(() => {
    return computeCirclePatientMessageUnreadCount({
      messages,
      repliesByMessageId,
      patientId,
      memberRole,
      user,
      normalizedEmail,
      readTick,
    });
  }, [
    messages,
    repliesByMessageId,
    patientId,
    memberRole,
    user,
    normalizedEmail,
    readTick,
  ]);

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
