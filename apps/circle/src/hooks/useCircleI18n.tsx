import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  CIRCLE_UI_LANGUAGE_STORAGE_KEY,
  normalizeCircleUiLanguage,
  type CircleUiLanguage,
} from '../lib/circleLanguages';
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
    if (!user) return;
    return onSnapshot(doc(db, 'circle_profiles', user.uid), (snap) => {
      const raw = snap.exists() ? (snap.data().language as string | undefined) : undefined;
      if (!raw) return;
      const next = normalizeCircleUiLanguage(raw);
      setLanguage(next);
      try {
        localStorage.setItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    });
  }, [db, user]);

  const t = useMemo(() => createCircleTranslator(language), [language]);

  return { language, t };
}
