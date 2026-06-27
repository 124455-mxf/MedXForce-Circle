import { Languages } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CirclePatientLanguageConfirmModalProps = {
  open: boolean;
  patientName: string;
  languageLabel: string;
  saving?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CirclePatientLanguageConfirmModal({
  open,
  patientName,
  languageLabel,
  saving = false,
  onConfirm,
  onCancel,
}: CirclePatientLanguageConfirmModalProps) {
  const t = useCircleT();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white p-8 rounded-[32px] shadow-2xl max-w-lg w-full space-y-6 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 mx-auto">
          <Languages size={32} />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            {t('profile.patientLanguageConfirmTitle')}
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {t('profile.patientLanguageConfirmDesc', {
              name: patientName,
              language: languageLabel,
            })}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
