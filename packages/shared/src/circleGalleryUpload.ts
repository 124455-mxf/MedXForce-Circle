import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, type Firestore, type FirebaseStorage } from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';
import { buildCircleGalleryUpload, toFirestoreGalleryPayload } from './galleryMessages';
import { resolveGalleryUploadAlbumId } from './galleryDefaultAlbum';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function extensionOf(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return 'jpg';
  return (parts.pop() || 'jpg').toLowerCase();
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = extensionOf(file.name);
  return ['mp4', 'mov', 'm4v', 'webm'].includes(ext);
}

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
}): Promise<string> {
  const isVideo = isVideoFile(params.file);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (params.file.size > maxBytes) {
    throw new Error(isVideo ? 'Video is too large (max 200 MB).' : 'Photo is too large (max 25 MB).');
  }

  const ext = extensionOf(params.file.name) || (isVideo ? 'mp4' : 'jpg');
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const objectPath = `gallery/${params.patientId}/${stamp}.${ext}`;
  const storageRef = ref(params.storage, objectPath);

  await uploadBytes(storageRef, params.file, {
    contentType: params.file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
  });
  const url = await getDownloadURL(storageRef);

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
    albumId,
  });

  const docRef = await addDoc(
    collection(params.db, 'gallery_messages'),
    toFirestoreGalleryPayload(payload),
  );
  return docRef.id;
}
