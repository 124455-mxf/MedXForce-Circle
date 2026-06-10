import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import {
  createGalleryPersonId,
  listenGalleryPersonMediaTags,
  mediaIdsForPerson,
  peopleTaggedOnMedia,
  toggleGalleryPersonMediaTag,
  type GalleryPersonMediaTagDoc,
  type GalleryTagPerson,
} from '@medxforce/shared';

function contactToPerson(entry: Record<string, unknown>): GalleryTagPerson | null {
  const id = typeof entry.id === 'string' ? entry.id.trim() : '';
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!id || !name) return null;
  const relationship =
    (typeof entry.type === 'string' && entry.type) ||
    (typeof entry.relationship === 'string' && entry.relationship) ||
    undefined;
  return { id, name, relationship };
}

function mergePeopleFromTags(
  contacts: GalleryTagPerson[],
  tags: GalleryPersonMediaTagDoc[],
): GalleryTagPerson[] {
  const byId = new Map(contacts.map((p) => [p.id, p]));
  for (const tag of tags) {
    if (byId.has(tag.personId)) continue;
    const name = tag.personName?.trim();
    if (!name) continue;
    byId.set(tag.personId, {
      id: tag.personId,
      name,
      relationship: tag.personRelationship,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function useGalleryPersonTagging(
  db: Firestore,
  patientId: string | undefined,
  patientDisplayName: string,
  viewerUid: string | undefined,
) {
  const [tags, setTags] = useState<GalleryPersonMediaTagDoc[]>([]);
  const [contactPeople, setContactPeople] = useState<GalleryTagPerson[]>([]);

  useEffect(() => {
    if (!patientId) {
      setContactPeople([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const snap = await getDoc(doc(db, 'patients', patientId));
      if (cancelled || !snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      const lists = [
        ...(Array.isArray(data.caregivers) ? data.caregivers : []),
        ...(Array.isArray(data.friendsAndFamily) ? data.friendsAndFamily : []),
        ...(Array.isArray(data.contacts) ? data.contacts : []),
      ] as Record<string, unknown>[];
      const people = lists
        .map(contactToPerson)
        .filter((p): p is GalleryTagPerson => !!p);
      const lovedOne: GalleryTagPerson = {
        id: patientId,
        name: patientDisplayName || 'Your loved one',
        relationship: 'Patient',
      };
      const merged = new Map<string, GalleryTagPerson>();
      merged.set(lovedOne.id, lovedOne);
      for (const person of people) merged.set(person.id, person);
      setContactPeople(Array.from(merged.values()));
    })();
    return () => {
      cancelled = true;
    };
  }, [db, patientId, patientDisplayName]);

  useEffect(() => {
    return listenGalleryPersonMediaTags(db, patientId, setTags);
  }, [db, patientId]);

  const people = useMemo(
    () => mergePeopleFromTags(contactPeople, tags),
    [contactPeople, tags],
  );

  const getTaggedOnMedia = useCallback(
    (mediaId: string) => peopleTaggedOnMedia(people, tags, mediaId),
    [people, tags],
  );

  const isPersonTaggedOnMedia = useCallback(
    (personId: string, mediaId: string) =>
      mediaIdsForPerson(tags, personId).includes(mediaId),
    [tags],
  );

  const togglePersonOnMedia = useCallback(
    async (person: GalleryTagPerson, mediaId: string) => {
      if (!patientId || !viewerUid) return;
      const currentlyTagged = isPersonTaggedOnMedia(person.id, mediaId);
      await toggleGalleryPersonMediaTag(db, {
        patientId,
        person,
        mediaId,
        taggedByUid: viewerUid,
        currentlyTagged,
      });
    },
    [db, isPersonTaggedOnMedia, patientId, viewerUid],
  );

  const createPersonOnMedia = useCallback(
    async (name: string, relationship: string, mediaId: string) => {
      if (!patientId || !viewerUid) return null;
      const trimmedName = name.trim();
      if (!trimmedName) return null;
      const person: GalleryTagPerson = {
        id: createGalleryPersonId(),
        name: trimmedName,
        relationship: relationship.trim() || undefined,
      };
      await toggleGalleryPersonMediaTag(db, {
        patientId,
        person,
        mediaId,
        taggedByUid: viewerUid,
        currentlyTagged: false,
      });
      return person;
    },
    [db, patientId, viewerUid],
  );

  return {
    people,
    getTaggedOnMedia,
    isPersonTaggedOnMedia,
    togglePersonOnMedia,
    createPersonOnMedia,
  };
}
