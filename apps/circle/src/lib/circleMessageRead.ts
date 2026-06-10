const PREFIX = 'circleMsgRead:';

export const CIRCLE_MSG_READ_CHANGED = 'circleMsgReadChanged';

export function getThreadLastReadAt(patientId: string, messageId: string): number {
  try {
    const raw = localStorage.getItem(`${PREFIX}${patientId}:${messageId}`);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function markThreadRead(patientId: string, messageId: string, at = Date.now()): void {
  try {
    localStorage.setItem(`${PREFIX}${patientId}:${messageId}`, String(at));
    window.dispatchEvent(
      new CustomEvent(CIRCLE_MSG_READ_CHANGED, { detail: { patientId, messageId, at } }),
    );
  } catch {
    /* ignore */
  }
}

/** ICU daily summary — unread when summary was created/updated after last open. */
export function communicationLogSummaryActivityAt(msg: {
  createdAt: number;
  updatedAt?: number;
}): number {
  return msg.updatedAt || msg.createdAt || 0;
}

export function isCommunicationLogSummaryUnread(
  msg: { createdAt: number; updatedAt?: number },
  patientId: string,
  messageId: string,
): boolean {
  const lastRead = getThreadLastReadAt(patientId, messageId);
  return communicationLogSummaryActivityAt(msg) > lastRead;
}

export function markAllCommunicationLogRead(
  patientId: string,
  summaries: { id: string; createdAt: number; updatedAt?: number }[],
  at = Date.now(),
): void {
  for (const summary of summaries) {
    markThreadRead(patientId, summary.id, at);
  }
}

export function getLatestPatientActivityAt(
  msg: { createdAt: number },
  replies: { isPatient?: boolean; timestamp: number }[],
): number {
  const initialTs = msg.createdAt || 0;
  const patientReplyTs = replies
    .filter((r) => r.isPatient)
    .reduce((max, r) => Math.max(max, r.timestamp || 0), 0);
  return Math.max(initialTs, patientReplyTs);
}

/** Unread when the patient sent the thread message and/or a patient reply after last read. */
export function threadHasUnreadPatientReply(
  replies: { isPatient?: boolean; timestamp: number }[],
  patientId: string,
  messageId: string,
  msg: { createdAt: number },
): boolean {
  const lastRead = getThreadLastReadAt(patientId, messageId);
  return getLatestPatientActivityAt(msg, replies) > lastRead;
}

export function inboxUnreadKind(
  msg: { createdAt: number },
  replies: { isPatient?: boolean; timestamp: number }[],
  patientId: string,
  messageId: string,
): 'message' | 'reply' | null {
  const lastRead = getThreadLastReadAt(patientId, messageId);
  const latest = getLatestPatientActivityAt(msg, replies);
  if (latest <= lastRead) return null;
  const hasNewPatientReply = replies.some(
    (r) => r.isPatient && (r.timestamp || 0) > lastRead,
  );
  return hasNewPatientReply ? 'reply' : 'message';
}
