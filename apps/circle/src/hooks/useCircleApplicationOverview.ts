import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  subscribeApplicationOverview,
  type PatientApplicationOverviewDoc,
} from '@medxforce/shared';

export function useCircleApplicationOverview(db: Firestore, patientId: string | undefined) {
  const [overview, setOverview] = useState<PatientApplicationOverviewDoc | null>(null);
  const [loading, setLoading] = useState(!!patientId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setOverview(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    return subscribeApplicationOverview(
      db,
      patientId,
      (doc) => {
        setOverview(doc);
        setLoading(false);
        setError(null);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [db, patientId]);

  return { overview, loading, error };
}
