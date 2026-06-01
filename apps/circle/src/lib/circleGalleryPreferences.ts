export type CircleGalleryThumbnailSize = 'small' | 'normal' | 'large';

export const CIRCLE_GALLERY_THUMBNAIL_SIZE_KEY = 'circleGalleryThumbnailSize';

export const CIRCLE_GALLERY_THUMBNAIL_SIZE_CHANGED = 'circle-gallery-thumbnail-size-changed';

export const CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_KEY =
  'circleGallerySkipPhotoDeleteConfirm';

export const CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_CHANGED =
  'circle-gallery-skip-photo-delete-confirm-changed';

export function normalizeCircleGalleryThumbnailSize(
  value: unknown,
): CircleGalleryThumbnailSize {
  if (value === 'small' || value === 'large') return value;
  return 'normal';
}

export function getCircleGalleryThumbnailSize(): CircleGalleryThumbnailSize {
  try {
    return normalizeCircleGalleryThumbnailSize(
      localStorage.getItem(CIRCLE_GALLERY_THUMBNAIL_SIZE_KEY),
    );
  } catch {
    return 'normal';
  }
}

export function setCircleGalleryThumbnailSize(size: CircleGalleryThumbnailSize): void {
  try {
    localStorage.setItem(CIRCLE_GALLERY_THUMBNAIL_SIZE_KEY, size);
    window.dispatchEvent(new Event(CIRCLE_GALLERY_THUMBNAIL_SIZE_CHANGED));
  } catch {
    /* ignore */
  }
}

export function getCircleGallerySkipPhotoDeleteConfirm(): boolean {
  try {
    return localStorage.getItem(CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCircleGallerySkipPhotoDeleteConfirm(skip: boolean): void {
  try {
    localStorage.setItem(
      CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_KEY,
      skip ? 'true' : 'false',
    );
    window.dispatchEvent(new Event(CIRCLE_GALLERY_SKIP_PHOTO_DELETE_CONFIRM_CHANGED));
  } catch {
    /* ignore */
  }
}

export function isCompactCircleGalleryThumbnail(size: CircleGalleryThumbnailSize): boolean {
  return size === 'small';
}

export function circleGalleryGridClass(size: CircleGalleryThumbnailSize): string {
  switch (size) {
    case 'small':
      return 'grid grid-cols-3 gap-2';
    case 'large':
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    default:
      return 'grid grid-cols-2 gap-3';
  }
}
