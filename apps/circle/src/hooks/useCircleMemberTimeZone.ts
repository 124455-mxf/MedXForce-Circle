import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  getBrowserTimeZone,
  isValidIanaTimeZone,
  saveCircleUserProfile,
} from '@medxforce/shared';

/** Circle member home time zone from `circle_profiles`. */
export function useCircleMemberTimeZone(
  db: Firestore | null | undefined,
  user: { uid: string } | null | undefined,
) {
  const [timezoneId, setTimezoneIdState] = useState(getBrowserTimeZone);

  useEffect(() => {
    if (!user?.uid || !db) {
      setTimezoneIdState(getBrowserTimeZone());
      return;
    }
    return onSnapshot(doc(db, 'circle_profiles', user.uid), (snap) => {
      const raw = snap.exists() ? snap.data().timezoneId : undefined;
      if (isValidIanaTimeZone(raw)) {
        setTimezoneIdState(raw.trim());
        return;
      }
      setTimezoneIdState(getBrowserTimeZone());
    });
  }, [db, user?.uid]);

  const setTimezoneId = useCallback(
    async (next: string) => {
      if (!isValidIanaTimeZone(next) || !user?.uid || !db) return;
      setTimezoneIdState(next.trim());
      try {
        await saveCircleUserProfile(db, user.uid, { timezoneId: next.trim() });
      } catch (err) {
        console.warn('[useCircleMemberTimeZone] save failed', err);
      }
    },
    [db, user?.uid],
  );

  return { timezoneId, setTimezoneId };
}
