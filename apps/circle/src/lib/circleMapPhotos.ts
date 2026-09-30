import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore';
import { normalizeInviteEmail } from '@medxforce/shared';

type MemberPhotoMaps = {
  byEmail: Record<string, string>;
  byContactId: Record<string, string>;
  uidByEmail: Record<string, string>;
  uidByContactId: Record<string, string>;
};

/**
 * Load Circle member profile photos for a patient.
 *
 * Uses `patients/{id}/members` (readable by circle members). Listing
 * `circle_invites` only returns invites the viewer can read (usually their own),
 * so invite-based loads missed almost everyone else's photos.
 */
export async function loadCircleMapPhotoMaps(
  db: Firestore,
  patientId: string,
): Promise<MemberPhotoMaps> {
  const byEmail: Record<string, string> = {};
  const byContactId: Record<string, string> = {};
  const uidByEmail: Record<string, string> = {};
  const uidByContactId: Record<string, string> = {};
  try {
    const membersSnap = await getDocs(collection(db, 'patients', patientId, 'members'));
    await Promise.all(
      membersSnap.docs.map(async (memberDoc) => {
        const data = memberDoc.data() as {
          status?: string;
          invitedEmail?: string;
          contactId?: string;
        };
        if (data.status && data.status !== 'active') return;

        const uid = memberDoc.id;
        const email = normalizeInviteEmail(String(data.invitedEmail || ''));
        const contactId = typeof data.contactId === 'string' ? data.contactId.trim() : '';
        if (email) uidByEmail[email] = uid;
        if (contactId) uidByContactId[contactId] = uid;

        const profileSnap = await getDoc(doc(db, 'circle_profiles', memberDoc.id));
        const photoUrl = profileSnap.exists()
          ? String(profileSnap.data()?.photoUrl || '').trim()
          : '';
        if (!photoUrl) return;

        if (email) byEmail[email] = photoUrl;
        if (contactId) byContactId[contactId] = photoUrl;
      }),
    );
  } catch {
    /* optional enrichment */
  }
  return { byEmail, byContactId, uidByEmail, uidByContactId };
}

/** Circle member profile photos keyed by normalized invite email. */
export async function loadCircleMapPhotosByEmail(
  db: Firestore,
  patientId: string,
): Promise<Record<string, string>> {
  const { byEmail } = await loadCircleMapPhotoMaps(db, patientId);
  return byEmail;
}

/** Circle profile photos keyed by contact id on the patient record. */
export async function loadCircleMapPhotosByContactId(
  db: Firestore,
  patientId: string,
): Promise<Record<string, string>> {
  const { byContactId } = await loadCircleMapPhotoMaps(db, patientId);
  return byContactId;
}
