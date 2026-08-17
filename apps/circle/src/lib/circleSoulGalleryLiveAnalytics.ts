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
};

export type CircleSoulGalleryLivePoint = {
  date: string;
  photos: number;
  videos: number;
  reactions: number;
};

function dateKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** 30 daily buckets of circle-shared photos, videos, and reactions (today on the newest end). */
export function buildCircleSoulGalleryLiveTimeline(
  media: CircleSoulGalleryLiveMedia[],
  reactions: CircleSoulGalleryLiveReaction[],
  windowDays = 30,
): CircleSoulGalleryLivePoint[] {
  if (media.length === 0) return [];

  const now = new Date();
  const buckets: Record<string, CircleSoulGalleryLivePoint> = {};
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    buckets[date] = { date, photos: 0, videos: 0, reactions: 0 };
  }

  const cutoff = Date.now() - windowDays * DAY_MS;
  const circleMediaIds = new Set(media.map((item) => item.id));

  for (const item of media) {
    if (item.timestamp < cutoff) continue;
    const bucket = buckets[dateKey(item.timestamp)];
    if (!bucket) continue;
    if (item.isVideo) bucket.videos += 1;
    else bucket.photos += 1;
  }

  for (const reaction of reactions) {
    if (!circleMediaIds.has(reaction.mediaId) || reaction.timestamp < cutoff) continue;
    const bucket = buckets[dateKey(reaction.timestamp)];
    if (bucket) bucket.reactions += 1;
  }

  return Object.values(buckets);
}
