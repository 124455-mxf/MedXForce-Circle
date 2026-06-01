import { useCallback, useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  tagGalleryMediaForCircleMember,
  type GalleryReactionRecord,
} from '@medxforce/shared';
function mergeReactionsIntoMap(
  target: Record<string, GalleryReactionRecord[]>,
  snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] },
) {
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const mediaId = String(data.mediaId || '');
    if (!mediaId) continue;
    const entry: GalleryReactionRecord = {
      id: docSnap.id,
      emoji: String(data.emoji || ''),
      userId: typeof data.userId === 'string' ? data.userId : undefined,
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : undefined,
    };
    if (!target[mediaId]) target[mediaId] = [];
    const existing = target[mediaId].find((r) => r.id === entry.id);
    if (!existing) target[mediaId].push(entry);
  }
}

export function useGalleryMediaReactions(
  db: Firestore,
  patientId: string | undefined,
  viewerUid: string | undefined,
) {
  const [reactionsByMediaId, setReactionsByMediaId] = useState<
    Record<string, GalleryReactionRecord[]>
  >({});

  useEffect(() => {
    if (!patientId || !viewerUid) {
      setReactionsByMediaId({});
      return;
    }

    const reactionsRef = collection(db, 'media_reactions');
    const patientQuery = query(reactionsRef, where('patientId', '==', patientId));
    const ownQuery = query(reactionsRef, where('userId', '==', viewerUid));

    let patientDocs: { docs: { id: string; data: () => Record<string, unknown> }[] } = {
      docs: [],
    };
    let ownDocs: typeof patientDocs = { docs: [] };

    const apply = () => {
      const merged: Record<string, GalleryReactionRecord[]> = {};
      mergeReactionsIntoMap(merged, ownDocs);
      mergeReactionsIntoMap(merged, patientDocs);
      setReactionsByMediaId(merged);
    };

    const unsubPatient = onSnapshot(patientQuery, (snap) => {
      patientDocs = snap;
      apply();
    });
    const unsubOwn = onSnapshot(ownQuery, (snap) => {
      ownDocs = snap;
      apply();
    });

    return () => {
      unsubPatient();
      unsubOwn();
    };
  }, [db, patientId, viewerUid]);

  const addReaction = useCallback(
    async (mediaId: string, emoji: string) => {
      if (!patientId || !viewerUid) return null;
      const docRef = await addDoc(collection(db, 'media_reactions'), {
        userId: viewerUid,
        mediaId,
        patientId,
        emoji,
        timestamp: Date.now(),
      });
      try {
        await tagGalleryMediaForCircleMember(db, {
          patientId,
          mediaId,
          circleMemberUid: viewerUid,
        });
      } catch (err) {
        console.warn('[GALLERY] Could not auto-tag circle member on media:', err);
      }
      return docRef.id;
    },
    [db, patientId, viewerUid],
  );

  return { reactionsByMediaId, addReaction };
}
