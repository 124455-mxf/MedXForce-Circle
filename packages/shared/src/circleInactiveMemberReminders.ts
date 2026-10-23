import type { CircleInviteListItem } from './circleMemberManagement';
import {
  isParticipationReminderSnoozed,
  type CircleParticipationReminderSnoozes,
} from './circleParticipationReminders';

/** Align with inactivity re-engagement email (CIRCLE_INACTIVE_REENGAGEMENT_AFTER_MS). */
export const INACTIVE_CIRCLE_MEMBER_TILE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type InactiveCircleMemberTileKind = 'inactiveMembers';

/** Family and friends: proxy Home tile. Family also gets the re-engagement email. */
export const INACTIVE_CIRCLE_MEMBER_TILE_ROLES = new Set(['family', 'friend']);

export type InactiveCircleMember = {
  uid: string;
  invitedEmail: string;
  displayName?: string;
  role: string;
  lastActiveAt: number;
};

function normalizeRole(role: unknown): string {
  return String(role || '')
    .trim()
    .toLowerCase();
}

function inviteBaselineMs(invite: CircleInviteListItem): number {
  const created = invite.createdAt;
  if (typeof created === 'number' && Number.isFinite(created) && created > 0) return created;
  const updated = invite.updatedAt;
  if (typeof updated === 'number' && Number.isFinite(updated) && updated > 0) return updated;
  return 0;
}

/**
 * Accepted family/friend members who have not opened Circle for 7+ days.
 * lastOpenByUid: circle_profiles.lastCircleOpenAt, then presence.lastSeen (> 0).
 */
export function listInactiveCircleMembers(input: {
  invites: readonly CircleInviteListItem[];
  lastOpenByUid?: Readonly<Record<string, number>>;
  presenceByUid?: Readonly<Record<string, number>>;
  excludeUid?: string;
  now?: number;
  staleAfterMs?: number;
}): InactiveCircleMember[] {
  const now = input.now ?? Date.now();
  const cutoff = now - (input.staleAfterMs ?? INACTIVE_CIRCLE_MEMBER_TILE_AFTER_MS);
  const exclude = input.excludeUid?.trim() || '';
  const lastOpen = input.lastOpenByUid ?? {};
  const presence = input.presenceByUid ?? {};
  const byUid = new Map<string, InactiveCircleMember>();

  for (const invite of input.invites) {
    if (invite.status !== 'accepted') continue;
    const role = normalizeRole(invite.role);
    if (!INACTIVE_CIRCLE_MEMBER_TILE_ROLES.has(role)) continue;
    const uid = invite.acceptedByUid?.trim();
    if (!uid || uid === exclude) continue;

    const openAt = Number(lastOpen[uid]);
    const seenAt = Number(presence[uid]);
    const lastActiveAt =
      (Number.isFinite(openAt) && openAt > 0 && openAt) ||
      (Number.isFinite(seenAt) && seenAt > 0 && seenAt) ||
      inviteBaselineMs(invite);
    if (lastActiveAt <= 0 || lastActiveAt > cutoff) continue;

    const existing = byUid.get(uid);
    if (existing && existing.lastActiveAt >= lastActiveAt) continue;
    byUid.set(uid, {
      uid,
      invitedEmail: invite.invitedEmail,
      displayName: invite.displayName,
      role,
      lastActiveAt,
    });
  }

  return [...byUid.values()].sort((a, b) => a.lastActiveAt - b.lastActiveAt);
}

/** Proxy Home nudge when family or friends have not opened Circle recently. */
export function shouldShowInactiveMemberReminder(input: {
  enabled: boolean;
  members: readonly InactiveCircleMember[];
  loading: boolean;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled || input.loading) return false;
  if (input.members.length === 0) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('inactiveMembers', input.snoozes, now)) return false;
  return true;
}
