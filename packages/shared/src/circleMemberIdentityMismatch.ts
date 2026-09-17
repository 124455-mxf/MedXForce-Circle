/** @license SPDX-License-Identifier: Apache-2.0 */
import type { Firestore } from 'firebase/firestore';
import {
  composeContactDisplayName,
  findManagedContactByEmail,
  listPatientManagedContacts,
  normalizeContactDateOfBirth,
} from './circleContactManagement';
import {
  mergeContactWithMemberContactProfile,
  readMemberContactProfile,
} from './circleMemberContactProfile';
import { normalizeInviteEmail } from './patientPermissions';

export type CircleMemberIdentitySnapshot = {
  patientId: string;
  patientName: string;
  firstName: string;
  lastName: string;
  name: string;
  dateOfBirth: string;
};

function normPart(value: string | null | undefined): string {
  return (value || '').trim().toLocaleLowerCase();
}

/** First name, last name, display name, and DOB — not relationship or language. */
export function circleMemberIdentityKey(row: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  dateOfBirth?: string | null;
}): string {
  const firstName = (row.firstName || '').trim();
  const lastName = (row.lastName || '').trim();
  const name = composeContactDisplayName({
    firstName,
    lastName,
    name: row.name,
  });
  return [
    normPart(firstName),
    normPart(lastName),
    normPart(name),
    normalizeContactDateOfBirth(row.dateOfBirth),
  ].join('|');
}

export function circleMemberIdentityFingerprint(rows: CircleMemberIdentitySnapshot[]): string {
  return [...rows]
    .sort((a, b) => a.patientId.localeCompare(b.patientId))
    .map((row) => `${row.patientId}:${circleMemberIdentityKey(row)}`)
    .join(';');
}

export function circleMemberIdentityHasMismatch(rows: CircleMemberIdentitySnapshot[]): boolean {
  if (rows.length < 2) return false;
  const keys = new Set(rows.map((row) => circleMemberIdentityKey(row)));
  return keys.size > 1;
}

export async function loadCircleMemberIdentitySnapshots(
  db: Firestore,
  memberUid: string,
  memberEmail: string,
  patients: Array<{ patientId: string; displayName: string }>,
): Promise<CircleMemberIdentitySnapshot[]> {
  const email = normalizeInviteEmail(memberEmail);
  if (!email || !memberUid) return [];

  const snapshots: CircleMemberIdentitySnapshot[] = [];
  for (const patient of patients) {
    const patientId = patient.patientId?.trim();
    if (!patientId) continue;
    try {
      const listed = await listPatientManagedContacts(db, patientId);
      const base = findManagedContactByEmail(listed, email);
      if (!base) continue;
      const memberProfile = await readMemberContactProfile(db, patientId, memberUid);
      const merged = mergeContactWithMemberContactProfile(base, memberProfile);
      snapshots.push({
        patientId,
        patientName: (patient.displayName || '').trim() || patientId,
        firstName: (merged.firstName || '').trim(),
        lastName: (merged.lastName || '').trim(),
        name: composeContactDisplayName(merged),
        dateOfBirth: normalizeContactDateOfBirth(merged.dateOfBirth),
      });
    } catch (err) {
      console.warn('[Circle] Identity snapshot skipped —', patientId, err);
    }
  }
  return snapshots;
}
