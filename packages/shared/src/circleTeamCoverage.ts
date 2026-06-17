import type { CircleManagedContact } from './circleContactManagement';
import type { CircleInviteListItem } from './circleMemberManagement';
import { circleMemberRoleFromManagedContact } from './circleMemberRoles';
import { normalizeInviteEmail, normalizeMemberRole } from './patientPermissions';

export type TeamCoverageGap = 'backupProxy' | 'otherCaregivers';

export type TeamCoverageAnalysis = {
  hasBackupProxy: boolean;
  caregiverCount: number;
  gaps: TeamCoverageGap[];
};

function isActiveInvite(status: string): boolean {
  return status !== 'revoked';
}

/** Minimum caregivers on the team before the "add another caregiver" nudge clears. */
export const MIN_CAREGIVERS_FOR_TEAM_COVERAGE = 2;

export function analyzeCircleTeamCoverage(
  contacts: CircleManagedContact[],
  invites: CircleInviteListItem[],
): TeamCoverageAnalysis {
  const backupProxyEmails = new Set<string>();
  const caregiverEmails = new Set<string>();

  for (const contact of contacts) {
    const email = normalizeInviteEmail(contact.email);
    if (!email) continue;

    const role = circleMemberRoleFromManagedContact(contact);
    if (role === 'proxy' && contact.proxyTier === 'backup') {
      backupProxyEmails.add(email);
    }
    if (role === 'caregiver') {
      caregiverEmails.add(email);
    }
  }

  for (const invite of invites) {
    if (!isActiveInvite(invite.status)) continue;
    const email = normalizeInviteEmail(invite.invitedEmail);
    if (!email) continue;

    const role = normalizeMemberRole(invite.role);
    if (role === 'proxy' && invite.proxyTier === 'backup') {
      backupProxyEmails.add(email);
    }
    if (role === 'caregiver') {
      caregiverEmails.add(email);
    }
  }

  const hasBackupProxy = backupProxyEmails.size > 0;
  const caregiverCount = caregiverEmails.size;
  const gaps: TeamCoverageGap[] = [];
  if (!hasBackupProxy) gaps.push('backupProxy');
  if (caregiverCount < MIN_CAREGIVERS_FOR_TEAM_COVERAGE) gaps.push('otherCaregivers');

  return { hasBackupProxy, caregiverCount, gaps };
}

export function shouldShowTeamCoverageReminder(input: {
  enabled: boolean;
  gaps: TeamCoverageGap[];
  loading: boolean;
  snoozedUntil: number | undefined;
  now?: number;
}): boolean {
  if (!input.enabled || input.loading) return false;
  if (input.gaps.length === 0) return false;
  const now = input.now ?? Date.now();
  if (input.snoozedUntil != null && input.snoozedUntil > now) return false;
  return true;
}
