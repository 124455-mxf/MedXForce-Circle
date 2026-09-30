import {
  CIRCLE_INITIATE_MESSAGE_GROUPS,
  circleInitiateGroupForRole,
  isCircleInitiatePersonCoveredByGroups,
  sanitizeCircleInitiateMessageGroups,
  sanitizeCircleInitiateMessageMemberUids,
  type CircleInitiateMessageGroup,
} from './circleInitiateMessages';
import {
  isParticipationReminderSnoozed,
  type CircleParticipationReminderSnoozes,
} from './circleParticipationReminders';

/** Same groups as Circle-started patient messages. Email-only Contacts are never included. */
export const CIRCLE_DROP_IN_GROUPS = CIRCLE_INITIATE_MESSAGE_GROUPS;

export type CircleDropInGroup = CircleInitiateMessageGroup;

/** Today's behavior: proxy and caregivers whenever drop-in is on. */
export const DEFAULT_CIRCLE_DROP_IN_GROUPS: CircleDropInGroup[] = ['proxy', 'caregiver'];

export type CircleDropInAccessConfig = {
  circleDropInGroups: CircleDropInGroup[];
  circleDropInMemberUids: string[];
};

export function isCircleDropInFamilyFriendsLockedOff(appMode: string | undefined): boolean {
  return appMode === 'intensive_care';
}

export function sanitizeCircleDropInGroups(
  raw: unknown,
  options?: { requireCareTeam?: boolean },
): CircleDropInGroup[] {
  const requireCareTeam = options?.requireCareTeam === true;
  if (!Array.isArray(raw)) {
    return requireCareTeam ? [...DEFAULT_CIRCLE_DROP_IN_GROUPS] : [];
  }
  const next = sanitizeCircleInitiateMessageGroups(raw, { requireProxy: requireCareTeam });
  if (requireCareTeam && !next.includes('caregiver')) {
    const proxyIdx = next.indexOf('proxy');
    if (proxyIdx >= 0) next.splice(proxyIdx + 1, 0, 'caregiver');
    else next.unshift('caregiver');
  }
  return next;
}

export function parseCircleDropInAccessConfig(data: unknown): CircleDropInAccessConfig {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined;
  const hasGroupsField = Array.isArray(rec?.circleDropInGroups);
  return {
    circleDropInGroups: sanitizeCircleDropInGroups(
      hasGroupsField ? rec?.circleDropInGroups : DEFAULT_CIRCLE_DROP_IN_GROUPS,
      { requireCareTeam: true },
    ),
    circleDropInMemberUids: sanitizeCircleInitiateMessageMemberUids(rec?.circleDropInMemberUids),
  };
}

export function isCircleDropInGroupLocked(
  group: CircleDropInGroup,
  dropInFeatureEnabled: boolean,
  appMode: string | undefined,
): boolean {
  if (!dropInFeatureEnabled) return false;
  if (group === 'proxy' || group === 'caregiver') return true;
  if (
    (group === 'family' || group === 'friends') &&
    isCircleDropInFamilyFriendsLockedOff(appMode)
  ) {
    return true;
  }
  return false;
}

export function effectiveCircleDropInGroups(
  config: CircleDropInAccessConfig,
  appMode: string | undefined,
): CircleDropInGroup[] {
  if (!isCircleDropInFamilyFriendsLockedOff(appMode)) {
    return config.circleDropInGroups;
  }
  return config.circleDropInGroups.filter(
    (group) => group === 'proxy' || group === 'caregiver',
  );
}

export function isCircleDropInCareTeamRole(role: string | undefined): boolean {
  const group = circleInitiateGroupForRole(role);
  return group === 'proxy' || group === 'caregiver';
}

export function canCircleMemberUseDropIn(
  dropInFeatureEnabled: boolean,
  config: CircleDropInAccessConfig,
  appMode: string | undefined,
  member: { uid: string; role?: string },
): boolean {
  if (!dropInFeatureEnabled) return false;
  if (isCircleDropInCareTeamRole(member.role)) return true;
  if (isCircleDropInFamilyFriendsLockedOff(appMode)) return false;
  if (config.circleDropInMemberUids.includes(member.uid)) return true;
  const group = circleInitiateGroupForRole(member.role);
  return group != null && effectiveCircleDropInGroups(config, appMode).includes(group);
}

/** Copy drop-in allowlist fields only when they already exist — never invent defaults. */
export function circleDropInAccessFieldsFromData(
  data: unknown,
): Partial<CircleDropInAccessConfig> {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined;
  if (!rec) return {};
  const hasGroupsField = Array.isArray(rec.circleDropInGroups);
  const hasUidsField = Array.isArray(rec.circleDropInMemberUids);
  if (!hasGroupsField && !hasUidsField) return {};
  const parsed = parseCircleDropInAccessConfig(rec);
  const next: Partial<CircleDropInAccessConfig> = {};
  if (hasGroupsField) next.circleDropInGroups = parsed.circleDropInGroups;
  if (hasUidsField) next.circleDropInMemberUids = parsed.circleDropInMemberUids;
  return next;
}

export function extractCircleDropInAccessForRemote(
  preferences: Record<string, unknown>,
): Partial<CircleDropInAccessConfig> {
  return circleDropInAccessFieldsFromData(preferences);
}

/**
 * Proxy Home nudge: drop-in is still off, the patient has engaged at least once,
 * and the care-team member can open Remote Settings. The action opens the Drop-in
 * allowlist so the proxy can choose who may drop in before turning it on.
 */
export function shouldShowCircleDropInReminder(input: {
  enabled: boolean;
  canManageRemoteSettings: boolean;
  dropInEnabled: boolean;
  firstEngagementAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  snoozeLoading?: boolean;
  firstEngagementLoading?: boolean;
  now?: number;
}): boolean {
  if (!input.enabled || !input.canManageRemoteSettings) return false;
  if (input.snoozeLoading || input.firstEngagementLoading) return false;
  if (input.dropInEnabled) return false;
  if (input.firstEngagementAt == null || input.firstEngagementAt <= 0) return false;
  const now = input.now ?? Date.now();
  return !isParticipationReminderSnoozed('circleDropIn', input.snoozes, now);
}

export { isCircleInitiatePersonCoveredByGroups as isCircleDropInPersonCoveredByGroups };
