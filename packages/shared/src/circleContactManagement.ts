import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  circleInviteRefForPatientEmail,
  lookupCircleInviteByPatientEmail,
  type CircleInviteStatus,
} from './circleInvites';
import {
  capabilitiesForRole,
  normalizeInviteEmail,
  type CircleMemberRole,
  type PatientCapabilities,
} from './patientPermissions';
import { revokeCircleInviteByEmail } from './circleMemberManagement';
import {
  buildCircleAccessByEmailIndex,
  circleMemberRoleFromManagedContact,
  proxyTierFromContact,
  roleFromCaregiverContact,
  roleFromFriendsAndFamilyContact,
} from './circleMemberRoles';

export type CircleContactKind = 'caregiver' | 'family' | 'friend' | 'contact';

export interface CircleManagedContact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  relationship: string;
  kind: CircleContactKind;
  circleRole?: CircleMemberRole;
  proxyTier?: 'primary' | 'backup';
  language: string;
  message: boolean;
  sms: boolean;
  alert: boolean;
  attention: boolean;
  /** Set when the patient app verifies the contact email (OTP). */
  isEmailVerified?: boolean;
  /** Set when a messaging-only contact notification email was sent. */
  contactAddedEmailSentAt?: number;
}

interface PatientContactsDocShape {
  caregivers?: Record<string, unknown>[];
  friendsAndFamily?: Record<string, unknown>[];
  contacts?: Record<string, unknown>[];
  updatedAt?: number;
}

export class ContactConflictError extends Error {
  constructor(message = 'This person was updated elsewhere. Refresh and try again.') {
    super(message);
    this.name = 'ContactConflictError';
  }
}

export class DuplicateContactEmailError extends Error {
  readonly existingContactName: string;
  readonly email: string;

  constructor(existingContactName: string, email: string) {
    super(
      existingContactName.trim()
        ? `This email is already used by ${existingContactName.trim()}. Edit that person instead.`
        : `This email is already on another contact (${email}). Edit that person instead.`,
    );
    this.name = 'DuplicateContactEmailError';
    this.existingContactName = existingContactName.trim();
    this.email = email;
  }
}

export function readPatientDocUpdatedAt(data: Record<string, unknown> | undefined): number {
  const value = data?.updatedAt;
  return typeof value === 'number' && value > 0 ? value : 0;
}

/** Fingerprint of a contact row on patients/{id} — for edit conflict detection. */
export function managedContactRecordFingerprint(contact: CircleManagedContact): string {
  return JSON.stringify({
    id: contact.id,
    name: (contact.name || '').trim(),
    email: normalizeInviteEmail(contact.email || ''),
    mobile: (contact.mobile || '').trim(),
    relationship: (contact.relationship || '').trim(),
    kind: contact.kind,
    language: (contact.language || 'English').trim(),
    message: !!contact.message,
    sms: !!contact.sms,
    alert: !!contact.alert,
    attention: !!contact.attention,
    circleRole: contact.circleRole ?? '',
    proxyTier: contact.proxyTier ?? '',
  });
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function readString(contact: Record<string, unknown>, key: string): string {
  const value = contact[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase();
}

function legacyContactKey(kind: CircleContactKind, parts: string[]): string {
  return [kind, ...parts.map(normalizeKeyPart)].join('|');
}

function normalizedRelationshipForKind(
  kind: CircleContactKind,
  contact: Record<string, unknown>,
): string {
  const relationship = readString(contact, 'relationship');
  const type = readString(contact, 'type');
  if (kind === 'caregiver') return relationship || type || 'Other';
  if (kind === 'family') return relationship || type || 'Family';
  if (kind === 'friend') return relationship || type || 'Friend';
  return '';
}

function legacyKeyFromCaregiverRecord(contact: Record<string, unknown>): string {
  return legacyContactKey('caregiver', [
    readString(contact, 'name'),
    readString(contact, 'email'),
    readString(contact, 'mobile'),
    normalizedRelationshipForKind('caregiver', contact),
  ]);
}

function legacyKeyFromFriendsFamilyRecord(contact: Record<string, unknown>): string {
  const kind = contactKindFromFriendsFamily(contact);
  return legacyContactKey(kind, [
    readString(contact, 'name'),
    readString(contact, 'email'),
    readString(contact, 'mobile'),
    normalizedRelationshipForKind(kind, contact),
  ]);
}

function legacyKeyFromSimpleRecord(contact: Record<string, unknown>): string {
  return legacyContactKey('contact', [
    readString(contact, 'name'),
    readString(contact, 'email'),
    readString(contact, 'mobile'),
  ]);
}

function legacyKeyFromManagedContact(contact: CircleManagedContact): string {
  return legacyContactKey(contact.kind, [
    contact.name,
    contact.email,
    contact.mobile,
    contact.kind === 'contact' ? '' : contact.relationship,
  ]);
}

function readEmailVerified(contact: Record<string, unknown>): boolean {
  return contact.isEmailVerified === true;
}

function readContactAddedEmailSentAt(contact: Record<string, unknown>): number | undefined {
  const value = contact.contactAddedEmailSentAt;
  return typeof value === 'number' && value > 0 ? value : undefined;
}

function readOptionalBool(contact: Record<string, unknown>, key: string): boolean | undefined {
  const value = contact[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === '1') return true;
    if (v === '0') return false;
  }
  return undefined;
}

function notifyDefaultsForKind(kind: CircleContactKind): Pick<
  CircleManagedContact,
  'language' | 'message' | 'sms' | 'alert' | 'attention'
> {
  // Mirror patient-app semantics.
  if (kind === 'contact') {
    return {
      language: 'English',
      message: true,
      sms: false,
      alert: false,
      attention: false,
    };
  }

  return {
    language: 'English',
    message: true,
    sms: true,
    alert: true,
    attention: true,
  };
}

function contactKindFromFriendsFamily(contact: Record<string, unknown>): CircleContactKind {
  const type = readString(contact, 'type').toLowerCase();
  const role = readString(contact, 'circleRole').toLowerCase();
  if (role === 'friend' || type.includes('friend')) return 'friend';
  return 'family';
}

function mapCaregiver(contact: Record<string, unknown>): CircleManagedContact {
  const defaults = notifyDefaultsForKind('caregiver');
  const existingId = readString(contact, 'id');
  const circleRole = roleFromCaregiverContact(contact);
  const tier = proxyTierFromContact(contact);
  return {
    id: existingId || `legacy_${legacyKeyFromCaregiverRecord(contact)}`,
    name: readString(contact, 'name'),
    email: readString(contact, 'email'),
    mobile: readString(contact, 'mobile'),
    relationship: readString(contact, 'relationship') || readString(contact, 'type') || 'Other',
    kind: 'caregiver',
    circleRole,
    ...(tier ? { proxyTier: tier } : {}),
    language: readString(contact, 'language') || defaults.language,
    message: readOptionalBool(contact, 'message') ?? defaults.message,
    sms: readOptionalBool(contact, 'sms') ?? defaults.sms,
    alert: readOptionalBool(contact, 'alert') ?? defaults.alert,
    attention: readOptionalBool(contact, 'attention') ?? defaults.attention,
    isEmailVerified: readEmailVerified(contact),
  };
}

function mapFriendsFamily(contact: Record<string, unknown>): CircleManagedContact {
  const circleRole = roleFromFriendsAndFamilyContact(contact);
  const kind = circleRole === 'proxy' ? 'family' : contactKindFromFriendsFamily(contact);
  const defaults = notifyDefaultsForKind(kind);
  const existingId = readString(contact, 'id');
  const tier = proxyTierFromContact(contact);
  return {
    id: existingId || `legacy_${legacyKeyFromFriendsFamilyRecord(contact)}`,
    name: readString(contact, 'name'),
    email: readString(contact, 'email'),
    mobile: readString(contact, 'mobile'),
    relationship:
      readString(contact, 'relationship') || readString(contact, 'type') || (kind === 'friend' ? 'Friend' : 'Family'),
    kind,
    circleRole,
    ...(tier ? { proxyTier: tier } : {}),
    language: readString(contact, 'language') || defaults.language,
    message: readOptionalBool(contact, 'message') ?? defaults.message,
    sms: readOptionalBool(contact, 'sms') ?? defaults.sms,
    alert: readOptionalBool(contact, 'alert') ?? defaults.alert,
    attention: readOptionalBool(contact, 'attention') ?? defaults.attention,
    isEmailVerified: readEmailVerified(contact),
  };
}

function mapSimpleContact(contact: Record<string, unknown>): CircleManagedContact {
  const defaults = notifyDefaultsForKind('contact');
  const existingId = readString(contact, 'id');
  return {
    id: existingId || `legacy_${legacyKeyFromSimpleRecord(contact)}`,
    name: readString(contact, 'name'),
    email: readString(contact, 'email'),
    mobile: readString(contact, 'mobile'),
    relationship: '',
    kind: 'contact',
    language: readString(contact, 'language') || defaults.language,
    message: readOptionalBool(contact, 'message') ?? defaults.message,
    sms: readOptionalBool(contact, 'sms') ?? defaults.sms,
    alert: readOptionalBool(contact, 'alert') ?? defaults.alert,
    attention: readOptionalBool(contact, 'attention') ?? defaults.attention,
    isEmailVerified: readEmailVerified(contact),
    contactAddedEmailSentAt: readContactAddedEmailSentAt(contact),
  };
}

function hasVisibleContactIdentity(contact: CircleManagedContact): boolean {
  return Boolean(contact.name.trim() || contact.email.trim() || contact.mobile.trim());
}

function roleFromKind(kind: CircleContactKind): CircleMemberRole | null {
  return circleMemberRoleFromManagedContact({ kind });
}

function toCaregiverRecord(contact: CircleManagedContact): Record<string, unknown> {
  const circleRole = contact.circleRole || 'caregiver';
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    emailVerify: contact.email,
    isEmailVerified: contact.isEmailVerified === true,
    mobile: contact.mobile,
    relationship: contact.relationship || 'Other',
    circleRole,
    ...(circleRole === 'proxy' && contact.proxyTier ? { proxyTier: contact.proxyTier } : {}),
    language: contact.language || 'English',
    alert: !!contact.alert,
    attention: !!contact.attention,
    message: !!contact.message,
    sms: !!contact.sms,
  };
}

function toFriendsFamilyRecord(contact: CircleManagedContact): Record<string, unknown> {
  const isFriend = contact.kind === 'friend' && contact.circleRole !== 'proxy';
  const circleRole = contact.circleRole || (isFriend ? 'friend' : 'family');
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    emailVerify: contact.email,
    isEmailVerified: contact.isEmailVerified === true,
    mobile: contact.mobile,
    relationship: contact.relationship || (isFriend ? 'Friend' : 'Family'),
    type: isFriend ? 'Friend' : 'Family',
    circleRole,
    ...(circleRole === 'proxy' && contact.proxyTier ? { proxyTier: contact.proxyTier } : {}),
    language: contact.language || 'English',
    alert: !!contact.alert,
    attention: !!contact.attention,
    message: !!contact.message,
    sms: !!contact.sms,
  };
}

function toSimpleContactRecord(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    mobile: contact.mobile,
    language: contact.language || 'English',
    alert: !!contact.alert,
    attention: !!contact.attention,
    message: !!contact.message,
    sms: !!contact.sms,
    ...(contact.isEmailVerified ? { isEmailVerified: true } : {}),
    ...(contact.contactAddedEmailSentAt
      ? { contactAddedEmailSentAt: contact.contactAddedEmailSentAt }
      : {}),
  };
}

function inviteAccessUnchanged(
  existing: Record<string, unknown> | undefined,
  role: CircleMemberRole,
  capabilities: PatientCapabilities,
  proxyTier: 'primary' | 'backup' | undefined,
): boolean {
  if (!existing) return false;
  if (existing.role !== role) return false;
  if (role === 'proxy' && existing.proxyTier !== proxyTier) return false;
  const stored = existing.capabilities;
  if (!stored || typeof stored !== 'object') return false;
  const storedCaps = stored as Partial<PatientCapabilities>;
  return (
    !!storedCaps.inviteMembers === !!capabilities.inviteMembers &&
    !!storedCaps.messaging === !!capabilities.messaging &&
    !!storedCaps.remoteSettings === !!capabilities.remoteSettings &&
    !!storedCaps.viewClinicalData === !!capabilities.viewClinicalData
  );
}

async function syncMemberContactProfileFromManagedContact(
  db: Firestore,
  patientId: string,
  contact: CircleManagedContact,
): Promise<void> {
  const email = normalizeInviteEmail(contact.email || '');
  if (!email) return;

  const invite = await lookupCircleInviteByPatientEmail(db, patientId, email);
  if (!invite.exists) return;
  const data = invite.data;
  if (data?.status !== 'accepted') return;

  const uid = typeof data.acceptedByUid === 'string' ? data.acceptedByUid.trim() : '';
  if (!uid) return;

  const name = contact.name.trim();
  if (!name) return;

  await setDoc(
    doc(db, 'patients', patientId, 'members', uid),
    {
      contactProfile: {
        name,
        language: contact.language?.trim() || 'English',
        relationship: contact.relationship.trim(),
      },
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

async function syncInviteForCircleRoleContact(
  db: Firestore,
  patientId: string,
  contact: CircleManagedContact,
): Promise<void> {
  const role = circleMemberRoleFromManagedContact(contact);
  const email = normalizeInviteEmail(contact.email);
  if (!role || !email) return;

  const capabilities = capabilitiesForRole(role);
  const proxyTier =
    role === 'proxy' ? (contact.proxyTier === 'backup' ? 'backup' : 'primary') : undefined;

  const existing = await lookupCircleInviteByPatientEmail(db, patientId, email);
  const existingData = existing.exists ? existing.data : undefined;
  const existingStatus = existingData?.status as CircleInviteStatus | undefined;
  const inviteRef = circleInviteRefForPatientEmail(
    db,
    patientId,
    email,
    existing.exists ? existing.id : undefined,
  );
  const accessUnchanged = inviteAccessUnchanged(existingData, role, capabilities, proxyTier);

  const invitePatch: Record<string, unknown> = {
    displayName: contact.name || undefined,
    contactId: contact.id,
    updatedAt: Date.now(),
  };
  if (!accessUnchanged) {
    invitePatch.role = role;
    invitePatch.capabilities = capabilities;
    if (proxyTier) invitePatch.proxyTier = proxyTier;
  }

  if (existingStatus === 'accepted') {
    await setDoc(inviteRef, invitePatch, { merge: true });

    if (!accessUnchanged) {
      const acceptedByUid = existingData?.acceptedByUid;
      if (typeof acceptedByUid === 'string' && acceptedByUid.trim()) {
        await setDoc(
          doc(db, 'patients', patientId, 'members', acceptedByUid.trim()),
          {
            role,
            capabilities,
            ...(proxyTier ? { proxyTier } : {}),
            updatedAt: Date.now(),
          },
          { merge: true },
        );
      }
    }
    return;
  }

  await setDoc(
    inviteRef,
    {
      patientId,
      invitedEmail: email,
      status: 'pending',
      createdAt: existing.exists ? existingData?.createdAt ?? Date.now() : Date.now(),
      ...invitePatch,
    },
    { merge: true },
  );
}

export function parsePatientManagedContacts(
  data: PatientContactsDocShape | Record<string, unknown> | undefined,
): CircleManagedContact[] {
  if (!data) return [];
  const shape = data as PatientContactsDocShape;
  const caregivers = asArray(shape.caregivers).map(mapCaregiver);
  const friendsFamily = asArray(shape.friendsAndFamily).map(mapFriendsFamily);
  const contacts = asArray(shape.contacts).map(mapSimpleContact);

  return [...caregivers, ...friendsFamily, ...contacts]
    .filter(hasVisibleContactIdentity)
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

export async function listPatientManagedContacts(
  db: Firestore,
  patientId: string,
): Promise<CircleManagedContact[]> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) return [];
  return parsePatientManagedContacts(snap.data() as PatientContactsDocShape);
}

export async function upsertPatientManagedContact(
  db: Firestore,
  patientId: string,
  input: Omit<CircleManagedContact, 'id'> & { id?: string },
  options: {
    expectedPatientUpdatedAt?: number;
    /** Prefer contact-row fingerprint — avoids false conflicts when unrelated patient fields change. */
    expectedContactFingerprint?: string;
    syncInvite?: boolean;
    /** Proxy contact saves rebuild the index; member self-service edits must not. */
    updateAccessIndex?: boolean;
  } = {},
): Promise<CircleManagedContact> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) throw new Error('Patient record not found.');

  const data = snap.data() as PatientContactsDocShape;
  const remoteUpdatedAt = readPatientDocUpdatedAt(data as Record<string, unknown>);
  const expected = options.expectedPatientUpdatedAt ?? 0;
  const expectedContactFingerprint = options.expectedContactFingerprint?.trim() || '';

  if (input.id && expectedContactFingerprint) {
    const remoteContact = parsePatientManagedContacts(data).find((row) => row.id === input.id);
    if (
      remoteContact &&
      managedContactRecordFingerprint(remoteContact) !== expectedContactFingerprint
    ) {
      throw new ContactConflictError();
    }
  } else if (expected > 0 && remoteUpdatedAt > expected) {
    throw new ContactConflictError();
  }
  const caregivers = asArray(data.caregivers).map((x) => ({ ...x }));
  const friendsAndFamily = asArray(data.friendsAndFamily).map((x) => ({ ...x }));
  const contacts = asArray(data.contacts).map((x) => ({ ...x }));

  const id = (input.id && input.id.trim()) || `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const normalizedEmail = normalizeInviteEmail(input.email || '');
  const requestedId = (input.id && input.id.trim()) || '';

  if (normalizedEmail) {
    const emailOwner = parsePatientManagedContacts(data).find(
      (contact) => normalizeInviteEmail(contact.email) === normalizedEmail,
    );
    if (emailOwner && emailOwner.id !== requestedId) {
      throw new DuplicateContactEmailError(emailOwner.name, normalizedEmail);
    }
  }

  const inputLegacyKey = legacyKeyFromManagedContact({
    id,
    name: input.name,
    email: input.email,
    mobile: input.mobile,
    relationship: input.relationship,
    kind: input.kind,
    language: input.language || 'English',
    message: !!input.message,
    sms: !!input.sms,
    alert: !!input.alert,
    attention: !!input.attention,
  });

  const removeFromList = (list: Record<string, unknown>[], listKind: CircleContactKind) =>
    list.filter((item) => {
      const itemId = readString(item, 'id');
      const itemEmail = normalizeInviteEmail(readString(item, 'email'));
      if (itemId && itemId === id) return false;
      if (normalizedEmail && itemEmail === normalizedEmail) return false;
      if (!itemId && !normalizedEmail) {
        const itemKind =
          listKind === 'family' || listKind === 'friend'
            ? contactKindFromFriendsFamily(item)
            : listKind;
        const itemLegacyKey = legacyContactKey(itemKind, [
          readString(item, 'name'),
          readString(item, 'email'),
          readString(item, 'mobile'),
          normalizedRelationshipForKind(itemKind, item),
        ]);
        if (itemLegacyKey === inputLegacyKey) return false;
      }
      return true;
    });

  const existingManaged = parsePatientManagedContacts(data).find((contact) => {
    if (id && contact.id === id) return true;
    return normalizedEmail && normalizeInviteEmail(contact.email) === normalizedEmail;
  });

  const nextCaregivers = removeFromList(caregivers, 'caregiver');
  const nextFriendsAndFamily = removeFromList(friendsAndFamily, 'family');
  const nextContacts = removeFromList(contacts, 'contact');

  const circleRole = input.circleRole ?? existingManaged?.circleRole;
  const proxyTier =
    circleRole === 'proxy'
      ? input.proxyTier ?? existingManaged?.proxyTier ?? 'primary'
      : undefined;

  const existingRaw = [...caregivers, ...friendsAndFamily, ...contacts].find((item) => {
    const itemId = readString(item, 'id');
    if (id && itemId === id) return true;
    return normalizedEmail && normalizeInviteEmail(readString(item, 'email')) === normalizedEmail;
  });
  const emailUnchanged =
    !!existingRaw &&
    normalizeInviteEmail(readString(existingRaw, 'email')) === normalizedEmail;
  const isEmailVerified = emailUnchanged && readEmailVerified(existingRaw ?? {});
  const contactAddedEmailSentAt = emailUnchanged
    ? (input.contactAddedEmailSentAt ??
      existingManaged?.contactAddedEmailSentAt ??
      readContactAddedEmailSentAt(existingRaw ?? {}))
    : input.contactAddedEmailSentAt;

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
    isEmailVerified,
    ...(contactAddedEmailSentAt ? { contactAddedEmailSentAt } : {}),
    ...(circleRole ? { circleRole } : {}),
    ...(proxyTier ? { proxyTier } : {}),
  };

  if (input.kind === 'caregiver') nextCaregivers.push(toCaregiverRecord(next));
  if (input.kind === 'family' || input.kind === 'friend') {
    nextFriendsAndFamily.push(toFriendsFamilyRecord(next));
  }
  if (input.kind === 'contact') nextContacts.push(toSimpleContactRecord(next));

  const shouldUpdateAccessIndex = options.updateAccessIndex !== false;
  const circleAccessByEmail = shouldUpdateAccessIndex
    ? buildCircleAccessByEmailIndex({
        caregivers: nextCaregivers,
        friendsAndFamily: nextFriendsAndFamily,
      })
    : undefined;

  try {
    await setDoc(
      doc(db, 'patients', patientId),
      {
        caregivers: nextCaregivers,
        friendsAndFamily: nextFriendsAndFamily,
        contacts: nextContacts,
        ...(circleAccessByEmail ? { circleAccessByEmail } : {}),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not save contact list: ${message}`);
  }

  const syncInvite = options.syncInvite !== false;

  try {
    if (syncInvite && normalizedEmail && input.kind !== 'contact') {
      await syncInviteForCircleRoleContact(db, patientId, next);
      await syncMemberContactProfileFromManagedContact(db, patientId, next);
    } else if (syncInvite && normalizedEmail && input.kind === 'contact') {
      await revokeCircleInviteByEmail(db, patientId, normalizedEmail);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Contact saved, but Circle access sync failed: ${message}`);
  }

  return next;
}

export function findManagedContactByEmail(
  contacts: CircleManagedContact[],
  actorEmail: string,
): CircleManagedContact | undefined {
  const normalized = normalizeInviteEmail(actorEmail);
  if (!normalized) return undefined;
  return contacts.find((contact) => normalizeInviteEmail(contact.email) === normalized);
}

export async function deletePatientManagedContact(
  db: Firestore,
  patientId: string,
  contact: CircleManagedContact,
): Promise<void> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) throw new Error('Patient record not found.');
  const data = snap.data() as PatientContactsDocShape;

  const id = contact.id.trim();
  const normalizedEmail = normalizeInviteEmail(contact.email || '');
  const contactLegacyKey = legacyKeyFromManagedContact(contact);

  const listKindForItem = (item: Record<string, unknown>, listKind: CircleContactKind): CircleContactKind => {
    if (listKind === 'family' || listKind === 'friend') return contactKindFromFriendsFamily(item);
    return listKind;
  };

  const legacyKeyForItem = (item: Record<string, unknown>, listKind: CircleContactKind): string => {
    const itemKind = listKindForItem(item, listKind);
    return legacyContactKey(itemKind, [
      readString(item, 'name'),
      readString(item, 'email'),
      readString(item, 'mobile'),
      itemKind === 'contact' ? '' : normalizedRelationshipForKind(itemKind, item),
    ]);
  };

  const removeFromList = (list: Record<string, unknown>[]) =>
    list.filter((item) => {
      const itemId = readString(item, 'id');
      const itemEmail = normalizeInviteEmail(readString(item, 'email'));
      if (id && itemId === id) return false;
      if (normalizedEmail && itemEmail === normalizedEmail) return false;
      return true;
    });

  const nextCaregivers = removeFromList(asArray(data.caregivers)).filter(
    (item) =>
      !(
        contact.kind === 'caregiver' &&
        !readString(item, 'id') &&
        !normalizeInviteEmail(readString(item, 'email')) &&
        legacyKeyForItem(item, 'caregiver') === contactLegacyKey
      ),
  );
  const nextFriendsAndFamily = removeFromList(asArray(data.friendsAndFamily)).filter(
    (item) =>
      !(
        (contact.kind === 'family' || contact.kind === 'friend') &&
        !readString(item, 'id') &&
        !normalizeInviteEmail(readString(item, 'email')) &&
        legacyKeyForItem(item, 'family') === contactLegacyKey
      ),
  );
  const nextContacts = removeFromList(asArray(data.contacts)).filter(
    (item) =>
      !(
        contact.kind === 'contact' &&
        !readString(item, 'id') &&
        !normalizeInviteEmail(readString(item, 'email')) &&
        legacyKeyForItem(item, 'contact') === contactLegacyKey
      ),
  );

  const circleAccessByEmail = buildCircleAccessByEmailIndex({
    caregivers: nextCaregivers,
    friendsAndFamily: nextFriendsAndFamily,
  });

  await setDoc(
    doc(db, 'patients', patientId),
    {
      caregivers: nextCaregivers,
      friendsAndFamily: nextFriendsAndFamily,
      contacts: nextContacts,
      circleAccessByEmail,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (normalizedEmail) {
    await revokeCircleInviteByEmail(db, patientId, normalizedEmail);
  }
}
