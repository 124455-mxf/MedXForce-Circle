import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

export const DROP_IN_LIVE_DOC_ID = 'live';
export const DROP_IN_INVITE_TTL_MS = 5 * 60 * 1000;
/** Circle caregiver waits this long for accept/decline before auto-closing the invite. */
export const DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS = 30 * 1000;
export const DROP_IN_MESSAGE_MAX_LENGTH = 2000;

export type DropInSessionStatus = 'pending' | 'active' | 'declined' | 'ended' | 'expired';

export type DropInEndedByRole = 'patient' | 'caregiver';

export interface DropInSession {
  patientId: string;
  sessionId: string;
  status: DropInSessionStatus;
  requestedAt: number;
  expiresAt: number;
  requestedByUid: string;
  requestedByName: string;
  requestedByRole?: string;
  startedAt?: number;
  endedAt?: number;
  endedByUid?: string;
  endedByRole?: DropInEndedByRole;
}

export interface DropInMessage {
  id: string;
  sessionId: string;
  patientId: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorRole: DropInEndedByRole;
  createdAt: number;
}

export function dropInSessionDocRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'drop_in', DROP_IN_LIVE_DOC_ID);
}

export function dropInMessagesCollection(db: Firestore, patientId: string) {
  return collection(db, 'patients', patientId, 'drop_in', DROP_IN_LIVE_DOC_ID, 'messages');
}

export function newDropInSessionId(): string {
  return `dropin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseDropInSession(
  patientId: string,
  data: Record<string, unknown> | undefined,
): DropInSession | null {
  if (!data) return null;
  const status = data.status;
  if (
    status !== 'pending' &&
    status !== 'active' &&
    status !== 'declined' &&
    status !== 'ended' &&
    status !== 'expired'
  ) {
    return null;
  }
  const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
  const requestedAt = typeof data.requestedAt === 'number' ? data.requestedAt : 0;
  const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : 0;
  if (!sessionId || !requestedAt) return null;

  return {
    patientId,
    sessionId,
    status,
    requestedAt,
    expiresAt,
    requestedByUid: String(data.requestedByUid ?? ''),
    requestedByName: String(data.requestedByName ?? 'Care team'),
    requestedByRole:
      typeof data.requestedByRole === 'string' ? data.requestedByRole : undefined,
    startedAt: typeof data.startedAt === 'number' ? data.startedAt : undefined,
    endedAt: typeof data.endedAt === 'number' ? data.endedAt : undefined,
    endedByUid: typeof data.endedByUid === 'string' ? data.endedByUid : undefined,
    endedByRole:
      data.endedByRole === 'patient' || data.endedByRole === 'caregiver'
        ? data.endedByRole
        : undefined,
  };
}

export function parseDropInMessage(
  id: string,
  data: Record<string, unknown>,
): DropInMessage | null {
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  const createdAt = typeof data.createdAt === 'number' ? data.createdAt : 0;
  const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
  const patientId = typeof data.patientId === 'string' ? data.patientId : '';
  if (!text || !createdAt || !sessionId || !patientId) return null;
  const authorRole = data.authorRole;
  if (authorRole !== 'patient' && authorRole !== 'caregiver') return null;

  return {
    id,
    sessionId,
    patientId,
    text,
    authorUid: String(data.authorUid ?? ''),
    authorName: String(data.authorName ?? ''),
    authorRole,
    createdAt,
  };
}

export function isDropInInvitePending(session: DropInSession | null, now = Date.now()): boolean {
  if (!session) return false;
  if (session.status !== 'pending') return false;
  if (session.requestedAt + DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS <= now) return false;
  return session.expiresAt > now;
}

export function isDropInSessionActive(session: DropInSession | null): boolean {
  return session?.status === 'active';
}

export function isDropInSessionBlocking(session: DropInSession | null, now = Date.now()): boolean {
  if (!session) return false;
  if (session.status === 'active') return true;
  if (session.status === 'pending' && session.requestedAt + DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS <= now) {
    return false;
  }
  if (session.status === 'pending' && session.expiresAt > now) return true;
  return false;
}

export function dropInPatientInviteBannerText(session: DropInSession): string {
  const who = session.requestedByName?.trim() || 'Your care team';
  return `${who} would like to drop in for a live conversation on your tablet.`;
}

export function dropInCircleInviteConfirmTitle(): string {
  return 'Drop in on patient tablet?';
}

export function dropInCircleInviteConfirmBody(): string {
  return 'The patient will see a prompt to accept or decline. If they accept, you can chat live in a modal until either of you ends the conversation.';
}

export function dropInCircleAwaitingTitle(): string {
  return 'Waiting for patient…';
}

export function dropInCircleAwaitingBody(): string {
  return 'The patient will see a prompt to accept or decline. This request closes automatically if there is no response.';
}

export function dropInCircleAwaitingCountdownLabel(secondsRemaining: number): string {
  const seconds = Math.max(0, secondsRemaining);
  if (seconds === 1) return 'Closing in 1 second if there is no response';
  return `Closing in ${seconds} seconds if there is no response`;
}

export type DropInPatientResponse = 'accepted' | 'declined';

export function dropInCircleResponseTitle(response: DropInPatientResponse): string {
  return response === 'accepted' ? 'Patient chose Open now' : 'Patient chose Not now';
}

export function dropInCircleResponseBody(
  response: DropInPatientResponse,
  patientName: string,
): string {
  if (response === 'accepted') {
    return `${patientName} accepted your drop-in request. You can chat live until either of you ends the conversation.`;
  }
  return `${patientName} declined your drop-in request.`;
}

function formatDropInSessionTimestamp(ts: number | undefined): string {
  if (!ts) return 'Unknown time';
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDropInEndedByLabel(
  session: DropInSession,
  patientDisplayName: string,
): string {
  if (session.endedByRole === 'patient') return patientDisplayName;
  if (session.endedByRole === 'caregiver') {
    if (session.endedByUid && session.endedByUid === session.requestedByUid) {
      return session.requestedByName;
    }
    return 'Care team';
  }
  return 'Unknown';
}

export function formatDropInTranscriptForCareCoordination(
  session: DropInSession,
  messages: DropInMessage[],
  patientDisplayName: string,
): string {
  const started = formatDropInSessionTimestamp(session.startedAt);
  const ended = formatDropInSessionTimestamp(session.endedAt);
  const endedBy = formatDropInEndedByLabel(session, patientDisplayName);
  const lines = [
    `Drop-in conversation — ${started}`,
    `Patient: ${patientDisplayName}`,
    `Started by: ${session.requestedByName}`,
    `Ended: ${ended}`,
    `Ended by: ${endedBy}`,
    '',
  ];

  for (const message of messages) {
    const who = message.authorRole === 'patient' ? patientDisplayName : message.authorName;
    lines.push(`${who}: ${message.text}`);
  }

  lines.push('', '— Shared from a live drop-in session');
  return lines.join('\n').trim();
}

export async function startDropInSession(
  db: Firestore,
  params: {
    patientId: string;
    requestedByUid: string;
    requestedByName: string;
    requestedByRole?: string;
  },
): Promise<DropInSession> {
  const ref = dropInSessionDocRef(db, params.patientId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const parsed = parseDropInSession(params.patientId, existing.data() as Record<string, unknown>);
    if (isDropInSessionBlocking(parsed)) {
      throw new Error('A drop-in is already in progress or waiting for a response.');
    }
  }

  const now = Date.now();
  const session: DropInSession = {
    patientId: params.patientId,
    sessionId: newDropInSessionId(),
    status: 'pending',
    requestedAt: now,
    expiresAt: now + DROP_IN_INVITE_TTL_MS,
    requestedByUid: params.requestedByUid,
    requestedByName: params.requestedByName.trim() || 'Care team',
    requestedByRole: params.requestedByRole,
  };
  await setDoc(ref, session);
  return session;
}

export async function respondToDropInInvite(
  db: Firestore,
  session: DropInSession,
  response: 'accepted' | 'declined',
  patientUid: string,
): Promise<void> {
  const now = Date.now();
  if (response === 'declined') {
    await updateDoc(dropInSessionDocRef(db, session.patientId), {
      status: 'declined',
      endedAt: now,
      endedByUid: patientUid,
      endedByRole: 'patient',
    });
    return;
  }

  await updateDoc(dropInSessionDocRef(db, session.patientId), {
    status: 'active',
    startedAt: now,
  });
}

export async function expireDropInInvite(
  db: Firestore,
  session: DropInSession,
): Promise<void> {
  await updateDoc(dropInSessionDocRef(db, session.patientId), {
    status: 'expired',
    endedAt: Date.now(),
  });
}

export async function endDropInSession(
  db: Firestore,
  session: DropInSession,
  endedByUid: string,
  endedByRole: DropInEndedByRole,
): Promise<void> {
  await updateDoc(dropInSessionDocRef(db, session.patientId), {
    status: 'ended',
    endedAt: Date.now(),
    endedByUid,
    endedByRole,
  });
}

/** Idempotent cleanup when the patient app goes offline or disconnects. */
export async function abortDropInSessionForPatientOffline(
  db: Firestore,
  session: DropInSession,
  patientUid: string,
): Promise<void> {
  if (
    session.status === 'ended' ||
    session.status === 'declined' ||
    session.status === 'expired'
  ) {
    return;
  }
  if (session.status === 'pending') {
    await expireDropInInvite(db, session);
    return;
  }
  await endDropInSession(db, session, patientUid, 'patient');
}

export async function sendDropInMessage(
  db: Firestore,
  params: {
    patientId: string;
    sessionId: string;
    text: string;
    authorUid: string;
    authorName: string;
    authorRole: DropInEndedByRole;
  },
): Promise<void> {
  const body = params.text.trim().slice(0, DROP_IN_MESSAGE_MAX_LENGTH);
  if (!body) throw new Error('Please write a message before sending.');

  await addDoc(dropInMessagesCollection(db, params.patientId), {
    patientId: params.patientId,
    sessionId: params.sessionId,
    text: body,
    authorUid: params.authorUid,
    authorName: params.authorName.trim() || (params.authorRole === 'patient' ? 'Patient' : 'Care team'),
    authorRole: params.authorRole,
    createdAt: Date.now(),
  });
}

export function subscribeDropInSession(
  db: Firestore,
  patientId: string,
  onChange: (session: DropInSession | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    dropInSessionDocRef(db, patientId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(parseDropInSession(patientId, snap.data() as Record<string, unknown>));
    },
    (err) => onError?.(err.message),
  );
}

export function subscribeDropInMessages(
  db: Firestore,
  patientId: string,
  onChange: (messages: DropInMessage[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(dropInMessagesCollection(db, patientId), orderBy('createdAt', 'asc')),
    (snap) => {
      const messages: DropInMessage[] = [];
      for (const docSnap of snap.docs) {
        const parsed = parseDropInMessage(docSnap.id, docSnap.data() as Record<string, unknown>);
        if (parsed) messages.push(parsed);
      }
      onChange(messages);
    },
    (err) => onError?.(err.message),
  );
}

function circleAwaitingDropInStorageKey(patientId: string): string {
  return `medx_circle_awaiting_drop_in_${patientId}`;
}

function circleNotifiedDropInStorageKey(patientId: string, sessionId: string, response: DropInPatientResponse): string {
  return `medx_circle_drop_in_notice_${patientId}_${sessionId}_${response}`;
}

export function writeCircleAwaitingDropInResponse(patientId: string, sessionId: string): void {
  try {
    localStorage.setItem(circleAwaitingDropInStorageKey(patientId), sessionId);
  } catch {
    /* ignore */
  }
}

export function readCircleAwaitingDropInResponse(patientId: string): string {
  try {
    return localStorage.getItem(circleAwaitingDropInStorageKey(patientId)) ?? '';
  } catch {
    return '';
  }
}

export function clearCircleAwaitingDropInResponse(patientId: string): void {
  try {
    localStorage.removeItem(circleAwaitingDropInStorageKey(patientId));
  } catch {
    /* ignore */
  }
}

export function hasCircleNotifiedDropInResponse(
  patientId: string,
  sessionId: string,
  response: DropInPatientResponse,
): boolean {
  try {
    return localStorage.getItem(circleNotifiedDropInStorageKey(patientId, sessionId, response)) === '1';
  } catch {
    return false;
  }
}

export function writeCircleNotifiedDropInResponse(
  patientId: string,
  sessionId: string,
  response: DropInPatientResponse,
): void {
  try {
    localStorage.setItem(circleNotifiedDropInStorageKey(patientId, sessionId, response), '1');
  } catch {
    /* ignore */
  }
}

export function readLastHandledDropInSessionId(patientId: string): string {
  try {
    return localStorage.getItem(`medx_last_drop_in_${patientId}`) ?? '';
  } catch {
    return '';
  }
}

export function writeLastHandledDropInSessionId(patientId: string, sessionId: string): void {
  try {
    localStorage.setItem(`medx_last_drop_in_${patientId}`, sessionId);
  } catch {
    /* ignore */
  }
}
