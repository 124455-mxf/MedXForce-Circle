import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Firestore } from 'firebase/firestore';

import type { CircleMemberRole, CircleMemberThreadKind, DropInShareDestination } from '@medxforce/shared';

import {

  abortDropInSessionForPatientOffline,

  clearCircleAwaitingDropInResponse,

  circleMemberThreadKindsForDropInShare,

  createCircleMemberThreadPost,

  canOfferDropInCareTeamNotify,

  dropInPendingResponseDeadlineMs,

  dropInPatientRequestSecondsRemaining,

  endDropInSession,

  expireDropInInvite,

  filterDropInShareThreadKindsForSharer,

  formatDropInTranscriptForCareCoordination,

  isDropInCaregiverParticipant,

  isDropInPatientInitiated,

  isDropInPendingForCaregiver,

  isDropInSessionActive,

  isDropInSessionBlocking,

  primaryDropInShareDestination,

  resolveCircleThreadAudienceUids,

  resolveDropInParticipantRole,

  resolveDropInShareThreadKinds,

  respondToPatientDropInInvite,

  sendDropInMessage,

  shareDropInTranscriptWithPatient,

  startDropInSession,

  subscribeDropInMessages,

  subscribeDropInSession,

  writeCircleAwaitingDropInResponse,

  DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS,
  type DropInMessage,

  type DropInSession,

} from '@medxforce/shared';

import type { CircleTranslator } from '../lib/circleI18nContext';

import type { CircleUiLanguage } from '../lib/circleLanguages';

import { buildCircleThreadPostTranslations } from '../lib/circleThreadPostTranslate';

import {

  buildDropInTranscriptLabels,

  circleUiLanguageToLocale,

} from '../lib/dropInTranscriptI18n';



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

  viewerLanguage: CircleUiLanguage,

  t: CircleTranslator,

  memberLanguagesByUid: Record<string, CircleUiLanguage>,

  patientLanguage: CircleUiLanguage,

) {

  const [session, setSession] = useState<DropInSession | null>(null);

  const [messages, setMessages] = useState<DropInMessage[]>([]);

  const [chatOpen, setChatOpen] = useState(false);

  const [sharePrompt, setSharePrompt] = useState<CircleDropInSharePrompt | null>(null);
  const [shareThreadKinds, setShareThreadKinds] = useState<CircleMemberThreadKind[]>(['restricted']);
  const [shareDestination, setShareDestination] = useState<DropInShareDestination>('restricted');
  const [shareParticipantRole, setShareParticipantRole] = useState<string | undefined>(undefined);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());

  const endedSessionRef = useRef<string | null>(null);

  const offlineAbortRef = useRef<string | null>(null);

  const expiredAwaitingRef = useRef<string | null>(null);



  const isCaregiverParticipant =

    !!session && !!userId && isDropInCaregiverParticipant(session, userId);

  const isCaregiverRequester =

    !!session &&

    !!userId &&

    session.requestedByUid === userId &&

    !isDropInPatientInitiated(session);

  const activeSession = session && isDropInSessionActive(session) ? session : null;

  const pendingInviteSession =

    session && session.status === 'pending' && isCaregiverRequester ? session : null;

  const pendingPatientRequest =

    session && userId && isDropInPendingForCaregiver(session, userId) ? session : null;

  const awaitingPatientResponse = !!pendingInviteSession;

  const responseDeadline = pendingInviteSession

    ? dropInPendingResponseDeadlineMs(pendingInviteSession)

    : null;

  const responseSecondsRemaining =

    responseDeadline != null

      ? Math.max(0, Math.ceil((responseDeadline - nowTick) / 1000))

      : null;

  const patientRequestDeadline = pendingPatientRequest

    ? pendingPatientRequest.requestedAt + DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS

    : null;

  const patientRequestSecondsRemaining = useMemo(() => {

    void nowTick;

    return dropInPatientRequestSecondsRemaining(pendingPatientRequest);

  }, [nowTick, pendingPatientRequest]);



  const sessionMessages = session

    ? messages.filter((message) => message.sessionId === session.sessionId)

    : [];



  useEffect(() => {

    if (!enabled || !patientId) {

      setSession(null);

      return;

    }

    return subscribeDropInSession(db, patientId, (nextSession) => {
      setSession(nextSession);
      if (
        nextSession &&
        userId &&
        isDropInPendingForCaregiver(nextSession, userId)
      ) {
        setError(null);
      }
    }, (msg) => {
      console.warn('[circleDropIn]', msg);
      setError(msg);
    });

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

    if (!activeSession || !isCaregiverParticipant) return;

    setChatOpen(true);

  }, [activeSession, isCaregiverParticipant]);



  useEffect(() => {

    if (!awaitingPatientResponse && !pendingPatientRequest) return;

    const interval = window.setInterval(() => setNowTick(Date.now()), 250);

    return () => window.clearInterval(interval);

  }, [awaitingPatientResponse, pendingPatientRequest?.sessionId, pendingPatientRequest]);



  useEffect(() => {

    const pending = pendingInviteSession;

    if (!enabled || !patientId || !pending) return;

    const responseDeadlineMs = dropInPendingResponseDeadlineMs(pending);

    const msRemaining = responseDeadlineMs - Date.now();

    if (msRemaining <= 0) {

      if (expiredAwaitingRef.current === pending.sessionId) return;

      expiredAwaitingRef.current = pending.sessionId;

      void expireDropInInvite(db, pending)

        .then(() => {

          if (pendingInviteSession) {

            clearCircleAwaitingDropInResponse(patientId);

          }

        })

        .catch((err) => console.warn('[circleDropIn] awaiting expire', err));

      return;

    }



    const timer = window.setTimeout(() => {

      if (expiredAwaitingRef.current === pending.sessionId) return;

      expiredAwaitingRef.current = pending.sessionId;

      void expireDropInInvite(db, pending)

        .then(() => {

          if (pendingInviteSession) {

            clearCircleAwaitingDropInResponse(patientId);

          }

        })

        .catch((err) => console.warn('[circleDropIn] awaiting expire', err));

    }, msRemaining);



    return () => window.clearTimeout(timer);

  }, [

    db,

    enabled,

    patientId,

    pendingInviteSession,

    pendingPatientRequest,

    pendingInviteSession?.sessionId,

    pendingPatientRequest?.sessionId,

  ]);



  useEffect(() => {

    if (patientOnline || !enabled || !patientId) return;

    const blocking = session && isDropInSessionBlocking(session) ? session : null;

    if (!blocking) return;

    if (blocking.status === 'pending' && isDropInPatientInitiated(blocking)) return;

    if (offlineAbortRef.current === blocking.sessionId) return;

    offlineAbortRef.current = blocking.sessionId;

    setChatOpen(false);

    void abortDropInSessionForPatientOffline(db, blocking, patientId).catch((err) =>

      console.warn('[circleDropIn] patient offline abort', err),

    );

  }, [db, enabled, patientId, patientOnline, session]);



  useEffect(() => {

    if (!session || !isCaregiverParticipant || !userId) return;

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

  }, [isCaregiverParticipant, messages, session, userId]);

  useEffect(() => {
    if (!sharePrompt || !patientId) {
      setShareThreadKinds(['restricted']);
      setShareDestination('restricted');
      setShareParticipantRole(undefined);
      return;
    }

    let active = true;
    void resolveDropInParticipantRole(db, patientId, sharePrompt.session).then((participantRole) => {
      if (!active) return;
      setShareParticipantRole(participantRole);
      const kinds = filterDropInShareThreadKindsForSharer(
        circleMemberThreadKindsForDropInShare(participantRole),
        memberRole,
      );
      const resolved = kinds.length > 0 ? kinds : circleMemberThreadKindsForDropInShare(participantRole);
      setShareThreadKinds(resolved);
      setShareDestination(primaryDropInShareDestination(resolved));
    });

    return () => {
      active = false;
    };
  }, [db, memberRole, patientId, sharePrompt?.session.sessionId, sharePrompt]);



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



  const acceptPatientDropIn = useCallback(async () => {

    if (!pendingPatientRequest || !userId) return;

    setBusy(true);

    setError(null);

    try {

      await respondToPatientDropInInvite(db, pendingPatientRequest, 'accepted', userId);

    } catch (err) {

      const message = err instanceof Error ? err.message : 'Could not accept drop-in.';

      setError(message);

      throw err;

    } finally {

      setBusy(false);

    }

  }, [db, pendingPatientRequest, userId]);



  const declinePatientDropIn = useCallback(async () => {

    if (!pendingPatientRequest || !userId) return;

    setBusy(true);

    setError(null);

    try {

      await respondToPatientDropInInvite(db, pendingPatientRequest, 'declined', userId);

    } catch (err) {

      const message = err instanceof Error ? err.message : 'Could not decline drop-in.';

      setError(message);

      throw err;

    } finally {

      setBusy(false);

    }

  }, [db, pendingPatientRequest, userId]);



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



  const shareToCareCoordination = useCallback(async (alsoNotifyCareTeam = false) => {

    if (!sharePrompt || !userId) return;

    setBusy(true);

    setError(null);

    try {

      const labels = buildDropInTranscriptLabels(t);

      const text = formatDropInTranscriptForCareCoordination(

        sharePrompt.session,

        sharePrompt.messages,

        patientDisplayName,

        { labels, locale: circleUiLanguageToLocale(viewerLanguage) },

      );

      const targetLanguages = [
        ...new Set([...Object.values(memberLanguagesByUid), patientLanguage]),
      ] as CircleUiLanguage[];

      const translations = await buildCircleThreadPostTranslations(

        text,

        viewerLanguage,

        targetLanguages,

      );

      const participantRole = await resolveDropInParticipantRole(
        db,
        sharePrompt.session.patientId,
        sharePrompt.session,
      );
      const threadKinds = resolveDropInShareThreadKinds(participantRole, {
        alsoNotifyCareTeam,
        sharerRole: memberRole,
      });
      if (threadKinds.length === 0) {
        throw new Error('You cannot share this drop-in to the circle from your role.');
      }

      for (const threadKind of threadKinds) {
        await createCircleMemberThreadPost(db, {
          patientId: sharePrompt.session.patientId,
          threadKind,
          authorUid: userId,
          authorName: userDisplayName,
          authorRole: memberRole,
          text,
          postKind: 'drop_in',
          ...(translations.length > 0 ? { translations } : {}),
        });
      }

      if (isDropInPatientInitiated(sharePrompt.session)) {
        const audienceUids = await resolveCircleThreadAudienceUids(
          db,
          sharePrompt.session.patientId,
          threadKinds,
        );
        await shareDropInTranscriptWithPatient(db, {
          session: sharePrompt.session,
          messages: sharePrompt.messages,
          patientDisplayName,
          sharedByUid: userId,
          sharedByName: userDisplayName,
          circleMemberUids: audienceUids,
          translations,
          options: { labels, locale: circleUiLanguageToLocale(viewerLanguage) },
        });
      }

      setSharePrompt(null);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Could not share conversation.');

      throw err;

    } finally {

      setBusy(false);

    }

  }, [db, memberRole, memberLanguagesByUid, patientDisplayName, patientLanguage, sharePrompt, t, userDisplayName, userId, viewerLanguage]);



  const showCareTeamNotifyOption = useMemo(
    () => canOfferDropInCareTeamNotify(shareParticipantRole, shareDestination),
    [shareDestination, shareParticipantRole],
  );

  const dismissSharePrompt = useCallback(() => {

    setSharePrompt(null);

  }, []);



  const closeChat = useCallback(() => {

    setChatOpen(false);

  }, []);



  const resumeChat = useCallback(() => {

    if (activeSession && isCaregiverParticipant) {

      setChatOpen(true);

    }

  }, [activeSession, isCaregiverParticipant]);



  return {

    session,

    activeSession,

    sessionMessages,

    awaitingPatientResponse,

    responseSecondsRemaining,

    pendingPatientRequest,

    patientRequestSecondsRemaining,

    chatOpen: chatOpen && !!activeSession && isCaregiverParticipant,

    sharePrompt: isCaregiverParticipant ? sharePrompt : null,

    shareDestination,

    shareThreadKinds,

    showCareTeamNotifyOption,

    busy,

    error,

    requestDropIn,

    cancelPendingDropIn,

    acceptPatientDropIn,

    declinePatientDropIn,

    sendMessage,

    endConversation,

    shareToCareCoordination,

    dismissSharePrompt,

    closeChat,

    resumeChat,

  };

}

