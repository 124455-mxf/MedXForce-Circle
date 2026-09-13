import { doc, setDoc, type Firestore } from 'firebase/firestore';
import {
  isFirestoreTransientError,
  isFirestoreWriteQueueExhaustedError,
} from '@medxforce/shared';
import {
  isFirestoreBackgroundWritePaused,
  isFirestoreDailyQuotaError,
  isFirestoreWriteBackpressureActive,
  pauseFirestoreBackgroundWrites,
  throttleFirestoreWriteBackpressure,
} from '../lib/firestoreQuota';

const PRESENCE_HEARTBEAT_MS = 30_000;
const MIN_BEAT_GAP_MS = 15_000;
/** Durable activity for re-engagement email (slower than live presence). */
const LAST_OPEN_HEARTBEAT_MS = 5 * 60_000;
const MIN_LAST_OPEN_GAP_MS = 2 * 60_000;

function shouldSkipPresenceBeat(): boolean {
  if (isFirestoreBackgroundWritePaused() || isFirestoreWriteBackpressureActive()) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return true;
  return false;
}

/** Clear live presence so the patient app stops showing this member as online. */
export async function markCircleMemberPresenceOffline(
  db: Firestore,
  patientId: string,
  uid: string,
): Promise<void> {
  await setDoc(
    doc(db, 'patients', patientId, 'presence', uid),
    { uid, lastSeen: 0, status: 'offline' },
    { merge: true },
  );
}

/**
 * Durable "opened Circle" timestamp for inactivity emails.
 * Not cleared when the member hides online status from the patient.
 */
export function startCircleMemberLastOpenHeartbeat(db: Firestore, uid: string): () => void {
  let active = true;
  let writeInFlight = false;
  let lastBeatAt = 0;
  let lastTransientLogAt = 0;

  const beat = () => {
    if (!active || shouldSkipPresenceBeat()) return;
    const now = Date.now();
    if (writeInFlight || now - lastBeatAt < MIN_LAST_OPEN_GAP_MS) return;

    writeInFlight = true;
    void setDoc(
      doc(db, 'circle_profiles', uid),
      { uid, lastCircleOpenAt: now, updatedAt: now },
      { merge: true },
    )
      .then(() => {
        lastBeatAt = Date.now();
      })
      .catch((err) => {
        if (isFirestoreDailyQuotaError(err)) {
          pauseFirestoreBackgroundWrites(String(err));
          return;
        }
        if (isFirestoreTransientError(err) || isFirestoreWriteQueueExhaustedError(err)) {
          if (isFirestoreWriteQueueExhaustedError(err)) {
            throttleFirestoreWriteBackpressure(60_000);
          }
          if (Date.now() - lastTransientLogAt > 5 * 60_000) {
            lastTransientLogAt = Date.now();
            console.debug('[circleLastOpen] transient write error (will retry):', err);
          }
          return;
        }
        console.warn('[circleLastOpen] heartbeat failed:', err);
      })
      .finally(() => {
        writeInFlight = false;
      });
  };

  beat();
  const interval = window.setInterval(beat, LAST_OPEN_HEARTBEAT_MS);

  const onVisibility = () => {
    if (document.visibilityState === 'visible') beat();
  };
  const onOnline = () => beat();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);

  return () => {
    active = false;
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
  };
}

export function startCircleMemberPresenceHeartbeat(
  db: Firestore,
  patientId: string,
  uid: string,
): () => void {
  let active = true;
  let writeInFlight = false;
  let lastBeatAt = 0;
  let lastTransientLogAt = 0;

  const beat = () => {
    if (!active || shouldSkipPresenceBeat()) return;
    const now = Date.now();
    if (writeInFlight || now - lastBeatAt < MIN_BEAT_GAP_MS) return;

    writeInFlight = true;
    void setDoc(
      doc(db, 'patients', patientId, 'presence', uid),
      { uid, lastSeen: now, status: 'online' },
      { merge: true },
    )
      .then(() => {
        lastBeatAt = Date.now();
      })
      .catch((err) => {
        if (isFirestoreDailyQuotaError(err)) {
          pauseFirestoreBackgroundWrites(String(err));
          return;
        }
        if (isFirestoreTransientError(err) || isFirestoreWriteQueueExhaustedError(err)) {
          if (isFirestoreWriteQueueExhaustedError(err)) {
            throttleFirestoreWriteBackpressure(60_000);
          }
          if (Date.now() - lastTransientLogAt > 5 * 60_000) {
            lastTransientLogAt = Date.now();
            console.debug('[circlePresence] transient write error (will retry):', err);
          }
          return;
        }
        console.warn('[circlePresence] heartbeat failed:', err);
      })
      .finally(() => {
        writeInFlight = false;
      });
  };

  beat();
  const interval = window.setInterval(beat, PRESENCE_HEARTBEAT_MS);

  const onVisibility = () => {
    if (document.visibilityState === 'visible') beat();
  };
  const onOnline = () => beat();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);

  return () => {
    active = false;
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
  };
}
