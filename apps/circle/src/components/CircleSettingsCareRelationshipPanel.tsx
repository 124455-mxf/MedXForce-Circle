import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { HeartHandshake, LogOut } from 'lucide-react';
import {
  leaveCircleForPatient,
  type CircleMemberRole,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CircleLeaveCircleConfirmModal } from './CircleLeaveCircleConfirmModal';

const ROLE_LABELS: Record<CircleMemberRole, string> = {
  friend: 'Friend',
  family: 'Family',
  caregiver: 'Caregiver',
  professional_caregiver: 'Professional caregiver',
  proxy: 'Proxy',
  facility_staff: 'Facility staff',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role as CircleMemberRole] ?? role.replace(/_/g, ' ');
}

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError('Could not leave this circle. Try again or contact your loved one.');
        return;
      }
      setConfirmOpen(false);
      await onLeftCircle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave this circle.');
    } finally {
      setBusy(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          Select someone you are caring for on the home screen to manage that relationship.
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
            <h3 className="font-bold text-slate-800">Care relationship</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your role and access for the person you are supporting in MedXForce Circle.
            </p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Caring for
            </p>
            <p className="font-bold text-slate-800">{patient.displayName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Your role
            </p>
            <p className="text-sm font-semibold text-slate-700">{roleLabel(patient.role)}</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Leaving removes your access to their messages and media in Circle. It works the same
            way as when they revoke your access in the patient app.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-red-600 bg-white border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            Leave circle
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
