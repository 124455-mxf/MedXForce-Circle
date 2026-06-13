import { useEffect, useMemo, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { CircleMessageBodyPreview } from './CircleMessageBodyPreview';
import { CirclePatientLanguagePill } from './CirclePatientLanguagePill';
import { resolveStoredMessageText, type StoredMessageTranslation } from '../lib/messageTranslationDisplay';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import {
  isCirclePatientMessageTranslateAvailable,
  translatePatientMessageForViewer,
} from '../lib/circlePatientMessageTranslate';
import { cn } from '../lib/utils';

export function CircleStoredTranslationMessage({
  text,
  translations,
  viewerLanguage,
  className,
  t,
  translateIfMissing = false,
  boldFirstLine = false,
  disableTruncate = false,
  patientLanguage,
  showPatientLanguagePill = false,
}: {
  text: string;
  translations?: StoredMessageTranslation[];
  viewerLanguage: CircleUiLanguage;
  className?: string;
  t: CircleTranslator;
  /** When true, translate patient text on read if Firestore has no stored translation. */
  translateIfMissing?: boolean;
  boldFirstLine?: boolean;
  disableTruncate?: boolean;
  patientLanguage?: string | null;
  showPatientLanguagePill?: boolean;
}) {
  const resolved = useMemo(
    () => resolveStoredMessageText({ text, translations }, viewerLanguage),
    [text, translations, viewerLanguage],
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const [liveTranslation, setLiveTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const needsLiveTranslation =
    translateIfMissing && !resolved.hasTranslation && isCirclePatientMessageTranslateAvailable();

  useEffect(() => {
    setLiveTranslation(null);
    setShowOriginal(false);
    setIsTranslating(false);
  }, [text, viewerLanguage, translations]);

  useEffect(() => {
    if (!needsLiveTranslation) return;

    let cancelled = false;
    setIsTranslating(true);
    void translatePatientMessageForViewer(text, viewerLanguage).then((translated) => {
      if (cancelled) return;
      if (translated.trim() && translated.trim() !== resolved.originalText.trim()) {
        setLiveTranslation(translated.trim());
      }
      setIsTranslating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [text, needsLiveTranslation, viewerLanguage, resolved.originalText]);

  const hasTranslation = resolved.hasTranslation || !!liveTranslation;
  const displayText = showOriginal
    ? resolved.originalText
    : liveTranslation || resolved.displayText;

  return (
    <div className="space-y-2">
      {showPatientLanguagePill && patientLanguage ? (
        <CirclePatientLanguagePill
          language={patientLanguage}
          title={t('messages.patientLanguagePillTitle')}
        />
      ) : null}

      {isTranslating && !showOriginal ? (
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
          {t('messages.translating')}
        </p>
      ) : null}

      <CircleMessageBodyPreview
        text={displayText}
        className={className}
        boldFirstLine={boldFirstLine}
        disableTruncate={disableTruncate}
      />

      {hasTranslation ? (
        <button
          type="button"
          onClick={() => setShowOriginal((value) => !value)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors',
            'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          <Languages size={12} />
          {showOriginal ? t('messages.hideOriginal') : t('messages.showOriginal')}
        </button>
      ) : null}
    </div>
  );
}
