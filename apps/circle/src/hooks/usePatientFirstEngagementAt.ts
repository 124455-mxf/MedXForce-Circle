import { useEffect, useState } from 'react';
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { ICU_DAILY_SUMMARY_TYPE } from '../lib/circleCommunicationLog';

function minTimestamp(current: number | null, candidate: number | undefined | null): number | null {
  if (candidate == null || !Number.isFinite(candidate) || candidate <= 0) return current;
  if (current == null || candidate < current) return candidate;
  return current;
}

/** Earliest patient communication-board activity or outgoing message timestamp. */
export function usePatientFirstEngagementAt(
  db: Firestore,
  patientId: string | undefined,
): { firstEngagementAt: number | null; loading: boolean } {
  const [firstEngagementAt, setFirstEngagementAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setFirstEngagementAt(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let messageMin: number | null = null;
    let replyMin: number | null = null;
    let messagesReady = false;
    let repliesReady = false;

    const publish = () => {
      if (!messagesReady || !repliesReady) return;
      if (messageMin == null && replyMin == null) setFirstEngagementAt(null);
      else if (messageMin == null) setFirstEngagementAt(replyMin);
      else if (replyMin == null) setFirstEngagementAt(messageMin);
      else setFirstEngagementAt(Math.min(messageMin, replyMin));
      setLoading(false);
    };

    const messagesUnsub = onSnapshot(
      query(collection(db, 'patients', patientId, 'messages')),
      (snap) => {
        let nextMin: number | null = null;
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (data.type === ICU_DAILY_SUMMARY_TYPE) {
            const entries = Array.isArray(data.summaryEntries) ? data.summaryEntries : [];
            for (const entry of entries) {
              if (entry && typeof entry === 'object') {
                const ts = (entry as { timestamp?: number }).timestamp;
                nextMin = minTimestamp(nextMin, ts);
              }
            }
            nextMin = minTimestamp(nextMin, data.createdAt as number | undefined);
            continue;
          }

          if (data.senderUid === patientId) {
            nextMin = minTimestamp(nextMin, data.createdAt as number | undefined);
          }
        }
        messageMin = nextMin;
        messagesReady = true;
        publish();
      },
      () => {
        messageMin = null;
        messagesReady = true;
        publish();
      },
    );

    const repliesUnsub = onSnapshot(
      query(collectionGroup(db, 'replies'), where('patientId', '==', patientId)),
      (snap) => {
        let nextMin: number | null = null;
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (data.isPatient === true) {
            nextMin = minTimestamp(nextMin, data.timestamp as number | undefined);
          }
        }
        replyMin = nextMin;
        repliesReady = true;
        publish();
      },
      () => {
        replyMin = null;
        repliesReady = true;
        publish();
      },
    );

    return () => {
      messagesUnsub();
      repliesUnsub();
    };
  }, [db, patientId]);

  return { firstEngagementAt, loading };
}
