import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Mic, MicOff, Minimize2, Sparkles } from 'lucide-react';
import type { CircleMemberRole } from '@medxforce/shared';
import { useDictation } from '../hooks/useDictation';
import { isCircleAiAssistAvailable } from '../lib/circleAiAssist';
import { cn } from '../lib/utils';
import { CircleAiGuidanceModal } from './CircleAiGuidanceModal';

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
  textareaClassName?: string;
  wrapperClassName?: string;
  aiGuidance?: CircleAiGuidanceConfig;
};

const inlineTextareaClass =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm max-h-28 outline-none focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15 [@media(max-height:740px)]:px-3 [@media(max-height:740px)]:py-2 [@media(max-height:740px)]:max-h-20';

const expandedTextareaClass =
  'w-full h-full min-h-[200px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-base leading-relaxed outline-none focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15';

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
  textareaClassName,
  wrapperClassName,
  aiGuidance,
}: CircleExpandableMessageComposerProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const inlineRef = useRef<HTMLTextAreaElement>(null);
  const expandedRef = useRef<HTMLTextAreaElement>(null);
  const previousValueRef = useRef(value);
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();
  const showAiGuidance = Boolean(aiGuidance) && isCircleAiAssistAvailable();

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
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      expandedRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [expanded]);

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

  const actionRow = (compactSend?: boolean) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 shrink-0">
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={inputDisabled}
            className={iconButtonClass}
            aria-label="Expand message box"
            title="Expand"
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
          aria-label={isRecording ? 'Stop dictation' : 'Dictate with microphone'}
          aria-pressed={isRecording}
          title={isRecording ? 'Stop dictation' : 'Dictate'}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        {showAiGuidance && aiGuidance && (
          <button
            type="button"
            onClick={handleOpenAiGuidance}
            disabled={inputDisabled}
            className={cn(
              iconButtonClass,
              'border-violet-100 text-violet-600 hover:bg-violet-50 hover:border-violet-200',
            )}
            aria-label="Private AI guidance"
            title="Private AI guidance"
          >
            <Sparkles size={18} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 min-w-0">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-50 [@media(max-height:740px)]:px-3 [@media(max-height:740px)]:py-1.5 [@media(max-height:740px)]:text-xs"
          disabled={inputDisabled}
        >
          {clearLabel}
        </button>
        <button
          type="button"
          onClick={() => void handleSend()}
          className={cn(
            'px-5 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50',
            compactSend && '[@media(max-height:740px)]:px-4 [@media(max-height:740px)]:py-1.5 [@media(max-height:740px)]:text-xs',
          )}
          disabled={!canSend}
        >
          {sending ? sendingLabel : sendLabel}
        </button>
      </div>
    </div>
  );

  return (
    <>
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

        {actionRow(true)}

        {isRecording && (
          <p className="text-[11px] text-red-600 font-medium leading-snug">
            Listening… speak naturally, then tap the mic to stop.
          </p>
        )}
        {micError && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-snug">
            {micError}
          </p>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[130] flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="circle-expanded-composer-title"
        >
          <div
            className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <h3
              id="circle-expanded-composer-title"
              className="text-sm font-bold text-slate-800 truncate"
            >
              {expandTitle}
            </h3>
            <button
              type="button"
              onClick={collapseExpanded}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold uppercase tracking-wide text-[10px] hover:bg-slate-50 shrink-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
              aria-label="Collapse message box"
            >
              <Minimize2 size={16} />
              Collapse
            </button>
          </div>

          <div className="flex-1 min-h-0 p-4">
            <textarea
              ref={expandedRef}
              value={value}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className={cn(expandedTextareaClass, textareaRecordingClass)}
              disabled={inputDisabled}
              maxLength={maxLength}
            />
          </div>

          <div
            className="shrink-0 p-4 border-t border-slate-200 bg-white space-y-2"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {maxLength != null && (
              <p className="text-[11px] text-slate-400 text-right tabular-nums">
                {value.length}/{maxLength}
              </p>
            )}
            {actionRow(false)}
            {isRecording && (
              <p className="text-xs text-red-600 font-medium leading-snug">
                Listening… speak naturally, then tap the mic to stop.
              </p>
            )}
            {micError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-snug">
                {micError}
              </p>
            )}
          </div>
        </div>
      )}

      {showAiGuidance && aiGuidance && (
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
