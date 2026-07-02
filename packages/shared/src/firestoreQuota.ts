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

/** Client write stream backlog — back off analytics, but keep presence heartbeats. */
export function isFirestoreWriteQueueExhaustedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const message = String((err as { message?: string }).message ?? '').toLowerCase();
  return (
    message.includes('queued writes') ||
    message.includes('write stream exhausted') ||
    message.includes('maximum backoff delay')
  );
}

/** Daily / project Firestore quota — pause background sync for this session. */
export function isFirestoreDailyQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const message = String((err as { message?: string }).message ?? '').toLowerCase();
  if (message.includes('quota exceeded') || message.includes('quota limit exceeded')) {
    return true;
  }
  const code = String((err as { code?: string }).code ?? '');
  return code === 'resource-exhausted' && !isFirestoreWriteQueueExhaustedError(err);
}

/** @deprecated Prefer isFirestoreDailyQuotaError or isFirestoreWriteQueueExhaustedError. */
export function isFirestoreQuotaError(err: unknown): boolean {
  return isFirestoreDailyQuotaError(err);
}

export function shouldPauseBackgroundWritesOnError(err: unknown): boolean {
  return isFirestoreDailyQuotaError(err);
}

let backgroundWritesPaused = false;

export function isFirestoreBackgroundWritePaused(): boolean {
  return backgroundWritesPaused;
}

export function pauseFirestoreBackgroundWrites(reason?: string): void {
  if (backgroundWritesPaused) return;
  backgroundWritesPaused = true;
  console.warn(
    '[Firestore] Background sync paused for this session (daily write quota exceeded).',
    reason ?? '',
  );
}

export function resumeFirestoreBackgroundWrites(): void {
  backgroundWritesPaused = false;
}

let analyticsSyncPausedUntil = 0;

export function throttleAnalyticsSync(durationMs: number): void {
  analyticsSyncPausedUntil = Date.now() + durationMs;
}

export function isAnalyticsSyncThrottled(): boolean {
  return Date.now() < analyticsSyncPausedUntil;
}

/** Shared backpressure after write-stream exhaustion — pauses non-critical Firestore sync. */
export function isFirestoreWriteBackpressureActive(): boolean {
  return isAnalyticsSyncThrottled();
}

export function throttleFirestoreWriteBackpressure(durationMs: number): void {
  throttleAnalyticsSync(durationMs);
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
