import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
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
  proxyTier?: 'primary' | 'backup';
  /** Set when the circle member leaves voluntarily (leaveCircleForPatient). */
  leftByUid?: string;
  createdAt: number;
  updatedAt: number;
  /** When the introduction / invite email was sent (patient API). */
  introductionEmailSentAt?: number;
  introductionReminderSentAt?: number;
  /** Accept demoted from proxy because primary/backup slot was already filled. */
  proxySlotDemotedAt?: number;
  proxySlotDemotedTo?: CircleMemberRole;
  requestedProxyTier?: 'primary' | 'backup';
  proxySlotHeldByEmail?: string;
}

export function buildCircleInviteRecord(params: {
  patientId: string;
  invitedEmail: string;
  role: CircleMemberRole;
  capabilities: PatientCapabilities;
  displayName?: string;
  contactId?: string;
  proxyTier?: 'primary' | 'backup';
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
  if (params.role === 'proxy') {
    record.proxyTier = params.proxyTier === 'backup' ? 'backup' : 'primary';
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
  if (invite.role === 'proxy') {
    record.proxyTier = invite.proxyTier === 'backup' ? 'backup' : 'primary';
  }
  return record;
}

export function circleInviteDocId(patientId: string, invitedEmail: string): string {
  const email = normalizeInviteEmail(invitedEmail);
  return `${patientId}_${email.replace(/[@.]/g, '_')}`;
}

export type CircleInviteLookup =
  | { exists: false }
  | { exists: true; ref: DocumentReference; id: string; data: CircleInviteRecord };

/**
 * Look up an invite by patient + email.
 * Avoids listing all invites for a patient (caregiver/family/friend cannot read others'
 * invites — that query returns permission-denied). Prefer deterministic doc id, then
 * an invitee-scoped email query.
 */
export async function lookupCircleInviteByPatientEmail(
  db: Firestore,
  patientId: string,
  invitedEmail: string,
): Promise<CircleInviteLookup> {
  const email = normalizeInviteEmail(invitedEmail);
  const scopedPatientId = patientId.trim();
  if (!email || !scopedPatientId) return { exists: false };

  const directRef = doc(db, 'circle_invites', circleInviteDocId(scopedPatientId, email));
  try {
    const direct = await getDoc(directRef);
    if (direct.exists()) {
      return {
        exists: true,
        ref: direct.ref,
        id: direct.id,
        data: direct.data() as CircleInviteRecord,
      };
    }
  } catch {
    /* fall through to email query / not found */
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'circle_invites'), where('invitedEmail', '==', email)),
    );
    const match = snap.docs.find(
      (inviteDoc) => String(inviteDoc.data().patientId ?? '').trim() === scopedPatientId,
    );
    if (!match) return { exists: false };
    return {
      exists: true,
      ref: match.ref,
      id: match.id,
      data: match.data() as CircleInviteRecord,
    };
  } catch {
    return { exists: false };
  }
}

/** Invite ref — uses existing doc id when already stored under a legacy id. */
export function circleInviteRefForPatientEmail(
  db: Firestore,
  patientId: string,
  invitedEmail: string,
  existingId?: string,
): DocumentReference {
  const id = existingId?.trim() || circleInviteDocId(patientId, invitedEmail);
  return doc(db, 'circle_invites', id);
}
