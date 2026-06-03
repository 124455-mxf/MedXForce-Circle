import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import type { CircleMemberRole } from '@medxforce/shared';
import { askCircleAiGuidance, isCircleAiAssistAvailable } from '../lib/circleAiAssist';
import { CIRCLE_AI_PRIVACY_DISCLOSURE } from '../lib/circleAiGuardrails';
import { cn } from '../lib/utils';
import { CircleAiGuidanceContent } from './CircleAiGuidanceContent';

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
  const [question, setQuestion] = useState('');
  const [includeRecentMessages, setIncludeRecentMessages] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canIncludeContext = Boolean(recentContext?.trim());

  useEffect(() => {
    if (!open) {
      setQuestion('');
      setAnswer(null);
      setError(null);
      setIncludeRecentMessages(false);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
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
      setError(err instanceof Error ? err.message : 'Could not get guidance.');
    } finally {
      setLoading(false);
    }
  };

  const askAnother = () => {
    setAnswer(null);
    setError(null);
    setQuestion('');
    setIncludeRecentMessages(false);
  };

  if (!open || !isCircleAiAssistAvailable()) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[92vh] flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={18} className="text-violet-600 shrink-0" />
              Private AI guidance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Not posted to the circle thread</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
          {!answer && (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">{CIRCLE_AI_PRIVACY_DISCLOSURE}</p>

              {canIncludeContext && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecentMessages}
                    onChange={(e) => setIncludeRecentMessages(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 rounded border-violet-300 text-violet-600"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Include recent messages from this thread as background (off by default)
                  </span>
                </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase">Your question</span>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  placeholder="e.g. How can I encourage my father to do his daily check-ins?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none min-h-[100px]"
                  maxLength={1000}
                  disabled={loading}
                  autoFocus
                />
              </label>
            </>
          )}

          {answer && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Your question
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
                  Guidance
                </p>
                <CircleAiGuidanceContent text={answer} />
              </div>
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
                Ask another
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700"
              >
                Done
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
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAsk()}
                disabled={loading || !question.trim()}
                className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Get guidance
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
