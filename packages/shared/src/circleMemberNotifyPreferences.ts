import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { CircleManagedContact } from './circleContactManagement';
import { findManagedContactByEmail, listPatientManagedContacts } from './circleContactManagement';

export type CircleMemberNotifyPreferences = {
  alert: boolean;
  attention: boolean;
  message: boolean;
};

export type OwnNotifyPreferencesPatch = {
  message?: boolean;
  alert?: boolean;
  attention?: boolean;
};

export function memberNotifyPreferencesRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export function parseMemberNotifyPreferences(
  data: Record<string, unknown> | undefined,
): CircleMemberNotifyPreferences | null {
  const raw = data?.notifyPreferences;
  if (!raw || typeof raw !== 'object') return null;
  const prefs = raw as Record<string, unknown>;
  return {
    alert: prefs.alert === true,
    attention: prefs.attention === true,
    message: prefs.message === true,
  };
}

export function mergeContactWithMemberNotifyPreferences(
  contact: CircleManagedContact,
  memberPrefs: CircleMemberNotifyPreferences | null,
): CircleManagedContact {
  if (!memberPrefs) return contact;
  return {
    ...contact,
    alert: memberPrefs.alert,
    attention: memberPrefs.attention,
    message: memberPrefs.message,
  };
}

export async function readMemberNotifyPreferences(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleMemberNotifyPreferences | null> {
  const snap = await getDoc(memberNotifyPreferencesRef(db, patientId, memberUid));
  if (!snap.exists()) return null;
  return parseMemberNotifyPreferences(snap.data() as Record<string, unknown>);
}

/** Circle members store notify prefs on their own members/{uid} row (not the patient contact arrays). */
export async function writeMemberNotifyPreferences(
  db: Firestore,
  patientId: string,
  memberUid: string,
  patch: OwnNotifyPreferencesPatch,
  defaults: CircleMemberNotifyPreferences,
): Promise<CircleMemberNotifyPreferences> {
  const snap = await getDoc(memberNotifyPreferencesRef(db, patientId, memberUid));
  const existing = snap.exists()
    ? parseMemberNotifyPreferences(snap.data() as Record<string, unknown>) ?? defaults
    : defaults;

  const next: CircleMemberNotifyPreferences = {
    alert: patch.alert !== undefined ? patch.alert : existing.alert,
    attention: patch.attention !== undefined ? patch.attention : existing.attention,
    message: patch.message !== undefined ? patch.message : existing.message,
  };

  await setDoc(
    memberNotifyPreferencesRef(db, patientId, memberUid),
    {
      notifyPreferences: next,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return next;
}

export async function updateOwnCircleNotifyPreferences(
  db: Firestore,
  patientId: string,
  memberUid: string,
  actorEmail: string,
  patch: OwnNotifyPreferencesPatch,
): Promise<CircleManagedContact> {
  const contacts = await listPatientManagedContacts(db, patientId);
  const existing = findManagedContactByEmail(contacts, actorEmail);
  if (!existing) {
    throw new Error('Your contact record was not found. Ask the patient or proxy to add your email.');
  }

  const hasEmail = !!existing.email.trim();
  const defaults: CircleMemberNotifyPreferences = {
    alert: existing.alert,
    attention: existing.attention,
    message: existing.message,
  };

  const stored = await readMemberNotifyPreferences(db, patientId, memberUid);
  const base = stored ?? defaults;

  const nextPrefs = await writeMemberNotifyPreferences(
    db,
    patientId,
    memberUid,
    {
      ...patch,
      message:
        patch.message !== undefined ? patch.message && hasEmail : undefined,
    },
    base,
  );

  return mergeContactWithMemberNotifyPreferences(existing, nextPrefs);
}
