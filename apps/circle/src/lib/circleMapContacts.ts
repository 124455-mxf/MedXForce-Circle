import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  circleRoleFromContact,
  type CircleManagedContact,
  type CircleMemberThreadKind,
} from '@medxforce/shared';

export function managedContactToRecord(contact: CircleManagedContact): Record<string, unknown> {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    relationship: contact.relationship,
    circleRole: contact.circleRole,
    proxyTier: contact.proxyTier,
    kind: contact.kind,
  };
}

export function contactsToCircleMapPreferences(
  contacts: CircleManagedContact[],
  patientName: string,
  nickName?: string,
) {
  const caregivers = contacts.filter((c) => c.kind === 'caregiver').map(managedContactToRecord);
  const friendsAndFamily = contacts
    .filter((c) => c.kind === 'family' || c.kind === 'friend')
    .map(managedContactToRecord);
  const messagingContacts = contacts.filter((c) => c.kind === 'contact').map(managedContactToRecord);

  return {
    userName: patientName,
    fullUserDetails: nickName ? { identity: { nickName } } : undefined,
    caregivers,
    friendsAndFamily,
    contacts: messagingContacts,
  };
}

function contactCircleRole(contact: CircleManagedContact) {
  return contact.circleRole || circleRoleFromContact(managedContactToRecord(contact));
}

/** People who can actually read this Circle thread — not messaging-only contacts. */
export function contactsForCircleThread(
  contacts: CircleManagedContact[],
  threadKind: CircleMemberThreadKind,
): CircleManagedContact[] {
  return contacts.filter((contact) => {
    if (contact.kind === 'contact') return false;
    const role = contactCircleRole(contact);
    return threadKind === 'restricted'
      ? canSeeCircleRestrictedThread(role)
      : canParticipateInCircleOpenThread(role);
  });
}
