import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { CircleManagedContact } from './circleContactManagement';
import { findManagedContactByEmail, listPatientManagedContacts } from './circleContactManagement';

export type CircleMemberContactProfile = {
  name: string;
  language: string;
  relationship: string;
};

export type OwnContactProfilePatch = {
  name?: string;
  language?: string;
  relationship?: string;
};

export function memberContactProfileRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export function parseMemberContactProfile(
  data: Record<string, unknown> | undefined,
): CircleMemberContactProfile | null {
  const raw = data?.contactProfile;
  if (!raw || typeof raw !== 'object') return null;
  const profile = raw as Record<string, unknown>;
  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  if (!name) return null;
  return {
    name,
    language: typeof profile.language === 'string' && profile.language.trim()
      ? profile.language.trim()
      : 'English',
    relationship: typeof profile.relationship === 'string' ? profile.relationship.trim() : '',
  };
}

export function mergeContactWithMemberContactProfile(
  contact: CircleManagedContact,
  memberProfile: CircleMemberContactProfile | null,
): CircleManagedContact {
  if (!memberProfile) return contact;
  return {
    ...contact,
    name: memberProfile.name,
    language: memberProfile.language,
    relationship: memberProfile.relationship || contact.relationship,
  };
}

export async function readMemberContactProfile(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleMemberContactProfile | null> {
  const snap = await getDoc(memberContactProfileRef(db, patientId, memberUid));
  if (!snap.exists()) return null;
  return parseMemberContactProfile(snap.data() as Record<string, unknown>);
}

/** Circle members store self-edited name / language / relationship on members/{uid}. */
export async function writeMemberContactProfile(
  db: Firestore,
  patientId: string,
  memberUid: string,
  patch: OwnContactProfilePatch,
  defaults: CircleMemberContactProfile,
): Promise<CircleMemberContactProfile> {
  const snap = await getDoc(memberContactProfileRef(db, patientId, memberUid));
  const existing = snap.exists()
    ? parseMemberContactProfile(snap.data() as Record<string, unknown>) ?? defaults
    : defaults;

  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!name) {
    throw new Error('Name is required.');
  }

  const next: CircleMemberContactProfile = {
    name,
    language:
      patch.language !== undefined ? patch.language.trim() || 'English' : existing.language,
    relationship:
      patch.relationship !== undefined ? patch.relationship.trim() : existing.relationship,
  };

  await setDoc(
    memberContactProfileRef(db, patientId, memberUid),
    {
      contactProfile: next,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return next;
}

export async function updateOwnCircleContactProfile(
  db: Firestore,
  patientId: string,
  memberUid: string,
  actorEmail: string,
  patch: OwnContactProfilePatch,
): Promise<CircleManagedContact> {
  const contacts = await listPatientManagedContacts(db, patientId);
  const existing = findManagedContactByEmail(contacts, actorEmail);
  if (!existing) {
    throw new Error('Your contact record was not found. Ask the patient or proxy to add your email.');
  }

  const defaults: CircleMemberContactProfile = {
    name: existing.name,
    language: existing.language || 'English',
    relationship: existing.relationship,
  };

  const stored = await readMemberContactProfile(db, patientId, memberUid);
  const base = stored ?? defaults;

  let relationship = base.relationship;
  if (
    patch.relationship !== undefined &&
    (existing.kind === 'caregiver' || existing.kind === 'family')
  ) {
    relationship = patch.relationship.trim() || base.relationship;
  }

  const nextProfile = await writeMemberContactProfile(
    db,
    patientId,
    memberUid,
    {
      ...patch,
      relationship: patch.relationship !== undefined ? relationship : undefined,
    },
    base,
  );

  return mergeContactWithMemberContactProfile(existing, nextProfile);
}
