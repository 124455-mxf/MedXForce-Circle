import { createPortal } from 'react-dom';
import { Loader2, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';

type DiaryEntryDeleteConfirmModalProps = {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting?: boolean;
};

export function DiaryEntryDeleteConfirmModal({
  open,
  onConfirm,
  onClose,
  isDeleting = false,
}: DiaryEntryDeleteConfirmModalProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-labelledby="circle-diary-delete-title"
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <Trash2 size={22} />
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2">
          <h3 id="circle-diary-delete-title" className="text-xl font-bold text-slate-900">
            Delete this entry?
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            This cannot be undone. The entry will be removed from your journal and the circle
            story.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              'flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2',
            )}
          >
            {isDeleting && <Loader2 size={18} className="animate-spin" />}
            Delete entry
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
