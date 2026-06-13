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

/** Use inside signed-in Circle UI (requires `CircleI18nProvider`). Falls back to English when absent. */
export function useCircleT(): CircleTranslator {
  const ctx = useContext(CircleI18nContext);
  if (!ctx) return createCircleTranslator('English');
  return ctx.t;
}

export function useCircleI18nContext(): CircleI18nContextValue {
  const ctx = useContext(CircleI18nContext);
  if (!ctx) {
    throw new Error('useCircleI18nContext must be used within CircleI18nProvider');
  }
  return ctx;
}
