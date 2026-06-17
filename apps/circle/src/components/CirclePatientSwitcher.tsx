import { ChevronDown, HeartHandshake, X } from 'lucide-react';

import { cn, type CirclePatientSummary } from '@medxforce/shared';

import {
  PatientAvatarPresenceRing,
  PatientPresenceCaption,
} from './PatientPresenceCaption';
import { CirclePatientSwitchList } from './CirclePatientSwitchList';
import { useCirclePatientsAttention } from '../context/CirclePatientsAttentionContext';
import { useCircleT } from '../lib/circleI18nContext';
import { formatCircleBadgeCount } from './CircleCountBadge';

interface CirclePatientSwitcherProps {
  patients: CirclePatientSummary[];
  selected: CirclePatientSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (patient: CirclePatientSummary) => void;
  startupPatientId?: string | null;
  onSetStartupPatient?: (patient: CirclePatientSummary) => void;
  /** Card row with photo (dashboard). Modal-only for settings / embedded switcher. */
  variant?: 'card' | 'modal-only';
  patientOnline?: boolean;
  patientLastSeen?: number;
  memberDisplayName?: string;
}

export function CirclePatientSwitcher({
  patients,
  selected,
  open,
  onOpenChange,
  onSelect,
  startupPatientId = null,
  onSetStartupPatient,
  variant = 'card',
  patientOnline = false,
  patientLastSeen = 0,
  memberDisplayName,
}: CirclePatientSwitcherProps) {
  const t = useCircleT();
  const { otherPatientsSummary } = useCirclePatientsAttention();

  const selectedFromList =
    patients.find((p) => p.patientId === selected.patientId) ?? selected;

  const cardTitle = memberDisplayName
    ? t('common.memberForPatientTitle', {
        member: memberDisplayName,
        patient: selectedFromList.displayName,
      })
    : selectedFromList.displayName;

  const otherAttentionLabel =
    otherPatientsSummary.patientCount === 1
      ? t('drawer.otherPatientNeedsAttention', {
          count: formatCircleBadgeCount(otherPatientsSummary.totalUnread),
        })
      : t('drawer.otherPatientsNeedAttention', {
          count: formatCircleBadgeCount(otherPatientsSummary.totalUnread),
        });

  return (
    <>
      {variant === 'card' && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="flex items-center gap-3 min-w-0 w-full text-left px-2 py-2 rounded-xl hover:bg-white/80 transition-colors"
          aria-label={
            otherPatientsSummary.patientCount > 0 ? otherAttentionLabel : undefined
          }
        >
          <PatientAvatarPresenceRing online={patientOnline}>
            <div
              className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden"
              aria-hidden
            >
              {selectedFromList.photoUrl ? (
                <img
                  src={selectedFromList.photoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <HeartHandshake size={20} className="text-blue-600" />
              )}
            </div>
          </PatientAvatarPresenceRing>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 truncate leading-tight">{cardTitle}</p>
            <PatientPresenceCaption
              online={patientOnline}
              lastSeen={patientLastSeen}
              variant="card"
            />
            {otherPatientsSummary.patientCount > 0 ? (
              <p
                className={cn(
                  'text-[11px] font-semibold mt-0.5 truncate',
                  otherPatientsSummary.hasUrgentAlert ? 'text-red-700' : 'text-amber-700',
                )}
              >
                {otherAttentionLabel}
              </p>
            ) : null}
          </div>

          <ChevronDown size={18} className="text-slate-400 shrink-0" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label={t('common.close')}
            onClick={() => onOpenChange(false)}
          />

          <div className="relative w-full max-w-md bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="font-bold text-slate-800">{t('drawer.switchPatient')}</h2>
                {otherPatientsSummary.patientCount > 0 ? (
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    {otherAttentionLabel}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {patients.length > 1 && onSetStartupPatient ? (
              <p className="px-5 py-2 text-xs text-slate-500 leading-relaxed">
                {t('drawer.setStartupPatientHint')}
              </p>
            ) : null}

            <div className="max-h-[60vh] overflow-y-auto p-3">
              <CirclePatientSwitchList
                patients={patients}
                selectedPatientId={selected.patientId}
                startupPatientId={startupPatientId}
                onSelect={(patient) => {
                  onSelect(patient);
                  onOpenChange(false);
                }}
                onSetStartupPatient={onSetStartupPatient}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
