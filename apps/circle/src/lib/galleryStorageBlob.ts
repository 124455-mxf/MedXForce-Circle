import { getApp } from 'firebase/app';
import { getBlob, getStorage, ref } from 'firebase/storage';
import { firebase } from './firebaseClient';

export function storagePathFromDownloadUrl(url: string): string | null {
  const match = url.match(/\/o\/(.+?)(\?|$)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function resolveGalleryApiBase(): string {
  const explicit = String(
    (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined) || '',
  ).trim();
  return explicit.replace(/\/$/, '');
}

async function loadGalleryBlobViaServerProxy(path: string): Promise<Blob | null> {
  const apiBase = resolveGalleryApiBase();
  if (!apiBase) return null;

  const user = firebase.auth.currentUser;
  if (!user) return null;

  const token = await user.getIdToken();
  const res = await fetch(
    `${apiBase}/api/gallery/storage-blob?path=${encodeURIComponent(path)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  return res.blob();
}

/** Load gallery bytes; prefers patient-app server proxy when VITE_MEDXFORCE_API_URL is set. */
export async function loadGalleryStorageBlob(url: string): Promise<Blob> {
  const path = storagePathFromDownloadUrl(url);
  if (!path) throw new Error('Invalid gallery storage URL');

  const proxied = await loadGalleryBlobViaServerProxy(path);
  if (proxied) return proxied;

  return getBlob(ref(getStorage(getApp()), path));
}
