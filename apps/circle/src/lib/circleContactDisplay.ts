import type {
  CircleContactKind,
  CircleInviteListItem,
  CircleManagedContact,
  ProxyTier,
} from '@medxforce/shared';
import { circleMemberRoleFromManagedContact, normalizeInviteEmail } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
import { translateCircleMemberAccessLabel, contactKindLabelI18n } from './adminScreenI18n';

export type ContactInvitePeopleStatus = 'pending' | 'missing' | 'revoked';

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

function contactHasInvitableCircleAccess(contact: CircleManagedContact): boolean {
  if (contact.kind === 'contact') return false;
  if (!circleMemberRoleFromManagedContact(contact)) return false;
  const email = contact.email.trim().toLowerCase();
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** People-tab hint: pending invite, revoked access, or missing invite after contact save. */
export function resolveContactInvitePeopleStatus(
  contact: CircleManagedContact,
  members: CircleInviteListItem[],
): ContactInvitePeopleStatus | null {
  if (!contactHasInvitableCircleAccess(contact)) return null;

  const email = normalizeInviteEmail(contact.email);
  const invite = members.find(
    (item) => normalizeInviteEmail(item.invitedEmail) === email,
  );
  if (invite?.status === 'pending') return 'pending';
  if (invite?.status === 'accepted') return null;
  if (invite?.status === 'revoked') return 'revoked';
  return 'missing';
}

export function contactInvitePeopleStatusBadgeClass(
  status: ContactInvitePeopleStatus,
): string {
  if (status === 'pending') {
    return 'bg-amber-50 text-amber-800 border-amber-100';
  }
  if (status === 'revoked') {
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }
  return 'bg-rose-50 text-rose-700 border-rose-100';
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
