/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Firestore } from 'firebase/firestore';
import { getCircleUserProfile, saveCircleUserProfile } from '@medxforce/shared';

const STORAGE_PREFIX = 'circle-startup-patient:';

export function startupPatientStorageKey(memberUid: string): string {
  return `${STORAGE_PREFIX}${memberUid}`;
}

/** Fast local cache — used for immediate UI before Firestore resolves. */
export function readStartupPatientId(memberUid: string | undefined): string | null {
  if (!memberUid) return null;
  try {
    const raw = localStorage.getItem(startupPatientStorageKey(memberUid));
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

function writeLocalStartupPatientId(memberUid: string, patientId: string | null): void {
  try {
    const key = startupPatientStorageKey(memberUid);
    if (patientId) localStorage.setItem(key, patientId);
    else localStorage.removeItem(key);
  } catch {
    // ignore quota / private mode
  }
}

/** Load startup patient from Firestore, falling back to local cache. Syncs cache on success. */
export async function loadStartupPatientId(
  db: Firestore,
  memberUid: string | undefined,
): Promise<string | null> {
  if (!memberUid) return null;
  const local = readStartupPatientId(memberUid);
  try {
    const profile = await getCircleUserProfile(db, memberUid);
    const remote = profile?.startupPatientId?.trim() || null;
    if (remote) {
      writeLocalStartupPatientId(memberUid, remote);
      return remote;
    }
    // Profile exists but no remote preference — clear stale local only if we had a profile doc.
    if (profile) {
      if (local) {
        // Migrate existing local-only preference to the cloud once.
        await saveCircleUserProfile(db, memberUid, { startupPatientId: local });
        return local;
      }
      return null;
    }
  } catch {
    /* offline / rules — keep local */
  }
  return local;
}

/** Persist startup patient to Firestore and local cache. */
export async function writeStartupPatientId(
  db: Firestore,
  memberUid: string,
  patientId: string,
): Promise<void> {
  writeLocalStartupPatientId(memberUid, patientId);
  try {
    await saveCircleUserProfile(db, memberUid, { startupPatientId: patientId });
  } catch (err) {
    console.warn('[startupPatient] cloud save failed; kept local preference', err);
  }
}

/** Clear startup patient (e.g. when leaving that patient's circle). */
export async function clearStartupPatientId(
  db: Firestore,
  memberUid: string,
): Promise<void> {
  writeLocalStartupPatientId(memberUid, null);
  try {
    await saveCircleUserProfile(db, memberUid, { startupPatientId: null });
  } catch (err) {
    console.warn('[startupPatient] cloud clear failed; cleared local preference', err);
  }
}
