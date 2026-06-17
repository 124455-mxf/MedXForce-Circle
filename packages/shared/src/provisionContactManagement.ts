import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  buildCircleInviteRecord,
  circleInviteDocId,
  type CircleInviteRecord,
  type CircleInviteStatus,
} from './circleInvites';
import type { CircleInviteListItem } from './circleMemberManagement';
import { buildCircleAccessByEmailIndex, circleMemberRoleFromManagedContact } from './circleMemberRoles';
import {
  ContactConflictError,
  managedContactRecordFingerprint,
  parsePatientManagedContacts,
  readPatientDocUpdatedAt,
  type CircleManagedContact,
} from './circleContactManagement';
import type { CircleInvitePreviewAction, CircleInvitePreviewItem } from './circleInvitePreview';
import {
  capabilitiesForRole,
  normalizeInviteEmail,
  type CircleMemberRole,
} from './patientPermissions';

type ProvisionContactsDocShape = {
  caregivers?: Record<string, unknown>[];
  friendsAndFamily?: Record<string, unknown>[];
  contacts?: Record<string, unknown>[];
  updatedAt?: number;
};

function provisionRef(db: Firestore, provisionId: string) {
  return doc(db, 'patient_provisions', provisionId);
}

function draftInviteRef(db: Firestore, provisionId: string, email: string) {
  return doc(db, 'patient_provisions', provisionId, 'draft_invites', circleInviteDocId(provisionId, email));
}

export async function listProvisionManagedContacts(
  db: Firestore,
  provisionId: string,
): Promise<CircleManagedContact[]> {
  const snap = await getDoc(provisionRef(db, provisionId));
  if (!snap.exists()) return [];
  return parsePatientManagedContacts(snap.data() as ProvisionContactsDocShape);
}

export async function listProvisionDraftInvites(
  db: Firestore,
  provisionId: string,
): Promise<CircleInviteListItem[]> {
  const snap = await getDocs(collection(db, 'patient_provisions', provisionId, 'draft_invites'));
  return snap.docs
    .map((inviteDoc) => {
      const data = inviteDoc.data() as Partial<CircleInviteRecord> & { acceptedByUid?: string };
      const status = (data.status || 'pending') as CircleInviteStatus;
      return {
        id: inviteDoc.id,
        invitedEmail: data.invitedEmail || '',
        displayName: data.displayName,
        role: data.role || 'member',
        proxyTier:
          data.proxyTier === 'backup' || data.proxyTier === 'primary' ? data.proxyTier : undefined,
        status,
        updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
        acceptedByUid: typeof data.acceptedByUid === 'string' ? data.acceptedByUid : undefined,
      };
    })
    .filter((item) => item.invitedEmail)
    .sort((a, b) => {
      const statusOrder = { accepted: 0, pending: 1, revoked: 2 };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return (a.displayName || a.invitedEmail).localeCompare(b.displayName || b.invitedEmail);
    });
}

async function syncProvisionDraftInvite(
  db: Firestore,
  provisionId: string,
  contact: CircleManagedContact,
): Promise<void> {
  const role = circleMemberRoleFromManagedContact(contact);
  const email = normalizeInviteEmail(contact.email);
  if (!role || !email) return;

  const capabilities = capabilitiesForRole(role);
  const proxyTier =
    role === 'proxy' ? (contact.proxyTier === 'backup' ? 'backup' : 'primary') : undefined;

  const ref = draftInviteRef(db, provisionId, email);
  const existing = await getDoc(ref);
  const existingData = existing.exists() ? existing.data() : undefined;
  const existingStatus = existingData?.status as CircleInviteStatus | undefined;

  if (existingStatus === 'revoked') {
    await setDoc(
      ref,
      buildCircleInviteRecord({
        patientId: provisionId,
        invitedEmail: email,
        role,
        capabilities,
        displayName: contact.name,
        contactId: contact.id,
        proxyTier,
      }),
    );
    return;
  }

  await setDoc(
    ref,
    {
      patientId: provisionId,
      invitedEmail: email,
      role,
      capabilities,
      status: existingStatus === 'accepted' ? 'accepted' : 'pending',
      displayName: contact.name || undefined,
      contactId: contact.id,
      ...(proxyTier ? { proxyTier } : {}),
      createdAt: existing.exists
        ? (typeof existingData?.createdAt === 'number' ? existingData.createdAt : Date.now())
        : Date.now(),
      updatedAt: Date.now(),
      ...(existingData?.acceptedByUid ? { acceptedByUid: existingData.acceptedByUid } : {}),
    },
    { merge: true },
  );
}

/** Proxy saves caregivers / family / friends on a pending provision before iPad claim. */
export async function upsertProvisionManagedContact(
  db: Firestore,
  provisionId: string,
  input: Omit<CircleManagedContact, 'id'> & { id?: string },
  options: { expectedContactFingerprint?: string } = {},
): Promise<CircleManagedContact> {
  const snap = await getDoc(provisionRef(db, provisionId));
  if (!snap.exists()) throw new Error('Patient setup record not found.');
  if (String(snap.data()?.status || '') !== 'pending') {
    throw new Error('This patient setup was already linked on an iPad.');
  }

  const data = snap.data() as ProvisionContactsDocShape;
  const remoteUpdatedAt = readPatientDocUpdatedAt(data as Record<string, unknown>);
  const expectedContactFingerprint = options.expectedContactFingerprint?.trim() || '';

  const id = (input.id && input.id.trim()) || `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  if (input.id && expectedContactFingerprint) {
    const remoteContact = parsePatientManagedContacts(data).find((row) => row.id === input.id);
    if (
      remoteContact &&
      managedContactRecordFingerprint(remoteContact) !== expectedContactFingerprint
    ) {
      throw new ContactConflictError();
    }
  }

  const listed = parsePatientManagedContacts(data);
  const normalizedEmail = normalizeInviteEmail(input.email || '');
  const withoutTarget = listed.filter((contact) => {
    if (contact.id === id) return false;
    if (normalizedEmail && normalizeInviteEmail(contact.email) === normalizedEmail) return false;
    return true;
  });

  const next: CircleManagedContact = {
    id,
    name: input.name.trim(),
    email: input.email.trim(),
    mobile: input.mobile.trim(),
    relationship: input.relationship.trim(),
    kind: input.kind,
    language: input.language?.trim() || 'English',
    message: !!input.message,
    sms: !!input.sms,
    alert: !!input.alert,
    attention: !!input.attention,
    ...(input.circleRole ? { circleRole: input.circleRole } : {}),
    ...(input.proxyTier ? { proxyTier: input.proxyTier } : {}),
  };

  const caregivers = withoutTarget.filter((c) => c.kind === 'caregiver').map(toStoredCaregiver);
  const friendsAndFamily = withoutTarget
    .filter((c) => c.kind === 'family' || c.kind === 'friend')
    .map(toStoredFriendsFamily);
  const contacts = withoutTarget.filter((c) => c.kind === 'contact').map(toStoredSimpleContact);

  if (next.kind === 'caregiver') caregivers.push(toStoredCaregiver(next));
  if (next.kind === 'family' || next.kind === 'friend') friendsAndFamily.push(toStoredFriendsFamily(next));
  if (next.kind === 'contact') contacts.push(toStoredSimpleContact(next));

  const circleAccessByEmail = buildCircleAccessByEmailIndex({ caregivers, friendsAndFamily });

  await setDoc(
    provisionRef(db, provisionId),
    {
      caregivers,
      friendsAndFamily,
      contacts,
      circleAccessByEmail,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (normalizedEmail && next.kind !== 'contact') {
    await syncProvisionDraftInvite(db, provisionId, next);
  } else if (normalizedEmail && next.kind === 'contact') {
    await revokeProvisionDraftInviteByEmail(db, provisionId, normalizedEmail);
  }

  void remoteUpdatedAt;
  return next;
}

export async function deleteProvisionManagedContact(
  db: Firestore,
  provisionId: string,
  contact: CircleManagedContact,
): Promise<void> {
  const snap = await getDoc(provisionRef(db, provisionId));
  if (!snap.exists()) throw new Error('Patient setup record not found.');
  const data = snap.data() as ProvisionContactsDocShape;
  const listed = parsePatientManagedContacts(data);
  const normalizedEmail = normalizeInviteEmail(contact.email || '');

  const withoutTarget = listed.filter((row) => row.id !== contact.id);
  const caregivers = withoutTarget.filter((c) => c.kind === 'caregiver').map(toStoredCaregiver);
  const friendsAndFamily = withoutTarget
    .filter((c) => c.kind === 'family' || c.kind === 'friend')
    .map(toStoredFriendsFamily);
  const contacts = withoutTarget.filter((c) => c.kind === 'contact').map(toStoredSimpleContact);

  await setDoc(
    provisionRef(db, provisionId),
    {
      caregivers,
      friendsAndFamily,
      contacts,
      circleAccessByEmail: buildCircleAccessByEmailIndex({ caregivers, friendsAndFamily }),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (normalizedEmail) {
    await revokeProvisionDraftInviteByEmail(db, provisionId, normalizedEmail);
  }
}

export async function revokeProvisionDraftInviteByEmail(
  db: Firestore,
  provisionId: string,
  invitedEmail: string,
): Promise<boolean> {
  const email = normalizeInviteEmail(invitedEmail);
  if (!email) return false;
  const ref = draftInviteRef(db, provisionId, email);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  if (snap.data()?.status === 'revoked') return false;
  await setDoc(ref, { status: 'revoked', updatedAt: Date.now() }, { merge: true });
  return true;
}

function toStoredCaregiver(contact: CircleManagedContact): Record<string, unknown> {
  const circleRole = contact.circleRole ?? 'caregiver';
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    emailVerify: contact.email,
    mobile: contact.mobile,
    mobileVerify: contact.mobile,
    relationship: contact.relationship || 'Other',
    role: 'Admin',
    language: contact.language || 'English',
    alert: contact.alert,
    attention: contact.attention,
    message: contact.message,
    sms: contact.sms,
    circleRole,
    ...(circleRole === 'proxy'
      ? { proxyTier: contact.proxyTier === 'backup' ? 'backup' : 'primary' }
      : {}),
  };
}

function toStoredFriendsFamily(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    emailVerify: contact.email,
    mobile: contact.mobile,
    mobileVerify: contact.mobile,
    relationship: contact.relationship || (contact.kind === 'friend' ? 'Friend' : 'Family'),
    type: contact.kind === 'friend' ? 'Friend' : 'Family',
    language: contact.language || 'English',
    alert: contact.alert,
    attention: contact.attention,
    message: contact.message,
    sms: contact.sms,
    circleRole: contact.circleRole ?? contact.kind,
  };
}

function toStoredSimpleContact(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    mobile: contact.mobile,
    language: contact.language || 'English',
    alert: contact.alert,
    attention: contact.attention,
    message: contact.message,
    sms: contact.sms,
  };
}

export function provisionDraftInviteRoleLabel(role: string, proxyTier?: string): string {
  if (role === 'proxy') return proxyTier === 'backup' ? 'Backup proxy' : 'Primary proxy';
  return role;
}

function isValidInviteEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Preview draft Circle invites before proxy saves a contact on a pending provision. */
export async function previewProvisionManagedContactInviteChange(
  db: Firestore,
  provisionId: string,
  contact: Pick<CircleManagedContact, 'id' | 'name' | 'email' | 'kind' | 'circleRole' | 'proxyTier'>,
  options: { previousEmail?: string } = {},
): Promise<CircleInvitePreviewItem[]> {
  const items: CircleInvitePreviewItem[] = [];
  const email = normalizeInviteEmail(contact.email || '');
  const previousEmail = normalizeInviteEmail(options.previousEmail || '');
  const displayName = contact.name.trim() || email;

  const pushRevokeIfActive = async (targetEmail: string, name: string) => {
    if (!targetEmail) return;
    const ref = draftInviteRef(db, provisionId, targetEmail);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const status = snap.data()?.status as CircleInviteStatus | undefined;
    if (status === 'revoked') return;
    items.push({
      name: name || targetEmail,
      email: targetEmail,
      role: String(snap.data()?.role ?? 'member'),
      action: 'revoke',
    });
  };

  const pushInviteIfNeeded = async (
    targetEmail: string,
    name: string,
    managed: Pick<CircleManagedContact, 'kind' | 'circleRole' | 'proxyTier'>,
  ) => {
    const role = circleMemberRoleFromManagedContact(managed);
    if (!role || !isValidInviteEmail(targetEmail)) return;

    const ref = draftInviteRef(db, provisionId, targetEmail);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      items.push({ name, email: targetEmail, role, action: 'invite' });
      return;
    }
    if (snap.data()?.status === 'revoked') {
      items.push({ name, email: targetEmail, role, action: 'reinvite' });
    }
  };

  if (contact.kind === 'contact') {
    if (email) await pushRevokeIfActive(email, displayName);
    if (previousEmail && previousEmail !== email) {
      await pushRevokeIfActive(previousEmail, displayName);
    }
    return items;
  }

  if (previousEmail && previousEmail !== email) {
    await pushRevokeIfActive(previousEmail, displayName);
  }
  if (email) {
    await pushInviteIfNeeded(email, displayName, contact);
  }
  return items;
}

export async function previewProvisionManagedContactDeleteInviteChange(
  db: Firestore,
  provisionId: string,
  contact: CircleManagedContact,
): Promise<CircleInvitePreviewItem[]> {
  const email = normalizeInviteEmail(contact.email || '');
  if (!email || contact.kind === 'contact') return [];
  const ref = draftInviteRef(db, provisionId, email);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const status = snap.data()?.status as CircleInviteStatus | undefined;
  if (status === 'revoked') return [];
  return [
    {
      name: contact.name.trim() || email,
      email,
      role: String(snap.data()?.role ?? 'member'),
      action: 'revoke',
    },
  ];
}

export async function previewProvisionCircleAccessRevoke(
  db: Firestore,
  provisionId: string,
  invitedEmail: string,
  displayName?: string,
): Promise<CircleInvitePreviewItem[]> {
  const email = normalizeInviteEmail(invitedEmail);
  if (!email) return [];
  const ref = draftInviteRef(db, provisionId, email);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const status = snap.data()?.status as CircleInviteStatus | undefined;
  if (status === 'revoked') return [];
  return [
    {
      name: displayName?.trim() || email,
      email,
      role: String(snap.data()?.role ?? 'member'),
      action: 'revoke' satisfies CircleInvitePreviewAction,
    },
  ];
}

export type { CircleMemberRole };
