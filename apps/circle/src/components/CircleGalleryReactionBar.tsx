import { useState, useEffect } from 'react';
import {
  GALLERY_REACTION_EMOJIS,
  aggregateReactionCounts,
  reactionCountForEmoji,
  type GalleryReactionRecord,
} from '@medxforce/shared';

type CircleGalleryReactionBarProps = {
  mediaReactions: GalleryReactionRecord[];
  recentReactionId: string | null;
  onReact: (emoji: string) => void;
};

function FloatingReaction({ emoji }: { emoji: string }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 text-8xl z-[10003] animate-[gallery-reaction-pop_2.5s_ease-out_forwards]"
      aria-hidden
    >
      {emoji}
    </div>
  );
}

export function CircleGalleryReactionBar({
  mediaReactions,
  recentReactionId,
  onReact,
}: CircleGalleryReactionBarProps) {
  const summary = aggregateReactionCounts(mediaReactions);
  const [showPop, setShowPop] = useState<string | null>(null);

  useEffect(() => {
    if (!recentReactionId) return;
    const reaction = mediaReactions.find((r) => r.id === recentReactionId);
    if (!reaction) return;
    setShowPop(reaction.emoji);
    const timer = window.setTimeout(() => setShowPop(null), 2500);
    return () => window.clearTimeout(timer);
  }, [recentReactionId, mediaReactions]);

  return (
    <div className="w-full max-w-2xl mx-auto pointer-events-auto">
      <div className="flex items-center justify-center p-2">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-full shadow-xl border border-slate-200">
          {GALLERY_REACTION_EMOJIS.map((emoji) => {
            const count = reactionCountForEmoji(summary, emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                aria-label={count > 0 ? `${emoji}, ${count} reactions` : emoji}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full hover:scale-125 transition-all flex items-center justify-center text-lg sm:text-xl"
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-slate-800 text-white text-[10px] font-bold leading-[17px] text-center tabular-nums shadow-sm">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {showPop && <FloatingReaction emoji={showPop} />}
    </div>
  );
}
