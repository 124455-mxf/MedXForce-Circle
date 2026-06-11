import { useMemo, type ReactNode } from 'react';
import {
  CIRCLE_UI_LANGUAGE_STORAGE_KEY,
  normalizeCircleUiLanguage,
} from '../lib/circleLanguages';
import { createCircleTranslator } from '../translations';
import { useCirclePortraitRequired } from '../hooks/useCirclePortraitRequired';
import { CirclePortraitRequiredOverlay } from './CirclePortraitRequiredOverlay';

function readStoredLanguage() {
  try {
    return normalizeCircleUiLanguage(localStorage.getItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY));
  } catch {
    return 'English' as const;
  }
}

export function CirclePortraitGuard({ children }: { children: ReactNode }) {
  const portraitRequired = useCirclePortraitRequired();
  const t = useMemo(() => createCircleTranslator(readStoredLanguage()), []);

  return (
    <>
      {children}
      {portraitRequired ? (
        <CirclePortraitRequiredOverlay
          title={t('orientation.portraitTitle')}
          message={t('orientation.portraitMessage')}
        />
      ) : null}
    </>
  );
}
