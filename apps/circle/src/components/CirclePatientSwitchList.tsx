import { useState } from 'react';
import { Check, HeartHandshake, Home, Trash2 } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { translateCircleMemberAccessLabel } from '../lib/adminScreenI18n';
import { cn } from '../lib/utils';
import {
  CirclePatientAttentionIndicator,
} from './CirclePatientAttentionIndicator';
import { useCirclePatientsAttention } from '../context/CirclePatientsAttentionContext';
import { formatCircleBadgeCount } from './CircleCountBadge';

function patientAccountEmail(patient: CirclePatientSummary): string | undefined {
  return patient.claimedLoginEmail || patient.intendedEmail;
}

type CirclePatientSwitchListProps = {
  patients: CirclePatientSummary[];
  selectedPatientId: string;
  startupPatientId?: string | null;
  onSelect: (patient: CirclePatientSummary) => void;
  onSetStartupPatient?: (patient: CirclePatientSummary) => void;
  onCancelPending?: (patient: CirclePatientSummary) => Promise<void>;
};

export function CirclePatientSwitchList({
  patients,
  selectedPatientId,
  startupPatientId = null,
  onSelect,
  onSetStartupPatient,
  onCancelPending,
}: CirclePatientSwitchListProps) {
  const t = useCircleT();
  const { badgesByPatientId } = useCirclePatientsAttention();
  const showStartupControls = patients.length > 1 && !!onSetStartupPatient;
  const [confirmCancel, setConfirmCancel] = useState<CirclePatientSummary | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const proceedCancel = async (patient: CirclePatientSummary) => {
    if (!onCancelPending) return;
    setCancelingId(patient.patientId);
    setCancelError(null);
    try {
      await onCancelPending(patient);
      setConfirmCancel(null);
    } catch (err) {
      console.warn('[CirclePatientSwitchList] cancel pending provision', err);
      setCancelError(t('provision.cancelPendingFailed'));
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <>
      <ul className="space-y-1">
        {patients.map((patient) => {
          const isActive = patient.patientId === selectedPatientId;
          const isStartup = patient.patientId === startupPatientId;
          const badge = badgesByPatientId[patient.patientId];
          const showBadge = !isActive && badge;
          const accountEmail = patientAccountEmail(patient);
          const canCancel = patient.isPendingProvision === true && !!onCancelPending;

          return (
            <li key={patient.patientId}>
              <div
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-2xl transition-colors',
                  isActive
                    ? 'bg-blue-50 border border-blue-200'
                    : showBadge
                      ? 'hover:bg-amber-50/80 border border-amber-100/80 bg-amber-50/40'
                      : 'hover:bg-slate-50 border border-transparent',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(patient)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div
                    className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden"
                    aria-hidden
                  >
                    {patient.photoUrl ? (
                      <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <HeartHandshake size={18} className="text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{patient.displayName}</p>
                    {accountEmail ? (
                      <p className="text-xs text-slate-500 truncate break-all">{accountEmail}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {patient.isPendingProvision
                        ? t('provision.waitingForIpad')
                        : translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier)}
                    </p>
                    {isStartup && showStartupControls ? (
                      <p className="text-[11px] font-medium text-blue-700 mt-0.5">
                        {t('drawer.startupPatient')}
                      </p>
                    ) : null}
                    {showBadge ? (
                      <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                        {badge.hasUrgentAlert
                          ? t('drawer.patientUrgentAttention')
                          : t('drawer.patientUnreadBadge', {
                              count: formatCircleBadgeCount(badge.totalUnread),
                            })}
                      </p>
                    ) : null}
                  </div>
                </button>

                {showBadge ? (
                  <CirclePatientAttentionIndicator badge={badge} size="sm" />
                ) : null}

                {canCancel ? (
                  <button
                    type="button"
                    aria-label={t('provision.cancelPendingAria', { name: patient.displayName })}
                    title={t('provision.cancelPending')}
                    disabled={cancelingId === patient.patientId}
                    onClick={() => {
                      setCancelError(null);
                      setConfirmCancel(patient);
                    }}
                    className="inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                ) : null}

                {showStartupControls ? (
                  isStartup ? (
                    <span
                      className="inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-xl text-blue-600 bg-blue-100/80"
                      title={t('drawer.startupPatient')}
                      aria-label={t('drawer.startupPatient')}
                    >
                      <Home size={16} fill="currentColor" aria-hidden />
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={t('drawer.setStartupPatient', { name: patient.displayName })}
                      title={t('drawer.setStartupPatient', { name: patient.displayName })}
                      onClick={() => onSetStartupPatient(patient)}
                      className="inline-flex shrink-0 items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Home size={16} aria-hidden />
                    </button>
                  )
                ) : null}

                {isActive ? <Check size={20} className="text-blue-600 shrink-0" /> : null}
              </div>
            </li>
          );
        })}
      </ul>

      {cancelError ? (
        <p className="mt-2 px-2 text-sm text-red-600">{cancelError}</p>
      ) : null}

      {confirmCancel ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{t('provision.cancelPendingTitle')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('provision.cancelPendingBody', { name: confirmCancel.displayName })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancel(null)}
                disabled={cancelingId === confirmCancel.patientId}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void proceedCancel(confirmCancel)}
                disabled={cancelingId === confirmCancel.patientId}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold disabled:opacity-50"
              >
                {t('provision.cancelPendingConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
