import { createPortal } from 'react-dom';
import { Loader2, MessageCircle, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import { remotePromptAwaitingCountdownLabel } from '../lib/remotePromptsModalI18n';

type CircleDropInPatientRequestModalProps = {
  open: boolean;
  patientName: string;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
  secondsRemaining?: number | null;
  error?: string | null;
};

export function CircleDropInPatientRequestModal({
  open,
  patientName,
  onAccept,
  onDecline,
  busy = false,
  secondsRemaining = null,
  error = null,
}: CircleDropInPatientRequestModalProps) {
  const t = useCircleT();

  if (!open || typeof document === 'undefined') return null;

  const countdown = secondsRemaining != null ? Math.max(0, secondsRemaining) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-drop-in-patient-request-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle size={22} />
          </span>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label={t('remotePromptsModal.notNow')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="circle-drop-in-patient-request-title" className="text-xl font-bold text-slate-900">
            {t('remotePromptsModal.dropInPatientRequestTitle')}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('remotePromptsModal.dropInPatientRequestBody', { name: patientName })}
          </p>
        </div>

        {countdown != null ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-5 text-center space-y-2">
            <div
              className="text-4xl font-black tabular-nums text-emerald-700 leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {countdown}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600/80">
              {t('remotePromptsModal.secondsRemaining')}
            </p>
            <p className="text-sm text-emerald-900/80">
              {remotePromptAwaitingCountdownLabel(t, countdown)}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50"
          >
            {t('remotePromptsModal.notNow')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {t('remotePromptsModal.dropInPatientRequestAccept')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
