import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firebase } from '../lib/firebaseClient';
import {
  CIRCLE_GALLERY_VIEWED_CHANGED,
  getCircleGalleryViewedIds,
  type CircleGalleryViewedChangedDetail,
} from '../lib/circleGalleryViews';
import {
  buildCircleSoulGalleryLiveTimeline,
  type CircleSoulGalleryLiveMedia,
  type CircleSoulGalleryLivePoint,
  type CircleSoulGalleryLiveReaction,
} from '../lib/circleSoulGalleryLiveAnalytics';

export type CircleSoulGalleryLiveStats = {
  timeline: CircleSoulGalleryLivePoint[];
  circleUnseenPhotoCount: number;
  patientUnseenPhotoCount: number | null;
};

const EMPTY: CircleSoulGalleryLiveStats = {
  timeline: [],
  circleUnseenPhotoCount: 0,
  patientUnseenPhotoCount: null,
};

/** Live Soul gallery series + unseen counts from gallery_messages, reactions, and views. */
export function useCircleSoulGalleryLiveTimeline(
  patientId: string | undefined,
  enabled = true,
): CircleSoulGalleryLiveStats {
  const [media, setMedia] = useState<CircleSoulGalleryLiveMedia[]>([]);
  const [reactions, setReactions] = useState<CircleSoulGalleryLiveReaction[]>([]);
  const [patientViewedIds, setPatientViewedIds] = useState<Set<string> | null>(null);
  const [viewedTick, setViewedTick] = useState(0);
  const memberUid = firebase.auth.currentUser?.uid;

  useEffect(() => {
    if (!enabled || !patientId) {
      setMedia([]);
      setReactions([]);
      setPatientViewedIds(null);
      return undefined;
    }

    const mediaQuery = query(collection(firebase.db, 'gallery_messages'), where('userId', '==', patientId));
    const unsubMedia = onSnapshot(
      mediaQuery,
      (snapshot) => {
        const next: CircleSoulGalleryLiveMedia[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data.source === 'patient') continue;
          next.push({
            id: docSnap.id,
            timestamp: typeof data.timestamp === 'number' && Number.isFinite(data.timestamp) ? data.timestamp : 0,
            isVideo: !!data.isVideo,
            uploadedByUid: typeof data.uploadedByUid === 'string' ? data.uploadedByUid : undefined,
          });
        }
        setMedia(next);
      },
      () => setMedia([]),
    );

    const reactionsQuery = query(
      collection(firebase.db, 'media_reactions'),
      where('patientId', '==', patientId),
    );
    const unsubReactions = onSnapshot(
      reactionsQuery,
      (snapshot) => {
        const next: CircleSoulGalleryLiveReaction[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const mediaId = typeof data.mediaId === 'string' ? data.mediaId : '';
          if (!mediaId) continue;
          next.push({
            mediaId,
            timestamp:
              typeof data.timestamp === 'number' && Number.isFinite(data.timestamp) ? data.timestamp : 0,
            userId: typeof data.userId === 'string' && data.userId ? data.userId : undefined,
          });
        }
        setReactions(next);
      },
      () => setReactions([]),
    );

    const unsubPatientViews = onSnapshot(
      collection(firebase.db, 'patients', patientId, 'gallery_views'),
      (snapshot) => {
        const ids = new Set<string>();
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const mediaId = typeof data.mediaId === 'string' && data.mediaId ? data.mediaId : docSnap.id;
          if (mediaId) ids.add(mediaId);
        }
        setPatientViewedIds(ids);
      },
      () => setPatientViewedIds(null),
    );

    return () => {
      unsubMedia();
      unsubReactions();
      unsubPatientViews();
    };
  }, [enabled, patientId]);

  useEffect(() => {
    if (!enabled || !patientId) return undefined;
    const onViewed = (event: Event) => {
      const detail = (event as CustomEvent<CircleGalleryViewedChangedDetail>).detail;
      if (detail?.patientId !== patientId) return;
      setViewedTick((n) => n + 1);
    };
    window.addEventListener(CIRCLE_GALLERY_VIEWED_CHANGED, onViewed);
    return () => window.removeEventListener(CIRCLE_GALLERY_VIEWED_CHANGED, onViewed);
  }, [enabled, patientId]);

  return useMemo(() => {
    void viewedTick;
    const timeline = buildCircleSoulGalleryLiveTimeline(media, reactions, patientId ?? '');
    const circleViewed = patientId && memberUid ? getCircleGalleryViewedIds(patientId, memberUid) : new Set<string>();
    const circleUnseenPhotoCount = media.filter((item) => {
      if (item.isVideo) return false;
      if (memberUid && item.uploadedByUid === memberUid) return false;
      return !circleViewed.has(item.id);
    }).length;
    const patientUnseenPhotoCount =
      patientViewedIds == null
        ? null
        : media.filter((item) => !item.isVideo && !patientViewedIds.has(item.id)).length;
    return { timeline, circleUnseenPhotoCount, patientUnseenPhotoCount };
  }, [media, memberUid, patientId, patientViewedIds, reactions, viewedTick]);
}
