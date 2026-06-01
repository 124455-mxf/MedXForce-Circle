export const GALLERY_REACTION_EMOJIS = ['❤️', '👍', '👎', '🙌', '😂'] as const;

export type GalleryReactionRecord = {
  id: string;
  emoji: string;
  userId?: string;
  timestamp?: number;
};

export function aggregateReactionCounts(
  items: { emoji: string }[],
): { emoji: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.emoji, (counts.get(item.emoji) ?? 0) + 1);
  }
  return GALLERY_REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: counts.get(emoji) ?? 0,
  })).filter((entry) => entry.count > 0);
}

export function reactionCountForEmoji(
  summary: { emoji: string; count: number }[],
  emoji: string,
): number {
  return summary.find((entry) => entry.emoji === emoji)?.count ?? 0;
}
