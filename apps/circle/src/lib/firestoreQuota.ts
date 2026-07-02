export {
  hasRepairedMemberCapabilitiesThisSession,
  isFirestoreBackgroundWritePaused,
  isFirestoreDailyQuotaError,
  isFirestoreQuotaError,
  isFirestoreTransientError,
  isFirestoreWriteBackpressureActive,
  isFirestoreWriteQueueExhaustedError,
  markMemberCapabilitiesRepairedThisSession,
  pauseFirestoreBackgroundWrites,
  resumeFirestoreBackgroundWrites,
  throttleFirestoreWriteBackpressure,
} from '@medxforce/shared';
