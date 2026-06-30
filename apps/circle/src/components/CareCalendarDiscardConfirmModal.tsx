/** @license SPDX-License-Identifier: Apache-2.0 */
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

type CareCalendarDiscardConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function CareCalendarDiscardConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: CareCalendarDiscardConfirmModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            role="alertdialog"
            aria-labelledby="care-calendar-discard-title"
            aria-describedby="care-calendar-discard-desc"
            className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                <AlertTriangle size={22} />
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                aria-label={cancelLabel}
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              <h3 id="care-calendar-discard-title" className="text-xl font-bold text-slate-900">
                {title}
              </h3>
              <p id="care-calendar-discard-desc" className="text-sm text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(
                  'flex-1 py-3 rounded-2xl text-white font-bold transition-colors',
                  'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-100',
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
