import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { normalizeGalleryAlbum } from './circleGalleryAlbums';
import type { GalleryAlbum } from './galleryAlbums';

/** Stored title for the auto-created default album (display may use i18n when isDefault). */
export const DEFAULT_GALLERY_ALBUM_TITLE = 'Shared photos';

export function isDefaultGalleryAlbum(
  album: Pick<GalleryAlbum, 'isDefault'> | { isDefault?: boolean },
): boolean {
  return album.isDefault === true;
}

export async function findDefaultGalleryAlbum(
  db: Firestore,
  patientId: string,
): Promise<GalleryAlbum | null> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'gallery_albums'),
      where('isDefault', '==', true),
    ),
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return normalizeGalleryAlbum(docSnap.id, patientId, docSnap.data() as Record<string, unknown>);
}

export async function ensureDefaultGalleryAlbum(
  db: Firestore,
  params: { patientId: string; createdByUid: string },
): Promise<string> {
  const existing = await findDefaultGalleryAlbum(db, params.patientId);
  if (existing) return existing.id;

  const now = Date.now();
  const ref = await addDoc(collection(db, 'patients', params.patientId, 'gallery_albums'), {
    title: DEFAULT_GALLERY_ALBUM_TITLE,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    createdByUid: params.createdByUid,
  });
  return ref.id;
}

export async function resolveGalleryUploadAlbumId(
  db: Firestore,
  params: { patientId: string; createdByUid: string; albumId?: string },
): Promise<string> {
  if (params.albumId) return params.albumId;
  return ensureDefaultGalleryAlbum(db, {
    patientId: params.patientId,
    createdByUid: params.createdByUid,
  });
}

/** Assign legacy circle uploads (no albumId) into the default album. */
export async function migrateLooseCircleMediaToDefaultAlbum(
  db: Firestore,
  params: { patientId: string; actorUid: string },
): Promise<number> {
  const defaultAlbumId = await ensureDefaultGalleryAlbum(db, {
    patientId: params.patientId,
    createdByUid: params.actorUid,
  });

  const snap = await getDocs(
    query(
      collection(db, 'gallery_messages'),
      where('userId', '==', params.patientId),
      orderBy('timestamp', 'desc'),
    ),
  );

  const batch = writeBatch(db);
  let migrated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.source === 'patient' || data.albumId) continue;
    batch.update(docSnap.ref, { albumId: defaultAlbumId });
    migrated += 1;
  }

  if (migrated > 0) {
    batch.update(doc(db, 'patients', params.patientId, 'gallery_albums', defaultAlbumId), {
      updatedAt: Date.now(),
    });
    await batch.commit();
  }

  return migrated;
}
