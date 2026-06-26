import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  parseCircleProfileSnapshot,
  resolveCirclePatientPhotoUrl,
  type CirclePatientProfileSnapshot,
} from '@medxforce/shared';

export function useCirclePatientProfileSnapshot(
  db: Firestore,
  patientId: string | undefined,
) {
  const [snapshot, setSnapshot] = useState<CirclePatientProfileSnapshot | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setSnapshot(null);
      setPhotoUrl(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      doc(db, 'patients', patientId),
      (snap) => {
        if (!snap.exists()) {
          setSnapshot(null);
          setPhotoUrl(undefined);
          setLoading(false);
          return;
        }
        const data = snap.data();
        const parsed = parseCircleProfileSnapshot(data.profileSnapshot);
        setSnapshot(parsed);
        setPhotoUrl(
          resolveCirclePatientPhotoUrl(
            parsed?.identity.profilePicture,
            typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
          ),
        );
        setLoading(false);
      },
      () => {
        setSnapshot(null);
        setPhotoUrl(undefined);
        setLoading(false);
      },
    );
  }, [db, patientId]);

  return { snapshot, photoUrl, loading };
}
