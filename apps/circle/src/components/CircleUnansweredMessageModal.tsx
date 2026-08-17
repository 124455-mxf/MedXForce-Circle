import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleUnansweredMessageModalProps = {
  open: boolean;
  patientFirstName: string;
  onReply: () => void;
  onClose: () => void;
};

export function CircleUnansweredMessageModal({
  open,
  patientFirstName,
  onReply,
  onClose,
}: CircleUnansweredMessageModalProps) {
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
        aria-labelledby="circle-unanswered-message-title"
        aria-describedby="circle-unanswered-message-body"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <MessageSquare size={22} />
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2">
          <h3 id="circle-unanswered-message-title" className="text-xl font-bold text-slate-900">
            {t('messages.unansweredWaitingTitle')}
          </h3>
          <p
            id="circle-unanswered-message-body"
            className="text-sm text-slate-500 leading-relaxed"
          >
            {t('messages.unansweredWaitingBody', { name: patientFirstName })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={onReply}
            className="flex-1 py-3 rounded-2xl bg-sky-600 text-white font-bold hover:bg-sky-700"
          >
            {t('messages.reply')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
