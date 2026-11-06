/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  ICU_DAILY_PRESENCE_COLLECTION,
  rollingLast7DateKeys,
  type IcuDailyPresenceRecord,
} from '../lib/circleIcuDailyBrief';

export function useIcuDailyPresence(
  db: Firestore,
  patientId: string | undefined,
  enabled: boolean,
): { byDateKey: Map<string, IcuDailyPresenceRecord>; loading: boolean } {
  const [byDateKey, setByDateKey] = useState<Map<string, IcuDailyPresenceRecord>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !patientId) {
      setByDateKey(new Map());
      setLoading(false);
      return;
    }
    const keys = rollingLast7DateKeys();
    const oldest = keys[0];
    if (!oldest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'patients', patientId, ICU_DAILY_PRESENCE_COLLECTION),
      where('dateKey', '>=', oldest),
    );
    return onSnapshot(
      q,
      (snap) => {
        const next = new Map<string, IcuDailyPresenceRecord>();
        for (const docSnap of snap.docs) {
          const data = docSnap.data() as Partial<IcuDailyPresenceRecord>;
          const dateKey = typeof data.dateKey === 'string' ? data.dateKey : docSnap.id;
          next.set(dateKey, {
            dateKey,
            firstLoginAt: typeof data.firstLoginAt === 'number' ? data.firstLoginAt : undefined,
            totalOnlineMs: typeof data.totalOnlineMs === 'number' ? data.totalOnlineMs : undefined,
          });
        }
        setByDateKey(next);
        setLoading(false);
      },
      () => {
        setByDateKey(new Map());
        setLoading(false);
      },
    );
  }, [db, enabled, patientId]);

  return { byDateKey, loading };
}
