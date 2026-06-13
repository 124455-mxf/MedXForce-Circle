import { useEffect, useMemo, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { parseVisitCapturePostText } from '@medxforce/shared';
import {
  CircleVisitCapturePostFallback,
  CircleVisitCapturePostView,
} from './CircleVisitCapturePostView';
import { CirclePatientLanguagePill } from './CirclePatientLanguagePill';
import { resolveStoredMessageText, type StoredMessageTranslation } from '../lib/messageTranslationDisplay';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import {
  isCirclePatientMessageTranslateAvailable,
} from '../lib/circlePatientMessageTranslate';
import { translateVisitCaptureParsedForViewer } from '../lib/visitCaptureTranslateDisplay';
import { cn } from '../lib/utils';

/** Visit capture posts — structured sections; headline + analysis in the Circle UI language. */
export function CircleVisitCapturePost({
  text,
  translations,
  viewerLanguage,
  t,
  disableTruncate = false,
  patientLanguage,
  showPatientLanguagePill = false,
}: {
  text: string;
  translations?: StoredMessageTranslation[];
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  disableTruncate?: boolean;
  patientLanguage?: string | null;
  showPatientLanguagePill?: boolean;
}) {
  const resolved = useMemo(
    () => resolveStoredMessageText({ text, translations }, viewerLanguage),
    [text, translations, viewerLanguage],
  );
  const originalParsed = useMemo(() => parseVisitCapturePostText(text), [text]);
  const storedTranslatedParsed = useMemo(
    () => (resolved.hasTranslation ? parseVisitCapturePostText(resolved.displayText) : null),
    [resolved.displayText, resolved.hasTranslation],
  );

  const [showOriginal, setShowOriginal] = useState(false);
  const [liveParsed, setLiveParsed] = useState<ReturnType<typeof parseVisitCapturePostText>>(null);
  const [liveDiffers, setLiveDiffers] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const canLiveTranslate = !resolved.hasTranslation && isCirclePatientMessageTranslateAvailable();
  const shouldLiveTranslate = canLiveTranslate && !showOriginal && !!originalParsed;

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

    void translateVisitCaptureParsedForViewer(originalParsed, viewerLanguage).then(
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

    if (storedTranslatedParsed) {
      return {
        ...storedTranslatedParsed,
        transcript: originalParsed.transcript,
      };
    }

    if (liveParsed) {
      return {
        ...liveParsed,
        transcript: originalParsed.transcript,
      };
    }

    return originalParsed;
  }, [originalParsed, showOriginal, storedTranslatedParsed, liveParsed]);

  const hasTranslation = resolved.hasTranslation || liveDiffers;
  const fallbackText = showOriginal ? resolved.originalText : resolved.displayText;

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

      {displayParsed ? (
        <CircleVisitCapturePostView
          parsed={displayParsed}
          className="text-slate-700 font-medium"
          t={t}
          disableTruncate={disableTruncate}
        />
      ) : (
        <CircleVisitCapturePostFallback
          text={fallbackText}
          className="text-slate-700 font-medium"
          disableTruncate={disableTruncate}
        />
      )}

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
