import { createPortal } from 'react-dom';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import {
  patientRemoteCommandCircleResponseBody,
  patientRemoteCommandLabel,
  type PatientRemoteCommandPatientResponse,
  type PatientRemoteCommandType,
} from '@medxforce/shared';

type CirclePatientCommandResponseModalProps = {
  open: boolean;
  status: PatientRemoteCommandPatientResponse | null;
  type: PatientRemoteCommandType | null;
  patientName: string;
  onClose: () => void;
};

export function CirclePatientCommandResponseModal({
  open,
  status,
  type,
  patientName,
  onClose,
}: CirclePatientCommandResponseModalProps) {
  if (!open || !status || !type || typeof document === 'undefined') return null;

  const accepted = status === 'acknowledged';
  const decisionLabel = accepted ? 'Open now' : 'Not now';

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-patient-command-response-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={
              accepted
                ? 'w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0'
                : 'w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0'
            }
          >
            {accepted ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <h3
            id="circle-patient-command-response-title"
            className="text-xl font-bold text-slate-900"
          >
            Patient chose{' '}
            <span className={accepted ? 'text-emerald-600' : 'text-red-600'}>
              {decisionLabel}
            </span>
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {patientRemoteCommandCircleResponseBody(status, type, patientName)}
          </p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {patientRemoteCommandLabel(type)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
        >
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
