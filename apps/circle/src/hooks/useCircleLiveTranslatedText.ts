import { useEffect, useState } from 'react';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import {
  isCirclePatientMessageTranslateAvailable,
  translatePatientMessageForViewer,
} from '../lib/circlePatientMessageTranslate';

/** Live-translate member-authored text into the viewer’s Circle UI language. */
export function useCircleLiveTranslatedText(text: string | undefined | null) {
  const { language: viewerLanguage } = useCircleI18nContext();
  const originalText = (text ?? '').trim();
  const [showOriginal, setShowOriginal] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setTranslated(null);
    setShowOriginal(false);
    setIsTranslating(false);
  }, [originalText, viewerLanguage]);

  useEffect(() => {
    if (!originalText || !isCirclePatientMessageTranslateAvailable()) return;

    let cancelled = false;
    setIsTranslating(true);
    void translatePatientMessageForViewer(originalText, viewerLanguage).then((result) => {
      if (cancelled) return;
      const trimmed = result.trim();
      if (trimmed && trimmed !== originalText) {
        setTranslated(trimmed);
      }
      setIsTranslating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [originalText, viewerLanguage]);

  const hasTranslation = !!translated;
  const displayText = showOriginal ? originalText : translated || originalText;

  return {
    originalText,
    displayText,
    hasTranslation,
    isTranslating,
    showOriginal,
    toggleOriginal: () => setShowOriginal((value) => !value),
  };
}
