import { collection, doc, getDoc, getDocs, query, where, type Firestore } from 'firebase/firestore';
import { normalizeInviteEmail } from '@medxforce/shared';

/** Circle member profile photos keyed by normalized invite email. */
export async function loadCircleMapPhotosByEmail(
  db: Firestore,
  patientId: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const snap = await getDocs(
      query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
    );
    await Promise.all(
      snap.docs.map(async (inviteDoc) => {
        const invite = inviteDoc.data() as {
          status?: string;
          acceptedByUid?: string;
          invitedEmail?: string;
        };
        if (invite.status !== 'accepted' || !invite.acceptedByUid || !invite.invitedEmail) {
          return;
        }
        const email = normalizeInviteEmail(invite.invitedEmail);
        const profileSnap = await getDoc(doc(db, 'circle_profiles', invite.acceptedByUid));
        const photoUrl = profileSnap.exists()
          ? String(profileSnap.data()?.photoUrl || '').trim()
          : '';
        if (photoUrl) result[email] = photoUrl;
      }),
    );
  } catch {
    /* optional enrichment */
  }
  return result;
}

/** Circle profile photos keyed by contact id on the patient record. */
export async function loadCircleMapPhotosByContactId(
  db: Firestore,
  patientId: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const snap = await getDocs(
      query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
    );
    await Promise.all(
      snap.docs.map(async (inviteDoc) => {
        const invite = inviteDoc.data() as {
          status?: string;
          acceptedByUid?: string;
          contactId?: string;
        };
        if (invite.status !== 'accepted' || !invite.acceptedByUid || !invite.contactId) {
          return;
        }
        const profileSnap = await getDoc(doc(db, 'circle_profiles', invite.acceptedByUid));
        const photoUrl = profileSnap.exists()
          ? String(profileSnap.data()?.photoUrl || '').trim()
          : '';
        if (photoUrl) result[invite.contactId] = photoUrl;
      }),
    );
  } catch {
    /* optional enrichment */
  }
  return result;
}
