import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mic, MicOff, Send, X } from 'lucide-react';
import type { DropInMessage } from '@medxforce/shared';
import { DROP_IN_MESSAGE_MAX_LENGTH } from '@medxforce/shared';
import { useDictation } from '../hooks/useDictation';
import { cn } from '../lib/utils';
import {
  DROP_IN_CHAT_BACKDROP_CLASS,
  DROP_IN_CHAT_BODY_CLASS,
  DROP_IN_CHAT_FOOTER_CLASS,
  DROP_IN_CHAT_HEADER_CLASS,
  DROP_IN_CHAT_PANEL_CLASS,
  DROP_IN_CHAT_TEXTAREA_CLASS,
} from '../lib/dropInChatModalLayout';

type CircleDropInChatModalProps = {
  open: boolean;
  patientName: string;
  messages: DropInMessage[];
  caregiverName: string;
  busy?: boolean;
  onSend: (text: string) => Promise<void>;
  onEnd: () => Promise<void>;
  onClose: () => void;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CircleDropInChatModal({
  open,
  patientName,
  messages,
  caregiverName,
  busy = false,
  onSend,
  onEnd,
  onClose,
}: CircleDropInChatModalProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();

  useEffect(() => {
    if (!open) {
      setDraft('');
      setError(null);
      stopRecording();
    }
  }, [open, stopRecording]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, open]);

  if (!open || typeof document === 'undefined') return null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || busy) return;
    setSending(true);
    setError(null);
    stopRecording();
    try {
      await onSend(text);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleEnd = async () => {
    stopRecording();
    try {
      await onEnd();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end conversation.');
    }
  };

  return createPortal(
    <div className={DROP_IN_CHAT_BACKDROP_CLASS}>
      <div className={DROP_IN_CHAT_PANEL_CLASS}>
        <div className={DROP_IN_CHAT_HEADER_CLASS}>
          <div>
            <p className="text-lg font-bold text-slate-900">Drop-in with {patientName}</p>
            <p className="text-sm text-slate-500 mt-0.5">Live until either of you ends it</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Minimize"
          >
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className={DROP_IN_CHAT_BODY_CLASS}>
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Waiting for {patientName} to reply…
            </p>
          ) : (
            messages.map((message) => {
              const isCaregiver = message.authorRole === 'caregiver';
              return (
                <div
                  key={message.id}
                  className={cn('flex', isCaregiver ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2',
                      isCaregiver
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-800',
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                      {isCaregiver ? caregiverName : patientName}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap mt-0.5">
                      {message.text}
                    </p>
                    <p className="text-[10px] opacity-70 mt-1">{formatTime(message.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={DROP_IN_CHAT_FOOTER_CLASS}>
          {error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          ) : null}
          {micError ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {micError}
            </p>
          ) : null}
          <textarea
            value={draft}
            onChange={(e) => {
              setMicError(null);
              setDraft(e.target.value.slice(0, DROP_IN_MESSAGE_MAX_LENGTH));
            }}
            placeholder="Write a message…"
            rows={3}
            disabled={busy || sending}
            className={DROP_IN_CHAT_TEXTAREA_CLASS}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void toggleRecording(
                  () => draft,
                  (value) => setDraft(value.slice(0, DROP_IN_MESSAGE_MAX_LENGTH)),
                )
              }
              disabled={busy || sending}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-xl border shrink-0',
                isRecording
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
              aria-label={isRecording ? 'Stop dictation' : 'Start dictation'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              type="button"
              onClick={() => void handleEnd()}
              disabled={busy || sending}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              End conversation
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={busy || sending || !draft.trim()}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
