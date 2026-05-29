import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { deleteObject, ref, type FirebaseStorage } from 'firebase/storage';
import type { CircleMemberRole } from './patientPermissions';
import type { GalleryAlbum, GalleryAlbumMedia } from './galleryAlbums';
import { MAX_ALBUM_TITLE_LENGTH, MAX_CAPTION_LENGTH } from './galleryAlbums';
import { uploadCircleGalleryMedia } from './circleGalleryUpload';

function albumsCollection(db: Firestore, patientId: string) {
  return collection(db, 'patients', patientId, 'gallery_albums');
}

function storagePathFromDownloadUrl(url: string): string | null {
  const match = url.match(/\/o\/(.+?)(\?|$)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

async function deleteStorageUrl(storage: FirebaseStorage, url: string | undefined): Promise<void> {
  if (!url) return;
  const path = storagePathFromDownloadUrl(url);
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* file may already be gone */
  }
}

function normalizeAlbum(id: string, patientId: string, data: Record<string, unknown>): GalleryAlbum {
  return {
    id,
    patientId,
    title: String(data.title || 'Album'),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    createdByUid: String(data.createdByUid || ''),
  };
}

function normalizeMedia(id: string, data: Record<string, unknown>): GalleryAlbumMedia {
  const patientId = String(data.patientId || data.userId || '');
  return {
    id,
    patientId,
    albumId: data.albumId ? String(data.albumId) : undefined,
    url: String(data.url || ''),
    caption: data.caption ? String(data.caption) : '',
    isVideo: !!data.isVideo,
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
    uploadedByUid: String(data.uploadedByUid || ''),
    senderName: String(data.senderName || 'Family Member'),
    source: data.source === 'patient' ? 'patient' : 'circle',
  };
}

export async function listGalleryAlbums(db: Firestore, patientId: string): Promise<GalleryAlbum[]> {
  const snap = await getDocs(query(albumsCollection(db, patientId), orderBy('updatedAt', 'desc')));
  return snap.docs.map((d) => normalizeAlbum(d.id, patientId, d.data() as Record<string, unknown>));
}

export async function createGalleryAlbum(
  db: Firestore,
  params: { patientId: string; title: string; createdByUid: string },
): Promise<string> {
  const title = params.title.trim().slice(0, MAX_ALBUM_TITLE_LENGTH);
  if (!title) throw new Error('Album name is required.');
  const now = Date.now();
  const ref = await addDoc(albumsCollection(db, params.patientId), {
    title,
    createdAt: now,
    updatedAt: now,
    createdByUid: params.createdByUid,
  });
  return ref.id;
}

export async function renameGalleryAlbum(
  db: Firestore,
  params: { patientId: string; albumId: string; title: string },
): Promise<void> {
  const title = params.title.trim().slice(0, MAX_ALBUM_TITLE_LENGTH);
  if (!title) throw new Error('Album name is required.');
  await updateDoc(doc(db, 'patients', params.patientId, 'gallery_albums', params.albumId), {
    title,
    updatedAt: Date.now(),
  });
}

export async function listAlbumMedia(
  db: Firestore,
  patientId: string,
  albumId: string,
): Promise<GalleryAlbumMedia[]> {
  const snap = await getDocs(
    query(
      collection(db, 'gallery_messages'),
      where('userId', '==', patientId),
      where('albumId', '==', albumId),
      orderBy('timestamp', 'desc'),
    ),
  );
  return snap.docs.map((d) => normalizeMedia(d.id, d.data() as Record<string, unknown>));
}

/** Uses patient gallery index (userId + timestamp); filters client-side. */
export async function listUnassignedCircleMedia(
  db: Firestore,
  patientId: string,
  uploadedByUid: string,
): Promise<GalleryAlbumMedia[]> {
  const snap = await getDocs(
    query(
      collection(db, 'gallery_messages'),
      where('userId', '==', patientId),
      orderBy('timestamp', 'desc'),
    ),
  );
  return snap.docs
    .map((d) => normalizeMedia(d.id, d.data() as Record<string, unknown>))
    .filter(
      (m) =>
        m.source === 'circle' &&
        m.uploadedByUid === uploadedByUid &&
        !m.albumId,
    );
}

export async function assignMediaToAlbum(
  db: Firestore,
  params: { patientId: string; mediaId: string; albumId: string },
): Promise<void> {
  await updateDoc(doc(db, 'gallery_messages', params.mediaId), {
    albumId: params.albumId,
  });
  await updateDoc(doc(db, 'patients', params.patientId, 'gallery_albums', params.albumId), {
    updatedAt: Date.now(),
  });
}

export async function updateCircleGalleryCaption(
  db: Firestore,
  params: { mediaId: string; caption: string },
): Promise<void> {
  const caption = params.caption.trim().slice(0, MAX_CAPTION_LENGTH);
  await updateDoc(doc(db, 'gallery_messages', params.mediaId), { caption });
}

export async function deleteCircleGalleryMedia(
  db: Firestore,
  storage: FirebaseStorage,
  media: Pick<GalleryAlbumMedia, 'id' | 'url' | 'thumbnailUrl' | 'patientId'>,
): Promise<void> {
  await Promise.all([
    deleteStorageUrl(storage, media.url),
    deleteStorageUrl(storage, media.thumbnailUrl),
  ]);
  await deleteDoc(doc(db, 'gallery_messages', media.id));
}

export async function deleteGalleryAlbum(
  db: Firestore,
  storage: FirebaseStorage,
  params: { patientId: string; albumId: string },
): Promise<void> {
  const media = await listAlbumMedia(db, params.patientId, params.albumId);
  for (const item of media) {
    await deleteCircleGalleryMedia(db, storage, item);
  }
  await deleteDoc(doc(db, 'patients', params.patientId, 'gallery_albums', params.albumId));
}

export async function uploadCircleGalleryMediaToAlbum(params: {
  db: Firestore;
  storage: FirebaseStorage;
  patientId: string;
  albumId: string;
  uploadedByUid: string;
  uploadedByRole: CircleMemberRole;
  senderName: string;
  files: File[];
  caption?: string;
}): Promise<string[]> {
  const ids: string[] = [];
  for (const file of params.files) {
    const id = await uploadCircleGalleryMedia({
      db: params.db,
      storage: params.storage,
      patientId: params.patientId,
      albumId: params.albumId,
      uploadedByUid: params.uploadedByUid,
      uploadedByRole: params.uploadedByRole,
      senderName: params.senderName,
      file,
      caption: params.caption,
    });
    ids.push(id);
  }
  if (ids.length > 0) {
    await updateDoc(doc(params.db, 'patients', params.patientId, 'gallery_albums', params.albumId), {
      updatedAt: Date.now(),
    });
  }
  return ids;
}
