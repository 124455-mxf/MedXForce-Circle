const PREFIX = 'circleGalleryView:';

/** Fired on window after a gallery item is marked viewed (localStorage). */
export const CIRCLE_GALLERY_VIEWED_CHANGED = 'circle-gallery-viewed-changed';

export type CircleGalleryViewedChangedDetail = {
  patientId: string;
  mediaId: string;
};

export function getCircleGalleryViewedIds(patientId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${PREFIX}${patientId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function markCircleGalleryMediaViewed(patientId: string, mediaId: string): void {
  try {
    const set = getCircleGalleryViewedIds(patientId);
    if (set.has(mediaId)) return;
    set.add(mediaId);
    localStorage.setItem(`${PREFIX}${patientId}`, JSON.stringify([...set]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<CircleGalleryViewedChangedDetail>(CIRCLE_GALLERY_VIEWED_CHANGED, {
          detail: { patientId, mediaId },
        }),
      );
    }
  } catch {
    /* ignore */
  }
}

/** Unseen for the member = not opened yet, and not their own upload. */
export function isCircleGalleryMediaUnseenForMember(
  media: { id: string; uploadedByUid?: string | null },
  viewedIds: ReadonlySet<string>,
  memberUid: string,
): boolean {
  if (media.uploadedByUid && media.uploadedByUid === memberUid) return false;
  return !viewedIds.has(media.id);
}
