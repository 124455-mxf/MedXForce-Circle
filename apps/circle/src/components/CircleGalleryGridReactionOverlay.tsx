import { User, Users } from 'lucide-react';
import {
  GALLERY_REACTION_EMOJIS,
  aggregateReactionCounts,
  reactionCountForEmoji,
  splitGalleryReactionsByPatient,
  type GalleryReactionRecord,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { useCircleT } from '../lib/circleI18nContext';

type CircleGalleryGridReactionOverlayProps = {
  reactions: GalleryReactionRecord[];
  patientUid: string;
  patientFirstName: string;
  compact?: boolean;
  /** On the Reactions album, always show both rows even if one side is empty. */
  alwaysShow?: boolean;
};

function MiniEmojiRow({
  icon: Icon,
  label,
  reactions,
  compact,
}: {
  icon: typeof User;
  label: string;
  reactions: GalleryReactionRecord[];
  compact?: boolean;
}) {
  const summary = aggregateReactionCounts(reactions);
  const emojis = compact
    ? GALLERY_REACTION_EMOJIS.filter((emoji) => reactionCountForEmoji(summary, emoji) > 0)
    : GALLERY_REACTION_EMOJIS;

  return (
    <div
      className="flex items-center gap-0.5 bg-white/95 border border-slate-200 shadow-md rounded-full pl-1 pr-1 py-0.5 min-w-0"
      aria-label={label}
    >
      <span className="shrink-0 w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
        <Icon size={10} aria-hidden />
      </span>
      {!compact ? (
        <span className="text-[8px] font-bold text-slate-600 truncate max-w-[2.75rem] leading-none px-0.5">
          {label}
        </span>
      ) : null}
      <div className="flex items-center justify-center gap-px min-w-0 flex-1">
        {emojis.length === 0 ? (
          <span className="text-[9px] text-slate-400 px-1">—</span>
        ) : (
          emojis.map((emoji) => {
            const count = reactionCountForEmoji(summary, emoji);
            return (
              <span
                key={emoji}
                className="relative w-5 h-5 flex items-center justify-center text-[11px] leading-none shrink-0"
              >
                <span className={cn(count === 0 && 'opacity-35')}>{emoji}</span>
                {count > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] px-0.5 rounded-full bg-slate-800 text-white text-[8px] font-bold leading-[12px] text-center tabular-nums">
                    {formatCircleBadgeCount(count)}
                  </span>
                ) : null}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CircleGalleryGridReactionOverlay({
  reactions,
  patientUid,
  patientFirstName,
  compact = false,
  alwaysShow = false,
}: CircleGalleryGridReactionOverlayProps) {
  const t = useCircleT();
  const { patient, circle } = splitGalleryReactionsByPatient(reactions, patientUid);
  if (!alwaysShow && patient.length === 0 && circle.length === 0) return null;

  return (
    <div className="absolute inset-x-1 bottom-1 z-[1] flex flex-col gap-0.5 pointer-events-none">
      <MiniEmojiRow
        icon={User}
        label={t('gallery.reactionsFromPatient', { name: patientFirstName })}
        reactions={patient}
        compact={compact}
      />
      <MiniEmojiRow
        icon={Users}
        label={t('gallery.reactionsFromCircle')}
        reactions={circle}
        compact={compact}
      />
    </div>
  );
}
