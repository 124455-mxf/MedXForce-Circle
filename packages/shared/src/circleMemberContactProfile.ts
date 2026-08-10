import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { CircleManagedContact } from './circleContactManagement';
import {
  composeContactDisplayName,
  findManagedContactByEmail,
  listPatientManagedContacts,
  normalizeContactDateOfBirth,
} from './circleContactManagement';
import {
  circleInviteRefForPatientEmail,
  lookupCircleInviteByPatientEmail,
} from './circleInvites';
import { normalizeInviteEmail } from './patientPermissions';

export type CircleMemberContactProfile = {
  name: string;
  language: string;
  relationship: string;
  firstName: string;
  lastName: string;
  /** ISO `YYYY-MM-DD` or empty. */
  dateOfBirth: string;
};

export type OwnContactProfilePatch = {
  name?: string;
  language?: string;
  relationship?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
};

export function memberContactProfileRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid, 'prefs', 'contact');
}

function memberContactProfileLegacyRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export function parseMemberContactProfile(
  data: Record<string, unknown> | undefined,
): CircleMemberContactProfile | null {
  const raw = data?.contactProfile;
  if (!raw || typeof raw !== 'object') return null;
  const profile = raw as Record<string, unknown>;
  const firstName = typeof profile.firstName === 'string' ? profile.firstName.trim() : '';
  const lastName = typeof profile.lastName === 'string' ? profile.lastName.trim() : '';
  const dateOfBirth = normalizeContactDateOfBirth(
    typeof profile.dateOfBirth === 'string' ? profile.dateOfBirth : '',
  );
  const name = composeContactDisplayName({
    firstName,
    lastName,
    name: typeof profile.name === 'string' ? profile.name : '',
  });
  if (!name) return null;
  return {
    name,
    language: typeof profile.language === 'string' && profile.language.trim()
      ? profile.language.trim()
      : 'English',
    relationship: typeof profile.relationship === 'string' ? profile.relationship.trim() : '',
    firstName,
    lastName,
    dateOfBirth,
  };
}

export function mergeContactWithMemberContactProfile(
  contact: CircleManagedContact,
  memberProfile: CircleMemberContactProfile | null,
): CircleManagedContact {
  if (!memberProfile) {
    return {
      ...contact,
      name: composeContactDisplayName(contact),
    };
  }
  const firstName = memberProfile.firstName || contact.firstName;
  const lastName = memberProfile.lastName || contact.lastName;
  const dateOfBirth = memberProfile.dateOfBirth || contact.dateOfBirth;
  return {
    ...contact,
    name: composeContactDisplayName({
      firstName,
      lastName,
      name: memberProfile.name || contact.name,
    }),
    language: memberProfile.language,
    relationship: memberProfile.relationship || contact.relationship,
    firstName,
    lastName,
    dateOfBirth,
  };
}

export async function readMemberContactProfile(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleMemberContactProfile | null> {
  const snap = await getDoc(memberContactProfileRef(db, patientId, memberUid));
  if (snap.exists()) {
    return parseMemberContactProfile(snap.data() as Record<string, unknown>);
  }
  // Legacy: profile lived on the member root doc.
  const legacy = await getDoc(memberContactProfileLegacyRef(db, patientId, memberUid));
  if (!legacy.exists()) return null;
  return parseMemberContactProfile(legacy.data() as Record<string, unknown>);
}

/** Circle members store self-edited profile fields on prefs/contact. */
export async function writeMemberContactProfile(
  db: Firestore,
  patientId: string,
  memberUid: string,
  patch: OwnContactProfilePatch,
  defaults: CircleMemberContactProfile,
): Promise<CircleMemberContactProfile> {
  const existing =
    (await readMemberContactProfile(db, patientId, memberUid)) ?? defaults;

  const firstName =
    patch.firstName !== undefined ? patch.firstName.trim() : existing.firstName;
  const lastName =
    patch.lastName !== undefined ? patch.lastName.trim() : existing.lastName;
  const dateOfBirth =
    patch.dateOfBirth !== undefined
      ? normalizeContactDateOfBirth(patch.dateOfBirth)
      : existing.dateOfBirth;
  const name = composeContactDisplayName({
    firstName,
    lastName,
    name: patch.name !== undefined ? patch.name.trim() : existing.name,
  });
  if (!name) {
    throw new Error('Name is required.');
  }

  const next: CircleMemberContactProfile = {
    name,
    language:
      patch.language !== undefined ? patch.language.trim() || 'English' : existing.language,
    relationship:
      patch.relationship !== undefined ? patch.relationship.trim() : existing.relationship,
    firstName,
    lastName,
    dateOfBirth,
  };

  await setDoc(
    memberContactProfileRef(db, patientId, memberUid),
    {
      contactProfile: next,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  // Keep legacy member-root profile aligned for older patient readers.
  await setDoc(
    memberContactProfileLegacyRef(db, patientId, memberUid),
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
    firstName: existing.firstName || '',
    lastName: existing.lastName || '',
    dateOfBirth: existing.dateOfBirth || '',
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

  const merged = mergeContactWithMemberContactProfile(existing, nextProfile);

  // Keep invite list labels aligned with the composed display name.
  const invite = await lookupCircleInviteByPatientEmail(
    db,
    patientId,
    normalizeInviteEmail(actorEmail),
  );
  if (invite.exists && nextProfile.name) {
    await setDoc(
      circleInviteRefForPatientEmail(
        db,
        patientId,
        normalizeInviteEmail(actorEmail),
        invite.id,
      ),
      {
        displayName: nextProfile.name,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }

  return merged;
}
