import { useEffect, useMemo, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import {
  resolveDiaryEntryText,
  type DiaryEntryTranslation,
} from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import { useCircleT } from '../lib/circleI18nContext';
import {
  isCirclePatientMessageTranslateAvailable,
  translatePatientMessageForViewer,
} from '../lib/circlePatientMessageTranslate';
import { CircleDiaryEntryBodyPreview } from './CircleDiaryEntryBodyPreview';
import { cn } from '../lib/utils';

type CircleDiaryTranslatedContentProps = {
  title?: string;
  body: string;
  translations?: DiaryEntryTranslation[];
  viewerLanguage: CircleUiLanguage;
  /** Live-translate when Firestore has no stored entry for the viewer language. */
  translateIfMissing?: boolean;
};

export function CircleDiaryTranslatedContent({
  title,
  body,
  translations,
  viewerLanguage,
  translateIfMissing = true,
}: CircleDiaryTranslatedContentProps) {
  const t = useCircleT();
  const resolved = useMemo(
    () => resolveDiaryEntryText({ title, body, translations }, viewerLanguage),
    [title, body, translations, viewerLanguage],
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [liveBody, setLiveBody] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const needsLiveTranslation =
    translateIfMissing &&
    !resolved.hasTranslation &&
    isCirclePatientMessageTranslateAvailable();

  useEffect(() => {
    setShowOriginal(false);
    setLiveTitle(null);
    setLiveBody(null);
    setIsTranslating(false);
  }, [title, body, translations, viewerLanguage]);

  useEffect(() => {
    if (!needsLiveTranslation) return;
    let cancelled = false;
    setIsTranslating(true);
    void (async () => {
      const [nextBody, nextTitle] = await Promise.all([
        translatePatientMessageForViewer(resolved.originalBody, viewerLanguage),
        resolved.originalTitle
          ? translatePatientMessageForViewer(resolved.originalTitle, viewerLanguage)
          : Promise.resolve(''),
      ]);
      if (cancelled) return;
      const bodyTrim = nextBody.trim();
      if (bodyTrim && bodyTrim !== resolved.originalBody) {
        setLiveBody(bodyTrim);
      }
      const titleTrim = nextTitle.trim();
      if (titleTrim && titleTrim !== resolved.originalTitle) {
        setLiveTitle(titleTrim);
      }
      setIsTranslating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    needsLiveTranslation,
    resolved.originalBody,
    resolved.originalTitle,
    viewerLanguage,
  ]);

  const hasTranslation =
    resolved.hasTranslation || !!liveBody || !!liveTitle;
  const displayTitle = showOriginal
    ? resolved.originalTitle
    : liveTitle || resolved.displayTitle;
  const displayBody = showOriginal
    ? resolved.originalBody
    : liveBody || resolved.displayBody;

  return (
    <div className="space-y-2">
      {isTranslating && !showOriginal ? (
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
          {t('messages.translating')}
        </p>
      ) : null}
      {displayTitle ? (
        <h3 className="text-base font-bold text-slate-900">{displayTitle}</h3>
      ) : null}
      <CircleDiaryEntryBodyPreview text={displayBody} />
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
