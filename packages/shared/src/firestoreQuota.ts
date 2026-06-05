/** Transient network / WebChannel blips — safe to retry on next heartbeat. */
export function isFirestoreTransientError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = String((err as { code?: string }).code ?? '');
  const message = String((err as { message?: string }).message ?? '').toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'aborted' ||
    code === 'cancelled' ||
    message.includes('transport errored') ||
    message.includes('webchannel') ||
    message.includes('failed to reach') ||
    message.includes('network')
  );
}

/** Detect Firestore free-tier / quota exhaustion so callers can stop write loops. */
export function isFirestoreQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = String((err as { message?: string }).message ?? '');
  return (
    code === 'resource-exhausted' ||
    message.includes('Quota exceeded') ||
    message.includes('quota limit exceeded')
  );
}

const CAP_REPAIR_SESSION_PREFIX = 'mxfc-cap-repair:';

export function hasRepairedMemberCapabilitiesThisSession(uid: string): boolean {
  try {
    return sessionStorage.getItem(`${CAP_REPAIR_SESSION_PREFIX}${uid}`) === 'ok';
  } catch {
    return false;
  }
}

export function markMemberCapabilitiesRepairedThisSession(uid: string): void {
  try {
    sessionStorage.setItem(`${CAP_REPAIR_SESSION_PREFIX}${uid}`, 'ok');
  } catch {
    /* ignore */
  }
}
