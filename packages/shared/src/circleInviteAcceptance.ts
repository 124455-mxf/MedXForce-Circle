import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  mergeMemberCapabilities,
  normalizeInviteEmail,
  normalizeMemberRole,
  capabilitiesForRole,
  type PatientCapabilities,
} from './patientPermissions';
import type { CircleInviteRecord } from './circleInvites';
import { memberRecordFromInvite } from './circleInvites';
import { type ProxyTier, publishCircleAccessIndexFromPatientDoc, resolveCircleAccessForInviteEmail } from './circleMemberRoles';
import {
  hasRepairedMemberCapabilitiesThisSession,
  isFirestoreQuotaError,
  markMemberCapabilitiesRepairedThisSession,
} from './firestoreQuota';

function memberDocNeedsCapabilityRepair(
  stored: Partial<PatientCapabilities> | undefined,
  role: string,
  inviteCaps?: PatientCapabilities,
): boolean {
  if (stored?.messaging === true) return false;
  const merged = mergeMemberCapabilities(role, inviteCaps);
  return merged.messaging === true;
}

/** After sign-in: link pending invites to members/{uid} for upload rules. */
export async function acceptPendingCircleInvites(
  db: Firestore,
  user: User,
): Promise<string[]> {
  const email = user.email ? normalizeInviteEmail(user.email) : '';
  if (!email) return [];

  const pending = query(
    collection(db, 'circle_invites'),
    where('invitedEmail', '==', email),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(pending);
  if (snap.empty) return [];

  const batch = writeBatch(db);
  const patientIds: string[] = [];

  snap.forEach((inviteDoc) => {
    const invite = inviteDoc.data() as CircleInviteRecord;
    patientIds.push(invite.patientId);

    batch.set(doc(db, 'patients', invite.patientId, 'members', user.uid), {
      ...memberRecordFromInvite(invite, user.uid),
      inviteRef: inviteDoc.id,
    });

    batch.update(inviteDoc.ref, {
      status: 'accepted',
      acceptedByUid: user.uid,
      updatedAt: Date.now(),
    });
  });

  try {
    await batch.commit();
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      console.warn('[Circle] Invite acceptance skipped — Firestore daily write quota exceeded.');
      return [];
    }
    throw err;
  }

  return patientIds;
}

/**
 * One-time backfill for legacy member docs missing `capabilities.messaging`.
 * Reads first and skips writes when already OK (avoids burning free-tier quota).
 */
export async function ensureMemberCapabilitiesForUser(
  db: Firestore,
  uid: string,
): Promise<void> {
  if (hasRepairedMemberCapabilitiesThisSession(uid)) return;

  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) {
    markMemberCapabilitiesRepairedThisSession(uid);
    return;
  }

  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const memberRef = doc(db, 'patients', invite.patientId, 'members', uid);
    const memberSnap = await getDoc(memberRef);
    const stored = memberSnap.exists()
      ? (memberSnap.data()?.capabilities as Partial<PatientCapabilities> | undefined)
      : undefined;

    if (!memberDocNeedsCapabilityRepair(stored, invite.role, invite.capabilities)) {
      continue;
    }

    const capabilities = mergeMemberCapabilities(invite.role, invite.capabilities);
    batch.set(
      memberRef,
      {
        role: invite.role,
        capabilities,
        invitedEmail: invite.invitedEmail,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    pendingWrites += 1;
  }

  if (pendingWrites === 0) {
    markMemberCapabilitiesRepairedThisSession(uid);
    return;
  }

  try {
    await batch.commit();
    markMemberCapabilitiesRepairedThisSession(uid);
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      console.warn(
        '[Circle] Capability backfill skipped — Firestore daily write quota exceeded. Reload after midnight Pacific.',
      );
      return;
    }
    throw err;
  }
}

function memberRoleNeedsRepair(
  memberRole: string | undefined,
  memberProxyTier: ProxyTier | undefined,
  memberCaps: Partial<PatientCapabilities> | undefined,
  expectedRole: ReturnType<typeof normalizeMemberRole>,
  expectedProxyTier: ProxyTier | undefined,
  expectedCaps: PatientCapabilities,
): boolean {
  if (normalizeMemberRole(String(memberRole || '')) !== expectedRole) return true;
  if (expectedProxyTier && memberProxyTier !== expectedProxyTier) return true;
  if (memberCaps?.inviteMembers !== expectedCaps.inviteMembers) return true;
  if (memberCaps?.remoteSettings !== expectedCaps.remoteSettings) return true;
  return memberDocNeedsCapabilityRepair(memberCaps, expectedRole, expectedCaps);
}

/**
 * Align member doc with accepted invite (patient-app sync updates invites; member may lag).
 * Circle members may only update their own member doc — not invites.
 */
export async function reconcileAcceptedMemberRolesForUser(
  db: Firestore,
  uid: string,
): Promise<void> {
  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) return;

  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientSnap = await getDoc(doc(db, 'patients', invite.patientId));
    const patientData = patientSnap.exists() ? patientSnap.data() : null;

    try {
      await publishCircleAccessIndexFromPatientDoc(
        db,
        invite.patientId,
        patientData as {
          caregivers?: Record<string, unknown>[];
          friendsAndFamily?: Record<string, unknown>[];
          circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
        },
      );
    } catch (err) {
      if (!isFirestoreQuotaError(err)) {
        console.warn('[Circle] Access index publish skipped —', err);
      }
    }

    const memberRef = doc(db, 'patients', invite.patientId, 'members', uid);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) continue;

    const memberData = memberSnap.data();
    const memberCaps = memberData?.capabilities as Partial<PatientCapabilities> | undefined;
    const memberProxyTier = memberData?.proxyTier as ProxyTier | undefined;

    const resolved = resolveCircleAccessForInviteEmail(
      patientData as {
        caregivers?: Record<string, unknown>[];
        friendsAndFamily?: Record<string, unknown>[];
        circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
      },
      invite.invitedEmail,
      {
        memberRole: String(memberData?.role || ''),
        memberProxyTier,
        inviteRole: invite.role,
        inviteProxyTier:
          invite.proxyTier === 'backup' || invite.proxyTier === 'primary'
            ? invite.proxyTier
            : undefined,
      },
    );

    const role = normalizeMemberRole(resolved.role);
    const capabilities = mergeMemberCapabilities(role, capabilitiesForRole(role));
    const proxyTier =
      role === 'proxy' &&
      (resolved.proxyTier === 'backup' || resolved.proxyTier === 'primary')
        ? resolved.proxyTier
        : undefined;

    // Never downgrade a member to caregiver when patient contacts still list them as proxy.
    const currentRole = normalizeMemberRole(String(memberData?.role || ''));
    if (
      currentRole === 'proxy' &&
      role !== 'proxy' &&
      patientData &&
      resolveCircleAccessForInviteEmail(
        patientData as {
          caregivers?: Record<string, unknown>[];
          friendsAndFamily?: Record<string, unknown>[];
        },
        invite.invitedEmail,
      )?.role === 'proxy'
    ) {
      continue;
    }

    const memberNeedsUpdate = memberRoleNeedsRepair(
      String(memberData?.role || ''),
      memberProxyTier,
      memberCaps,
      role,
      proxyTier,
      capabilities,
    );

    if (!memberNeedsUpdate) continue;

    batch.set(
      memberRef,
      {
        role,
        capabilities,
        ...(proxyTier ? { proxyTier } : {}),
        invitedEmail: invite.invitedEmail,
        inviteRef: memberData?.inviteRef || inviteDoc.id,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    pendingWrites += 1;
  }

  if (pendingWrites === 0) return;

  try {
    await batch.commit();
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      console.warn('[Circle] Role reconcile skipped — Firestore daily write quota exceeded.');
      return;
    }
    console.warn('[Circle] Role reconcile skipped —', err);
  }
}
