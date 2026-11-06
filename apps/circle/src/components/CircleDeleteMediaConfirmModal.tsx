import { Trash2 } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleDeleteMediaConfirmModalProps = {
  open: boolean;
  isVideo: boolean;
  caption?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CircleDeleteMediaConfirmModal({
  open,
  isVideo,
  caption,
  busy = false,
  onCancel,
  onConfirm,
}: CircleDeleteMediaConfirmModalProps) {
  const t = useCircleT();
  if (!open) return null;

  const trimmedCaption = caption?.trim();
  const title = isVideo ? t('gallery.deleteVideoTitle') : t('gallery.deletePhotoTitle');
  const confirm = isVideo ? t('gallery.deleteVideoConfirm') : t('gallery.deletePhotoConfirm');
  const untitledBody = isVideo ? t('gallery.deleteVideoBody') : t('gallery.deletePhotoBody');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-media-title"
    >
      <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-6 border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
          <Trash2 size={32} />
        </div>
        <div className="space-y-2">
          <h3 id="delete-media-title" className="text-xl font-bold text-slate-900">
            {title}
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            {trimmedCaption
              ? t('gallery.deleteMediaBodyCaption', { caption: trimmedCaption })
              : untitledBody}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
          >
            {busy ? t('gallery.deleting') : confirm}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {t('gallery.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
