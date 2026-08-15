import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { normalizeMemberRole } from './patientPermissions';
import { circleProfileOnboardingRef } from './circleMemberOnboarding';
import {
  isParticipationReminderSnoozed,
  type CircleParticipationReminderSnoozes,
} from './circleParticipationReminders';

/** Groups that may start a new patient message. Email-only Contacts are never included. */
export const CIRCLE_INITIATE_MESSAGE_GROUPS = ['proxy', 'caregiver', 'family', 'friends'] as const;

export type CircleInitiateMessageGroup = (typeof CIRCLE_INITIATE_MESSAGE_GROUPS)[number];

export const DEFAULT_CIRCLE_INITIATE_MESSAGE_GROUPS: CircleInitiateMessageGroup[] = ['proxy'];

export type CircleInitiateMessagesConfig = {
  allowCircleInitiateMessages: boolean;
  circleInitiateMessageGroups: CircleInitiateMessageGroup[];
  circleInitiateMessageMemberUids: string[];
  circleInitiateMessagesEnabledAt: number;
};

const GROUP_SET = new Set<string>(CIRCLE_INITIATE_MESSAGE_GROUPS);

export function sanitizeCircleInitiateMessageGroups(
  raw: unknown,
  options?: { requireProxy?: boolean },
): CircleInitiateMessageGroup[] {
  if (!Array.isArray(raw)) {
    return options?.requireProxy ? ['proxy'] : [];
  }
  const next: CircleInitiateMessageGroup[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !GROUP_SET.has(item)) continue;
    const group = item as CircleInitiateMessageGroup;
    if (!next.includes(group)) next.push(group);
  }
  if (options?.requireProxy && !next.includes('proxy')) {
    next.unshift('proxy');
  }
  return next;
}

export function sanitizeCircleInitiateMessageMemberUids(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const next: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const uid = item.trim();
    if (!uid || uid.length > 128 || next.includes(uid)) continue;
    next.push(uid);
  }
  return next;
}

export function parseCircleInitiateMessagesConfig(data: unknown): CircleInitiateMessagesConfig {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : undefined;
  const enabledAt = rec?.circleInitiateMessagesEnabledAt;
  return {
    allowCircleInitiateMessages: rec?.allowCircleInitiateMessages === true,
    circleInitiateMessageGroups: sanitizeCircleInitiateMessageGroups(
      rec?.circleInitiateMessageGroups,
      { requireProxy: rec?.allowCircleInitiateMessages === true },
    ),
    circleInitiateMessageMemberUids: sanitizeCircleInitiateMessageMemberUids(
      rec?.circleInitiateMessageMemberUids,
    ),
    circleInitiateMessagesEnabledAt: typeof enabledAt === 'number' && enabledAt > 0 ? enabledAt : 0,
  };
}

export function circleInitiateGroupForRole(role: string | undefined): CircleInitiateMessageGroup | null {
  if (!role || !role.trim()) return null;
  const normalized = normalizeMemberRole(role);
  if (normalized === 'proxy') return 'proxy';
  if (normalized === 'caregiver') return 'caregiver';
  if (normalized === 'family') return 'family';
  if (normalized === 'friend') return 'friends';
  return null;
}

export function isCircleInitiateGroupLocked(
  group: CircleInitiateMessageGroup,
  allowEnabled: boolean,
): boolean {
  return allowEnabled && group === 'proxy';
}

export function isCircleInitiateMessagesLockedOff(appMode: string | undefined): boolean {
  return appMode === 'intensive_care';
}

export type CircleInitiateAllowlistPerson = {
  uid: string;
  name: string;
  email?: string;
  status?: string;
  role?: string;
};

export type CircleInitiateAllowlistRow = {
  uid: string;
  name: string;
  role?: string;
};

export function isCircleInitiatePersonCoveredByGroups(
  role: string | undefined,
  groups: readonly CircleInitiateMessageGroup[],
): boolean {
  const group = circleInitiateGroupForRole(role);
  return group != null && groups.includes(group);
}

/** One row per Circle app user. Prefer email, then display name, so re-invites do not duplicate. */
export function uniqueCircleInitiateAllowlistPeople(
  members: CircleInitiateAllowlistPerson[],
): CircleInitiateAllowlistRow[] {
  const byEmail = new Map<string, CircleInitiateAllowlistRow>();
  const withoutEmail: CircleInitiateAllowlistRow[] = [];
  const seenUid = new Set<string>();

  const ranked = [...members].sort((a, b) => {
    const aActive = !a.status || a.status === 'active' ? 1 : 0;
    const bActive = !b.status || b.status === 'active' ? 1 : 0;
    return bActive - aActive;
  });

  for (const member of ranked) {
    const status = member.status || 'active';
    if (status !== 'active') continue;
    const uid = member.uid.trim();
    const name = member.name.trim();
    if (!uid || !name || seenUid.has(uid)) continue;
    const row: CircleInitiateAllowlistRow = { uid, name, role: member.role };
    const email = (member.email || '').trim().toLowerCase();
    if (email) {
      if (byEmail.has(email)) continue;
      byEmail.set(email, row);
      seenUid.add(uid);
      continue;
    }
    seenUid.add(uid);
    withoutEmail.push(row);
  }

  const byName = new Map<string, CircleInitiateAllowlistRow>();
  for (const person of [...byEmail.values(), ...withoutEmail]) {
    const nameKey = person.name.trim().toLowerCase();
    if (byName.has(nameKey)) continue;
    byName.set(nameKey, person);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function effectiveCircleInitiateMessagesEnabled(
  allow: boolean | undefined,
  appMode: string | undefined,
): boolean {
  return allow === true && !isCircleInitiateMessagesLockedOff(appMode);
}

/**
 * Proxy Home nudge: messaging is on, Circle-started messages are still off,
 * and the patient is not in Intensive Care.
 */
export function shouldShowCircleInitiateMessagesReminder(input: {
  enabled: boolean;
  canManageRemoteSettings: boolean;
  appMode: string | null | undefined;
  messagingEnabled: boolean;
  allowCircleInitiateMessages: boolean;
  snoozes: CircleParticipationReminderSnoozes;
  snoozeLoading?: boolean;
  now?: number;
}): boolean {
  if (!input.enabled || !input.canManageRemoteSettings) return false;
  if (input.snoozeLoading) return false;
  if (isCircleInitiateMessagesLockedOff(input.appMode ?? undefined)) return false;
  if (!input.messagingEnabled) return false;
  if (input.allowCircleInitiateMessages) return false;
  const now = input.now ?? Date.now();
  return !isParticipationReminderSnoozed('circleInitiateMessages', input.snoozes, now);
}

export function canCircleMemberInitiateMessage(
  config: CircleInitiateMessagesConfig,
  appMode: string | undefined,
  member: { uid: string; role: string },
): boolean {
  if (!effectiveCircleInitiateMessagesEnabled(config.allowCircleInitiateMessages, appMode)) {
    return false;
  }
  if (config.circleInitiateMessageMemberUids.includes(member.uid)) return true;
  const group = circleInitiateGroupForRole(member.role);
  return group != null && config.circleInitiateMessageGroups.includes(group);
}

/** First enable defaults to proxy-only and stamps enabledAt so the Circle notice can reappear. */
export function withCircleInitiateMessagesTurnedOn(
  current: Partial<CircleInitiateMessagesConfig>,
  now = Date.now(),
): CircleInitiateMessagesConfig {
  const groups = sanitizeCircleInitiateMessageGroups(current.circleInitiateMessageGroups);
  return {
    allowCircleInitiateMessages: true,
    circleInitiateMessageGroups: sanitizeCircleInitiateMessageGroups(groups, { requireProxy: true }),
    circleInitiateMessageMemberUids: sanitizeCircleInitiateMessageMemberUids(
      current.circleInitiateMessageMemberUids,
    ),
    circleInitiateMessagesEnabledAt: now,
  };
}

export function extractCircleInitiateMessagesForRemote(
  preferences: Record<string, unknown>,
  appMode: string | undefined,
): CircleInitiateMessagesConfig {
  const parsed = parseCircleInitiateMessagesConfig(preferences);
  if (isCircleInitiateMessagesLockedOff(appMode ?? (preferences.appMode as string | undefined))) {
    return { ...parsed, allowCircleInitiateMessages: false };
  }
  return parsed;
}

export function isCircleInitiatedPatientThread(
  message: { initiatedBy?: string; senderUid?: string },
  patientId: string,
): boolean {
  if (message.initiatedBy === 'circle') return true;
  return !!message.senderUid && message.senderUid !== patientId;
}

export function parseCircleInitiateMessagesNoticeDismissedByPatient(
  raw: unknown,
): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const next: Record<string, number> = {};
  for (const [patientId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof patientId !== 'string' || !patientId.trim()) continue;
    if (typeof value === 'number' && value > 0) next[patientId] = value;
  }
  return next;
}

export function isCircleInitiateMessagesNoticeDismissed(
  profileData: Record<string, unknown> | undefined,
  patientId: string,
  enabledAt: number,
): boolean {
  if (!enabledAt) return true;
  const byPatient = parseCircleInitiateMessagesNoticeDismissedByPatient(
    profileData?.circleInitiateMessagesNoticeDismissedByPatient,
  );
  return byPatient[patientId] === enabledAt;
}

export async function dismissCircleInitiateMessagesNotice(
  db: Firestore,
  patientId: string,
  memberUid: string,
  enabledAt: number,
): Promise<void> {
  const profileRef = circleProfileOnboardingRef(db, memberUid);
  const profileSnap = await getDoc(profileRef);
  const byPatient = profileSnap.exists()
    ? parseCircleInitiateMessagesNoticeDismissedByPatient(
        profileSnap.data()?.circleInitiateMessagesNoticeDismissedByPatient,
      )
    : {};

  await setDoc(
    profileRef,
    {
      uid: memberUid,
      circleInitiateMessagesNoticeDismissedByPatient: {
        ...byPatient,
        [patientId]: enabledAt,
      },
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
