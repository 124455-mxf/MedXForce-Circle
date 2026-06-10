import { doc, writeBatch, type Firestore } from 'firebase/firestore';
import { circleInviteRefForPatientEmail, lookupCircleInviteByPatientEmail } from './circleInvites';
import { normalizeInviteEmail } from './patientPermissions';

/** Circle member voluntarily ends access for one patient (same outcome as patient revoke). */
export async function leaveCircleForPatient(
  db: Firestore,
  params: { uid: string; patientId: string; email: string },
): Promise<boolean> {
  const email = normalizeInviteEmail(params.email);
  if (!email) return false;

  const invite = await lookupCircleInviteByPatientEmail(db, params.patientId, email);
  if (!invite.exists) return false;

  const inviteRef = circleInviteRefForPatientEmail(db, params.patientId, email, invite.id);
  const data = invite.data;
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
