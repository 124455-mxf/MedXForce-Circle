import { LayoutDashboard, Shield, Stethoscope } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CirclePatientRecoveryPhaseConfirmModalProps = {
  open: boolean;
  patientName: string;
  phaseLabel: string;
  appModeLabel: string;
  dashboardLabel: string;
  saving?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CirclePatientRecoveryPhaseConfirmModal({
  open,
  patientName,
  phaseLabel,
  appModeLabel,
  dashboardLabel,
  saving = false,
  onConfirm,
  onCancel,
}: CirclePatientRecoveryPhaseConfirmModalProps) {
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
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
          <Stethoscope size={32} />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">
            {t('profile.recoveryPhaseConfirmTitle')}
          </h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            {t('profile.recoveryPhaseConfirmDesc', {
              name: patientName,
              phase: phaseLabel,
            })}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('profile.recoveryPhaseConfirmAppMode')}
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{appModeLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <LayoutDashboard size={18} className="text-violet-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('profile.recoveryPhaseConfirmDashboard')}
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{dashboardLabel}</p>
            </div>
          </div>
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
            {t('profile.recoveryPhaseConfirmSave')}
          </button>
        </div>
      </div>
    </div>
  );
}
