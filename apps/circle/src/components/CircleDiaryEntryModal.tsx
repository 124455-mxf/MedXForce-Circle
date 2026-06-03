import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, Mic, MicOff, Users, X } from 'lucide-react';
import {
  DIARY_MOOD_OPTIONS,
  emptyDiaryDraft,
  type CircleDiaryEntry,
  type CircleDiaryEntryDraft,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useDictation } from '../hooks/useDictation';

type CircleDiaryEntryModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  entry?: CircleDiaryEntry;
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: CircleDiaryEntryDraft) => void;
};

function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInputValue(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

export function CircleDiaryEntryModal({
  open,
  mode,
  entry,
  saving = false,
  onClose,
  onSave,
}: CircleDiaryEntryModalProps) {
  const [draft, setDraft] = useState<CircleDiaryEntryDraft>(() => emptyDiaryDraft());
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();

  const setBody = useCallback((body: string) => {
    setDraft((prev) => ({ ...prev, body: body.slice(0, 10000) }));
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && entry) {
      setDraft({
        title: entry.title || '',
        body: entry.body,
        mood: entry.mood || '',
        experienceAt: entry.experienceAt,
        visibility: entry.visibility,
      });
    } else {
      setDraft(emptyDiaryDraft());
    }
    setMicError(null);
  }, [open, mode, entry, setMicError]);

  useEffect(() => {
    if (!open) stopRecording();
  }, [open, stopRecording]);

  const handleClose = () => {
    stopRecording();
    onClose();
  };

  const handleExperienceDictation = () => {
    void toggleRecording(
      () => draft.body,
      (body) => setBody(body),
    );
  };

  if (!open) return null;

  const canSave = draft.body.trim().length > 0 && !saving;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">
              {mode === 'create' ? 'New diary entry' : 'Edit entry'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Your experience on this journey — only you see private entries until you share them.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase">Title (optional)</span>
            <input
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
              placeholder="A visit, a moment, a milestone…"
              value={draft.title}
              maxLength={200}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <label className="block space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Your experience</span>
              <button
                type="button"
                onClick={handleExperienceDictation}
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors disabled:opacity-50',
                  isRecording
                    ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600',
                )}
                aria-label={isRecording ? 'Stop dictation' : 'Dictate with microphone'}
                aria-pressed={isRecording}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                {isRecording ? 'Stop' : 'Dictate'}
              </button>
            </div>
            <textarea
              className={cn(
                'w-full px-4 py-3 rounded-xl border text-sm min-h-[140px] resize-y',
                isRecording ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200',
              )}
              placeholder="What happened? How did you experience it? What feelings came up for you?"
              value={draft.body}
              maxLength={10000}
              onChange={(e) => setBody(e.target.value)}
            />
            {isRecording && (
              <p className="text-xs text-red-600 font-medium">Listening… speak naturally, then tap Stop.</p>
            )}
            {micError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {micError}
              </p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase">How you felt</span>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white"
              value={draft.mood}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  mood: e.target.value as CircleDiaryEntryDraft['mood'],
                })
              }
            >
              <option value="">Choose a mood (optional)</option>
              {DIARY_MOOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase">When</span>
            <input
              type="date"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
              value={toDateInputValue(draft.experienceAt)}
              onChange={(e) =>
                setDraft({ ...draft, experienceAt: fromDateInputValue(e.target.value) })
              }
            />
          </label>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Sharing</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, visibility: 'private' })}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border text-left transition-colors',
                  draft.visibility === 'private'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                <Lock size={18} />
                <span className="text-xs font-bold">Just for me</span>
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, visibility: 'circle' })}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border text-left transition-colors',
                  draft.visibility === 'circle'
                    ? 'border-violet-200 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                <Users size={18} />
                <span className="text-xs font-bold">Share with circle</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Shared entries become part of the circle&apos;s combined story — each member&apos;s
              perspective woven together over time.
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(draft)}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === 'create' ? 'Save entry' : 'Update entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
