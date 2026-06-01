import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import type { GalleryAlbumMedia } from '@medxforce/shared';
import { markCircleGalleryMediaViewed } from '../lib/circleGalleryViews';
import { useGalleryMediaReactions } from '../hooks/useGalleryMediaReactions';
import { CircleGalleryReactionBar } from './CircleGalleryReactionBar';
import { cn } from '../lib/utils';

const DEFAULT_SLIDESHOW_SECONDS = 5;

type CircleGalleryLightboxProps = {
  db: Firestore;
  user: User;
  patientId: string;
  items: GalleryAlbumMedia[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** When true (e.g. Play all), auto-advance through photos and videos. */
  autoPlaySlideshow?: boolean;
};

export function CircleGalleryLightbox({
  db,
  user,
  patientId,
  items,
  index,
  onIndexChange,
  onClose,
  autoPlaySlideshow = false,
}: CircleGalleryLightboxProps) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const [isSlideshowActive, setIsSlideshowActive] = useState(autoPlaySlideshow);
  const [recentReactionId, setRecentReactionId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { reactionsByMediaId, addReaction } = useGalleryMediaReactions(
    db,
    patientId,
    user.uid,
  );
  const mediaReactions = item ? reactionsByMediaId[item.id] ?? [] : [];

  useEffect(() => {
    setIsSlideshowActive(autoPlaySlideshow);
  }, [autoPlaySlideshow]);

  useEffect(() => {
    if (!item) return;
    markCircleGalleryMediaViewed(patientId, item.id);
  }, [item, patientId]);

  const goNext = useCallback(() => {
    if (index < items.length - 1) {
      onIndexChange(index + 1);
    } else if (isSlideshowActive && items.length > 1) {
      onIndexChange(0);
    }
  }, [index, isSlideshowActive, items.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (!isSlideshowActive || !item || item.isVideo) return;

    const timer = window.setInterval(() => {
      goNext();
    }, DEFAULT_SLIDESHOW_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [goNext, isSlideshowActive, item]);

  useEffect(() => {
    if (!isSlideshowActive || !item?.isVideo) return;

    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      goNext();
    };

    video.addEventListener('ended', onEnded);
    void video.play().catch(() => {});

    return () => {
      video.removeEventListener('ended', onEnded);
    };
  }, [goNext, isSlideshowActive, item?.id, item?.isVideo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) goPrev();
      if (e.key === 'ArrowRight' && hasNext) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, hasNext, hasPrev, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-slate-100" aria-hidden />
      <div className="relative shrink-0 flex items-center justify-between px-4 py-3 text-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white text-slate-500 border border-slate-200 shadow-md flex items-center justify-center hover:text-slate-700"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <span className="h-8 px-4 bg-white text-slate-800 rounded-full text-sm font-bold shadow-xl border border-slate-200 tabular-nums flex items-center">
          {index + 1} <span className="text-slate-300 mx-1">/</span> {items.length}
        </span>
        <button
          type="button"
          onClick={() => setIsSlideshowActive((v) => !v)}
          className="w-9 h-9 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-700"
          aria-label={isSlideshowActive ? 'Pause slideshow' : 'Play slideshow'}
        >
          {isSlideshowActive ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2">
        {hasPrev && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-lg flex items-center justify-center"
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        {item.isVideo ? (
          <video
            key={item.id}
            ref={videoRef}
            src={item.url}
            controls={!isSlideshowActive}
            playsInline
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          <img
            src={item.url}
            alt=""
            className="max-h-full max-w-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        )}
        {hasNext && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-lg flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </button>
        )}

        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center z-20 pointer-events-none">
          <CircleGalleryReactionBar
            mediaReactions={mediaReactions}
            recentReactionId={recentReactionId}
            onReact={(emoji) => {
              void addReaction(item.id, emoji).then((id) => {
                if (id) setRecentReactionId(id);
              });
            }}
          />
        </div>
      </div>

      <div className="relative shrink-0 p-4 space-y-1 text-center text-slate-700">
        {item.caption && (
          <p className="text-sm font-medium leading-relaxed text-slate-800">{item.caption}</p>
        )}
        <p className="text-xs text-slate-500">
          {item.source === 'patient' ? 'From your loved one' : item.senderName}
          {' · '}
          {new Date(item.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function GalleryThumb({
  item,
  className,
  unseen,
}: {
  item: GalleryAlbumMedia;
  className?: string;
  unseen?: boolean;
}) {
  return (
    <div className={cn('relative w-full h-full bg-slate-100', className)}>
      {item.isVideo ? (
        item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
            <Play size={28} fill="currentColor" />
          </div>
        )
      ) : (
        <img
          src={item.thumbnailUrl || item.url}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      {item.isVideo && (
        <div className="absolute top-2 right-2 p-1.5 bg-black/45 rounded-lg text-white">
          <Play size={14} fill="currentColor" />
        </div>
      )}
      {unseen && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold uppercase">
          New
        </span>
      )}
    </div>
  );
}
