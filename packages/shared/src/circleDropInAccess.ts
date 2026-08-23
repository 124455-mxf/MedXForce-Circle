import {
  CIRCLE_INITIATE_MESSAGE_GROUPS,
  circleInitiateGroupForRole,
  isCircleInitiatePersonCoveredByGroups,
  sanitizeCircleInitiateMessageGroups,
  sanitizeCircleInitiateMessageMemberUids,
  type CircleInitiateMessageGroup,
} from './circleInitiateMessages';

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

export function extractCircleDropInAccessForRemote(
  preferences: Record<string, unknown>,
): CircleDropInAccessConfig {
  return parseCircleDropInAccessConfig(preferences);
}

export { isCircleInitiatePersonCoveredByGroups as isCircleDropInPersonCoveredByGroups };
