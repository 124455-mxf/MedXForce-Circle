import type { CircleContactKind, CircleManagedContact, CircleMemberRole } from '@medxforce/shared';

export type CircleAccessOptionId =
  | 'caregiver'
  | 'proxy_primary'
  | 'proxy_backup'
  | 'family'
  | 'friend';

export function defaultCircleAccessOptionForKind(kind: CircleContactKind): CircleAccessOptionId {
  if (kind === 'family') return 'family';
  if (kind === 'friend') return 'friend';
  return 'caregiver';
}

export function circleAccessOptionFromManagedContact(
  contact: Pick<CircleManagedContact, 'kind' | 'circleRole' | 'proxyTier'>,
): CircleAccessOptionId {
  if (contact.circleRole === 'proxy') {
    return contact.proxyTier === 'backup' ? 'proxy_backup' : 'proxy_primary';
  }
  if (contact.kind === 'caregiver') return 'caregiver';
  if (contact.circleRole === 'family' || contact.kind === 'family') return 'family';
  return 'friend';
}

function isPrimaryProxy(contact: CircleManagedContact): boolean {
  return contact.circleRole === 'proxy' && contact.proxyTier !== 'backup';
}

function isBackupProxy(contact: CircleManagedContact): boolean {
  return contact.circleRole === 'proxy' && contact.proxyTier === 'backup';
}

function hasEligibleCaregiverForBackup(
  contacts: CircleManagedContact[],
  excludeContactId?: string,
): boolean {
  return contacts.some((contact) => {
    if (excludeContactId && contact.id === excludeContactId) return false;
    return contact.kind === 'caregiver' && contact.circleRole !== 'proxy';
  });
}

export function circleAccessOptionsForDraft(
  contacts: CircleManagedContact[],
  draft: {
    id?: string;
    kind: CircleContactKind;
    circleAccessOption: CircleAccessOptionId;
  },
): CircleAccessOptionId[] {
  if (draft.kind === 'contact') return [];
  if (draft.kind === 'caregiver') {
    return ['caregiver', 'proxy_primary', 'proxy_backup'];
  }

  const options: CircleAccessOptionId[] =
    draft.kind === 'family' ? ['family', 'friend'] : ['friend', 'family'];
  const hasBackup = contacts.some(
    (contact) => contact.id !== draft.id && isBackupProxy(contact),
  );
  const canOfferBackup =
    draft.circleAccessOption === 'proxy_backup' ||
    (!hasBackup && !hasEligibleCaregiverForBackup(contacts, draft.id));
  if (canOfferBackup) {
    options.push('proxy_backup');
  }
  return options;
}

export function circleRoleFieldsFromAccessOption(
  kind: CircleContactKind,
  option: CircleAccessOptionId,
): { circleRole?: CircleMemberRole; proxyTier?: 'primary' | 'backup' } {
  if (option === 'proxy_primary') {
    return { circleRole: 'proxy', proxyTier: 'primary' };
  }
  if (option === 'proxy_backup') {
    return { circleRole: 'proxy', proxyTier: 'backup' };
  }
  if (option === 'caregiver') {
    return { circleRole: 'caregiver' };
  }
  if (option === 'family') {
    return { circleRole: 'family' };
  }
  return { circleRole: 'friend' };
}

export function circleAccessOptionLabelKey(option: CircleAccessOptionId): string {
  switch (option) {
    case 'proxy_primary':
      return 'circle.rolePrimaryProxy';
    case 'proxy_backup':
      return 'circle.roleBackupProxy';
    case 'caregiver':
      return 'circle.roleCaregiver';
    case 'family':
      return 'circle.roleFamily';
    default:
      return 'circle.roleFriend';
  }
}

export function circleAccessOptionDescriptionKey(option: CircleAccessOptionId): string {
  switch (option) {
    case 'proxy_primary':
      return 'admin.contact.circleAccessDescPrimaryProxy';
    case 'proxy_backup':
      return 'admin.contact.circleAccessDescBackupProxy';
    case 'caregiver':
      return 'admin.contact.circleAccessDescCaregiver';
    case 'family':
      return 'admin.contact.circleAccessDescFamily';
    default:
      return 'admin.contact.circleAccessDescFriend';
  }
}

export function findPrimaryProxyContact(
  contacts: CircleManagedContact[],
  excludeContactId?: string,
): CircleManagedContact | undefined {
  return contacts.find((contact) => {
    if (excludeContactId && contact.id === excludeContactId) return false;
    return isPrimaryProxy(contact);
  });
}

export function findBackupProxyContact(
  contacts: CircleManagedContact[],
  excludeContactId?: string,
): CircleManagedContact | undefined {
  return contacts.find((contact) => {
    if (excludeContactId && contact.id === excludeContactId) return false;
    return isBackupProxy(contact);
  });
}

export function demoteAccessOptionForContact(
  contact: CircleManagedContact,
): CircleAccessOptionId {
  return contact.kind === 'caregiver' ? 'caregiver' : 'family';
}
