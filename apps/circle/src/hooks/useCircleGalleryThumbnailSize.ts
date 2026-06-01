import { useEffect, useState } from 'react';
import {
  CIRCLE_GALLERY_THUMBNAIL_SIZE_CHANGED,
  CIRCLE_GALLERY_THUMBNAIL_SIZE_KEY,
  getCircleGalleryThumbnailSize,
  type CircleGalleryThumbnailSize,
} from '../lib/circleGalleryPreferences';

export function useCircleGalleryThumbnailSize(): CircleGalleryThumbnailSize {
  const [size, setSize] = useState<CircleGalleryThumbnailSize>(getCircleGalleryThumbnailSize);

  useEffect(() => {
    const sync = () => setSize(getCircleGalleryThumbnailSize());
    window.addEventListener(CIRCLE_GALLERY_THUMBNAIL_SIZE_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_GALLERY_THUMBNAIL_SIZE_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return size;
}

export { CIRCLE_GALLERY_THUMBNAIL_SIZE_KEY };
