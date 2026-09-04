import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, Mic, MicOff, Sparkles, X } from 'lucide-react';
import type { CircleMemberRole } from '@medxforce/shared';
import { writeFormattedTextToClipboard } from '../lib/formattedClipboard';
import { useDictation } from '../hooks/useDictation';
import { cn } from '../lib/utils';
import { CircleAiGuidanceContent } from './CircleAiGuidanceContent';
import { useCircleT } from '../lib/circleI18nContext';

const QUESTION_MAX_LENGTH = 1000;

type CircleAiGuidanceModalProps = {
  open: boolean;
  onClose: () => void;
  threadLabel: string;
  memberRole: CircleMemberRole;
  recentContext?: string;
};

export function CircleAiGuidanceModal({
  open,
  onClose,
  threadLabel,
  memberRole,
  recentContext,
}: CircleAiGuidanceModalProps) {
  const t = useCircleT();
  const [question, setQuestion] = useState('');
  const [includeRecentMessages, setIncludeRecentMessages] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();

  const canIncludeContext = Boolean(recentContext?.trim());

  const setQuestionText = useCallback((text: string) => {
    setQuestion(text.slice(0, QUESTION_MAX_LENGTH));
  }, []);

  useEffect(() => {
    if (!open) {
      setQuestion('');
      setAnswer(null);
      setError(null);
      setIncludeRecentMessages(false);
      setLoading(false);
      setCopied(false);
      setMicError(null);
      stopRecording();
    }
  }, [open, setMicError, stopRecording]);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    stopRecording();
    onClose();
  };

  const handleQuestionDictation = () => {
    setMicError(null);
    void toggleRecording(() => question, setQuestionText);
  };

  const handleCopyGuidance = useCallback(async () => {
    if (!answer?.trim()) return;
    const q = question.trim();
    const text = q
      ? `${t('circle.aiGuidanceYourQuestion')}:\n${q}\n\n${t('circle.aiGuidanceLabel')}:\n${answer.trim()}`
      : answer.trim();
    try {
      await writeFormattedTextToClipboard(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [answer, question, t]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loading) return;
    stopRecording();
    setLoading(true);
    setError(null);
    setAnswer(null);
    setCopied(false);
    try {
      const result = await askCircleAiGuidance({
        question: q,
        threadLabel,
        memberRole,
        recentContext:
          includeRecentMessages && canIncludeContext ? recentContext : undefined,
      });
      setAnswer(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('circle.aiGuidanceFailed'));
    } finally {
      setLoading(false);
    }
  };

  const askAnother = () => {
    stopRecording();
    setMicError(null);
    setAnswer(null);
    setError(null);
    setCopied(false);
    setQuestion('');
    setIncludeRecentMessages(false);
  };

  useEffect(() => {
    if (loading) stopRecording();
  }, [loading, stopRecording]);

  if (!open || !isCircleAiAssistAvailable()) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[94vh] min-h-[65vh] sm:min-h-[480px] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={18} className="text-violet-600 shrink-0" />
              {t('circle.aiGuidanceTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('circle.aiGuidanceSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={cn(
            'flex-1 min-h-0 p-5',
            answer
              ? 'overflow-y-auto overscroll-contain space-y-4'
              : 'flex flex-col gap-4 overflow-hidden',
          )}
        >
          {!answer && (
            <>
              <p className="text-xs text-slate-500 leading-relaxed shrink-0">
                {t('circle.aiGuidancePrivacy')}
              </p>

              {canIncludeContext && (
                <label className="flex items-start gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={includeRecentMessages}
                    onChange={(e) => setIncludeRecentMessages(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 rounded border-violet-300 text-violet-600"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    {t('circle.aiGuidanceIncludeRecent')}
                  </span>
                </label>
              )}

              <label className="flex flex-col flex-1 min-h-0 gap-1.5">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {t('circle.aiGuidanceYourQuestion')}
                  </span>
                  <button
                    type="button"
                    onClick={handleQuestionDictation}
                    disabled={loading}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors disabled:opacity-50',
                      isRecording
                        ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-violet-600',
                    )}
                    aria-label={
                      isRecording ? t('common.aria.dictateStop') : t('common.aria.dictateQuestion')
                    }
                    aria-pressed={isRecording}
                  >
                    {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {isRecording ? t('circle.aiGuidanceDictateStop') : t('circle.aiGuidanceDictate')}
                  </button>
                </div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={t('circle.aiGuidancePlaceholder')}
                  className={cn(
                    'w-full flex-1 min-h-[120px] px-4 py-3 rounded-xl border text-sm resize-none outline-none focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15',
                    isRecording ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200',
                  )}
                  maxLength={QUESTION_MAX_LENGTH}
                  disabled={loading}
                />
                {isRecording && (
                  <p className="text-xs text-red-600 font-medium shrink-0">
                    {t('circle.aiGuidanceListening')}
                  </p>
                )}
                {micError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 shrink-0">
                    {micError}
                  </p>
                )}
              </label>
            </>
          )}

          {answer && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  {t('circle.aiGuidanceYourQuestion')}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">{question}</p>
              </div>

              <div
                className={cn(
                  'rounded-2xl border px-4 py-4',
                  answer.includes('988')
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-violet-100 bg-violet-50/30',
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 mb-3">
                  {t('circle.aiGuidanceLabel')}
                </p>
                <CircleAiGuidanceContent text={answer} />
              </div>

              <button
                type="button"
                onClick={() => void handleCopyGuidance()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? t('circle.copied') : t('circle.copyMessage')}
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 p-5 border-t border-slate-100 flex gap-2">
          {answer ? (
            <>
              <button
                type="button"
                onClick={askAnother}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50"
              >
                {t('circle.aiGuidanceAskAnother')}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700"
              >
                {t('circle.aiGuidanceDone')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleAsk()}
                disabled={loading || !question.trim()}
                className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {t('circle.aiGuidanceGet')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
