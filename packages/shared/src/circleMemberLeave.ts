import {
  doc,
  getDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { circleInviteDocId } from './circleInvites';
import { normalizeInviteEmail } from './patientPermissions';

/** Circle member voluntarily ends access for one patient (same outcome as patient revoke). */
export async function leaveCircleForPatient(
  db: Firestore,
  params: { uid: string; patientId: string; email: string },
): Promise<boolean> {
  const email = normalizeInviteEmail(params.email);
  if (!email) return false;

  const inviteRef = doc(db, 'circle_invites', circleInviteDocId(params.patientId, email));
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) return false;

  const data = inviteSnap.data();
  if (data.status !== 'accepted' || data.acceptedByUid !== params.uid) {
    return false;
  }

  const batch = writeBatch(db);
  batch.update(inviteRef, {
    status: 'revoked',
    leftByUid: params.uid,
    updatedAt: Date.now(),
  });
  batch.delete(doc(db, 'patients', params.patientId, 'members', params.uid));
  await batch.commit();
  return true;
}
