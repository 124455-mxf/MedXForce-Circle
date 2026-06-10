import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  parseCircleProfileSnapshot,
  type CirclePatientProfileSnapshot,
} from '@medxforce/shared';

export function useCirclePatientProfileSnapshot(
  db: Firestore,
  patientId: string | undefined,
) {
  const [snapshot, setSnapshot] = useState<CirclePatientProfileSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      doc(db, 'patients', patientId),
      (snap) => {
        if (!snap.exists()) {
          setSnapshot(null);
          setLoading(false);
          return;
        }
        setSnapshot(parseCircleProfileSnapshot(snap.data().profileSnapshot));
        setLoading(false);
      },
      () => {
        setSnapshot(null);
        setLoading(false);
      },
    );
  }, [db, patientId]);

  return { snapshot, loading };
}
