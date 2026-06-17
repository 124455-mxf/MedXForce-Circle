import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  CIRCLE_UI_LANGUAGE_STORAGE_KEY,
  normalizeCircleUiLanguage,
  type CircleUiLanguage,
} from '../lib/circleLanguages';
import { circleUiLanguageKeyForUid } from '../lib/circleSessionStorage';
import { createCircleTranslator } from '../translations';

function readStoredLanguage(): CircleUiLanguage {
  try {
    return normalizeCircleUiLanguage(localStorage.getItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY));
  } catch {
    return 'English';
  }
}

/** Circle UI language — reads Firestore profile when signed in, else localStorage. */
export function useCircleI18n(db: Firestore, user: User | null) {
  const [language, setLanguage] = useState<CircleUiLanguage>(readStoredLanguage);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    return onSnapshot(doc(db, 'circle_profiles', uid), (snap) => {
      const raw = snap.exists() ? (snap.data().language as string | undefined) : undefined;
      if (!raw) return;
      const next = normalizeCircleUiLanguage(raw);
      setLanguage(next);
      try {
        localStorage.setItem(circleUiLanguageKeyForUid(uid), next);
        localStorage.removeItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    });
  }, [db, user?.uid]);

  const setUiLanguage = useCallback(
    (next: CircleUiLanguage) => {
      setLanguage(next);
      try {
        if (user?.uid) {
          localStorage.setItem(circleUiLanguageKeyForUid(user.uid), next);
          localStorage.removeItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY);
        } else {
          localStorage.setItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY, next);
        }
      } catch {
        /* ignore */
      }
    },
    [user?.uid],
  );

  useEffect(() => {
    if (!user?.uid) {
      setLanguage(readStoredLanguage());
      return;
    }
    try {
      const perUid = localStorage.getItem(circleUiLanguageKeyForUid(user.uid));
      if (perUid) {
        setLanguage(normalizeCircleUiLanguage(perUid));
      }
    } catch {
      /* ignore */
    }
  }, [user?.uid]);

  const t = useMemo(() => createCircleTranslator(language), [language]);

  return { language, t, setLanguage: setUiLanguage };
}
