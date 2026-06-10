import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { isFirestoreTransientError } from '@medxforce/shared';
import {
  isFirestoreBackgroundWritePaused,
  isFirestoreQuotaError,
  pauseFirestoreBackgroundWrites,
} from '../lib/firestoreQuota';

const PRESENCE_HEARTBEAT_MS = 30_000;
const MIN_BEAT_GAP_MS = 15_000;

function shouldSkipPresenceBeat(): boolean {
  if (isFirestoreBackgroundWritePaused()) return true;
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
        if (isFirestoreQuotaError(err)) {
          pauseFirestoreBackgroundWrites(String(err));
          return;
        }
        if (isFirestoreTransientError(err)) {
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
