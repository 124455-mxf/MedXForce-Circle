import type { CircleMemberRole, PatientCapabilities, PatientMemberRecord } from './patientPermissions';
import { mergeMemberCapabilities, normalizeInviteEmail } from './patientPermissions';

export type CircleInviteStatus = 'pending' | 'accepted' | 'revoked';

export interface CircleInviteRecord {
  patientId: string;
  invitedEmail: string;
  role: CircleMemberRole;
  capabilities: PatientCapabilities;
  displayName?: string;
  contactId?: string;
  status: CircleInviteStatus;
  acceptedByUid?: string;
  /** Set when the circle member leaves voluntarily (leaveCircleForPatient). */
  leftByUid?: string;
  createdAt: number;
  updatedAt: number;
}

export function buildCircleInviteRecord(params: {
  patientId: string;
  invitedEmail: string;
  role: CircleMemberRole;
  capabilities: PatientCapabilities;
  displayName?: string;
  contactId?: string;
}): CircleInviteRecord {
  const now = Date.now();
  const record: CircleInviteRecord = {
    patientId: params.patientId,
    invitedEmail: params.invitedEmail.trim().toLowerCase(),
    role: params.role,
    capabilities: params.capabilities,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  if (params.displayName?.trim()) {
    record.displayName = params.displayName.trim();
  }
  if (params.contactId?.trim()) {
    record.contactId = params.contactId.trim();
  }
  return record;
}

export function memberRecordFromInvite(
  invite: CircleInviteRecord,
  _uid: string,
): PatientMemberRecord {
  const role = invite.role;
  const capabilities = mergeMemberCapabilities(role, invite.capabilities);
  const record: PatientMemberRecord = {
    role,
    capabilities,
    status: 'active',
    invitedEmail: invite.invitedEmail,
    updatedAt: Date.now(),
  };
  if (invite.displayName?.trim()) {
    record.displayName = invite.displayName.trim();
  }
  if (invite.contactId?.trim()) {
    record.contactId = invite.contactId.trim();
  }
  return record;
}

export function circleInviteDocId(patientId: string, invitedEmail: string): string {
  const email = normalizeInviteEmail(invitedEmail);
  return `${patientId}_${email.replace(/[@.]/g, '_')}`;
}
