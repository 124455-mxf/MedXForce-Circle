import type {
  CircleContactKind,
  CircleInviteListItem,
  CircleManagedContact,
  ProxyTier,
} from '@medxforce/shared';
import { normalizeInviteEmail } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
import { translateCircleMemberAccessLabel, contactKindLabelI18n } from './adminScreenI18n';

export const CONTACT_KIND_BADGE: Record<CircleContactKind, string> = {
  caregiver: 'bg-violet-50 text-violet-700 border-violet-100',
  family: 'bg-blue-50 text-blue-700 border-blue-100',
  friend: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  contact: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function memberRoleBadgeClass(role: string, proxyTier?: ProxyTier | null): string {
  if (role === 'proxy') {
    return proxyTier === 'backup'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
      : 'bg-violet-50 text-violet-700 border-violet-100';
  }
  if (role === 'caregiver' || role === 'professional_caregiver') {
    return CONTACT_KIND_BADGE.caregiver;
  }
  if (role === 'family') return CONTACT_KIND_BADGE.family;
  if (role === 'friend') return CONTACT_KIND_BADGE.friend;
  if (role === 'facility_staff') return CONTACT_KIND_BADGE.contact;
  return CONTACT_KIND_BADGE.contact;
}

export function inviteForContactEmail(
  contact: CircleManagedContact,
  members: CircleInviteListItem[],
): CircleInviteListItem | undefined {
  const email = normalizeInviteEmail(contact.email);
  if (!email) return undefined;
  return members.find(
    (item) =>
      item.status !== 'revoked' && normalizeInviteEmail(item.invitedEmail) === email,
  );
}

export function resolvedContactAccess(
  t: CircleTranslator,
  contact: CircleManagedContact,
  members: CircleInviteListItem[],
): { label: string; badgeClass: string } {
  const invite = inviteForContactEmail(contact, members);
  const role =
    contact.circleRole === 'proxy'
      ? 'proxy'
      : invite?.role === 'proxy'
        ? 'proxy'
        : contact.circleRole ?? invite?.role;
  const proxyTier =
    role === 'proxy'
      ? contact.proxyTier ??
        (invite?.proxyTier as CircleManagedContact['proxyTier'] | undefined)
      : contact.proxyTier ?? invite?.proxyTier;

  if (role && contact.kind !== 'contact') {
    const label = translateCircleMemberAccessLabel(t, role, proxyTier);
    const badgeClass =
      role === 'proxy'
        ? memberRoleBadgeClass('proxy', proxyTier)
        : CONTACT_KIND_BADGE[contact.kind];
    return { label, badgeClass };
  }

  return { label: contactKindLabelI18n(t, contact.kind), badgeClass: CONTACT_KIND_BADGE[contact.kind] };
}
