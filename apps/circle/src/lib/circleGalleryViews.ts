const PREFIX = 'circleGalleryView:';

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
    set.add(mediaId);
    localStorage.setItem(`${PREFIX}${patientId}`, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}
