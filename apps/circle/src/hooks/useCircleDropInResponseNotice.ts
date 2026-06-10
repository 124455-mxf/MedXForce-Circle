import { useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  clearCircleAwaitingDropInResponse,
  hasCircleNotifiedDropInResponse,
  readCircleAwaitingDropInResponse,
  subscribeDropInSession,
  writeCircleNotifiedDropInResponse,
  type DropInSession,
} from '@medxforce/shared';

export type CircleDropInResponseNotice = {
  sessionId: string;
};

function shouldNotifyDecline(
  session: DropInSession,
  userId: string,
  prev: DropInSession | null,
): boolean {
  if (session.requestedByUid !== userId) return false;
  if (session.status !== 'declined') return false;
  if (hasCircleNotifiedDropInResponse(session.patientId, session.sessionId, 'declined')) {
    return false;
  }

  const sawPendingTransition = prev?.sessionId === session.sessionId && prev.status === 'pending';
  const awaitingSessionId = readCircleAwaitingDropInResponse(session.patientId);
  return sawPendingTransition || awaitingSessionId === session.sessionId;
}

export function useCircleDropInResponseNotice(
  db: Firestore,
  patientId: string | undefined,
  userId: string | undefined,
  enabled: boolean,
): {
  notice: CircleDropInResponseNotice | null;
  dismissNotice: () => void;
} {
  const [notice, setNotice] = useState<CircleDropInResponseNotice | null>(null);
  const prevSessionRef = useRef<DropInSession | null>(null);

  useEffect(() => {
    if (!enabled || !patientId || !userId) {
      prevSessionRef.current = null;
      setNotice(null);
      return;
    }

    return subscribeDropInSession(db, patientId, (session) => {
      const prev = prevSessionRef.current;
      prevSessionRef.current = session;
      if (!session || !shouldNotifyDecline(session, userId, prev)) return;

      setNotice({ sessionId: session.sessionId });
      clearCircleAwaitingDropInResponse(patientId);
    });
  }, [db, enabled, patientId, userId]);

  const dismissNotice = () => {
    if (!notice || !patientId) {
      setNotice(null);
      return;
    }
    writeCircleNotifiedDropInResponse(patientId, notice.sessionId, 'declined');
    clearCircleAwaitingDropInResponse(patientId);
    setNotice(null);
  };

  return { notice, dismissNotice };
}
