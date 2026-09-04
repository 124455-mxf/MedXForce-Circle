import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { saveCircleUserProfile } from '@medxforce/shared';
import {
  CIRCLE_TEXT_SIZE_CHANGED,
  CIRCLE_TEXT_SIZE_STORAGE_KEY,
  applyCircleTextSize,
  circleTextSizeKeyForUid,
  getCircleTextSize,
  normalizeCircleTextSize,
  setCircleTextSize,
  type CircleTextSize,
} from '../lib/circleTextSizePreferences';

/** Circle text size — Firestore when signed in, else localStorage. */
export function useCircleTextSize(db: Firestore, user: User | null) {
  const [textSize, setTextSizeState] = useState<CircleTextSize>(getCircleTextSize);

  useEffect(() => {
    applyCircleTextSize(textSize);
  }, [textSize]);

  useEffect(() => {
    const sync = () => setTextSizeState(getCircleTextSize());
    window.addEventListener(CIRCLE_TEXT_SIZE_CHANGED, sync);
    return () => window.removeEventListener(CIRCLE_TEXT_SIZE_CHANGED, sync);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setTextSizeState(getCircleTextSize());
      return;
    }
    try {
      const perUid = localStorage.getItem(circleTextSizeKeyForUid(user.uid));
      if (perUid) {
        const next = normalizeCircleTextSize(perUid);
        setTextSizeState(next);
        applyCircleTextSize(next);
      }
    } catch {
      /* ignore */
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    return onSnapshot(doc(db, 'circle_profiles', uid), (snap) => {
      const raw = snap.exists() ? (snap.data().textSize as string | undefined) : undefined;
      if (!raw) return;
      const next = normalizeCircleTextSize(raw);
      setTextSizeState(next);
      try {
        localStorage.setItem(circleTextSizeKeyForUid(uid), next);
        localStorage.removeItem(CIRCLE_TEXT_SIZE_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      applyCircleTextSize(next);
    });
  }, [db, user?.uid]);

  const setTextSize = useCallback(
    (next: CircleTextSize) => {
      const normalized = normalizeCircleTextSize(next);
      setTextSizeState(normalized);
      setCircleTextSize(normalized, { uid: user?.uid });
      if (user?.uid) {
        void saveCircleUserProfile(db, user.uid, { textSize: normalized }).catch((err) => {
          console.warn('[useCircleTextSize] cloud save failed; kept local preference', err);
        });
      }
    },
    [db, user?.uid],
  );

  return { textSize, setTextSize };
}
