const PREFIX = 'circleMsgRead:';

export const CIRCLE_MSG_READ_CHANGED = 'circleMsgReadChanged';

export type CircleMsgReadChangedDetail = {
  patientId: string;
  messageId?: string;
  at?: number;
  /** When false, listeners should refresh UI but skip a cloud write (remote merge). */
  persist?: boolean;
};

const memoryCache = new Map<string, number>();

function cacheKey(patientId: string, messageId: string): string {
  return `${patientId}:${messageId}`;
}

function storageKey(patientId: string, messageId: string): string {
  return `${PREFIX}${patientId}:${messageId}`;
}

function readStored(patientId: string, messageId: string): number {
  try {
    const raw = localStorage.getItem(storageKey(patientId, messageId));
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeStored(patientId: string, messageId: string, at: number): void {
  try {
    localStorage.setItem(storageKey(patientId, messageId), String(at));
  } catch {
    /* ignore */
  }
}

function emitReadChanged(detail: CircleMsgReadChangedDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CIRCLE_MSG_READ_CHANGED, { detail }));
}

function rememberThreadRead(
  patientId: string,
  messageId: string,
  at: number,
  persist: boolean,
  notify = true,
): boolean {
  if (!patientId || !messageId || !Number.isFinite(at) || at <= 0) return false;
  const current = getThreadLastReadAt(patientId, messageId);
  if (at <= current) return false;
  memoryCache.set(cacheKey(patientId, messageId), at);
  writeStored(patientId, messageId, at);
  if (notify) emitReadChanged({ patientId, messageId, at, persist });
  return true;
}

export function getThreadLastReadAt(patientId: string, messageId: string): number {
  if (!patientId || !messageId) return 0;
  const mem = memoryCache.get(cacheKey(patientId, messageId)) ?? 0;
  return Math.max(mem, readStored(patientId, messageId));
}

export function markThreadRead(patientId: string, messageId: string, at = Date.now()): void {
  rememberThreadRead(patientId, messageId, at, true);
}

/** Merge last-read timestamps from Firestore without scheduling another cloud write. */
export function mergeRemoteThreadReads(
  patientId: string,
  lastReadByMessageId: Record<string, number>,
): boolean {
  let changed = false;
  for (const [messageId, at] of Object.entries(lastReadByMessageId)) {
    if (rememberThreadRead(patientId, messageId, at, false, false)) changed = true;
  }
  if (changed) emitReadChanged({ patientId, persist: false });
  return changed;
}

export function listLocalThreadReads(patientId: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!patientId) return out;
  const prefix = `${PREFIX}${patientId}:`;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const messageId = key.slice(prefix.length);
      const at = Number(localStorage.getItem(key)) || 0;
      if (messageId && at > 0) out[messageId] = at;
    }
  } catch {
    /* ignore */
  }
  const memPrefix = `${patientId}:`;
  for (const [key, at] of memoryCache) {
    if (!key.startsWith(memPrefix) || at <= 0) continue;
    const messageId = key.slice(memPrefix.length);
    if (!messageId) continue;
    out[messageId] = Math.max(out[messageId] ?? 0, at);
  }
  return out;
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
