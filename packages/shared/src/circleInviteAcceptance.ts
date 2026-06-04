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
  type PatientCapabilities,
} from './patientPermissions';
import type { CircleInviteRecord } from './circleInvites';
import { memberRecordFromInvite } from './circleInvites';
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
