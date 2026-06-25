import { useEffect, useState } from 'react';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { ICU_DAILY_SUMMARY_TYPE } from '../lib/circleCommunicationLog';

function minTimestamp(current: number | null, candidate: number | undefined | null): number | null {
  if (candidate == null || !Number.isFinite(candidate) || candidate <= 0) return current;
  if (current == null || candidate < current) return candidate;
  return current;
}

/** One-shot fetch — celebration widget only needs the earliest timestamp once per visit. */
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
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [messagesSnap, repliesSnap] = await Promise.all([
          getDocs(collection(db, 'patients', patientId, 'messages')),
          getDocs(
            query(collectionGroup(db, 'replies'), where('patientId', '==', patientId)),
          ),
        ]);

        if (cancelled) return;

        let messageMin: number | null = null;
        for (const docSnap of messagesSnap.docs) {
          const data = docSnap.data();
          if (data.type === ICU_DAILY_SUMMARY_TYPE) {
            const entries = Array.isArray(data.summaryEntries) ? data.summaryEntries : [];
            for (const entry of entries) {
              if (entry && typeof entry === 'object') {
                const ts = (entry as { timestamp?: number }).timestamp;
                messageMin = minTimestamp(messageMin, ts);
              }
            }
            messageMin = minTimestamp(messageMin, data.createdAt as number | undefined);
            continue;
          }

          if (data.senderUid === patientId) {
            messageMin = minTimestamp(messageMin, data.createdAt as number | undefined);
          }
        }

        let replyMin: number | null = null;
        for (const docSnap of repliesSnap.docs) {
          const data = docSnap.data();
          if (data.isPatient === true) {
            replyMin = minTimestamp(replyMin, data.timestamp as number | undefined);
          }
        }

        if (messageMin == null && replyMin == null) setFirstEngagementAt(null);
        else if (messageMin == null) setFirstEngagementAt(replyMin);
        else if (replyMin == null) setFirstEngagementAt(messageMin);
        else setFirstEngagementAt(Math.min(messageMin, replyMin));
      } catch (err) {
        console.warn('[usePatientFirstEngagementAt]', err);
        if (!cancelled) setFirstEngagementAt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, patientId]);

  return { firstEngagementAt, loading };
}
