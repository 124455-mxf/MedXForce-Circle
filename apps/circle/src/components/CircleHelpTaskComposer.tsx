import { useCallback, useEffect, useState } from 'react';
import { HeartHandshake, Maximize2, Mic, MicOff, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import { useDictation } from '../hooks/useDictation';
import { cn } from '../lib/utils';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';

const HELP_TITLE_MAX = 200;
const HELP_NOTE_MAX = 500;

type CircleHelpTaskComposerProps = {
  open: boolean;
  sending?: boolean;
  error?: string | null;
  onClose: () => void;
  onPost: (title: string, note: string) => void | Promise<void>;
};

export function CircleHelpTaskComposer({
  open,
  sending = false,
  error = null,
  onClose,
  onPost,
}: CircleHelpTaskComposerProps) {
  const t = useCircleT();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();

  const reset = useCallback(() => {
    setTitle('');
    setNote('');
    setMicError(null);
    stopRecording();
  }, [setMicError, stopRecording]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      reset();
    }
  }, [open, reset]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  if (!open) return null;

  const canPost = title.trim().length > 0 && !sending;

  const handlePost = async () => {
    if (!canPost) return;
    await onPost(title.trim(), note.trim());
  };

  const handleClear = () => {
    reset();
    setExpanded(false);
    onClose();
  };

  const heading = t('circle.composeNewCircleHelp');
  const subtitle = t('circle.composeCircleHelpSubtitle');

  const fields = (
    <div className="flex flex-col gap-4">
      <label className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {t('circle.circleHelpTaskLabel')}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, HELP_TITLE_MAX))}
          placeholder={t('careTransition.circleHelpTitlePlaceholder')}
          disabled={sending}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </label>

      <label className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {t('circle.circleHelpDetailsLabel')}
          </span>
          <button
            type="button"
            onClick={() => void toggleRecording(() => note, (value) => setNote(value.slice(0, HELP_NOTE_MAX)))}
            disabled={sending}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors disabled:opacity-50',
              isRecording
                ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600',
            )}
            aria-label={isRecording ? t('circle.circleHelpDictateStopAria') : t('circle.circleHelpDictateStartAria')}
            aria-pressed={isRecording}
          >
            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            {isRecording ? t('circle.circleHelpDictateStop') : t('circle.circleHelpDictate')}
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, HELP_NOTE_MAX))}
          placeholder={t('careTransition.circleHelpNotePlaceholder')}
          rows={expanded ? 16 : 10}
          disabled={sending}
          className={cn(
            'w-full min-h-[12rem] px-4 py-2.5 bg-white border rounded-2xl resize-none text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500',
            isRecording ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200',
          )}
        />
        {isRecording ? (
          <p className="text-xs text-red-600 font-medium">{t('circle.circleHelpDictateListening')}</p>
        ) : (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('circle.circleHelpDetailsHint')}
          </p>
        )}
        {micError ? (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {micError}
          </p>
        ) : null}
      </label>

      {error ? (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-snug">
          {error}
        </p>
      ) : null}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleClear}
        className="font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        disabled={sending}
      >
        {t('circle.clear')}
      </button>
      <button
        type="button"
        onClick={() => void handlePost()}
        disabled={!canPost}
        className={cn(
          'bg-blue-600 text-white rounded-2xl font-bold px-5 py-2 text-sm disabled:opacity-50',
        )}
      >
        {sending ? t('careTransition.circleHelpCreating') : t('circle.circleHelpPost')}
      </button>
    </div>
  );

  return expanded ? (
    <CircleMessageExpandOverlay
      open
      title={heading}
      subtitle={subtitle}
      onClose={() => setExpanded(false)}
      footer={footer}
      t={t}
    >
      {fields}
    </CircleMessageExpandOverlay>
  ) : (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <button type="button" aria-label={t('common.close')} className="absolute inset-0" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[94vh] min-h-[65vh] sm:min-h-[480px] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-help-task-composer-title"
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-4 sm:pt-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <HeartHandshake size={18} />
            </div>
            <div className="min-w-0">
              <h3
                id="circle-help-task-composer-title"
                className="font-bold text-slate-800 text-base truncate"
              >
                {heading}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              aria-label={t('circle.circleHelpExpand')}
              title={t('circle.circleHelpExpand')}
            >
              <Maximize2 size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-5 overflow-y-auto">{fields}</div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0">{footer}</div>
      </div>
    </div>
  );
}
