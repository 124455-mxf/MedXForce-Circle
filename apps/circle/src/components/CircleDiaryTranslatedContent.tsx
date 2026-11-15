import { useEffect, useMemo, useRef, useState } from 'react';
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

const liveDiaryCache = new Map<string, { title?: string; body: string }>();

function translationsFingerprint(
  translations: DiaryEntryTranslation[] | undefined,
): string {
  if (!translations?.length) return '';
  return translations
    .map((row) => `${row.language}:${row.title ?? ''}:${row.text}`)
    .join('|');
}

export function CircleDiaryTranslatedContent({
  title,
  body,
  translations,
  viewerLanguage,
  translateIfMissing = true,
}: CircleDiaryTranslatedContentProps) {
  const t = useCircleT();
  const translationKey = translationsFingerprint(translations);
  const resolved = useMemo(
    () => resolveDiaryEntryText({ title, body, translations }, viewerLanguage),
    // Content identity is captured by translationKey + title/body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, body, translationKey, viewerLanguage],
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [liveBody, setLiveBody] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const failedKeyRef = useRef<string | null>(null);

  const cacheKey = `${viewerLanguage}::${resolved.originalTitle}::${resolved.originalBody}`;
  const needsLiveTranslation =
    translateIfMissing &&
    !resolved.hasTranslation &&
    isCirclePatientMessageTranslateAvailable();

  useEffect(() => {
    setShowOriginal(false);
    const cached = liveDiaryCache.get(cacheKey);
    if (cached) {
      setLiveTitle(cached.title ?? null);
      setLiveBody(cached.body);
      setIsTranslating(false);
      return;
    }
    setLiveTitle(null);
    setLiveBody(null);
    setIsTranslating(false);
  }, [cacheKey]);

  useEffect(() => {
    if (!needsLiveTranslation) return;
    if (liveDiaryCache.has(cacheKey)) return;
    if (failedKeyRef.current === cacheKey) return;

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
      const titleTrim = nextTitle.trim();
      const bodyOk = !!bodyTrim && bodyTrim !== resolved.originalBody;
      const titleOk = !!titleTrim && titleTrim !== resolved.originalTitle;
      if (!bodyOk && !titleOk) {
        failedKeyRef.current = cacheKey;
        setIsTranslating(false);
        return;
      }
      const cached = {
        body: bodyOk ? bodyTrim : resolved.originalBody,
        ...(titleOk ? { title: titleTrim } : {}),
      };
      liveDiaryCache.set(cacheKey, cached);
      setLiveBody(bodyOk ? bodyTrim : null);
      setLiveTitle(titleOk ? titleTrim : null);
      setIsTranslating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    needsLiveTranslation,
    cacheKey,
    viewerLanguage,
    resolved.originalBody,
    resolved.originalTitle,
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
