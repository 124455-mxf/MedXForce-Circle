import { useEffect, useMemo, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import type { CircleHelpTask } from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import {
  isCirclePatientMessageTranslateAvailable,
  translatePatientMessageForViewer,
} from '../lib/circlePatientMessageTranslate';
import { resolveStoredMessageText } from '../lib/messageTranslationDisplay';
import { cn } from '../lib/utils';

const HELP_NOTE_PREVIEW_CHARS = 200;

export function CircleHelpTaskCopy({
  task,
  isOwn,
  viewerLanguage,
  t,
  done = false,
}: {
  task: CircleHelpTask;
  isOwn: boolean;
  viewerLanguage: CircleUiLanguage;
  t: CircleTranslator;
  done?: boolean;
}) {
  const titleResolved = useMemo(
    () =>
      resolveStoredMessageText(
        {
          text: task.title,
          translations: (task.translations ?? []).map((entry) => ({
            language: entry.language,
            text: entry.title,
            isAuto: entry.isAuto,
          })),
        },
        viewerLanguage,
      ),
    [task.title, task.translations, viewerLanguage],
  );
  const noteResolved = useMemo(
    () =>
      resolveStoredMessageText(
        {
          text: task.note,
          translations: (task.translations ?? [])
            .filter((entry) => typeof entry.note === 'string' && entry.note.trim())
            .map((entry) => ({
              language: entry.language,
              text: entry.note!.trim(),
              isAuto: entry.isAuto,
            })),
        },
        viewerLanguage,
      ),
    [task.note, task.translations, viewerLanguage],
  );

  const [showOriginal, setShowOriginal] = useState(false);
  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  const needsLive =
    !isOwn &&
    isCirclePatientMessageTranslateAvailable() &&
    (!titleResolved.hasTranslation ||
      (!done && Boolean(task.note.trim()) && !noteResolved.hasTranslation));

  useEffect(() => {
    setShowOriginal(false);
    setLiveTitle(null);
    setLiveNote(null);
    setIsTranslating(false);
    setNoteExpanded(false);
  }, [task.id, task.title, task.note, viewerLanguage]);

  useEffect(() => {
    if (!needsLive) return;
    let cancelled = false;
    setIsTranslating(true);
    void (async () => {
      const nextTitle = titleResolved.hasTranslation
        ? null
        : (await translatePatientMessageForViewer(task.title, viewerLanguage)).trim();
      const nextNote =
        done || !task.note.trim() || noteResolved.hasTranslation
          ? null
          : (await translatePatientMessageForViewer(task.note, viewerLanguage)).trim();
      if (cancelled) return;
      if (nextTitle && nextTitle !== titleResolved.originalText) setLiveTitle(nextTitle);
      if (nextNote && nextNote !== noteResolved.originalText) setLiveNote(nextNote);
      setIsTranslating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    needsLive,
    noteResolved.hasTranslation,
    noteResolved.originalText,
    task.note,
    task.title,
    titleResolved.hasTranslation,
    titleResolved.originalText,
    viewerLanguage,
    done,
  ]);

  const hasTranslation =
    !isOwn &&
    (titleResolved.hasTranslation ||
      noteResolved.hasTranslation ||
      Boolean(liveTitle) ||
      Boolean(liveNote));
  const titleText =
    isOwn || showOriginal
      ? titleResolved.originalText
      : liveTitle || titleResolved.displayText;
  const noteText =
    isOwn || showOriginal
      ? noteResolved.originalText
      : liveNote || noteResolved.displayText;

  return (
    <div className="min-w-0 flex-1 space-y-1">
      {isTranslating && !showOriginal ? (
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
          {t('messages.translating')}
        </p>
      ) : null}
      <p
        className={cn(
          'text-sm font-semibold',
          done ? 'text-emerald-900 line-clamp-1' : 'text-slate-800',
        )}
      >
        {titleText}
      </p>
      {!done && noteText ? (
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed whitespace-pre-wrap">
          {noteExpanded || noteText.length <= HELP_NOTE_PREVIEW_CHARS
            ? noteText
            : `${noteText.slice(0, HELP_NOTE_PREVIEW_CHARS).trimEnd()}…`}
          {noteText.length > HELP_NOTE_PREVIEW_CHARS ? (
            <button
              type="button"
              onClick={() => setNoteExpanded((value) => !value)}
              className="text-blue-600 font-bold ml-1 whitespace-nowrap hover:underline"
            >
              {noteExpanded ? t('messages.bodyShowLess') : t('messages.bodyShowMore')}
            </button>
          ) : null}
        </p>
      ) : null}
      {!done && hasTranslation ? (
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
