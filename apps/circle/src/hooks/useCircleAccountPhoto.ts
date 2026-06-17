import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';

/** Member avatar from Firestore circle_profiles, then Firebase Auth — cleared when uid changes. */
export function useCircleAccountPhoto(db: Firestore, user: User | null): string | undefined {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user?.uid) {
      setPhotoUrl(undefined);
      return;
    }

    setPhotoUrl(undefined);

    return onSnapshot(
      doc(db, 'circle_profiles', user.uid),
      (snap) => {
        const fromProfile = snap.exists()
          ? String(snap.data().photoUrl || '').trim()
          : '';
        const fromAuth = user.photoURL?.trim() || '';
        setPhotoUrl(fromProfile || fromAuth || undefined);
      },
      () => {
        const fromAuth = user.photoURL?.trim() || '';
        setPhotoUrl(fromAuth || undefined);
      },
    );
  }, [db, user?.uid, user?.photoURL]);

  return photoUrl;
}
