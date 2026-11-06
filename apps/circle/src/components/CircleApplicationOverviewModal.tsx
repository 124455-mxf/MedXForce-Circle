import { Copy, Download, FileText, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type CircleApplicationOverviewModalProps = {
  isOpen: boolean;
  overviewText: string;
  syncedAt?: number | null;
  t: (path: string, params?: Record<string, unknown>) => string;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
};

export function CircleApplicationOverviewModal({
  isOpen,
  overviewText,
  syncedAt,
  t,
  onClose,
  onCopy,
  onDownload,
  onPrint,
}: CircleApplicationOverviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {t('remoteSettings.applicationOverviewTitle')}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {t('remoteSettings.applicationOverviewDesc')}
                  </p>
                  {syncedAt ? (
                    <p className="text-xs text-slate-400 mt-1">
                      {t('remoteSettings.applicationOverviewSyncedAt', {
                        date: new Date(syncedAt).toLocaleString(),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-3 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <pre className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {overviewText}
                </pre>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={onCopy}
                className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                <Copy size={20} />
                {t('remoteSettings.applicationOverviewCopy')}
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                <Download size={20} />
                {t('remoteSettings.applicationOverviewDownload')}
              </button>
              <button
                type="button"
                onClick={onPrint}
                className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={20} />
                {t('remoteSettings.applicationOverviewPrint')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
