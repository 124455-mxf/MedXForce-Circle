import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart2, Maximize2, Plus, X } from 'lucide-react';
import {
  CIRCLE_POLL_DESCRIPTION_MAX_CHARS,
  CIRCLE_POLL_MAX_OPTIONS,
  CIRCLE_POLL_MIN_OPTIONS,
  CIRCLE_POLL_OPTION_MAX_CHARS,
  sanitizeCirclePollOptions,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultPollClosesAtLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(20, 0, 0, 0);
  return toDatetimeLocalValue(d.getTime());
}

function parseDatetimeLocalValue(value: string): number | null {
  if (!value.trim()) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

type CirclePollComposerProps = {
  open: boolean;
  sending?: boolean;
  error?: string | null;
  onClose: () => void;
  onPost: (question: string, options: string[], closesAt: number, description: string) => void | Promise<void>;
  mode?: 'create' | 'edit';
  lockQuestionAndOptions?: boolean;
  initialQuestion?: string;
  initialDescription?: string;
  initialOptions?: string[];
  initialClosesAt?: number;
};

export function CirclePollComposer({
  open,
  sending = false,
  error = null,
  onClose,
  onPost,
  mode = 'create',
  lockQuestionAndOptions = false,
  initialQuestion = '',
  initialDescription = '',
  initialOptions,
  initialClosesAt,
}: CirclePollComposerProps) {
  const t = useCircleT();
  const [question, setQuestion] = useState(initialQuestion);
  const [description, setDescription] = useState(initialDescription);
  const [options, setOptions] = useState(
    initialOptions && initialOptions.length >= CIRCLE_POLL_MIN_OPTIONS ? [...initialOptions] : ['', ''],
  );
  const [closesAtLocal, setClosesAtLocal] = useState(() =>
    typeof initialClosesAt === 'number' && initialClosesAt > 0
      ? toDatetimeLocalValue(initialClosesAt)
      : defaultPollClosesAtLocal(),
  );
  const isEdit = mode === 'edit';
  const optionsLocked = isEdit && lockQuestionAndOptions;
  const [expanded, setExpanded] = useState(false);

  const hydrateFromInitials = useCallback(() => {
    setQuestion(initialQuestion);
    setDescription(initialDescription);
    setOptions(
      initialOptions && initialOptions.length >= CIRCLE_POLL_MIN_OPTIONS
        ? [...initialOptions]
        : ['', ''],
    );
    setClosesAtLocal(
      typeof initialClosesAt === 'number' && initialClosesAt > 0
        ? toDatetimeLocalValue(initialClosesAt)
        : defaultPollClosesAtLocal(),
    );
  }, [initialClosesAt, initialDescription, initialOptions, initialQuestion]);

  const reset = useCallback(() => {
    setQuestion('');
    setDescription('');
    setOptions(['', '']);
    setClosesAtLocal(defaultPollClosesAtLocal());
  }, []);

  useEffect(() => {
    if (!open || !isEdit) return;
    hydrateFromInitials();
  }, [hydrateFromInitials, isEdit, open]);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  const minLocal = useMemo(() => toDatetimeLocalValue(Date.now() + 60_000), [open]);

  if (!open) return null;

  const sanitized = sanitizeCirclePollOptions(options);
  const closesAt = parseDatetimeLocalValue(closesAtLocal);
  const canPost =
    (optionsLocked || question.trim().length > 0) &&
    (optionsLocked || sanitized.length >= CIRCLE_POLL_MIN_OPTIONS) &&
    closesAt != null &&
    closesAt > Date.now() &&
    !sending;

  const handlePost = async () => {
    if (!canPost || closesAt == null) return;
    await onPost(
      optionsLocked ? initialQuestion.trim() || question.trim() : question.trim(),
      optionsLocked ? (initialOptions ?? sanitized) : sanitized,
      closesAt,
      optionsLocked ? initialDescription.trim() || description.trim() : description.trim(),
    );
    if (!isEdit) reset();
  };

  const title = isEdit ? t('circle.composePollEditTitle') : t('circle.composePollTitle');
  const subtitle = isEdit
    ? optionsLocked
      ? t('circle.composePollEditClosesOnlySubtitle')
      : t('circle.composePollEditSubtitle')
    : t('circle.composePollSubtitle');

  const fields = (
    <div className="flex flex-col gap-4">
      <label className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {t('circle.pollQuestionLabel')}
        </span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
          placeholder={t('circle.pollQuestionPlaceholder')}
          rows={expanded ? 5 : 3}
          disabled={sending || optionsLocked}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl resize-none text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {t('circle.pollDescriptionLabel')}
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, CIRCLE_POLL_DESCRIPTION_MAX_CHARS))}
          placeholder={t('circle.pollDescriptionPlaceholder')}
          rows={expanded ? 8 : 3}
          disabled={sending || optionsLocked}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl resize-none text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <p className="text-[11px] text-slate-500 leading-relaxed">{t('circle.pollDescriptionHint')}</p>
      </label>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {t('circle.pollOptionsLabel')}
        </p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={option}
              onChange={(e) => {
                const next = [...options];
                next[index] = e.target.value.slice(0, CIRCLE_POLL_OPTION_MAX_CHARS);
                setOptions(next);
              }}
              placeholder={t('circle.pollOptionPlaceholder', { n: index + 1 })}
              disabled={sending || optionsLocked}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {!optionsLocked && options.length > CIRCLE_POLL_MIN_OPTIONS ? (
              <button
                type="button"
                onClick={() => setOptions(options.filter((_, i) => i !== index))}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                aria-label={t('circle.pollRemoveOption')}
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        ))}
        {optionsLocked ? (
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('circle.pollOptionsLockedHint')}
          </p>
        ) : options.length < CIRCLE_POLL_MAX_OPTIONS ? (
          <button
            type="button"
            onClick={() => setOptions([...options, ''])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 px-1 py-1"
          >
            <Plus size={14} /> {t('circle.pollAddOption')}
          </button>
        ) : null}
      </div>

      <label className="space-y-1.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          {t('circle.pollClosesLabel')}
        </span>
        <input
          type="datetime-local"
          value={closesAtLocal}
          min={minLocal}
          onChange={(e) => setClosesAtLocal(e.target.value)}
          disabled={sending}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
        />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {optionsLocked ? t('circle.pollClosesHintAfterVotes') : t('circle.pollClosesHint')}
        </p>
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
        onClick={() => {
          if (!isEdit) reset();
          setExpanded(false);
          onClose();
        }}
        className="font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        disabled={sending}
      >
        {isEdit ? t('common.close') : t('circle.clear')}
      </button>
      <button
        type="button"
        onClick={() => void handlePost()}
        disabled={!canPost}
        className={cn(
          'bg-blue-600 text-white rounded-2xl font-bold px-5 py-2 text-sm disabled:opacity-50',
        )}
      >
        {sending ? t('circle.sending') : isEdit ? t('circle.pollSave') : t('circle.pollPost')}
      </button>
    </div>
  );

  return expanded ? (
    <CircleMessageExpandOverlay
      open
      title={title}
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
        aria-labelledby="circle-poll-composer-title"
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-4 sm:pt-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 id="circle-poll-composer-title" className="font-bold text-slate-800 text-base truncate">
                {title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
              aria-label={t('circle.pollExpand')}
              title={t('circle.pollExpand')}
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
