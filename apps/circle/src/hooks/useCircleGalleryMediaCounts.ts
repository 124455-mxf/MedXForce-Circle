import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { canViewPatientUploads, type PatientCapabilities } from '@medxforce/shared';

export function useCircleGalleryMediaCounts(
  db: Firestore,
  patientId: string | undefined,
  currentUid: string | undefined,
  capabilities: PatientCapabilities | undefined,
) {
  const [totalCount, setTotalCount] = useState(0);
  const [myUploadCount, setMyUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setTotalCount(0);
      setMyUploadCount(0);
      setLoading(false);
      return undefined;
    }

    const canViewCircle = !!(capabilities?.viewCircleMedia || capabilities?.richMediaUpload);
    const canViewPatient = canViewPatientUploads(capabilities);

    if (!canViewCircle && !canViewPatient) {
      setTotalCount(0);
      setMyUploadCount(0);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(
      collection(db, 'gallery_messages'),
      where('userId', '==', patientId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let total = 0;
        let mine = 0;
        for (const snap of snapshot.docs) {
          const data = snap.data();
          const source = data.source === 'patient' ? 'patient' : 'circle';
          if (source === 'patient' && !canViewPatient) continue;
          if (source !== 'patient' && !canViewCircle) continue;
          total += 1;
          if (currentUid && String(data.uploadedByUid || '') === currentUid) {
            mine += 1;
          }
        }
        setTotalCount(total);
        setMyUploadCount(mine);
        setLoading(false);
      },
      () => {
        setTotalCount(0);
        setMyUploadCount(0);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [db, patientId, currentUid, capabilities]);

  return { totalCount, myUploadCount, loading };
}
