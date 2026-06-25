import { createPortal } from 'react-dom';
import { Calendar, ClipboardList, Loader2, Radio, Stethoscope, X } from 'lucide-react';
import type { PatientRemoteCommandType } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import {
  remoteCommandAwaitingBodyI18n,
  remoteCommandConfirmBodyI18n,
  remoteCommandConfirmTitleI18n,
  remotePromptAwaitingCountdownLabel,
} from '../lib/remotePromptsModalI18n';

type CirclePatientCommandConfirmModalProps = {
  open: boolean;
  type: PatientRemoteCommandType | null;
  patientName: string;
  onConfirm: () => void;
  onClose: () => void;
  sending?: boolean;
  awaiting?: boolean;
  secondsRemaining?: number | null;
  error?: string | null;
};

export function CirclePatientCommandConfirmModal({
  open,
  type,
  patientName,
  onConfirm,
  onClose,
  sending = false,
  awaiting = false,
  secondsRemaining = null,
  error = null,
}: CirclePatientCommandConfirmModalProps) {
  const t = useCircleT();

  if (!open || !type || typeof document === 'undefined') return null;

  const lockDismiss = sending || awaiting;
  const countdown =
    awaiting && secondsRemaining != null ? Math.max(0, secondsRemaining) : null;
  const Icon =
    type === 'open_doctor_visit'
      ? Stethoscope
      : type === 'open_quick_answers'
        ? ClipboardList
        : Calendar;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={lockDismiss ? undefined : onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-patient-command-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            {awaiting ? <Radio size={22} /> : <Icon size={22} />}
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
          <h3 id="circle-patient-command-title" className="text-xl font-bold text-slate-900">
            {awaiting
              ? t('remotePromptsModal.remoteAwaitingTitle')
              : remoteCommandConfirmTitleI18n(t, type)}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {awaiting
              ? remoteCommandAwaitingBodyI18n(t, type)
              : remoteCommandConfirmBodyI18n(t, type)}
          </p>
          <p className="text-sm text-slate-700">
            {t('remotePromptsModal.patientLabel')}{' '}
            <span className="font-semibold">{patientName}</span>
          </p>
        </div>

        {awaiting && countdown != null ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-5 text-center space-y-2">
            <div
              className="text-4xl font-black tabular-nums text-blue-700 leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {countdown}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600/80">
              {t('remotePromptsModal.secondsRemaining')}
            </p>
            <p className="text-sm text-blue-900/80">
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
              className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : null}
              {t('remotePromptsModal.remoteSendToTablet')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
