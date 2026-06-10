import { useEffect, useState } from 'react';
import { convertHeicBlobToJpeg, isHeicGalleryUrl } from '@medxforce/shared';
import { loadGalleryStorageBlob } from './galleryStorageBlob';

const resolvedUrlCache = new Map<string, string>();

/** Resolve a gallery image URL to something browsers can render (JPEG object URL for HEIC). */
export async function resolveGalleryImageUrl(url: string): Promise<string> {
  if (!isHeicGalleryUrl(url)) return url;

  const cached = resolvedUrlCache.get(url);
  if (cached) return cached;

  const blob = await loadGalleryStorageBlob(url);
  const jpegBlob = await convertHeicBlobToJpeg(blob);
  const objectUrl = URL.createObjectURL(jpegBlob);
  resolvedUrlCache.set(url, objectUrl);
  return objectUrl;
}

/** Hook for grid/lightbox: resolves HEIC Firebase URLs to JPEG object URLs in-browser. */
export function useGalleryImageSrc(url: string | undefined, thumbnailUrl?: string): string {
  const preferredThumb =
    thumbnailUrl && !isHeicGalleryUrl(thumbnailUrl) ? thumbnailUrl : undefined;
  const [src, setSrc] = useState(preferredThumb || (url && !isHeicGalleryUrl(url) ? url : ''));

  useEffect(() => {
    const primary = preferredThumb || url;
    if (!primary) {
      setSrc('');
      return;
    }
    if (preferredThumb || !isHeicGalleryUrl(primary)) {
      setSrc(primary);
      return;
    }

    let cancelled = false;
    setSrc('');
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
  }, [url, preferredThumb]);

  return src;
}
