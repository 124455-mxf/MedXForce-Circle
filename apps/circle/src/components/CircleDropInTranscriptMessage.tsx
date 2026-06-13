import { useEffect, useMemo, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { CircleDropInTranscriptView } from './CircleDropInTranscriptView';
import { CirclePatientLanguagePill } from './CirclePatientLanguagePill';
import { parseDropInTranscriptText, type DropInTranscriptParsed } from '../lib/dropInTranscriptDisplay';
import { resolveStoredMessageText, type StoredMessageTranslation } from '../lib/messageTranslationDisplay';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { isCirclePatientMessageTranslateAvailable } from '../lib/circlePatientMessageTranslate';
import { translateDropInTranscriptParsedForViewer } from '../lib/dropInTranscriptTranslateDisplay';
import { cn } from '../lib/utils';

/**
 * Drop-in care-coordination posts: keep original structure (metadata + speaker cards).
 * Use stored translation when available; otherwise translate on read for the Circle UI language.
 */
export function CircleDropInTranscriptMessage({
  text,
  translations,
  viewerLanguage,
  className,
  t,
  disableTruncate = false,
  patientLanguage,
  showPatientLanguagePill = false,
}: {
  text: string;
  translations?: StoredMessageTranslation[];
  viewerLanguage: CircleUiLanguage;
  className?: string;
  t: CircleTranslator;
  disableTruncate?: boolean;
  patientLanguage?: string | null;
  showPatientLanguagePill?: boolean;
}) {
  const resolved = useMemo(
    () => resolveStoredMessageText({ text, translations }, viewerLanguage),
    [text, translations, viewerLanguage],
  );
  const originalParsed = useMemo(() => parseDropInTranscriptText(text), [text]);
  const storedTranslatedParsed = useMemo(
    () => (resolved.hasTranslation ? parseDropInTranscriptText(resolved.displayText) : null),
    [resolved.displayText, resolved.hasTranslation],
  );

  const [showOriginal, setShowOriginal] = useState(false);
  const [liveParsed, setLiveParsed] = useState<DropInTranscriptParsed | null>(null);
  const [liveDiffers, setLiveDiffers] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const shouldLiveTranslate =
    !showOriginal &&
    !!originalParsed &&
    !storedTranslatedParsed &&
    isCirclePatientMessageTranslateAvailable();

  useEffect(() => {
    setShowOriginal(false);
    setLiveParsed(null);
    setLiveDiffers(false);
    setIsTranslating(false);
  }, [text, viewerLanguage, translations, originalParsed]);

  useEffect(() => {
    if (!shouldLiveTranslate || !originalParsed) {
      setLiveParsed(null);
      setLiveDiffers(false);
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    void translateDropInTranscriptParsedForViewer(originalParsed, viewerLanguage).then(
      ({ parsed, differs }) => {
        if (cancelled) return;
        setLiveParsed(parsed);
        setLiveDiffers(differs);
        setIsTranslating(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [originalParsed, shouldLiveTranslate, viewerLanguage]);

  const displayParsed = useMemo(() => {
    if (!originalParsed) return null;
    if (showOriginal) return originalParsed;
    if (storedTranslatedParsed) return storedTranslatedParsed;
    if (liveParsed) return liveParsed;
    return originalParsed;
  }, [originalParsed, showOriginal, storedTranslatedParsed, liveParsed]);

  const hasTranslation = resolved.hasTranslation || liveDiffers;

  if (!originalParsed) {
    return (
      <CircleDropInTranscriptView
        text={showOriginal ? resolved.originalText : resolved.displayText}
        className={className}
        disableTruncate={disableTruncate}
      />
    );
  }

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

      <CircleDropInTranscriptView
        parsed={displayParsed ?? originalParsed}
        className={className}
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
