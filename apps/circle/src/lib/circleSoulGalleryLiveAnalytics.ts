const DAY_MS = 24 * 60 * 60 * 1000;

export type CircleSoulGalleryLiveMedia = {
  id: string;
  timestamp: number;
  isVideo: boolean;
  uploadedByUid?: string;
};

export type CircleSoulGalleryLiveReaction = {
  mediaId: string;
  timestamp: number;
  userId?: string;
};

export type CircleSoulGalleryLivePoint = {
  date: string;
  photos: number;
  videos: number;
  reactions: number;
  patientReactions: number;
  circleReactions: number;
};

function isoDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyPoint(date: string): CircleSoulGalleryLivePoint {
  return {
    date,
    photos: 0,
    videos: 0,
    reactions: 0,
    patientReactions: 0,
    circleReactions: 0,
  };
}

/** Sparse daily buckets of circle-shared photos, videos, and reactions. */
export function buildCircleSoulGalleryLiveTimeline(
  media: CircleSoulGalleryLiveMedia[],
  reactions: CircleSoulGalleryLiveReaction[],
  patientUid: string,
  windowDays = 30,
): CircleSoulGalleryLivePoint[] {
  if (media.length === 0) return [];

  const cutoff = Date.now() - windowDays * DAY_MS;
  const circleMediaIds = new Set(media.map((item) => item.id));
  const buckets = new Map<string, CircleSoulGalleryLivePoint>();

  const bucketFor = (timestamp: number) => {
    const date = isoDateKey(timestamp);
    const existing = buckets.get(date);
    if (existing) return existing;
    const next = emptyPoint(date);
    buckets.set(date, next);
    return next;
  };

  for (const item of media) {
    if (item.timestamp < cutoff) continue;
    const bucket = bucketFor(item.timestamp);
    if (item.isVideo) bucket.videos += 1;
    else bucket.photos += 1;
  }

  for (const reaction of reactions) {
    if (!circleMediaIds.has(reaction.mediaId) || reaction.timestamp < cutoff) continue;
    const bucket = bucketFor(reaction.timestamp);
    bucket.reactions += 1;
    if (patientUid && reaction.userId === patientUid) bucket.patientReactions += 1;
    else bucket.circleReactions += 1;
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}
