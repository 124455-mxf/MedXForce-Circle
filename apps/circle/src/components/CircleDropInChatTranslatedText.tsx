import { useEffect, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import {
  isCirclePatientMessageTranslateAvailable,
  translatePatientMessageForViewer,
} from '../lib/circlePatientMessageTranslate';
import { cn } from '../lib/utils';

/** Live translation for incoming drop-in chat messages (patient-authored text). */
export function CircleDropInChatTranslatedText({
  text,
  viewerLanguage,
  t,
  className,
}: {
  text: string;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  className?: string;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    setTranslated(null);
    setShowOriginal(false);
    setIsTranslating(false);
  }, [text, viewerLanguage]);

  useEffect(() => {
    if (!isCirclePatientMessageTranslateAvailable()) return;

    let cancelled = false;
    setIsTranslating(true);
    void translatePatientMessageForViewer(text, viewerLanguage).then((result) => {
      if (cancelled) return;
      const trimmed = result.trim();
      if (trimmed && trimmed !== text.trim()) {
        setTranslated(trimmed);
      }
      setIsTranslating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [text, viewerLanguage]);

  const hasTranslation = !!translated;
  const displayText = showOriginal ? text : translated || text;

  return (
    <div className="space-y-1">
      {isTranslating && !showOriginal ? (
        <p className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
          <Loader2 size={10} className="animate-spin shrink-0" aria-hidden />
          {t('messages.translating')}
        </p>
      ) : null}
      <p className={className}>{displayText}</p>
      {hasTranslation ? (
        <button
          type="button"
          onClick={() => setShowOriginal((value) => !value)}
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase transition-colors',
            'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          <Languages size={10} />
          {showOriginal
            ? t('remotePromptsModal.dropInChatHideOriginal')
            : t('remotePromptsModal.dropInChatShowOriginal')}
        </button>
      ) : null}
    </div>
  );
}
