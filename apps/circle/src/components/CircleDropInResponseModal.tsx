import { createPortal } from 'react-dom';
import { XCircle, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleDropInResponseModalProps = {
  open: boolean;
  patientName: string;
  onClose: () => void;
};

export function CircleDropInResponseModal({
  open,
  patientName,
  onClose,
}: CircleDropInResponseModalProps) {
  const t = useCircleT();

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-drop-in-response-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <XCircle size={22} />
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label={t('remotePromptsModal.closeAria')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="circle-drop-in-response-title" className="text-xl font-bold text-slate-900">
            {t('remotePromptsModal.patientChosePrefix')}{' '}
            <span className="text-red-600">{t('remotePromptsModal.notNow')}</span>
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('remotePromptsModal.dropInDeclinedBody', { name: patientName })}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
        >
          {t('remotePromptsModal.ok')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
