import { createContext, useContext, type ReactNode } from 'react';
import type { CircleUiLanguage } from './circleLanguages';
import { createCircleTranslator } from '../translations';

export type CircleTranslator = ReturnType<typeof createCircleTranslator>;

type CircleI18nContextValue = {
  language: CircleUiLanguage;
  t: CircleTranslator;
  setLanguage: (language: CircleUiLanguage) => void;
};

const CircleI18nContext = createContext<CircleI18nContextValue | null>(null);

const FALLBACK_I18N: CircleI18nContextValue = {
  language: 'English',
  t: createCircleTranslator('English'),
  setLanguage: () => {},
};

export function CircleI18nProvider({
  language,
  t,
  setLanguage,
  children,
}: {
  language: CircleUiLanguage;
  t: CircleTranslator;
  setLanguage: (language: CircleUiLanguage) => void;
  children: ReactNode;
}) {
  return (
    <CircleI18nContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </CircleI18nContext.Provider>
  );
}

/** Inside signed-in Circle UI. Falls back to English when provider is absent (e.g. React Fast Refresh). */
export function useCircleT(): CircleTranslator {
  const ctx = useContext(CircleI18nContext);
  return ctx?.t ?? FALLBACK_I18N.t;
}

/** Inside signed-in Circle UI. Falls back to English when provider is absent (e.g. React Fast Refresh). */
export function useCircleI18nContext(): CircleI18nContextValue {
  const ctx = useContext(CircleI18nContext);
  return ctx ?? FALLBACK_I18N;
}
