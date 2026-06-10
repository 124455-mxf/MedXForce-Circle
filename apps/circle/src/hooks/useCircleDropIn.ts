import { useCallback, useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { CircleMemberRole } from '@medxforce/shared';
import {
  abortDropInSessionForPatientOffline,
  clearCircleAwaitingDropInResponse,
  createCircleMemberThreadPost,
  DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS,
  endDropInSession,
  expireDropInInvite,
  formatDropInTranscriptForCareCoordination,
  isDropInSessionActive,
  isDropInSessionBlocking,
  sendDropInMessage,
  startDropInSession,
  subscribeDropInMessages,
  subscribeDropInSession,
  writeCircleAwaitingDropInResponse,
  type DropInMessage,
  type DropInSession,
} from '@medxforce/shared';

export type CircleDropInSharePrompt = {
  session: DropInSession;
  messages: DropInMessage[];
};

export function useCircleDropIn(
  db: Firestore,
  patientId: string | undefined,
  userId: string | undefined,
  userDisplayName: string,
  memberRole: CircleMemberRole,
  patientDisplayName: string,
  enabled: boolean,
  patientOnline: boolean,
) {
  const [session, setSession] = useState<DropInSession | null>(null);
  const [messages, setMessages] = useState<DropInMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [sharePrompt, setSharePrompt] = useState<CircleDropInSharePrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const endedSessionRef = useRef<string | null>(null);
  const offlineAbortRef = useRef<string | null>(null);
  const expiredAwaitingRef = useRef<string | null>(null);

  const isRequester = !!session && !!userId && session.requestedByUid === userId;
  const activeSession = session && isDropInSessionActive(session) ? session : null;
  const pendingInviteSession =
    session && session.status === 'pending' && isRequester ? session : null;
  const awaitingPatientResponse = !!pendingInviteSession;
  const responseDeadline = pendingInviteSession
    ? pendingInviteSession.requestedAt + DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS
    : null;
  const responseSecondsRemaining =
    responseDeadline != null
      ? Math.max(0, Math.ceil((responseDeadline - nowTick) / 1000))
      : null;

  const sessionMessages = session
    ? messages.filter((message) => message.sessionId === session.sessionId)
    : [];

  useEffect(() => {
    if (!enabled || !patientId) {
      setSession(null);
      return;
    }
    return subscribeDropInSession(db, patientId, setSession, (msg) =>
      console.warn('[circleDropIn]', msg),
    );
  }, [db, enabled, patientId]);

  useEffect(() => {
    if (!enabled || !patientId || !session || session.status !== 'active') {
      setMessages([]);
      return;
    }
    return subscribeDropInMessages(db, patientId, setMessages, (msg) =>
      console.warn('[circleDropIn messages]', msg),
    );
  }, [db, enabled, patientId, session?.sessionId, session?.status]);

  useEffect(() => {
    if (!activeSession || !isRequester) return;
    setChatOpen(true);
  }, [activeSession, isRequester]);

  useEffect(() => {
    if (!awaitingPatientResponse) return;
    const interval = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [awaitingPatientResponse, pendingInviteSession?.sessionId]);

  useEffect(() => {
    if (!enabled || !patientId || !pendingInviteSession || responseDeadline == null) return;
    const msRemaining = responseDeadline - Date.now();
    if (msRemaining <= 0) {
      if (expiredAwaitingRef.current === pendingInviteSession.sessionId) return;
      expiredAwaitingRef.current = pendingInviteSession.sessionId;
      void expireDropInInvite(db, pendingInviteSession)
        .then(() => clearCircleAwaitingDropInResponse(patientId))
        .catch((err) => console.warn('[circleDropIn] awaiting expire', err));
      return;
    }

    const timer = window.setTimeout(() => {
      if (expiredAwaitingRef.current === pendingInviteSession.sessionId) return;
      expiredAwaitingRef.current = pendingInviteSession.sessionId;
      void expireDropInInvite(db, pendingInviteSession)
        .then(() => clearCircleAwaitingDropInResponse(patientId))
        .catch((err) => console.warn('[circleDropIn] awaiting expire', err));
    }, msRemaining);

    return () => window.clearTimeout(timer);
  }, [
    db,
    enabled,
    patientId,
    pendingInviteSession?.sessionId,
    pendingInviteSession,
    responseDeadline,
  ]);

  useEffect(() => {
    if (patientOnline || !enabled || !patientId) return;
    const blocking = session && isDropInSessionBlocking(session) ? session : null;
    if (!blocking) return;
    if (offlineAbortRef.current === blocking.sessionId) return;
    offlineAbortRef.current = blocking.sessionId;
    setChatOpen(false);
    void abortDropInSessionForPatientOffline(db, blocking, patientId).catch((err) =>
      console.warn('[circleDropIn] patient offline abort', err),
    );
  }, [db, enabled, patientId, patientOnline, session]);

  useEffect(() => {
    if (!session || !isRequester || !userId) return;
    if (session.status !== 'ended' && session.status !== 'declined') return;
    if (endedSessionRef.current === session.sessionId) return;
    endedSessionRef.current = session.sessionId;
    setChatOpen(false);

    if (session.status === 'ended') {
      const transcriptMessages = messages.filter(
        (message) => message.sessionId === session.sessionId,
      );
      if (transcriptMessages.length > 0) {
        setSharePrompt({ session, messages: transcriptMessages });
      }
    }
  }, [isRequester, messages, session, userId]);

  const requestDropIn = useCallback(async () => {
    if (!enabled || !patientId || !userId) {
      throw new Error('Drop-in is not available.');
    }
    setBusy(true);
    setError(null);
    try {
      const created = await startDropInSession(db, {
        patientId,
        requestedByUid: userId,
        requestedByName: userDisplayName,
        requestedByRole: memberRole,
      });
      writeCircleAwaitingDropInResponse(patientId, created.sessionId);
      expiredAwaitingRef.current = null;
      setNowTick(Date.now());
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start drop-in.';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [db, enabled, memberRole, patientId, userDisplayName, userId]);

  const cancelPendingDropIn = useCallback(async () => {
    if (!patientId || !pendingInviteSession) return;
    setBusy(true);
    setError(null);
    try {
      await expireDropInInvite(db, pendingInviteSession);
      clearCircleAwaitingDropInResponse(patientId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not cancel drop-in.';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [db, patientId, pendingInviteSession]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeSession || !userId) return;
      await sendDropInMessage(db, {
        patientId: activeSession.patientId,
        sessionId: activeSession.sessionId,
        text,
        authorUid: userId,
        authorName: userDisplayName,
        authorRole: 'caregiver',
      });
    },
    [activeSession, db, userDisplayName, userId],
  );

  const endConversation = useCallback(async () => {
    if (!activeSession || !userId) return;
    setBusy(true);
    setError(null);
    try {
      await endDropInSession(db, activeSession, userId, 'caregiver');
      setChatOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end conversation.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, [activeSession, db, userId]);

  const shareToCareCoordination = useCallback(async () => {
    if (!sharePrompt || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const text = formatDropInTranscriptForCareCoordination(
        sharePrompt.session,
        sharePrompt.messages,
        patientDisplayName,
      );
      await createCircleMemberThreadPost(db, {
        patientId: sharePrompt.session.patientId,
        threadKind: 'restricted',
        authorUid: userId,
        authorName: userDisplayName,
        authorRole: memberRole,
        text,
      });
      setSharePrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share conversation.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, [db, memberRole, patientDisplayName, sharePrompt, userDisplayName, userId]);

  const dismissSharePrompt = useCallback(() => {
    setSharePrompt(null);
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  const resumeChat = useCallback(() => {
    if (activeSession && isRequester) {
      setChatOpen(true);
    }
  }, [activeSession, isRequester]);

  return {
    session,
    activeSession,
    sessionMessages,
    awaitingPatientResponse,
    responseSecondsRemaining,
    chatOpen: chatOpen && !!activeSession && isRequester,
    sharePrompt: isRequester ? sharePrompt : null,
    busy,
    error,
    requestDropIn,
    cancelPendingDropIn,
    sendMessage,
    endConversation,
    shareToCareCoordination,
    dismissSharePrompt,
    closeChat,
    resumeChat,
  };
};
