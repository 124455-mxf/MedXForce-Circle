import { doc, setDoc, type Firestore } from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';

export type ProxyTier = 'primary' | 'backup';

const PATIENT_APP_CIRCLE_ROLES = ['friend', 'family', 'caregiver', 'proxy'] as const;

export function isPatientAppCircleRole(value: string): value is CircleMemberRole {
  return (PATIENT_APP_CIRCLE_ROLES as readonly string[]).includes(value);
}

/** Resolve stored circle role from a patient-app contact record. */
export function circleRoleFromContact(contact: Record<string, unknown>): CircleMemberRole {
  const explicit = contact.circleRole;
  if (typeof explicit === 'string' && isPatientAppCircleRole(explicit)) {
    return explicit;
  }

  const legacyAdmin = String(contact.role ?? '').toLowerCase();
  if (legacyAdmin === 'admin') {
    return 'proxy';
  }

  const type = String(contact.type || contact.relationship || '').toLowerCase();
  if (type.includes('friend')) return 'friend';
  if (
    type.includes('family') ||
    type.includes('partner') ||
    type.includes('child') ||
    type.includes('parent') ||
    type.includes('spouse')
  ) {
    return 'family';
  }

  if (contact.relationship !== undefined || contact.role !== undefined) {
    return 'caregiver';
  }

  return 'friend';
}

export function proxyTierFromContact(contact: Record<string, unknown>): ProxyTier | null {
  if (circleRoleFromContact(contact) !== 'proxy') return null;
  return contact.proxyTier === 'backup' ? 'backup' : 'primary';
}

export function roleFromCaregiverContact(contact: Record<string, unknown>): CircleMemberRole {
  const role = circleRoleFromContact(contact);
  return role === 'proxy' ? 'proxy' : 'caregiver';
}

export function roleFromFriendsAndFamilyContact(contact: Record<string, unknown>): CircleMemberRole {
  const role = circleRoleFromContact(contact);
  if (role === 'proxy') return 'proxy';
  return role === 'family' ? 'family' : 'friend';
}

function contactEmail(contact: Record<string, unknown>): string {
  const raw = contact.email ?? contact.emailVerify;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export function findContactRoleByEmail(
  patientData: {
    caregivers?: Record<string, unknown>[];
    friendsAndFamily?: Record<string, unknown>[];
  },
  email: string,
): { role: CircleMemberRole; proxyTier?: ProxyTier } | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  for (const contact of patientData.caregivers || []) {
    if (contactEmail(contact) !== normalized) continue;
    const role = roleFromCaregiverContact(contact);
    const tier = proxyTierFromContact(contact);
    return tier ? { role, proxyTier: tier } : { role };
  }

  for (const contact of patientData.friendsAndFamily || []) {
    if (contactEmail(contact) !== normalized) continue;
    const role = roleFromFriendsAndFamilyContact(contact);
    const tier = proxyTierFromContact(contact);
    return tier ? { role, proxyTier: tier } : { role };
  }

  return null;
}

export function circleMemberRoleFromManagedContact(contact: {
  kind: 'caregiver' | 'family' | 'friend' | 'contact';
  circleRole?: CircleMemberRole;
  proxyTier?: ProxyTier;
}): CircleMemberRole | null {
  if (contact.kind === 'contact') return null;
  if (contact.circleRole === 'proxy') return 'proxy';
  if (contact.circleRole) return contact.circleRole;
  if (contact.kind === 'caregiver') return 'caregiver';
  if (contact.kind === 'family') return 'family';
  if (contact.kind === 'friend') return 'friend';
  return null;
}

export function resolveCircleAccessForInviteEmail(
  patientData:
    | {
        caregivers?: Record<string, unknown>[];
        friendsAndFamily?: Record<string, unknown>[];
        circleAccessByEmail?: Record<
          string,
          { role?: string; proxyTier?: string }
        >;
      }
    | null
    | undefined,
  invitedEmail: string,
  fallbacks: {
    memberRole?: string;
    memberProxyTier?: ProxyTier;
    inviteRole?: string;
    inviteProxyTier?: ProxyTier;
  } = {},
): { role: CircleMemberRole; proxyTier?: ProxyTier } {
  const fromContacts = patientData ? findContactRoleByEmail(patientData, invitedEmail) : null;
  if (fromContacts) return fromContacts;

  const indexed = patientData?.circleAccessByEmail?.[invitedEmail.trim().toLowerCase()];
  if (indexed?.role && isPatientAppCircleRole(indexed.role)) {
    const role = indexed.role as CircleMemberRole;
    const tier =
      role === 'proxy' && (indexed.proxyTier === 'backup' || indexed.proxyTier === 'primary')
        ? indexed.proxyTier
        : undefined;
    return tier ? { role, proxyTier: tier } : { role };
  }

  const role = (fallbacks.memberRole ||
    fallbacks.inviteRole ||
    'caregiver') as CircleMemberRole;
  const proxyTier =
    role === 'proxy'
      ? fallbacks.memberProxyTier ||
        fallbacks.inviteProxyTier ||
        ('primary' as ProxyTier)
      : undefined;
  return proxyTier ? { role, proxyTier } : { role };
}

function circleAccessIndexMatches(
  existing: Record<string, { role?: string; proxyTier?: string }> | undefined,
  next: Record<string, { role: CircleMemberRole; proxyTier?: ProxyTier }>,
): boolean {
  const prev = existing || {};
  const prevKeys = Object.keys(prev).sort();
  const nextKeys = Object.keys(next).sort();
  if (prevKeys.length !== nextKeys.length) return false;
  return prevKeys.every((key, index) => {
    if (key !== nextKeys[index]) return false;
    const left = prev[key];
    const right = next[key];
    return left?.role === right.role && (left?.proxyTier || '') === (right?.proxyTier || '');
  });
}

/** Publish contact access index from patient-owned caregiver arrays (Circle login heal). */
export async function publishCircleAccessIndexFromPatientDoc(
  db: Firestore,
  patientId: string,
  patientData:
    | {
        caregivers?: Record<string, unknown>[];
        friendsAndFamily?: Record<string, unknown>[];
        circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
      }
    | null
    | undefined,
): Promise<boolean> {
  if (!patientData) return false;

  const caregivers = patientData.caregivers || [];
  const friendsAndFamily = patientData.friendsAndFamily || [];
  if (caregivers.length === 0 && friendsAndFamily.length === 0) return false;

  const nextIndex = buildCircleAccessByEmailIndex({ caregivers, friendsAndFamily });
  if (Object.keys(nextIndex).length === 0) return false;
  if (circleAccessIndexMatches(patientData.circleAccessByEmail, nextIndex)) return true;

  await setDoc(
    doc(db, 'patients', patientId),
    { circleAccessByEmail: nextIndex, updatedAt: Date.now() },
    { merge: true },
  );
  return true;
}

export function buildCircleAccessByEmailIndex(preferences: {
  caregivers?: Record<string, unknown>[];
  friendsAndFamily?: Record<string, unknown>[];
}): Record<string, { role: CircleMemberRole; proxyTier?: ProxyTier }> {
  const map: Record<string, { role: CircleMemberRole; proxyTier?: ProxyTier }> = {};
  const add = (email: string, role: CircleMemberRole, tier: ProxyTier | null) => {
    if (!email) return;
    map[email] = tier ? { role, proxyTier: tier } : { role };
  };

  for (const contact of preferences.caregivers || []) {
    const email = contactEmail(contact);
    const role = roleFromCaregiverContact(contact);
    add(email, role, proxyTierFromContact(contact));
  }
  for (const contact of preferences.friendsAndFamily || []) {
    const email = contactEmail(contact);
    const role = roleFromFriendsAndFamilyContact(contact);
    add(email, role, proxyTierFromContact(contact));
  }
  return map;
}

export type ManagedProxyContact = {
  name: string;
  email: string;
  tier: ProxyTier;
};

export function listManagedProxyContacts(
  contacts: Array<{
    name: string;
    email: string;
    kind: 'caregiver' | 'family' | 'friend' | 'contact';
    circleRole?: CircleMemberRole;
    proxyTier?: ProxyTier;
  }>,
): ManagedProxyContact[] {
  return contacts
    .filter((contact) => circleMemberRoleFromManagedContact(contact) === 'proxy')
    .map((contact) => ({
      name: contact.name.trim() || contact.email.trim(),
      email: contact.email.trim(),
      tier: contact.proxyTier === 'backup' ? 'backup' : 'primary',
    }))
    .filter((contact) => contact.email || contact.name)
    .sort((left, right) => {
      if (left.tier === right.tier) {
        return left.name.localeCompare(right.name);
      }
      return left.tier === 'primary' ? -1 : 1;
    });
}

export function circleMemberAccessLabel(
  role: string,
  proxyTier?: ProxyTier | null,
): string {
  if (role === 'proxy') {
    if (proxyTier === 'backup') return 'Backup proxy';
    if (proxyTier === 'primary') return 'Primary proxy';
    return 'Proxy';
  }
  switch (role) {
    case 'caregiver':
      return 'Caregiver';
    case 'professional_caregiver':
      return 'Professional caregiver';
    case 'family':
      return 'Family';
    case 'friend':
      return 'Friend';
    case 'facility_staff':
      return 'Facility staff';
    default:
      return role.replace(/_/g, ' ');
  }
}
