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
/** Patient waits this long for a Circle member to accept a patient-initiated drop-in. */
export const DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS = 3 * 60 * 1000;
export const DROP_IN_MESSAGE_MAX_LENGTH = 2000;

export type DropInSessionStatus = 'pending' | 'active' | 'declined' | 'ended' | 'expired';

export type DropInEndedByRole = 'patient' | 'caregiver';

export type DropInInitiatedBy = 'patient' | 'caregiver';

export interface DropInSession {
  patientId: string;
  sessionId: string;
  status: DropInSessionStatus;
  requestedAt: number;
  expiresAt: number;
  requestedByUid: string;
  requestedByName: string;
  requestedByRole?: string;
  initiatedBy?: DropInInitiatedBy;
  targetUid?: string;
  targetName?: string;
  acceptedByUid?: string;
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

function readDropInFirestoreMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => unknown }).toMillis === 'function'
  ) {
    const ms = (value as { toMillis: () => number }).toMillis();
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : 0;
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    const seconds = (value as { seconds: unknown }).seconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) return seconds * 1000;
  }
  return 0;
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
  const requestedAt = readDropInFirestoreMs(data.requestedAt);
  const expiresAt = readDropInFirestoreMs(data.expiresAt);
  const requestedByUid = String(data.requestedByUid ?? '');
  if (!sessionId || !requestedAt) return null;

  let initiatedBy: DropInInitiatedBy | undefined =
    data.initiatedBy === 'patient' || data.initiatedBy === 'caregiver'
      ? data.initiatedBy
      : undefined;
  if (
    !initiatedBy &&
    status === 'pending' &&
    typeof data.targetUid === 'string' &&
    data.targetUid &&
    requestedByUid === patientId
  ) {
    initiatedBy = 'patient';
  }

  return {
    patientId,
    sessionId,
    status,
    requestedAt,
    expiresAt,
    requestedByUid,
    requestedByName: String(data.requestedByName ?? 'Care team'),
    requestedByRole:
      typeof data.requestedByRole === 'string' ? data.requestedByRole : undefined,
    initiatedBy,
    targetUid: typeof data.targetUid === 'string' ? data.targetUid : undefined,
    targetName: typeof data.targetName === 'string' ? data.targetName : undefined,
    acceptedByUid: typeof data.acceptedByUid === 'string' ? data.acceptedByUid : undefined,
    startedAt: readDropInFirestoreMs(data.startedAt) || undefined,
    endedAt: readDropInFirestoreMs(data.endedAt) || undefined,
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

export function isDropInPatientInitiated(session: DropInSession | null | undefined): boolean {
  return session?.initiatedBy === 'patient';
}

export function dropInPendingResponseDeadlineMs(session: DropInSession, now = Date.now()): number {
  const timeoutMs = isDropInPatientInitiated(session)
    ? DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS
    : DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS;
  return Math.min(session.requestedAt + timeoutMs, session.expiresAt);
}

export function isDropInInvitePending(session: DropInSession | null, now = Date.now()): boolean {
  if (!session) return false;
  if (session.status !== 'pending') return false;
  if (isDropInPatientInitiated(session)) return false;
  if (session.requestedAt + DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS <= now) return false;
  return session.expiresAt > now;
}

export function isDropInPatientRequestPending(session: DropInSession | null, now = Date.now()): boolean {
  if (!session) return false;
  if (session.status !== 'pending') return false;
  if (!isDropInPatientInitiated(session)) return false;
  if (session.requestedAt + DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS <= now) return false;
  return session.expiresAt > now;
}

export function dropInPatientRequestSecondsRemaining(
  session: DropInSession | null,
  now = Date.now(),
): number | null {
  if (!session || !isDropInPatientRequestPending(session, now)) return null;
  return Math.max(
    0,
    Math.ceil(
      (session.requestedAt + DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS - now) / 1000,
    ),
  );
}

export function isDropInPendingForCaregiver(
  session: DropInSession | null,
  caregiverUid: string | undefined,
  now = Date.now(),
): boolean {
  if (!session || !caregiverUid) return false;
  if (!isDropInPatientRequestPending(session, now)) return false;
  const targetUid = session.targetUid?.trim() || '';
  return targetUid.length > 0 && targetUid === caregiverUid.trim();
}

export function isDropInSessionActive(session: DropInSession | null): boolean {
  return session?.status === 'active';
}

export function isDropInSessionBlocking(session: DropInSession | null, now = Date.now()): boolean {
  if (!session) return false;
  if (session.status === 'active') return true;
  if (session.status !== 'pending') return false;
  const timeoutMs = isDropInPatientInitiated(session)
    ? DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS
    : DROP_IN_CIRCLE_RESPONSE_TIMEOUT_MS;
  if (session.requestedAt + timeoutMs <= now) return false;
  return session.expiresAt > now;
}

export function dropInChatPartnerNameForPatient(session: DropInSession | null | undefined): string {
  if (!session) return 'Care team';
  if (isDropInPatientInitiated(session)) {
    return session.targetName?.trim() || 'Care team';
  }
  return session.requestedByName?.trim() || 'Care team';
}

export function isDropInCaregiverParticipant(
  session: DropInSession | null | undefined,
  caregiverUid: string | undefined,
): boolean {
  if (!session || !caregiverUid) return false;
  if (isDropInPatientInitiated(session)) {
    return session.targetUid === caregiverUid || session.acceptedByUid === caregiverUid;
  }
  return session.requestedByUid === caregiverUid;
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

function formatDropInSessionTimestamp(
  ts: number | undefined,
  unknownTime = 'Unknown time',
  locale?: string,
): string {
  if (!ts) return unknownTime;
  return new Date(ts).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export type DropInTranscriptLabels = {
  conversationTitle: string;
  patientLabel: string;
  startedByLabel: string;
  endedLabel: string;
  endedByLabel: string;
  footer: string;
  careTeam: string;
  unknown: string;
  unknownTime: string;
};

export const DEFAULT_DROP_IN_TRANSCRIPT_LABELS: DropInTranscriptLabels = {
  conversationTitle: 'Drop-in conversation',
  patientLabel: 'Patient:',
  startedByLabel: 'Started by:',
  endedLabel: 'Ended:',
  endedByLabel: 'Ended by:',
  footer: '— Shared from a live drop-in session',
  careTeam: 'Care team',
  unknown: 'Unknown',
  unknownTime: 'Unknown time',
};

export const DROP_IN_THREAD_TITLE_PREFIXES = [
  'Drop-in conversation —',
  'Spontangespräch —',
  'Conversación drop-in —',
  'Rozmowa drop-in —',
] as const;

export const DROP_IN_THREAD_FOOTER_MARKERS = [
  '— Shared from a live drop-in session',
  'Shared from a live drop-in session',
  '— Aus einer Live-Spontansitzung geteilt',
  'Aus einer Live-Spontansitzung geteilt',
  '— Compartido de una sesión drop-in en vivo',
  'Compartido de una sesión drop-in en vivo',
  '— Udostępniono z sesji drop-in na żywo',
  'Udostępniono z sesji drop-in na żywo',
] as const;

export const DROP_IN_THREAD_PATIENT_LINE_PREFIXES = [
  'Patient:',
  'Paciente:',
  'Pacjent:',
] as const;

export type FormatDropInTranscriptOptions = {
  labels?: DropInTranscriptLabels;
  locale?: string;
};

export function formatDropInEndedByLabel(
  session: DropInSession,
  patientDisplayName: string,
  labels: Pick<DropInTranscriptLabels, 'careTeam' | 'unknown'> = DEFAULT_DROP_IN_TRANSCRIPT_LABELS,
): string {
  if (session.endedByRole === 'patient') return patientDisplayName;
  if (session.endedByRole === 'caregiver') {
    if (session.endedByUid && session.endedByUid === session.requestedByUid) {
      return session.requestedByName;
    }
    return labels.careTeam;
  }
  return labels.unknown;
}

export function formatDropInTranscriptForCareCoordination(
  session: DropInSession,
  messages: DropInMessage[],
  patientDisplayName: string,
  options?: FormatDropInTranscriptOptions,
): string {
  const labels = options?.labels ?? DEFAULT_DROP_IN_TRANSCRIPT_LABELS;
  const locale = options?.locale;
  const started = formatDropInSessionTimestamp(session.startedAt, labels.unknownTime, locale);
  const ended = formatDropInSessionTimestamp(session.endedAt, labels.unknownTime, locale);
  const endedBy = formatDropInEndedByLabel(session, patientDisplayName, labels);
  const lines = [
    `${labels.conversationTitle} — ${started}`,
    `${labels.patientLabel} ${patientDisplayName}`,
    `${labels.startedByLabel} ${session.requestedByName}`,
    `${labels.endedLabel} ${ended}`,
    `${labels.endedByLabel} ${endedBy}`,
    '',
  ];

  for (const message of messages) {
    const who = message.authorRole === 'patient' ? patientDisplayName : message.authorName;
    lines.push(`${who}: ${message.text}`);
  }

  lines.push('', labels.footer);
  return lines.join('\n').trim();
}

export const DROP_IN_PATIENT_TRANSCRIPT_MAX_LENGTH = 50_000;

export function dropInPatientTranscriptMessageId(sessionId: string): string {
  return `dropin_${sessionId}`.slice(0, 128);
}

export function dropInParticipantUid(session: DropInSession): string {
  if (isDropInPatientInitiated(session)) {
    return session.targetUid?.trim() || '';
  }
  return session.requestedByUid.trim();
}

export async function resolveDropInParticipantRole(
  db: Firestore,
  patientId: string,
  session: DropInSession,
): Promise<string | undefined> {
  const uid = dropInParticipantUid(session);
  if (!uid) return undefined;
  try {
    const snap = await getDoc(doc(db, 'patients', patientId, 'members', uid));
    if (!snap.exists()) return session.requestedByRole;
    const role = snap.data()?.role;
    return typeof role === 'string' && role.trim() ? role.trim() : session.requestedByRole;
  } catch {
    return session.requestedByRole;
  }
}

/** Save a shared drop-in transcript into the patient Messages inbox (In/Out). */
export async function shareDropInTranscriptWithPatient(
  db: Firestore,
  params: {
    session: DropInSession;
    messages: DropInMessage[];
    patientDisplayName: string;
    sharedByUid: string;
    sharedByName: string;
    circleMemberUids?: string[];
    translations?: { language: string; text: string; isAuto?: boolean }[];
    options?: FormatDropInTranscriptOptions;
  },
): Promise<void> {
  if (!isDropInPatientInitiated(params.session)) return;

  const patientId = params.session.patientId;
  const participantUid = dropInParticipantUid(params.session);
  const audienceUids = [
    ...new Set(
      [...(params.circleMemberUids ?? []), participantUid, params.sharedByUid].filter(Boolean),
    ),
  ];
  const text = formatDropInTranscriptForCareCoordination(
    params.session,
    params.messages,
    params.patientDisplayName,
    params.options,
  );
  const truncatedText =
    text.length > DROP_IN_PATIENT_TRANSCRIPT_MAX_LENGTH
      ? `${text.slice(0, DROP_IN_PATIENT_TRANSCRIPT_MAX_LENGTH - 3)}...`
      : text;
  const subjectLine = truncatedText.split('\n')[0]?.trim() || 'Drop-in conversation';
  const messageId = dropInPatientTranscriptMessageId(params.session.sessionId);
  const now = Date.now();

  await setDoc(
    doc(db, 'patients', patientId, 'messages', messageId),
    {
      id: messageId,
      subject: subjectLine.slice(0, 500),
      text: truncatedText,
      senderUid: patientId,
      senderName: params.patientDisplayName.trim() || 'Patient',
      status: 'sent',
      type: 'message',
      postKind: 'drop_in',
      dropInSessionId: params.session.sessionId,
      initiatedByPatient: true,
      sharedByUid: params.sharedByUid,
      sharedByName: params.sharedByName.trim() || 'Care team',
      recipientEmails: [],
      recipientContactIds: [],
      circleMemberUids: audienceUids,
      translations: params.translations ?? [],
      hasNewReply: false,
      createdAt: params.session.startedAt || params.session.requestedAt || now,
      updatedAt: now,
      summaryEntries: [],
    },
    { merge: true },
  );
}

/** Care coordination posts shared from a drop-in chat (title line varies by language). */
export function isDropInThreadPost(post: { text: string; postKind?: string }): boolean {
  if (post.postKind === 'drop_in') return true;
  const text = post.text.replace(/\r\n/g, '\n').trim();
  if (!text) return false;
  if (DROP_IN_THREAD_TITLE_PREFIXES.some((prefix) => text.startsWith(prefix))) return true;
  if (DROP_IN_THREAD_FOOTER_MARKERS.some((marker) => text.includes(marker))) return true;
  const lines = text.split('\n');
  return DROP_IN_THREAD_PATIENT_LINE_PREFIXES.some(
    (prefix) => lines[1]?.trim().startsWith(prefix) === true,
  );
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

function formatDropInWriteError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  if (code === 'permission-denied') {
    return 'Drop-in request was blocked by Firestore rules. Republish firestore.rules and try again.';
  }
  return err instanceof Error ? err.message : 'Could not send drop-in request.';
}

export async function startPatientDropInSession(
  db: Firestore,
  params: {
    patientId: string;
    patientUid: string;
    patientDisplayName: string;
    targetUid: string;
    targetName: string;
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
  const targetUid = params.targetUid.trim();
  if (!targetUid) {
    throw new Error('Choose someone from your Circle who is online.');
  }
  const targetName = params.targetName.trim() || 'Care team';
  const session: DropInSession = {
    patientId: params.patientId,
    sessionId: newDropInSessionId(),
    status: 'pending',
    requestedAt: now,
    expiresAt: now + DROP_IN_PATIENT_INITIATED_RESPONSE_TIMEOUT_MS,
    requestedByUid: params.patientUid,
    requestedByName: params.patientDisplayName.trim() || 'Patient',
    initiatedBy: 'patient',
    targetUid,
    targetName,
  };
  const payload = {
    patientId: session.patientId,
    sessionId: session.sessionId,
    status: session.status,
    requestedAt: session.requestedAt,
    expiresAt: session.expiresAt,
    requestedByUid: session.requestedByUid,
    requestedByName: session.requestedByName,
    initiatedBy: session.initiatedBy,
    targetUid: session.targetUid,
    targetName: session.targetName,
  };

  try {
    await setDoc(ref, payload);
  } catch (err) {
    throw new Error(formatDropInWriteError(err));
  }

  const verified = await getDoc(ref);
  if (!verified.exists()) {
    throw new Error('Drop-in request did not save. Check your connection and try again.');
  }
  const saved = parseDropInSession(params.patientId, verified.data() as Record<string, unknown>);
  if (
    !saved ||
    saved.sessionId !== session.sessionId ||
    saved.status !== 'pending' ||
    saved.initiatedBy !== 'patient' ||
    saved.targetUid?.trim() !== targetUid
  ) {
    throw new Error('Drop-in request did not save correctly. Please try again.');
  }

  return saved;
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

export async function respondToPatientDropInInvite(
  db: Firestore,
  session: DropInSession,
  response: 'accepted' | 'declined',
  caregiverUid: string,
): Promise<void> {
  const now = Date.now();
  if (response === 'declined') {
    await updateDoc(dropInSessionDocRef(db, session.patientId), {
      status: 'declined',
      endedAt: now,
      endedByUid: caregiverUid,
      endedByRole: 'caregiver',
    });
    return;
  }

  await updateDoc(dropInSessionDocRef(db, session.patientId), {
    status: 'active',
    startedAt: now,
    acceptedByUid: caregiverUid,
  });
}

export async function cancelPatientDropInRequest(
  db: Firestore,
  session: DropInSession,
  patientUid: string,
): Promise<void> {
  await updateDoc(dropInSessionDocRef(db, session.patientId), {
    status: 'expired',
    endedAt: Date.now(),
    endedByUid: patientUid,
    endedByRole: 'patient',
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
