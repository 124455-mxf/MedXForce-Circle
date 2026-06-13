import { createPortal } from 'react-dom';
import { Loader2, MessageCircle, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import { remotePromptAwaitingCountdownLabel } from '../lib/remotePromptsModalI18n';

type CircleDropInConfirmModalProps = {
  open: boolean;
  patientName: string;
  onConfirm: () => void;
  onClose: () => void;
  sending?: boolean;
  awaiting?: boolean;
  secondsRemaining?: number | null;
  error?: string | null;
};

export function CircleDropInConfirmModal({
  open,
  patientName,
  onConfirm,
  onClose,
  sending = false,
  awaiting = false,
  secondsRemaining = null,
  error = null,
}: CircleDropInConfirmModalProps) {
  const t = useCircleT();

  if (!open || typeof document === 'undefined') return null;

  const lockDismiss = sending || awaiting;
  const countdown =
    awaiting && secondsRemaining != null ? Math.max(0, secondsRemaining) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={lockDismiss ? undefined : onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-drop-in-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <MessageCircle size={22} />
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label={
              awaiting ? t('remotePromptsModal.cancelRequest') : t('remotePromptsModal.cancel')
            }
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="circle-drop-in-title" className="text-xl font-bold text-slate-900">
            {awaiting
              ? t('remotePromptsModal.dropInAwaitingTitle')
              : t('remotePromptsModal.dropInInviteTitle')}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {awaiting
              ? t('remotePromptsModal.dropInAwaitingBody')
              : t('remotePromptsModal.dropInInviteBody')}
          </p>
          <p className="text-sm text-slate-700">
            {t('remotePromptsModal.patientLabel')}{' '}
            <span className="font-semibold">{patientName}</span>
          </p>
        </div>

        {awaiting && countdown != null ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-5 text-center space-y-2">
            <div
              className="text-4xl font-black tabular-nums text-indigo-700 leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {countdown}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600/80">
              {t('remotePromptsModal.secondsRemaining')}
            </p>
            <p className="text-sm text-indigo-900/80">
              {remotePromptAwaitingCountdownLabel(t, countdown)}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        {awaiting ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50"
            >
              {t('remotePromptsModal.cancelRequest')}
            </button>
          </div>
        ) : (
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50"
            >
              {t('remotePromptsModal.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={sending}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              {t('remotePromptsModal.dropInConfirmButton')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
