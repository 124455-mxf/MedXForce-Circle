import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { HeartHandshake, LogOut } from 'lucide-react';
import { leaveCircleForPatient, type CirclePatientSummary } from '@medxforce/shared';
import { useCircleOnlineVisibility } from '../hooks/useCircleOnlineVisibility';
import { CircleLeaveCircleConfirmModal } from './CircleLeaveCircleConfirmModal';
import { useCircleT } from '../lib/circleI18nContext';
import { translateCircleMemberAccessLabel } from '../lib/adminScreenI18n';

interface CircleSettingsCareRelationshipPanelProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
  onLeftCircle: () => void | Promise<void>;
}

export function CircleSettingsCareRelationshipPanel({
  user,
  db,
  patient,
  onLeftCircle,
}: CircleSettingsCareRelationshipPanelProps) {
  const t = useCircleT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    hideOnlineStatusFromPatient,
    loading: visibilityLoading,
    saving: visibilitySaving,
    updateHideOnlineStatusFromPatient,
  } = useCircleOnlineVisibility(db, user.uid, patient?.patientId);

  const handleLeave = async () => {
    if (!patient) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await leaveCircleForPatient(db, {
        uid: user.uid,
        patientId: patient.patientId,
        email: user.email || '',
      });
      if (!ok) {
        setError(t('settings.careRelationshipLeaveFailed'));
        return;
      }
      setConfirmOpen(false);
      await onLeftCircle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('settings.careRelationshipLeaveFailedGeneric'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          {t('settings.notificationsNoPatient')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <HeartHandshake size={22} />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="font-bold text-slate-800">{t('drawer.careRelationship')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('settings.careRelationshipPanelSubtitle')}
            </p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
          <div>
            <p className="font-bold text-slate-800">{patient.displayName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              {t('settings.careRelationshipYourRole')}
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier)}
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-100">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">
                {t('common.aria.hideMyOnlineStatus')}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('settings.careRelationshipHideOnlineDesc')}
              </p>
            </div>
            <button
              type="button"
              disabled={visibilityLoading || visibilitySaving}
              onClick={() =>
                void updateHideOnlineStatusFromPatient(!hideOnlineStatusFromPatient)
              }
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
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('settings.careRelationshipLeaveHint')}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-red-600 bg-white border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            {t('settings.careRelationshipLeaveButton')}
          </button>
        </div>
      </div>

      <CircleLeaveCircleConfirmModal
        open={confirmOpen}
        patientName={patient.displayName}
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={() => void handleLeave()}
      />
    </>
  );
}
