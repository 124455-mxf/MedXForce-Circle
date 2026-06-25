import type { CircleInviteListItem, CircleManagedContact } from '@medxforce/shared';
import { normalizeInviteEmail } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
import { translateCircleMemberAccessLabel } from './adminScreenI18n';

export type CircleContactEmailAudience = {
  contactName?: string;
  patientName?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  roleLabel?: string;
  relationshipLabel?: string;
};

export function buildCircleEmailInviterScope(
  user: { displayName?: string | null; email?: string | null },
  options: {
    members: CircleInviteListItem[];
    contacts: CircleManagedContact[];
    memberContactProfileByEmail: Map<string, { name?: string }>;
  },
): Pick<CircleContactEmailAudience, 'invitedByName' | 'invitedByEmail'> {
  const invitedByEmail = user.email?.trim() || undefined;
  const emailNorm = invitedByEmail ? normalizeInviteEmail(invitedByEmail) : '';

  let invitedByName = user.displayName?.trim() || undefined;
  if (!invitedByName && emailNorm) {
    invitedByName =
      options.members
        .find((member) => normalizeInviteEmail(member.invitedEmail) === emailNorm)
        ?.displayName?.trim() ||
      options.contacts.find((contact) => normalizeInviteEmail(contact.email) === emailNorm)?.name
        ?.trim() ||
      options.memberContactProfileByEmail.get(emailNorm)?.name?.trim() ||
      undefined;
  }

  return { invitedByName, invitedByEmail };
}

export function buildCircleContactEmailAudience(
  contact: Pick<
    CircleManagedContact,
    'name' | 'email' | 'relationship' | 'circleRole' | 'proxyTier' | 'kind'
  >,
  scope: {
    patientName?: string;
    invitedByName?: string;
    invitedByEmail?: string;
  },
  t: CircleTranslator,
): CircleContactEmailAudience {
  const role =
    contact.circleRole ??
    (contact.kind === 'caregiver'
      ? 'caregiver'
      : contact.kind === 'friend'
        ? 'friend'
        : contact.kind === 'family'
          ? 'family'
          : undefined);

  const relationship =
    contact.relationship.trim() ||
    (contact.kind === 'friend' ? 'Friend' : contact.kind === 'family' ? 'Family' : undefined);

  return {
    contactName: contact.name.trim() || undefined,
    patientName: scope.patientName?.trim() || undefined,
    invitedByName: scope.invitedByName?.trim() || undefined,
    invitedByEmail: scope.invitedByEmail?.trim() || undefined,
    roleLabel: role ? translateCircleMemberAccessLabel(t, role, contact.proxyTier) : undefined,
    relationshipLabel: relationship,
  };
}
