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
import { circleInviteDocId, type CircleInviteRecord, type CircleInviteStatus } from './circleInvites';
import { normalizeInviteEmail } from './patientPermissions';

export interface CircleInviteListItem {
  id: string;
  invitedEmail: string;
  displayName?: string;
  role: string;
  status: CircleInviteStatus;
  updatedAt: number;
  acceptedByUid?: string;
}

/** List circle invites for a patient (proxy / patient owner). */
export async function listCircleInvitesForPatient(
  db: Firestore,
  patientId: string,
): Promise<CircleInviteListItem[]> {
  const invitesSnap = await getDocs(
    query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
  );
  return invitesSnap.docs
    .map((inviteDoc) => {
      const data = inviteDoc.data() as Partial<CircleInviteRecord> & {
        acceptedByUid?: string;
      };
      const status = (data.status || 'pending') as CircleInviteStatus;
      return {
        id: inviteDoc.id,
        invitedEmail: data.invitedEmail || '',
        displayName: data.displayName,
        role: data.role || 'member',
        status,
        updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
        acceptedByUid: typeof data.acceptedByUid === 'string' ? data.acceptedByUid : undefined,
      };
    })
    .filter((item) => item.invitedEmail)
    .sort((a, b) => {
      const statusOrder = { accepted: 0, pending: 1, revoked: 2 };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return (a.displayName || a.invitedEmail).localeCompare(b.displayName || b.invitedEmail);
    });
}

/** Revoke circle access for an invited email (proxy / patient owner). */
export async function revokeCircleInviteByEmail(
  db: Firestore,
  patientId: string,
  invitedEmail: string,
  options: { actorUid?: string } = {},
): Promise<boolean> {
  const email = normalizeInviteEmail(invitedEmail);
  if (!email) return false;

  const inviteRef = doc(db, 'circle_invites', circleInviteDocId(patientId, email));
  const existing = await getDoc(inviteRef);
  if (!existing.exists()) return false;

  const data = existing.data();
  const status = data?.status as CircleInviteStatus | undefined;
  if (status === 'revoked') return false;

  const actorUid = options.actorUid?.trim();
  const acceptedByUid = typeof data?.acceptedByUid === 'string' ? data.acceptedByUid.trim() : '';
  if (actorUid && acceptedByUid && actorUid === acceptedByUid) {
    return false;
  }

  const batch = writeBatch(db);
  batch.update(inviteRef, {
    status: 'revoked',
    updatedAt: Date.now(),
  });

  if (acceptedByUid) {
    batch.delete(doc(db, 'patients', patientId, 'members', acceptedByUid));
  }

  await batch.commit();
  return true;
}
