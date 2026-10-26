import { useEffect, useState } from 'react';
import { convertHeicBlobToJpeg, isHeicGalleryUrl } from '@medxforce/shared';
import { loadGalleryStorageBlob } from './galleryStorageBlob';

/** Cap in-memory HEIC→JPEG blob URLs so a long gallery session cannot grow forever. */
const MAX_HEIC_OBJECT_URLS = 32;
const resolvedUrlCache = new Map<string, string>();

function cacheGet(url: string): string | undefined {
  const value = resolvedUrlCache.get(url);
  if (value == null) return undefined;
  resolvedUrlCache.delete(url);
  resolvedUrlCache.set(url, value);
  return value;
}

function cacheSet(url: string, objectUrl: string): string {
  const existing = resolvedUrlCache.get(url);
  if (existing) {
    resolvedUrlCache.delete(url);
    resolvedUrlCache.set(url, existing);
    if (existing !== objectUrl) URL.revokeObjectURL(objectUrl);
    return existing;
  }
  while (resolvedUrlCache.size >= MAX_HEIC_OBJECT_URLS) {
    const oldest = resolvedUrlCache.keys().next().value;
    if (oldest == null) break;
    const stale = resolvedUrlCache.get(oldest);
    resolvedUrlCache.delete(oldest);
    if (stale) URL.revokeObjectURL(stale);
  }
  resolvedUrlCache.set(url, objectUrl);
  return objectUrl;
}

/** Resolve a gallery image URL to something browsers can render (JPEG object URL for HEIC). */
export async function resolveGalleryImageUrl(url: string): Promise<string> {
  if (!isHeicGalleryUrl(url)) return url;

  const cached = cacheGet(url);
  if (cached) return cached;

  const blob = await loadGalleryStorageBlob(url);
  const jpegBlob = await convertHeicBlobToJpeg(blob);
  const objectUrl = URL.createObjectURL(jpegBlob);
  return cacheSet(url, objectUrl);
}

function initialResolvedSrc(primary: string | undefined): string {
  if (!primary) return '';
  if (!isHeicGalleryUrl(primary)) return primary;
  return cacheGet(primary) ?? '';
}

/** Resolves a single gallery URL (HEIC → JPEG object URL in-browser). */
function useResolvedGalleryImageUrl(primary: string | undefined): string {
  const [src, setSrc] = useState(() => initialResolvedSrc(primary));

  useEffect(() => {
    if (!primary) {
      setSrc('');
      return;
    }
    if (!isHeicGalleryUrl(primary)) {
      setSrc(primary);
      return;
    }

    const cached = cacheGet(primary);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    void resolveGalleryImageUrl(primary)
      .then((resolved) => {
        if (!cancelled) setSrc(resolved);
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });

    return () => {
      cancelled = true;
    };
  }, [primary]);

  return src;
}

/** Grid / tile previews: prefers thumbnailUrl when provided. */
export function useGalleryImageSrc(url: string | undefined, thumbnailUrl?: string): string {
  const preferredThumb =
    thumbnailUrl && !isHeicGalleryUrl(thumbnailUrl) ? thumbnailUrl : undefined;
  return useResolvedGalleryImageUrl(preferredThumb || url);
}

/** Lightbox / full-screen: always uses the main stored image URL. */
export function useGalleryFullImageSrc(url: string | undefined): string {
  return useResolvedGalleryImageUrl(url);
}
