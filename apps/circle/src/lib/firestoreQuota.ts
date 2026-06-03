/** Detect Firestore free-tier / quota exhaustion so we can stop write loops. */
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

let backgroundWritesPaused = false;

export function isFirestoreBackgroundWritePaused(): boolean {
  return backgroundWritesPaused;
}

export function pauseFirestoreBackgroundWrites(reason?: string): void {
  if (backgroundWritesPaused) return;
  backgroundWritesPaused = true;
  console.warn(
    '[Firestore] Writes paused for this session (daily write quota exceeded). Reload after quota resets (midnight Pacific).',
    reason ?? '',
  );
}

export function resumeFirestoreBackgroundWrites(): void {
  backgroundWritesPaused = false;
}
