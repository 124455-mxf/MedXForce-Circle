import { ref, getDownloadURL, type FirebaseStorage } from 'firebase/storage';
import { addDoc, collection, type Firestore } from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';
import { buildCircleGalleryUpload, toFirestoreGalleryPayload } from './galleryMessages';
import { resolveGalleryUploadAlbumId } from './galleryDefaultAlbum';
import { prepareGalleryUploadFile } from './galleryMediaTypes';
import {
  uploadGalleryBlobResumable,
  type GalleryUploadFileProgress,
} from './galleryStorageUpload';

export type { GalleryUploadFileProgress };

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export async function uploadCircleGalleryMedia(params: {
  db: Firestore;
  storage: FirebaseStorage;
  patientId: string;
  uploadedByUid: string;
  uploadedByRole: CircleMemberRole;
  senderName: string;
  file: File;
  caption?: string;
  albumId?: string;
  fileIndex?: number;
  fileCount?: number;
  onProgress?: (progress: GalleryUploadFileProgress) => void;
}): Promise<string> {
  const index = params.fileIndex ?? 1;
  const total = params.fileCount ?? 1;
  const report = (phase: GalleryUploadFileProgress['phase'], percent?: number) => {
    params.onProgress?.({ index, total, phase, percent });
  };

  report('preparing');
  const prepared = await prepareGalleryUploadFile(params.file);
  const isVideo = prepared.isVideo;

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (params.file.size > maxBytes) {
    throw new Error(isVideo ? 'Video is too large (max 200 MB).' : 'Photo is too large (max 25 MB).');
  }

  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const objectPath = `gallery/${params.patientId}/${stamp}.${prepared.extension}`;
  const storageRef = ref(params.storage, objectPath);

  report('uploading', 0);
  await uploadGalleryBlobResumable(
    storageRef,
    prepared.blob,
    prepared.contentType,
    (mainPct) => {
      const thumbWeight = !isVideo && prepared.thumbnailBlob ? 0.12 : 0;
      report('uploading', Math.round(mainPct * (1 - thumbWeight)));
    },
  );
  const url = await getDownloadURL(storageRef);

  let thumbnailUrl: string | undefined;
  if (!isVideo && prepared.thumbnailBlob) {
    const thumbPath = `gallery/${params.patientId}/${stamp}_thumb.jpg`;
    const thumbRef = ref(params.storage, thumbPath);
    await uploadGalleryBlobResumable(
      thumbRef,
      prepared.thumbnailBlob,
      'image/jpeg',
      (thumbPct) => report('uploading', Math.round(88 + thumbPct * 0.12)),
    );
    thumbnailUrl = await getDownloadURL(thumbRef);
  }

  const albumId = await resolveGalleryUploadAlbumId(params.db, {
    patientId: params.patientId,
    createdByUid: params.uploadedByUid,
    albumId: params.albumId,
  });

  const payload = buildCircleGalleryUpload({
    patientId: params.patientId,
    uploadedByUid: params.uploadedByUid,
    uploadedByRole: params.uploadedByRole,
    senderName: params.senderName,
    url,
    caption: params.caption,
    isVideo,
    thumbnailUrl,
    albumId,
  });

  const docRef = await addDoc(
    collection(params.db, 'gallery_messages'),
    toFirestoreGalleryPayload(payload),
  );
  return docRef.id;
}
