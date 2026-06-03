import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { circleInviteDocId, type CircleInviteStatus } from './circleInvites';
import {
  capabilitiesForRole,
  normalizeInviteEmail,
  type CircleMemberRole,
} from './patientPermissions';
import { revokeCircleInviteByEmail } from './circleMemberManagement';

export type CircleContactKind = 'caregiver' | 'family' | 'friend' | 'contact';

export interface CircleManagedContact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  relationship: string;
  kind: CircleContactKind;
  language: string;
  message: boolean;
  sms: boolean;
  alert: boolean;
  attention: boolean;
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

export function readPatientDocUpdatedAt(data: Record<string, unknown> | undefined): number {
  const value = data?.updatedAt;
  return typeof value === 'number' && value > 0 ? value : 0;
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
  return {
    id: existingId || `legacy_${legacyKeyFromCaregiverRecord(contact)}`,
    name: readString(contact, 'name'),
    email: readString(contact, 'email'),
    mobile: readString(contact, 'mobile'),
    relationship: readString(contact, 'relationship') || readString(contact, 'type') || 'Other',
    kind: 'caregiver',
    language: readString(contact, 'language') || defaults.language,
    message: readOptionalBool(contact, 'message') ?? defaults.message,
    sms: readOptionalBool(contact, 'sms') ?? defaults.sms,
    alert: readOptionalBool(contact, 'alert') ?? defaults.alert,
    attention: readOptionalBool(contact, 'attention') ?? defaults.attention,
  };
}

function mapFriendsFamily(contact: Record<string, unknown>): CircleManagedContact {
  const kind = contactKindFromFriendsFamily(contact);
  const defaults = notifyDefaultsForKind(kind);
  const existingId = readString(contact, 'id');
  return {
    id: existingId || `legacy_${legacyKeyFromFriendsFamilyRecord(contact)}`,
    name: readString(contact, 'name'),
    email: readString(contact, 'email'),
    mobile: readString(contact, 'mobile'),
    relationship:
      readString(contact, 'relationship') || readString(contact, 'type') || (kind === 'friend' ? 'Friend' : 'Family'),
    kind,
    language: readString(contact, 'language') || defaults.language,
    message: readOptionalBool(contact, 'message') ?? defaults.message,
    sms: readOptionalBool(contact, 'sms') ?? defaults.sms,
    alert: readOptionalBool(contact, 'alert') ?? defaults.alert,
    attention: readOptionalBool(contact, 'attention') ?? defaults.attention,
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
  };
}

function hasVisibleContactIdentity(contact: CircleManagedContact): boolean {
  return Boolean(contact.name.trim() || contact.email.trim() || contact.mobile.trim());
}

function roleFromKind(kind: CircleContactKind): CircleMemberRole | null {
  if (kind === 'caregiver') return 'caregiver';
  if (kind === 'family') return 'family';
  if (kind === 'friend') return 'friend';
  return null;
}

function toCaregiverRecord(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    mobile: contact.mobile,
    relationship: contact.relationship || 'Other',
    circleRole: 'caregiver',
    language: contact.language || 'English',
    alert: !!contact.alert,
    attention: !!contact.attention,
    message: !!contact.message,
    sms: !!contact.sms,
  };
}

function toFriendsFamilyRecord(contact: CircleManagedContact): Record<string, unknown> {
  const isFriend = contact.kind === 'friend';
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    mobile: contact.mobile,
    relationship: contact.relationship || (isFriend ? 'Friend' : 'Family'),
    type: isFriend ? 'Friend' : 'Family',
    circleRole: isFriend ? 'friend' : 'family',
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
  };
}

async function syncInviteForCircleRoleContact(
  db: Firestore,
  patientId: string,
  contact: CircleManagedContact,
): Promise<void> {
  const role = roleFromKind(contact.kind);
  const email = normalizeInviteEmail(contact.email);
  if (!role || !email) return;

  const inviteRef = doc(db, 'circle_invites', circleInviteDocId(patientId, email));
  const existing = await getDoc(inviteRef);
  const existingStatus = existing.exists()
    ? (existing.data()?.status as CircleInviteStatus | undefined)
    : undefined;

  if (existingStatus === 'accepted') {
    await setDoc(
      inviteRef,
      {
        role,
        capabilities: capabilitiesForRole(role),
        displayName: contact.name || undefined,
        contactId: contact.id,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    return;
  }

  await setDoc(
    inviteRef,
    {
      patientId,
      invitedEmail: email,
      role,
      capabilities: capabilitiesForRole(role),
      displayName: contact.name || undefined,
      contactId: contact.id,
      status: 'pending',
      updatedAt: Date.now(),
      createdAt: existing.exists() ? existing.data()?.createdAt ?? Date.now() : Date.now(),
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
  options: { expectedPatientUpdatedAt?: number; syncInvite?: boolean } = {},
): Promise<CircleManagedContact> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) throw new Error('Patient record not found.');

  const data = snap.data() as PatientContactsDocShape;
  const remoteUpdatedAt = readPatientDocUpdatedAt(data as Record<string, unknown>);
  const expected = options.expectedPatientUpdatedAt ?? 0;
  if (expected > 0 && remoteUpdatedAt > expected) {
    throw new ContactConflictError();
  }
  const caregivers = asArray(data.caregivers).map((x) => ({ ...x }));
  const friendsAndFamily = asArray(data.friendsAndFamily).map((x) => ({ ...x }));
  const contacts = asArray(data.contacts).map((x) => ({ ...x }));

  const id = (input.id && input.id.trim()) || `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const normalizedEmail = normalizeInviteEmail(input.email || '');
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

  const nextCaregivers = removeFromList(caregivers, 'caregiver');
  const nextFriendsAndFamily = removeFromList(friendsAndFamily, 'family');
  const nextContacts = removeFromList(contacts, 'contact');

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
  };

  if (input.kind === 'caregiver') nextCaregivers.push(toCaregiverRecord(next));
  if (input.kind === 'family' || input.kind === 'friend') {
    nextFriendsAndFamily.push(toFriendsFamilyRecord(next));
  }
  if (input.kind === 'contact') nextContacts.push(toSimpleContactRecord(next));

  await setDoc(
    doc(db, 'patients', patientId),
    {
      caregivers: nextCaregivers,
      friendsAndFamily: nextFriendsAndFamily,
      contacts: nextContacts,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  const syncInvite = options.syncInvite !== false;

  if (syncInvite && normalizedEmail && input.kind !== 'contact') {
    await syncInviteForCircleRoleContact(db, patientId, next);
  } else if (syncInvite && normalizedEmail && input.kind === 'contact') {
    await revokeCircleInviteByEmail(db, patientId, normalizedEmail);
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

export type OwnNotifyPreferencesPatch = {
  message?: boolean;
  alert?: boolean;
  attention?: boolean;
};

/** Non-proxy members may only change alert / attention / message on their own contact row. */
export async function updateOwnCircleNotifyPreferences(
  db: Firestore,
  patientId: string,
  actorEmail: string,
  patch: OwnNotifyPreferencesPatch,
  options: { expectedPatientUpdatedAt?: number } = {},
): Promise<CircleManagedContact> {
  const contacts = await listPatientManagedContacts(db, patientId);
  const existing = findManagedContactByEmail(contacts, actorEmail);
  if (!existing) {
    throw new Error('Your contact record was not found. Ask the patient or proxy to add your email.');
  }

  const hasEmail = !!existing.email.trim();
  const nextMessage =
    patch.message !== undefined ? patch.message && hasEmail : existing.message;
  const nextAlert = patch.alert !== undefined ? patch.alert : existing.alert;
  const nextAttention = patch.attention !== undefined ? patch.attention : existing.attention;

  return upsertPatientManagedContact(
    db,
    patientId,
    {
      ...existing,
      message: nextMessage,
      alert: nextAlert,
      attention: nextAttention,
    },
    { expectedPatientUpdatedAt: options.expectedPatientUpdatedAt, syncInvite: false },
  );
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

  await setDoc(
    doc(db, 'patients', patientId),
    {
      caregivers: nextCaregivers,
      friendsAndFamily: nextFriendsAndFamily,
      contacts: nextContacts,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  if (normalizedEmail) {
    await revokeCircleInviteByEmail(db, patientId, normalizedEmail);
  }
}
