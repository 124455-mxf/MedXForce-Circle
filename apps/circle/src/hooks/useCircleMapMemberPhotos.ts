import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  loadCircleMapPhotosByContactId,
  loadCircleMapPhotosByEmail,
} from '../lib/circleMapPhotos';

export function useCircleMapMemberPhotos(
  db: Firestore | undefined,
  patientId: string | undefined,
  enabled = true,
) {
  const [photosByEmail, setPhotosByEmail] = useState<Record<string, string>>({});
  const [photosByContactId, setPhotosByContactId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || !db || !patientId) {
      setPhotosByEmail({});
      setPhotosByContactId({});
      return undefined;
    }

    let active = true;
    const load = async () => {
      const [byEmail, byContactId] = await Promise.all([
        loadCircleMapPhotosByEmail(db, patientId),
        loadCircleMapPhotosByContactId(db, patientId),
      ]);
      if (active) {
        setPhotosByEmail(byEmail);
        setPhotosByContactId(byContactId);
      }
    };

    void load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [db, enabled, patientId]);

  return { photosByEmail, photosByContactId };
}
