import type { CirclePatientSummary } from '@medxforce/shared';
import { readStartupPatientId } from './circleStartupPatient';

/** Prefer an iPad-linked patient when choosing a default selection. */
export function pickPreferredPatientId(patients: CirclePatientSummary[]): string | null {
  if (patients.length === 0) return null;
  const active = patients.find((p) => !p.isPendingProvision);
  return (active ?? patients[0]).patientId;
}

/** Resolve which patient to open — saved startup preference, then role default. */
export function pickStartupPatientId(
  patients: CirclePatientSummary[],
  memberUid: string | undefined,
): string | null {
  if (patients.length === 0) return null;
  const saved = readStartupPatientId(memberUid);
  if (saved && patients.some((p) => p.patientId === saved)) {
    return saved;
  }
  return pickPreferredPatientId(patients);
}

export function firstActivePatient(
  patients: CirclePatientSummary[],
): CirclePatientSummary | null {
  return patients.find((p) => !p.isPendingProvision) ?? null;
}

export function hasActivePatientBesides(
  patients: CirclePatientSummary[],
  patientId: string,
): boolean {
  return patients.some((p) => p.patientId !== patientId && !p.isPendingProvision);
}
