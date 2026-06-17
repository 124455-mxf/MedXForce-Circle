const STORAGE_PREFIX = 'circle-startup-patient:';

export function startupPatientStorageKey(memberUid: string): string {
  return `${STORAGE_PREFIX}${memberUid}`;
}

export function readStartupPatientId(memberUid: string | undefined): string | null {
  if (!memberUid) return null;
  try {
    const raw = localStorage.getItem(startupPatientStorageKey(memberUid));
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function writeStartupPatientId(memberUid: string, patientId: string): void {
  try {
    localStorage.setItem(startupPatientStorageKey(memberUid), patientId);
  } catch {
    // ignore quota / private mode
  }
}
