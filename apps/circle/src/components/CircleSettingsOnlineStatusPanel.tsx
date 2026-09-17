import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Radio } from 'lucide-react';
import { useCircleOnlineVisibility } from '../hooks/useCircleOnlineVisibility';
import { useCircleT } from '../lib/circleI18nContext';
import type { CirclePatientSummary } from '@medxforce/shared';

type CircleSettingsOnlineStatusPanelProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
};

export function CircleSettingsOnlineStatusPanel({
  user,
  db,
  patient,
}: CircleSettingsOnlineStatusPanelProps) {
  const t = useCircleT();
  const {
    hideOnlineStatusFromPatient,
    loading,
    saving,
    updateHideOnlineStatusFromPatient,
  } = useCircleOnlineVisibility(db, user.uid, patient?.patientId);

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <Radio size={22} />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-800">{t('drawer.onlineStatus')}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('settings.onlineStatusPanelSubtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{t('common.aria.hideMyOnlineStatus')}</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('settings.careRelationshipHideOnlineDesc')}
          </p>
        </div>
        <button
          type="button"
          disabled={loading || saving}
          onClick={() => void updateHideOnlineStatusFromPatient(!hideOnlineStatusFromPatient)}
          className={`w-14 h-8 rounded-full transition-all duration-300 relative shrink-0 disabled:opacity-50 ${
            hideOnlineStatusFromPatient ? 'bg-blue-600' : 'bg-slate-300'
          }`}
          aria-pressed={hideOnlineStatusFromPatient}
          aria-label={t('common.aria.hideMyOnlineStatus')}
        >
          <span
            className={`absolute top-1 left-0 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
              hideOnlineStatusFromPatient ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
