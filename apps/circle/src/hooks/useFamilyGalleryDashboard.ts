import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { canViewPatientUploads, type PatientCapabilities } from '@medxforce/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_PHOTO_LIMIT = 24;

export type FamilyGalleryPreviewPhoto = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption: string;
  senderName: string;
  timestamp: number;
};

export type FamilyGalleryDashboardStats = {
  previewPhotos: FamilyGalleryPreviewPhoto[];
  photoCount: number;
  /** Reactions on any gallery photo (all uploaders). */
  totalReactions: number;
  reactionsLast7: number;
  myUploadCount: number;
  latestMyUploadAt: number | null;
  reactionsOnMyUploads: number;
  reactionsOnMyUploadsLast7: number;
  patientReactionsOnMyUploads: number;
  /** All reactions the patient gave on circle gallery media. */
  patientReactionsTotal: number;
  patientReactionsLast7: number;
  loading: boolean;
};

const EMPTY: FamilyGalleryDashboardStats = {
  previewPhotos: [],
  photoCount: 0,
  totalReactions: 0,
  reactionsLast7: 0,
  myUploadCount: 0,
  latestMyUploadAt: null,
  reactionsOnMyUploads: 0,
  reactionsOnMyUploadsLast7: 0,
  patientReactionsOnMyUploads: 0,
  patientReactionsTotal: 0,
  patientReactionsLast7: 0,
  loading: true,
};

/** Live gallery stats for Circle dashboard tiles (photos, reactions, member uploads). */
export function useFamilyGalleryDashboard(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
  capabilities: PatientCapabilities | undefined,
  windowDays = 7,
): FamilyGalleryDashboardStats {
  const [previewPhotos, setPreviewPhotos] = useState<FamilyGalleryPreviewPhoto[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [myMediaIds, setMyMediaIds] = useState<Set<string>>(new Set());
  const [latestMyUploadAt, setLatestMyUploadAt] = useState<number | null>(null);
  const [reactions, setReactions] = useState<
    { mediaId: string; userId: string; timestamp: number }[]
  >([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [loadingReactions, setLoadingReactions] = useState(true);

  const canViewCircle = !!(capabilities?.viewCircleMedia || capabilities?.richMediaUpload);
  const canViewPatient = canViewPatientUploads(capabilities);

  useEffect(() => {
    if (!patientId || !memberUid || (!canViewCircle && !canViewPatient)) {
      setPreviewPhotos([]);
      setPhotoCount(0);
      setMyMediaIds(new Set());
      setLatestMyUploadAt(null);
      setLoadingMedia(false);
      return undefined;
    }

    setLoadingMedia(true);
    const q = query(collection(db, 'gallery_messages'), where('userId', '==', patientId));

    return onSnapshot(
      q,
      (snapshot) => {
        const photos: FamilyGalleryPreviewPhoto[] = [];
        const myIds = new Set<string>();
        let photosTotal = 0;
        let latestMyUploadAt: number | null = null;

        for (const snap of snapshot.docs) {
          const data = snap.data();
          const source = data.source === 'patient' ? 'patient' : 'circle';
          if (source === 'patient' && !canViewPatient) continue;
          if (source !== 'patient' && !canViewCircle) continue;

          const isVideo = !!data.isVideo;
          if (!isVideo) photosTotal += 1;

          if (String(data.uploadedByUid || '') === memberUid) {
            myIds.add(snap.id);
            const ts = typeof data.timestamp === 'number' ? data.timestamp : 0;
            if (ts > 0 && (latestMyUploadAt == null || ts > latestMyUploadAt)) {
              latestMyUploadAt = ts;
            }
          }

          if (isVideo) continue;

          const url = String(data.url || '');
          const thumbnailUrl =
            typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined;
          if (!url && !thumbnailUrl) continue;

          photos.push({
            id: snap.id,
            url,
            thumbnailUrl,
            caption: String(data.caption || ''),
            senderName: String(data.senderName || 'Family Member'),
            timestamp: typeof data.timestamp === 'number' ? data.timestamp : 0,
          });
        }

        photos.sort((a, b) => b.timestamp - a.timestamp);
        setPreviewPhotos(photos.slice(0, PREVIEW_PHOTO_LIMIT));
        setPhotoCount(photosTotal);
        setMyMediaIds(myIds);
        setLatestMyUploadAt(latestMyUploadAt);
        setLoadingMedia(false);
      },
      () => {
        setPreviewPhotos([]);
        setPhotoCount(0);
        setMyMediaIds(new Set());
        setLatestMyUploadAt(null);
        setLoadingMedia(false);
      },
    );
  }, [canViewCircle, canViewPatient, db, memberUid, patientId]);

  useEffect(() => {
    if (!patientId || !memberUid || (!canViewCircle && !canViewPatient)) {
      setReactions([]);
      setLoadingReactions(false);
      return undefined;
    }

    setLoadingReactions(true);
    const q = query(collection(db, 'media_reactions'), where('patientId', '==', patientId));

    return onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              mediaId: String(data.mediaId || ''),
              userId: String(data.userId || ''),
              timestamp: typeof data.timestamp === 'number' ? data.timestamp : 0,
            };
          })
          .filter((row) => row.mediaId);
        setReactions(next);
        setLoadingReactions(false);
      },
      () => {
        setReactions([]);
        setLoadingReactions(false);
      },
    );
  }, [canViewCircle, canViewPatient, db, memberUid, patientId]);

  return useMemo(() => {
    if (!memberUid) return { ...EMPTY, loading: loadingMedia || loadingReactions };

    const cutoff = Date.now() - windowDays * DAY_MS;
    let totalReactions = 0;
    let reactionsLast7 = 0;
    let reactionsOnMyUploads = 0;
    let reactionsOnMyUploadsLast7 = 0;
    let patientReactionsOnMyUploads = 0;
    let patientReactionsTotal = 0;
    let patientReactionsLast7 = 0;

    for (const reaction of reactions) {
      totalReactions += 1;
      if (reaction.timestamp >= cutoff) reactionsLast7 += 1;

      if (reaction.userId === patientId) {
        patientReactionsTotal += 1;
        if (reaction.timestamp >= cutoff) patientReactionsLast7 += 1;
      }

      if (!myMediaIds.has(reaction.mediaId)) continue;
      if (reaction.userId === memberUid) continue;
      reactionsOnMyUploads += 1;
      if (reaction.timestamp >= cutoff) reactionsOnMyUploadsLast7 += 1;
      if (reaction.userId === patientId) patientReactionsOnMyUploads += 1;
    }

    return {
      previewPhotos,
      photoCount,
      totalReactions,
      reactionsLast7,
      myUploadCount: myMediaIds.size,
      latestMyUploadAt,
      reactionsOnMyUploads,
      reactionsOnMyUploadsLast7,
      patientReactionsOnMyUploads,
      patientReactionsTotal,
      patientReactionsLast7,
      loading: loadingMedia || loadingReactions,
    };
  }, [
    loadingMedia,
    loadingReactions,
    memberUid,
    myMediaIds,
    latestMyUploadAt,
    patientId,
    photoCount,
    previewPhotos,
    reactions,
    windowDays,
  ]);
}
