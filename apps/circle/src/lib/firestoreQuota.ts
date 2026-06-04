export {
  isFirestoreQuotaError,
  hasRepairedMemberCapabilitiesThisSession,
  markMemberCapabilitiesRepairedThisSession,
} from '@medxforce/shared';

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
