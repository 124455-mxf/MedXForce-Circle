import { createPortal } from 'react-dom';
import { Loader2, Share2, X } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleDropInShareModalProps = {
  open: boolean;
  patientName: string;
  onShare: () => void | Promise<void>;
  onDismiss: () => void;
  sharing?: boolean;
  error?: string | null;
};

export function CircleDropInShareModal({
  open,
  patientName,
  onShare,
  onDismiss,
  sharing = false,
  error = null,
}: CircleDropInShareModalProps) {
  const t = useCircleT();

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={sharing ? undefined : onDismiss}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-drop-in-share-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Share2 size={22} />
          </span>
          <button
            type="button"
            onClick={onDismiss}
            disabled={sharing}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label={t('remotePromptsModal.closeAria')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 id="circle-drop-in-share-title" className="text-xl font-bold text-slate-900">
            {t('remotePromptsModal.dropInShareTitle')}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('remotePromptsModal.dropInShareBody')}
          </p>
          <p className="text-sm text-slate-700">
            {t('remotePromptsModal.patientLabel')}{' '}
            <span className="font-semibold">{patientName}</span>
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
            onClick={onDismiss}
            disabled={sharing}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50"
          >
            {t('remotePromptsModal.dropInShareDontShare')}
          </button>
          <button
            type="button"
            onClick={() => void onShare()}
            disabled={sharing}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sharing ? <Loader2 size={18} className="animate-spin" /> : null}
            {t('remotePromptsModal.dropInShareButton')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
