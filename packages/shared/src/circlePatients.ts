import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { CircleInviteRecord } from './circleInvites';

export interface CirclePatientSummary {
  patientId: string;
  displayName: string;
  role: string;
  canUpload: boolean;
}

/** Patients this circle user may access (accepted invites + active member doc). */
export async function listCirclePatientsForUser(
  db: Firestore,
  uid: string,
): Promise<CirclePatientSummary[]> {
  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );

  const summaries: CirclePatientSummary[] = [];

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const memberSnap = await getDoc(doc(db, 'patients', invite.patientId, 'members', uid));
    const member = memberSnap.exists() ? memberSnap.data() : null;
    const patientSnap = await getDoc(doc(db, 'patients', invite.patientId));
    const patientName =
      (patientSnap.exists() && String(patientSnap.data()?.displayName || '')) ||
      invite.displayName ||
      'Patient';

    summaries.push({
      patientId: invite.patientId,
      displayName: patientName,
      role: String(member?.role || invite.role),
      canUpload: !!member?.capabilities?.richMediaUpload,
    });
  }

  return summaries;
}
