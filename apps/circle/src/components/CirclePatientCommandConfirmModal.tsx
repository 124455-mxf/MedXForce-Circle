import { createPortal } from 'react-dom';
import { Loader2, Radio, X } from 'lucide-react';
import {
  patientRemoteCommandCircleConfirmBody,
  patientRemoteCommandCircleConfirmTitle,
  type PatientRemoteCommandType,
} from '@medxforce/shared';

type CirclePatientCommandConfirmModalProps = {
  open: boolean;
  type: PatientRemoteCommandType | null;
  patientName: string;
  onConfirm: () => void;
  onClose: () => void;
  sending?: boolean;
  error?: string | null;
};

export function CirclePatientCommandConfirmModal({
  open,
  type,
  patientName,
  onConfirm,
  onClose,
  sending = false,
  error = null,
}: CirclePatientCommandConfirmModalProps) {
  if (!open || !type || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={sending ? undefined : onClose}
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
            <Radio size={22} />
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="circle-patient-command-title" className="text-xl font-bold text-slate-900">
            {patientRemoteCommandCircleConfirmTitle(type)}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {patientRemoteCommandCircleConfirmBody(type)}
          </p>
          <p className="text-sm text-slate-700">
            Patient: <span className="font-semibold">{patientName}</span>
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : null}
            Send to tablet
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
