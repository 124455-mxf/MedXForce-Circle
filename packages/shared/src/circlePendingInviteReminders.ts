import type { CircleInviteListItem } from './circleMemberManagement';
import {
  isParticipationReminderSnoozed,
  type CircleParticipationReminderSnoozes,
} from './circleParticipationReminders';

/** Align with invitee reminder email (INTRODUCTION_REMINDER_AFTER_MS). */
export const PENDING_INVITE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingInviteReminderKind = 'pendingInvites';

export type StalePendingInvite = {
  id: string;
  invitedEmail: string;
  displayName?: string;
  invitedAt: number;
};

/** Prefer introduction email time, then createdAt, then updatedAt. */
export function inviteAgeAnchorMs(invite: {
  introductionEmailSentAt?: number;
  createdAt?: number;
  updatedAt?: number;
}): number {
  const intro = invite.introductionEmailSentAt;
  if (typeof intro === 'number' && Number.isFinite(intro) && intro > 0) return intro;
  const created = invite.createdAt;
  if (typeof created === 'number' && Number.isFinite(created) && created > 0) return created;
  const updated = invite.updatedAt;
  if (typeof updated === 'number' && Number.isFinite(updated) && updated > 0) return updated;
  return 0;
}

export function listStalePendingInvites(
  invites: readonly CircleInviteListItem[],
  now = Date.now(),
  staleAfterMs = PENDING_INVITE_STALE_MS,
): StalePendingInvite[] {
  const cutoff = now - staleAfterMs;
  const stale: StalePendingInvite[] = [];
  for (const invite of invites) {
    if (invite.status !== 'pending') continue;
    if (invite.acceptedByUid) continue;
    const invitedAt = inviteAgeAnchorMs(invite);
    if (invitedAt <= 0 || invitedAt > cutoff) continue;
    stale.push({
      id: invite.id,
      invitedEmail: invite.invitedEmail,
      displayName: invite.displayName,
      invitedAt,
    });
  }
  stale.sort((a, b) => a.invitedAt - b.invitedAt);
  return stale;
}

/**
 * Proxy Home nudge when at least one Circle invite has been pending long enough
 * that the invitee may need a follow-up (resend / revoke) from Admin → Access.
 */
export function shouldShowPendingInviteReminder(input: {
  enabled: boolean;
  staleInvites: readonly StalePendingInvite[];
  loading: boolean;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled || input.loading) return false;
  if (input.staleInvites.length === 0) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('pendingInvites', input.snoozes, now)) return false;
  return true;
}

/** Display names for the reminder body (max 2 + overflow). */
export function formatStalePendingInviteNames(
  staleInvites: readonly StalePendingInvite[],
  formatOverflow: (count: number) => string,
  maxNamed = 2,
): string {
  if (staleInvites.length === 0) return '';
  const labels = staleInvites.map(
    (invite) => invite.displayName?.trim() || invite.invitedEmail,
  );
  if (labels.length <= maxNamed) {
    if (labels.length === 1) return labels[0]!;
    return `${labels[0]} · ${labels[1]}`;
  }
  const named = labels.slice(0, maxNamed);
  const overflow = labels.length - maxNamed;
  return `${named.join(' · ')} ${formatOverflow(overflow)}`;
}
