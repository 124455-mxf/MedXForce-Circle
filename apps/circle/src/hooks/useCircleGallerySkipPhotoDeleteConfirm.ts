import { useEffect, useState } from 'react';
import {
  CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_CHANGED,
  getCircleGallerySkipPhotoDeleteConfirm,
} from '../lib/circleGalleryPreferences';

export function useCircleGallerySkipPhotoDeleteConfirm(): boolean {
  const [skip, setSkip] = useState(getCircleGallerySkipPhotoDeleteConfirm);

  useEffect(() => {
    const sync = () => setSkip(getCircleGallerySkipPhotoDeleteConfirm());
    window.addEventListener(CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return skip;
}
