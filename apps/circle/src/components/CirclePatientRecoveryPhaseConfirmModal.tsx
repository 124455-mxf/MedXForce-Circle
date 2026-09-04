import {
  LayoutDashboard,
  ListChecks,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCircleT } from '../lib/circleI18nContext';

type CirclePatientRecoveryPhaseConfirmModalProps = {
  open: boolean;
  patientName: string;
  phaseLabel: string;
  appModeLabel: string;
  dashboardLabel: string;
  careTransitionLabel?: string | null;
  saving?: boolean;
  onUpdateTablet: (startCareTransitionPack: boolean) => void;
  onKeepTablet: (startCareTransitionPack: boolean) => void;
  onCancel: () => void;
};

export function CirclePatientRecoveryPhaseConfirmModal({
  open,
  patientName,
  phaseLabel,
  appModeLabel,
  dashboardLabel,
  careTransitionLabel = null,
  saving = false,
  onUpdateTablet,
  onKeepTablet,
  onCancel,
}: CirclePatientRecoveryPhaseConfirmModalProps) {
  const t = useCircleT();
  const [startCareTransition, setStartCareTransition] = useState(true);

  useEffect(() => {
    if (open) setStartCareTransition(true);
  }, [open]);

  if (!open) return null;

  const startPack = Boolean(careTransitionLabel) && startCareTransition;

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
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('profile.recoveryPhaseConfirmSuggested')}
          </p>
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

        {careTransitionLabel ? (
          <label className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
              checked={startCareTransition}
              onChange={(event) => setStartCareTransition(event.target.checked)}
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks size={16} className="text-amber-800 shrink-0" />
                {t('profile.recoveryPhaseConfirmCareTransition')}
              </span>
              <span className="block text-sm text-slate-600 mt-0.5">{careTransitionLabel}</span>
              <span className="block text-xs text-slate-500 mt-1">
                {t('profile.recoveryPhaseConfirmCareTransitionHint')}
              </span>
            </span>
          </label>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onUpdateTablet(startPack)}
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {t('profile.recoveryPhaseConfirmSave')}
          </button>
          <button
            type="button"
            onClick={() => onKeepTablet(startPack)}
            disabled={saving}
            className="w-full py-4 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {t('profile.recoveryPhaseConfirmKeepTablet')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
