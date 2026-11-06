import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { CircleManagedContact } from './circleContactManagement';
import {
  composeContactDisplayName,
  findManagedContactByEmail,
  listPatientManagedContacts,
  normalizeContactDateOfBirth,
  upsertPatientManagedContact,
} from './circleContactManagement';
import {
  circleInviteRefForPatientEmail,
  lookupCircleInviteByPatientEmail,
  type CircleInviteRecord,
} from './circleInvites';
import { normalizeInviteEmail } from './patientPermissions';
import { isFirestoreQuotaError } from './firestoreQuota';

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
      patch.language !== undefined ? patch.language.trim() || 'English' : existing.language || 'English',
    relationship:
      patch.relationship !== undefined
        ? patch.relationship.trim()
        : existing.relationship || '',
    firstName: firstName || '',
    lastName: lastName || '',
    dateOfBirth: dateOfBirth || '',
  };

  await setDoc(
    memberContactProfileRef(db, patientId, memberUid),
    {
      contactProfile: next,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  // Keep legacy member-root profile + displayName aligned for older patient readers.
  try {
    await setDoc(
      memberContactProfileLegacyRef(db, patientId, memberUid),
      {
        contactProfile: next,
        displayName: next.name,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn('[Circle] Legacy member contactProfile sync skipped —', err);
  }

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
    relationship: existing.relationship || '',
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

  // Keep patient caregivers / friends list in sync — Circle UI merges prefs for display,
  // but the patient app reads the managed-contact `name` field directly.
  try {
    await upsertPatientManagedContact(
      db,
      patientId,
      {
        ...merged,
        name: nextProfile.name,
        firstName: nextProfile.firstName,
        lastName: nextProfile.lastName,
        dateOfBirth: nextProfile.dateOfBirth,
        language: nextProfile.language,
        relationship: nextProfile.relationship || existing.relationship,
      },
      {
        syncInvite: false,
        updateAccessIndex: false,
      },
    );
  } catch (err) {
    console.warn('[Circle] Managed contact name sync skipped —', err);
  }

  // displayName is written with contactProfile in writeMemberContactProfile.

  // Keep invite list labels aligned with the composed display name.
  // Never fail the member's contact save if invite lookup/sync is denied.
  try {
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
  } catch (err) {
    console.warn('[Circle] Invite displayName sync skipped —', err);
  }

  return merged;
}

function memberCanWritePatientContactList(
  memberData: Record<string, unknown> | undefined,
  inviteRole: string | undefined,
): boolean {
  const role = String(memberData?.role || inviteRole || '');
  if (role === 'proxy') return true;
  const caps = memberData?.capabilities;
  return (
    !!caps &&
    typeof caps === 'object' &&
    (caps as { inviteMembers?: unknown }).inviteMembers === true
  );
}

/**
 * Heal: copy member contactProfile (first/last name) onto the patient managed-contact
 * row when the patient list still has a stale display name (e.g. email local-part).
 * Only proxies (or invite-capable members) may write the patient contact arrays;
 * caregivers/family/friends only refresh their own member displayName.
 */
export async function syncManagedContactNamesFromMemberProfilesForUser(
  db: Firestore,
  uid: string,
  actorEmail: string,
): Promise<number> {
  const email = normalizeInviteEmail(actorEmail);
  if (!email) return 0;

  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) return 0;

  let synced = 0;
  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId =
      typeof invite.patientId === 'string' ? invite.patientId.trim() : '';
    if (!patientId) continue;

    try {
      const profile = await readMemberContactProfile(db, patientId, uid);
      if (!profile?.name?.trim()) continue;

      const memberRef = doc(db, 'patients', patientId, 'members', uid);
      const memberSnap = await getDoc(memberRef);
      const memberData = memberSnap.exists()
        ? (memberSnap.data() as Record<string, unknown>)
        : undefined;
      const canWritePatientContacts = memberCanWritePatientContactList(
        memberData,
        invite.role,
      );

      if (canWritePatientContacts) {
        const contacts = await listPatientManagedContacts(db, patientId);
        const existing = findManagedContactByEmail(contacts, invite.invitedEmail || email);
        if (existing) {
          const currentName = composeContactDisplayName(existing);
          const sameName = currentName === profile.name;
          const sameParts =
            (existing.firstName || '') === profile.firstName &&
            (existing.lastName || '') === profile.lastName;
          if (!sameName || !sameParts) {
            await upsertPatientManagedContact(
              db,
              patientId,
              {
                ...existing,
                name: profile.name,
                firstName: profile.firstName,
                lastName: profile.lastName,
                dateOfBirth: profile.dateOfBirth || existing.dateOfBirth || '',
                language: profile.language || existing.language,
                relationship: profile.relationship || existing.relationship,
              },
              {
                syncInvite: false,
                updateAccessIndex: false,
              },
            );
            synced += 1;
          }
        }
      }

      const currentDisplayName =
        typeof memberData?.displayName === 'string' ? memberData.displayName.trim() : '';
      if (currentDisplayName !== profile.name) {
        await setDoc(
          memberRef,
          { displayName: profile.name, updatedAt: Date.now() },
          { merge: true },
        );
      }
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        console.warn('[Circle] Contact name heal skipped — Firestore daily write quota exceeded.');
        break;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (/missing or insufficient permissions/i.test(message) || /permission-denied/i.test(message)) {
        continue;
      }
      console.warn('[Circle] Contact name heal skipped for patient', patientId, err);
    }
  }

  return synced;
}
