import { useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  CIRCLE_GALLERY_VIEWED_CHANGED,
  getCircleGalleryViewedIds,
  mergeRemoteCircleGalleryViewedIds,
  parseCircleGalleryViewedFromProfile,
  type CircleGalleryViewedChangedDetail,
} from '../lib/circleGalleryViews';

async function persistCircleGalleryViewedToCloud(
  db: Firestore,
  memberUid: string,
  patientId: string,
): Promise<void> {
  const ids = [...getCircleGalleryViewedIds(patientId, memberUid)];
  await setDoc(
    doc(db, 'circle_profiles', memberUid),
    {
      uid: memberUid,
      galleryViewedByPatient: { [patientId]: ids },
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

/**
 * Keep gallery "seen" state across PWA/session wipes: localStorage + circle_profiles.
 */
export function useCircleGalleryViewedSync(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
): void {
  useEffect(() => {
    if (!patientId || !memberUid) return undefined;
    return onSnapshot(
      doc(db, 'circle_profiles', memberUid),
      (snap) => {
        if (!snap.exists()) return;
        mergeRemoteCircleGalleryViewedIds(
          patientId,
          memberUid,
          parseCircleGalleryViewedFromProfile(snap.data() as Record<string, unknown>, patientId),
        );
      },
      () => undefined,
    );
  }, [db, memberUid, patientId]);

  useEffect(() => {
    if (!patientId || !memberUid) return undefined;

    let timer: number | undefined;
    let dirty = false;
    const persist = () => {
      if (!dirty) return;
      dirty = false;
      void persistCircleGalleryViewedToCloud(db, memberUid, patientId).catch((err) => {
        dirty = true;
        console.warn('[gallery-viewed] cloud save failed; kept local viewed state', err);
      });
    };
    const schedule = () => {
      dirty = true;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(persist, 400);
    };
    const flush = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      persist();
    };

    const onViewed = (event: Event) => {
      const detail = (event as CustomEvent<CircleGalleryViewedChangedDetail>).detail;
      if (detail?.patientId !== patientId) return;
      if (detail.memberUid && detail.memberUid !== memberUid) return;
      if (detail.persist === false) return;
      schedule();
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener(CIRCLE_GALLERY_VIEWED_CHANGED, onViewed);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener(CIRCLE_GALLERY_VIEWED_CHANGED, onViewed);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [db, memberUid, patientId]);
}
