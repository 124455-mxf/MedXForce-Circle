import {
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

/** Circle member tags a photo for their linked Friends & Family / caregiver contact. */
export async function tagGalleryMediaForCircleMember(
  db: Firestore,
  params: { patientId: string; mediaId: string; circleMemberUid: string },
): Promise<void> {
  const memberSnap = await getDoc(
    doc(db, 'patients', params.patientId, 'members', params.circleMemberUid),
  );
  const contactId =
    typeof memberSnap.data()?.contactId === 'string' ? memberSnap.data()!.contactId.trim() : '';
  if (!contactId) return;

  await setDoc(
    doc(db, 'patients', params.patientId, 'gallery_person_media_tags', contactId),
    {
      personId: contactId,
      mediaIds: arrayUnion(params.mediaId),
      updatedAt: Date.now(),
      lastTaggedByUid: params.circleMemberUid,
    },
    { merge: true },
  );
}
