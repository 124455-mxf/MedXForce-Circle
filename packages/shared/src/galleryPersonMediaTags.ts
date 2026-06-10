import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

export type GalleryPersonMediaTagDoc = {
  personId: string;
  personName?: string;
  personRelationship?: string;
  mediaIds: string[];
  updatedAt: number;
  lastTaggedByUid?: string;
};

export type GalleryTagPerson = {
  id: string;
  name: string;
  relationship?: string;
};

function normalizeTagDoc(
  personId: string,
  data: Record<string, unknown>,
): GalleryPersonMediaTagDoc {
  const mediaIds = Array.isArray(data.mediaIds)
    ? data.mediaIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    personId,
    personName: typeof data.personName === 'string' ? data.personName : undefined,
    personRelationship:
      typeof data.personRelationship === 'string' ? data.personRelationship : undefined,
    mediaIds,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    lastTaggedByUid:
      typeof data.lastTaggedByUid === 'string' ? data.lastTaggedByUid : undefined,
  };
}

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

export function listenGalleryPersonMediaTags(
  db: Firestore,
  patientId: string | undefined,
  onChange: (docs: GalleryPersonMediaTagDoc[]) => void,
): () => void {
  if (!patientId) {
    onChange([]);
    return () => undefined;
  }

  const tagsRef = collection(db, 'patients', patientId, 'gallery_person_media_tags');
  return onSnapshot(
    tagsRef,
    (snapshot) => {
      onChange(snapshot.docs.map((snap) => normalizeTagDoc(snap.id, snap.data())));
    },
    () => onChange([]),
  );
}

export async function toggleGalleryPersonMediaTag(
  db: Firestore,
  params: {
    patientId: string;
    person: GalleryTagPerson;
    mediaId: string;
    taggedByUid: string;
    currentlyTagged: boolean;
  },
): Promise<void> {
  const ref = doc(db, 'patients', params.patientId, 'gallery_person_media_tags', params.person.id);
  const payload: Record<string, unknown> = {
    personId: params.person.id,
    personName: params.person.name,
    updatedAt: Date.now(),
    lastTaggedByUid: params.taggedByUid,
    mediaIds: params.currentlyTagged
      ? arrayRemove(params.mediaId)
      : arrayUnion(params.mediaId),
  };
  if (params.person.relationship) {
    payload.personRelationship = params.person.relationship;
  }
  await setDoc(ref, payload, { merge: true });
}

export function mediaIdsForPerson(
  tags: GalleryPersonMediaTagDoc[],
  personId: string,
): string[] {
  return tags.find((t) => t.personId === personId)?.mediaIds ?? [];
}

export function peopleTaggedOnMedia(
  people: GalleryTagPerson[],
  tags: GalleryPersonMediaTagDoc[],
  mediaId: string,
): GalleryTagPerson[] {
  const taggedIds = new Set(
    tags.filter((t) => t.mediaIds.includes(mediaId)).map((t) => t.personId),
  );
  return people.filter((p) => taggedIds.has(p.id));
}

export function createGalleryPersonId(): string {
  return `person_${Date.now()}`;
}
