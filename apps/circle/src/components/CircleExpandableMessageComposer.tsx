import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, MessageSquare, Mic, MicOff, Sparkles, X } from 'lucide-react';
import type { CircleMemberRole } from '@medxforce/shared';
import { useDictation } from '../hooks/useDictation';
import { isCircleAiAssistAvailable } from '../lib/circleAiAssist';
import { cn } from '../lib/utils';
import { messageLooksFormatted } from '../lib/formattedMessage';
import { CircleAiGuidanceModal } from './CircleAiGuidanceModal';
import { CircleFormattedBody } from './CircleFormattedBody';
import { useCircleT } from '../lib/circleI18nContext';

type CircleAiGuidanceConfig = {
  threadLabel: string;
  memberRole: CircleMemberRole;
  recentContext?: string;
};

type CircleExpandableMessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  sending?: boolean;
  onClear: () => void;
  onSend: () => void | Promise<void>;
  clearLabel?: string;
  sendLabel?: string;
  sendingLabel?: string;
  maxLength?: number;
  expandTitle?: string;
  expandSubtitle?: string;
  textareaClassName?: string;
  wrapperClassName?: string;
  aiGuidance?: CircleAiGuidanceConfig;
  /** When false, hide the sparkles control (e.g. AI lives in the page header). Default true. */
  showAiButton?: boolean;
  /**
   * `inline` (default): compact composer + optional expand overlay.
   * `overlay`: full-page composer only — open via `expanded` / `onExpandedChange`.
   */
  presentation?: 'inline' | 'overlay';
  /** Controlled expanded overlay (required for `presentation="overlay"`). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  error?: string | null;
  showSubject?: boolean;
  subject?: string;
  onSubjectChange?: (value: string) => void;
  subjectPlaceholder?: string;
  subjectMaxLength?: number;
};

const inlineTextareaClass =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm max-h-28 outline-none focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 [@media(max-height:740px)]:px-3 [@media(max-height:740px)]:py-2 [@media(max-height:740px)]:max-h-20';

const expandedTextareaClass =
  'w-full h-full min-h-[160px] px-4 py-3 bg-white border border-slate-200 rounded-2xl resize-none text-base leading-relaxed outline-none focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15';

const iconButtonClass =
  'w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shrink-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 [@media(max-height:740px)]:w-9 [@media(max-height:740px)]:h-9';

function applyMaxLength(text: string, maxLength?: number): string {
  if (maxLength == null) return text;
  return text.slice(0, maxLength);
}

export function CircleExpandableMessageComposer({
  value,
  onChange,
  placeholder,
  disabled = false,
  sending = false,
  onClear,
  onSend,
  clearLabel = 'Clear',
  sendLabel = 'Send',
  sendingLabel = 'Sending…',
  maxLength,
  expandTitle = 'Write message',
  expandSubtitle,
  textareaClassName,
  wrapperClassName,
  aiGuidance,
  showAiButton = true,
  presentation = 'inline',
  expanded: expandedProp,
  onExpandedChange,
  error = null,
  showSubject = false,
  subject = '',
  onSubjectChange,
  subjectPlaceholder,
  subjectMaxLength = 256,
}: CircleExpandableMessageComposerProps) {
  const t = useCircleT();
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const inlineRef = useRef<HTMLTextAreaElement>(null);
  const expandedRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const previousValueRef = useRef(value);
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();
  const showAiGuidance = Boolean(aiGuidance) && isCircleAiAssistAvailable();
  const showInlineAiButton = showAiGuidance && showAiButton;
  const isOverlayOnly = presentation === 'overlay';
  const expandedControlled = expandedProp !== undefined;
  const expanded = expandedControlled ? expandedProp : uncontrolledExpanded;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!expandedControlled) setUncontrolledExpanded(next);
      onExpandedChange?.(next);
    },
    [expandedControlled, onExpandedChange],
  );

  const setText = useCallback(
    (text: string) => {
      onChange(applyMaxLength(text, maxLength));
    },
    [maxLength, onChange],
  );

  const inputDisabled = disabled || sending;

  const collapseExpanded = useCallback(() => {
    expandedRef.current?.blur();
    inlineRef.current?.blur();
    subjectRef.current?.blur();
    setExpanded(false);
  }, [setExpanded]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      if (showSubject) {
        subjectRef.current?.focus({ preventScroll: true });
      } else {
        expandedRef.current?.focus({ preventScroll: true });
      }
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [expanded, showSubject]);

  useEffect(() => {
    const hadContent = previousValueRef.current.trim().length > 0;
    const nowEmpty = !value.trim();
    if (expanded && hadContent && nowEmpty) {
      collapseExpanded();
    }
    previousValueRef.current = value;
  }, [value, expanded, collapseExpanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        collapseExpanded();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded, collapseExpanded]);

  useEffect(() => {
    if (inputDisabled) stopRecording();
  }, [inputDisabled, stopRecording]);

  useEffect(() => {
    return () => stopRecording();
  }, [stopRecording]);

  const canSend = !inputDisabled && !!value.trim();

  const handleDictation = () => {
    setMicError(null);
    void toggleRecording(() => value, setText);
  };

  const handleClear = () => {
    stopRecording();
    setMicError(null);
    onClear();
  };

  const handleSend = () => {
    stopRecording();
    void onSend();
  };

  const handleOpenAiGuidance = () => {
    stopRecording();
    setAiModalOpen(true);
  };

  const textareaRecordingClass = isRecording ? 'border-red-200 ring-2 ring-red-100' : '';

  const inlineActionRow = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center shrink-0 gap-1.5">
        {!expanded && !isOverlayOnly && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={inputDisabled}
            className={iconButtonClass}
            aria-label={t('common.aria.expandMessageBox')}
            title={t('common.aria.expandMessageBox')}
          >
            <Maximize2 size={18} className="[@media(max-height:740px)]:hidden" />
            <Maximize2 size={16} className="hidden [@media(max-height:740px)]:block" />
          </button>
        )}
        <button
          type="button"
          onClick={handleDictation}
          disabled={inputDisabled}
          className={cn(
            iconButtonClass,
            isRecording && 'border-red-200 bg-red-50 text-red-600 animate-pulse',
          )}
          aria-label={isRecording ? t('common.aria.dictateStop') : t('common.aria.dictateStart')}
          aria-pressed={isRecording}
          title={isRecording ? t('common.aria.dictateStop') : t('common.aria.dictateStart')}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        {showInlineAiButton && aiGuidance && (
          <button
            type="button"
            onClick={handleOpenAiGuidance}
            disabled={inputDisabled}
            className={cn(
              iconButtonClass,
              'border-violet-100 text-violet-600 hover:bg-violet-50 hover:border-violet-200',
            )}
            aria-label={t('common.aria.privateAiGuidance')}
            title={t('common.aria.privateAiGuidance')}
          >
            <Sparkles size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-end min-w-0 gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="font-semibold text-slate-600 hover:bg-slate-50 rounded-2xl border border-slate-200 disabled:opacity-50 px-4 py-2 text-sm [@media(max-height:740px)]:px-3 [@media(max-height:740px)]:py-1.5 [@media(max-height:740px)]:text-xs"
          disabled={inputDisabled}
        >
          {clearLabel}
        </button>
        <button
          type="button"
          onClick={() => void handleSend()}
          className="bg-blue-600 text-white rounded-2xl font-bold disabled:opacity-50 px-5 py-2 text-sm [@media(max-height:740px)]:px-4 [@media(max-height:740px)]:py-1.5 [@media(max-height:740px)]:text-xs"
          disabled={!canSend}
        >
          {sending ? sendingLabel : sendLabel}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {!isOverlayOnly ? (
        <div className={cn('space-y-2', wrapperClassName)}>
          <textarea
            ref={inlineRef}
            value={value}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={placeholder}
            className={cn(inlineTextareaClass, textareaRecordingClass, textareaClassName)}
            disabled={inputDisabled}
            maxLength={maxLength}
          />

          {inlineActionRow}

          {isRecording && (
            <p className="text-[11px] text-red-600 font-medium leading-snug">
              {t('circle.composerListening')}
            </p>
          )}
          {micError && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-snug">
              {micError}
            </p>
          )}
          {error ? (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-snug">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {expanded && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0"
            onClick={collapseExpanded}
          />
          <div
            className="relative bg-white w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[94vh] min-h-[65vh] sm:min-h-[480px] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="circle-expanded-composer-title"
          >
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <div className="flex items-center justify-between gap-3 px-5 pb-4 sm:pt-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div className="min-w-0">
                  <h3
                    id="circle-expanded-composer-title"
                    className="font-bold text-slate-800 text-base truncate"
                  >
                    {expandTitle}
                  </h3>
                  {expandSubtitle ? (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{expandSubtitle}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={collapseExpanded}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
                aria-label={t('common.aria.collapseMessageBox')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 p-5 flex flex-col gap-3 overflow-hidden">
              {showSubject ? (
                <div className="shrink-0 flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {t('circle.composerSubject')}
                  </span>
                  <input
                    ref={subjectRef}
                    type="text"
                    value={subject}
                    onChange={(e) =>
                      onSubjectChange?.(applyMaxLength(e.target.value, subjectMaxLength))
                    }
                    placeholder={subjectPlaceholder}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                    disabled={inputDisabled}
                    maxLength={subjectMaxLength}
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {t('circle.composerYourMessage')}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDictation}
                    disabled={inputDisabled}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors disabled:opacity-50',
                      isRecording
                        ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600',
                    )}
                    aria-label={
                      isRecording ? t('common.aria.dictateStop') : t('common.aria.dictateStart')
                    }
                    aria-pressed={isRecording}
                  >
                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {isRecording ? t('circle.aiGuidanceDictateStop') : t('circle.aiGuidanceDictate')}
                  </button>
                  {showInlineAiButton && aiGuidance ? (
                    <button
                      type="button"
                      onClick={handleOpenAiGuidance}
                      disabled={inputDisabled}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                      aria-label={t('common.aria.privateAiGuidance')}
                    >
                      <Sparkles size={14} />
                    </button>
                  ) : null}
                </div>
              </div>

              <textarea
                ref={expandedRef}
                value={value}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className={cn(expandedTextareaClass, 'flex-1 min-h-[120px]', textareaRecordingClass)}
                disabled={inputDisabled}
                maxLength={maxLength}
              />

              {messageLooksFormatted(value) ? (
                <div className="shrink-0 max-h-40 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                    {t('circle.composerFormatPreview')}
                  </p>
                  <CircleFormattedBody text={value} className="text-sm text-slate-700" />
                </div>
              ) : null}

              {maxLength != null && (
                <p className="text-xs text-slate-400 text-right tabular-nums shrink-0">
                  {value.length}/{maxLength}
                </p>
              )}
              {isRecording && (
                <p className="text-xs text-red-600 font-medium shrink-0">
                  {t('circle.composerListening')}
                </p>
              )}
              {micError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 shrink-0">
                  {micError}
                </p>
              )}
              {error ? (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 shrink-0">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 p-5 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={inputDisabled}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {clearLabel}
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? sendingLabel : sendLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAiGuidance && aiGuidance && showAiButton && (
        <CircleAiGuidanceModal
          open={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          threadLabel={aiGuidance.threadLabel}
          memberRole={aiGuidance.memberRole}
          recentContext={aiGuidance.recentContext}
        />
      )}
    </>
  );
}
