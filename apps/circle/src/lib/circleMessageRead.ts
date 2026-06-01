const PREFIX = 'circleMsgRead:';

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
  } catch {
    /* ignore */
  }
}

export function threadHasUnreadPatientReply(
  replies: { isPatient?: boolean; timestamp: number }[],
  patientId: string,
  messageId: string,
): boolean {
  const patientReplies = replies.filter((r) => r.isPatient);
  if (patientReplies.length === 0) return false;
  const latest = patientReplies.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
  return latest.timestamp > getThreadLastReadAt(patientId, messageId);
}
