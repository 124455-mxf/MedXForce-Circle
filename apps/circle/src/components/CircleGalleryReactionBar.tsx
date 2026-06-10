import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import {
  GALLERY_REACTION_EMOJIS,
  aggregateReactionCounts,
  reactionCountForEmoji,
  type GalleryReactionRecord,
} from '@medxforce/shared';

type TaggedPersonChip = {
  id: string;
  name: string;
  relationship?: string;
};

type CircleGalleryReactionBarProps = {
  mediaReactions: GalleryReactionRecord[];
  recentReactionId: string | null;
  taggedPeople?: TaggedPersonChip[];
  onReact: (emoji: string) => void;
  showIdentify?: boolean;
  onToggleIdentify?: () => void;
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
  taggedPeople = [],
  onReact,
  showIdentify = false,
  onToggleIdentify,
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
    <div className="w-full max-w-[min(100vw-2rem,44rem)] mx-auto pointer-events-auto">
      <div className="flex flex-col items-center gap-2 p-2">
        {taggedPeople.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5 px-2">
            {taggedPeople.map((person) => (
              <span
                key={person.id}
                title={
                  person.relationship
                    ? `${person.name} · ${person.relationship}`
                    : person.name
                }
                className="inline-flex max-w-[11rem] min-w-0 flex-col px-2.5 py-1 rounded-full bg-white/95 border border-slate-200 shadow-md"
              >
                <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                  {person.name}
                </span>
                {person.relationship ? (
                  <span className="text-[10px] font-medium text-slate-500 leading-tight truncate">
                    {person.relationship}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-[2rem] shadow-xl border border-slate-200">
          {GALLERY_REACTION_EMOJIS.map((emoji) => {
            const count = reactionCountForEmoji(summary, emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                aria-label={count > 0 ? `${emoji}, ${count} reactions` : emoji}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full hover:scale-125 transition-all flex items-center justify-center text-lg sm:text-xl shrink-0"
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
          {showIdentify && onToggleIdentify ? (
            <>
              <div className="w-[1px] h-6 sm:h-8 bg-black/10 mx-1 shrink-0" />
              <button
                type="button"
                onClick={onToggleIdentify}
                className="w-10 h-10 sm:w-11 sm:h-11 text-slate-700/70 rounded-full flex items-center justify-center hover:text-blue-600 transition-all shrink-0"
                aria-label="Identify someone"
              >
                <UserPlus size={18} />
              </button>
            </>
          ) : null}
        </div>
      </div>
      {showPop && <FloatingReaction emoji={showPop} />}
    </div>
  );
}
