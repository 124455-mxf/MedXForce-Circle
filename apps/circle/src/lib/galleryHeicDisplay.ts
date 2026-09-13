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

function initialResolvedSrc(primary: string | undefined): string {
  if (!primary) return '';
  if (!isHeicGalleryUrl(primary)) return primary;
  return resolvedUrlCache.get(primary) ?? '';
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

    const cached = resolvedUrlCache.get(primary);
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
