/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { CareCalendarEntry } from '@medxforce/shared';
import { subscribeCareCalendarEntries } from '../services/careCalendarService';

export function useCareCalendarEntries(db: Firestore | undefined, patientId: string | undefined) {
  const [entries, setEntries] = useState<CareCalendarEntry[]>([]);
  const [loading, setLoading] = useState(!!patientId);

  useEffect(() => {
    if (!db || !patientId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeCareCalendarEntries(
      db,
      patientId,
      (next) => {
        setEntries(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [db, patientId]);

  return { entries, loading };
}
