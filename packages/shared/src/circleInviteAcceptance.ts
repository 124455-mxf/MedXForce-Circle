import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { normalizeInviteEmail } from './patientPermissions';
import type { CircleInviteRecord } from './circleInvites';
import { memberRecordFromInvite } from './circleInvites';

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

  await batch.commit();
  return patientIds;
}
