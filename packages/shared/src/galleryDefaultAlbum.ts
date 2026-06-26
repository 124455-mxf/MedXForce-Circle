import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { normalizeGalleryAlbum } from './circleGalleryAlbums';
import type { GalleryAlbum, GalleryAlbumMedia } from './galleryAlbums';

/** Stored title for the auto-created default album (display may use i18n when isDefault). */
export const DEFAULT_GALLERY_ALBUM_TITLE = 'Shared photos';

/** Stored title for the auto-created reactions album (display may use i18n when isReactions). */
export const REACTIONS_GALLERY_ALBUM_TITLE = 'Reactions';

export function isDefaultGalleryAlbum(
  album: Pick<GalleryAlbum, 'isDefault'> | { isDefault?: boolean },
): boolean {
  return album.isDefault === true;
}

export function isReactionsGalleryAlbum(
  album: Pick<GalleryAlbum, 'isReactions'> | { isReactions?: boolean },
): boolean {
  return album.isReactions === true;
}

export function resolveGalleryAlbumTitle(
  album: Pick<GalleryAlbum, 'title' | 'isDefault' | 'isReactions'>,
  labels: { defaultAlbum: string; reactionsAlbum: string },
): string {
  if (isDefaultGalleryAlbum(album)) return labels.defaultAlbum;
  if (isReactionsGalleryAlbum(album)) return labels.reactionsAlbum;
  return album.title;
}

export function mediaBelongsToGalleryAlbum(
  media: Pick<GalleryAlbumMedia, 'id' | 'albumId'>,
  album: Pick<GalleryAlbum, 'id' | 'isDefault' | 'isReactions'>,
  reactedMediaIds: ReadonlySet<string>,
): boolean {
  if (isReactionsGalleryAlbum(album)) {
    return reactedMediaIds.has(media.id);
  }
  if (media.albumId === album.id) return true;
  return isDefaultGalleryAlbum(album) && !media.albumId;
}

export function isReactionsTitleAlbum(title: string | undefined | null): boolean {
  return String(title || '').trim().toLowerCase() === REACTIONS_GALLERY_ALBUM_TITLE.toLowerCase();
}

export function findCanonicalReactionsAlbum<T extends Pick<GalleryAlbum, 'id' | 'isReactions' | 'createdAt'>>(
  albums: T[],
): T | undefined {
  const flagged = albums
    .filter((album) => isReactionsGalleryAlbum(album))
    .sort((a, b) => a.createdAt - b.createdAt);
  return flagged[0];
}

/** Keep a single default/reactions system album when duplicates exist in Firestore. */
export function dedupeGalleryAlbumsForDisplay<
  T extends Pick<GalleryAlbum, 'id' | 'title' | 'isDefault' | 'isReactions' | 'createdAt'>,
>(albums: T[]): T[] {
  const reactions = albums
    .filter((album) => isReactionsGalleryAlbum(album))
    .sort((a, b) => a.createdAt - b.createdAt);
  const defaults = albums
    .filter((album) => isDefaultGalleryAlbum(album))
    .sort((a, b) => a.createdAt - b.createdAt);
  const keepReactionsId = reactions[0]?.id;
  const keepDefaultId = defaults[0]?.id;

  return albums.filter((album) => {
    if (isReactionsGalleryAlbum(album)) return album.id === keepReactionsId;
    if (keepReactionsId && isReactionsTitleAlbum(album.title)) return false;
    if (isDefaultGalleryAlbum(album)) return album.id === keepDefaultId;
    return true;
  });
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

export async function findReactionsGalleryAlbum(
  db: Firestore,
  patientId: string,
): Promise<GalleryAlbum | null> {
  const albums = await listReactionsGalleryAlbums(db, patientId);
  return albums[0] ?? null;
}

export async function listReactionsGalleryAlbums(
  db: Firestore,
  patientId: string,
): Promise<GalleryAlbum[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'gallery_albums'),
      where('isReactions', '==', true),
    ),
  );
  return snap.docs
    .map((docSnap) =>
      normalizeGalleryAlbum(docSnap.id, patientId, docSnap.data() as Record<string, unknown>),
    )
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function ensureReactionsGalleryAlbum(
  db: Firestore,
  params: { patientId: string; createdByUid: string },
): Promise<string> {
  const existing = await findReactionsGalleryAlbum(db, params.patientId);
  if (existing) return existing.id;

  const now = Date.now();
  const ref = await addDoc(collection(db, 'patients', params.patientId, 'gallery_albums'), {
    title: REACTIONS_GALLERY_ALBUM_TITLE,
    isReactions: true,
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
