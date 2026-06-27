import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

export type GalleryPersonMediaTagDoc = {
  personId: string;
  personName?: string;
  personRelationship?: string;
  /** Manual People & Faces tags (Circle or patient tagging UI). */
  manualMediaIds: string[];
  /** Legacy field — may contain reaction auto-tags; not used for People & Faces. */
  legacyMediaIds?: string[];
  updatedAt: number;
  lastTaggedByUid?: string;
};

export type GalleryTagPerson = {
  id: string;
  name: string;
  relationship?: string;
};

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : [];
}

function normalizeTagDoc(personId: string, data: Record<string, unknown>): GalleryPersonMediaTagDoc {
  return {
    personId,
    personName: typeof data.personName === 'string' ? data.personName : undefined,
    personRelationship:
      typeof data.personRelationship === 'string' ? data.personRelationship : undefined,
    manualMediaIds: normalizeStringArray(data.manualMediaIds),
    legacyMediaIds: normalizeStringArray(data.mediaIds),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    lastTaggedByUid:
      typeof data.lastTaggedByUid === 'string' ? data.lastTaggedByUid : undefined,
  };
}

/** Media ids that count toward People & Faces for one tag document. */
export function peopleFacesMediaIdsForTag(tag: GalleryPersonMediaTagDoc): string[] {
  return tag.manualMediaIds;
}

/** Legacy reaction auto-tags stored in `mediaIds` before reactions were decoupled. */
export function legacyReactionMediaIdsForTag(tag: GalleryPersonMediaTagDoc): string[] {
  return tag.legacyMediaIds ?? [];
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
    manualMediaIds: params.currentlyTagged
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
  const tag = tags.find((t) => t.personId === personId);
  return tag ? peopleFacesMediaIdsForTag(tag) : [];
}

export function peopleTaggedOnMedia(
  people: GalleryTagPerson[],
  tags: GalleryPersonMediaTagDoc[],
  mediaId: string,
): GalleryTagPerson[] {
  const taggedIds = new Set(
    tags.filter((t) => peopleFacesMediaIdsForTag(t).includes(mediaId)).map((t) => t.personId),
  );
  return people.filter((p) => taggedIds.has(p.id));
}

export function createGalleryPersonId(): string {
  return `person_${Date.now()}`;
}
