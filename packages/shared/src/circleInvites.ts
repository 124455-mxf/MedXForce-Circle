import type { CircleMemberRole, PatientCapabilities, PatientMemberRecord } from './patientPermissions';
import { normalizeInviteEmail } from './patientPermissions';

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
  return {
    patientId: params.patientId,
    invitedEmail: params.invitedEmail.trim().toLowerCase(),
    role: params.role,
    capabilities: params.capabilities,
    displayName: params.displayName,
    contactId: params.contactId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

export function memberRecordFromInvite(
  invite: CircleInviteRecord,
  uid: string,
): PatientMemberRecord {
  return {
    role: invite.role,
    capabilities: invite.capabilities,
    status: 'active',
    displayName: invite.displayName,
    invitedEmail: invite.invitedEmail,
    contactId: invite.contactId,
    inviteRef: undefined,
    updatedAt: Date.now(),
  };
}

export function circleInviteDocId(patientId: string, invitedEmail: string): string {
  const email = normalizeInviteEmail(invitedEmail);
  return `${patientId}_${email.replace(/[@.]/g, '_')}`;
}
