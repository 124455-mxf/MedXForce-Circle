import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import type { User } from 'firebase/auth';
import { ChevronLeft, ChevronRight, ImageIcon, Pause, Play, X } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import type { GalleryAlbumMedia, GalleryTagPerson } from '@medxforce/shared';
import { markCircleGalleryMediaViewed } from '../lib/circleGalleryViews';
import { useGalleryMediaReactions } from '../hooks/useGalleryMediaReactions';
import { useGalleryPersonTagging } from '../hooks/useGalleryPersonTagging';
import { CircleGalleryReactionBar } from './CircleGalleryReactionBar';
import { CircleGalleryIdentifyPanel } from './CircleGalleryIdentifyPanel';
import { cn } from '../lib/utils';
import { useGalleryImageSrc } from '../lib/galleryHeicDisplay';
import {
  buildLightboxMediaFit,
  type LightboxStageBounds,
  useLightboxStageBounds,
} from '../lib/galleryLightboxLayout';
import { resolveGalleryUploaderDisplayName } from '../lib/galleryUploaderDisplay';
import { CircleGalleryCaptionView } from './CircleGalleryCaptionView';
import { useCircleT } from '../lib/circleI18nContext';

const DEFAULT_SLIDESHOW_SECONDS = 5;

function CircleAdaptiveLightboxPhoto({
  src,
  stageBounds,
}: {
  src: string;
  stageBounds: LightboxStageBounds;
}) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setNaturalSize(null);
  }, [src]);

  const fit = useMemo(() => {
    if (!naturalSize) return null;
    return buildLightboxMediaFit(naturalSize.width, naturalSize.height, stageBounds);
  }, [naturalSize, stageBounds]);

  const frameStyle =
    fit && fit.maxWidth > 0 && fit.maxHeight > 0
      ? { width: fit.maxWidth, height: fit.maxHeight }
      : undefined;

  return (
    <div className="relative flex items-center justify-center" style={frameStyle}>
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cn(
          'object-contain shadow-lg w-full h-full',
          fit?.radiusClass ?? 'rounded-3xl max-h-full max-w-full',
        )}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setNaturalSize({
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
          }
        }}
      />
    </div>
  );
}

type CircleGalleryLightboxProps = {
  db: Firestore;
  user: User;
  patientId: string;
  patientDisplayName: string;
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
  patientDisplayName,
  items,
  index,
  onIndexChange,
  onClose,
  autoPlaySlideshow = false,
}: CircleGalleryLightboxProps) {
  const t = useCircleT();
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const [isSlideshowActive, setIsSlideshowActive] = useState(autoPlaySlideshow);
  const indexRef = useRef(index);
  const slideshowActiveRef = useRef(isSlideshowActive);
  const onIndexChangeRef = useRef(onIndexChange);
  const itemsLengthRef = useRef(items.length);
  indexRef.current = index;
  slideshowActiveRef.current = isSlideshowActive;
  onIndexChangeRef.current = onIndexChange;
  itemsLengthRef.current = items.length;
  const [recentReactionId, setRecentReactionId] = useState<string | null>(null);
  const [showIdentify, setShowIdentify] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { reactionsByMediaId, addReaction } = useGalleryMediaReactions(
    db,
    patientId,
    user.uid,
  );
  const {
    people,
    getTaggedOnMedia,
    isPersonTaggedOnMedia,
    togglePersonOnMedia,
    createPersonOnMedia,
  } = useGalleryPersonTagging(db, patientId, patientDisplayName, user.uid);
  const mediaReactions = item ? reactionsByMediaId[item.id] ?? [] : [];
  const canIdentifyPerson =
    !!item && !item.isVideo && item.uploadedByUid === user.uid;
  const taggedPeople = item ? getTaggedOnMedia(item.id) : [];

  useEffect(() => {
    setIsSlideshowActive(autoPlaySlideshow);
  }, [autoPlaySlideshow]);

  useEffect(() => {
    if (!item) return;
    markCircleGalleryMediaViewed(patientId, item.id);
  }, [item, patientId]);

  useEffect(() => {
    setShowIdentify(false);
  }, [item?.id]);

  const goNext = useCallback(() => {
    const i = indexRef.current;
    const len = itemsLengthRef.current;
    if (i < len - 1) {
      onIndexChangeRef.current(i + 1);
      return;
    }
    if (slideshowActiveRef.current && len > 1) {
      onIndexChangeRef.current(0);
    }
  }, []);

  const goPrev = useCallback(() => {
    const i = indexRef.current;
    if (i > 0) onIndexChangeRef.current(i - 1);
  }, []);

  const itemRef = useRef(item);
  itemRef.current = item;

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const bindVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    setVideoElement(element);
  }, []);

  // Photos: fixed interval. Never advance while a video slide is active.
  useEffect(() => {
    if (!isSlideshowActive || !item || item.isVideo || items.length <= 1) return;

    const timer = window.setInterval(() => {
      if (itemRef.current?.isVideo) return;
      goNext();
    }, DEFAULT_SLIDESHOW_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [goNext, isSlideshowActive, item?.id, item?.isVideo, items.length]);

  // Videos: advance only when playback finishes.
  useEffect(() => {
    if (!isSlideshowActive || !item?.isVideo || !videoElement) return;

    const onEnded = () => {
      goNext();
    };

    const startPlayback = () => {
      videoElement.currentTime = 0;
      void videoElement.play().catch(() => {});
    };

    const onCanPlay = () => {
      if (videoElement.paused) startPlayback();
    };

    videoElement.addEventListener('ended', onEnded);
    videoElement.addEventListener('canplay', onCanPlay);

    if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback();
    }

    return () => {
      videoElement.removeEventListener('ended', onEnded);
      videoElement.removeEventListener('canplay', onCanPlay);
      videoElement.pause();
    };
  }, [goNext, isSlideshowActive, item?.id, item?.isVideo, videoElement]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) goPrev();
      if (e.key === 'ArrowRight' && hasNext) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, hasNext, hasPrev, onClose]);

  const imageSrc = useGalleryImageSrc(item?.isVideo ? undefined : item?.url, item?.thumbnailUrl);
  const { ref: lightboxStageRef, bounds: lightboxStageBounds } = useLightboxStageBounds<HTMLDivElement>();

  const uploaderLabel = resolveGalleryUploaderDisplayName(
    item?.senderName,
    item?.source,
    patientDisplayName,
  );

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-0 bg-slate-100" aria-hidden />

      <div
        ref={lightboxStageRef}
        className="absolute inset-0 flex items-center justify-center px-14 sm:px-16 pt-14 pb-36"
      >
        {hasPrev && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-lg flex items-center justify-center"
            aria-label={t('common.aria.previous')}
          >
            <ChevronLeft size={28} />
          </button>
        )}
        {item.isVideo ? (
          <video
            key={item.id}
            ref={bindVideoElement}
            src={item.url}
            controls={!isSlideshowActive}
            playsInline
            muted={isSlideshowActive}
            className="max-h-full max-w-full rounded-lg"
          />
        ) : imageSrc ? (
          <CircleAdaptiveLightboxPhoto src={imageSrc} stageBounds={lightboxStageBounds} />
        ) : (
          <div className="max-w-md rounded-2xl bg-white px-8 py-10 text-center text-slate-500 shadow-lg">
            <ImageIcon size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm">This photo could not be previewed.</p>
          </div>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-slate-600 border border-slate-200 shadow-lg flex items-center justify-center"
            aria-label={t('common.aria.next')}
          >
            <ChevronRight size={28} />
          </button>
        )}

        {showIdentify && canIdentifyPerson ? (
          <CircleGalleryIdentifyPanel
            people={people}
            mediaId={item.id}
            isTagged={(personId) => isPersonTaggedOnMedia(personId, item.id)}
            onToggle={(person: GalleryTagPerson) => {
              void togglePersonOnMedia(person, item.id).catch(() => {
                window.alert(t('gallery.tagFailed'));
              });
            }}
            onCreateAndTag={(name, relationship) =>
              createPersonOnMedia(name, relationship, item.id).catch(() => {
                window.alert(t('gallery.tagFailed'));
              })
            }
            onClose={() => setShowIdentify(false)}
          />
        ) : null}

      </div>

      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto w-9 h-9 rounded-full bg-white/95 text-slate-500 border border-slate-200 shadow-md flex items-center justify-center hover:text-slate-700"
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>
        <span className="pointer-events-none h-8 px-4 bg-white/95 text-slate-800 rounded-full text-sm font-bold shadow-xl border border-slate-200 tabular-nums flex items-center whitespace-nowrap">
          {index + 1} <span className="text-slate-300 mx-1">/</span> {items.length}
        </span>
        <button
          type="button"
          onClick={() => setIsSlideshowActive((v) => !v)}
          className="pointer-events-auto w-9 h-9 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-700"
          aria-label={
            isSlideshowActive ? t('common.aria.pauseSlideshow') : t('common.aria.playSlideshow')
          }
        >
          {isSlideshowActive ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto w-full">
          <CircleGalleryReactionBar
            mediaReactions={mediaReactions}
            recentReactionId={recentReactionId}
            taggedPeople={taggedPeople}
            onReact={(emoji) => {
              void addReaction(item.id, emoji).then((id) => {
                if (id) setRecentReactionId(id);
              });
            }}
            showIdentify={canIdentifyPerson}
            onToggleIdentify={() => setShowIdentify((v) => !v)}
          />
        </div>
        {(item.caption || uploaderLabel) && (
          <div className="pointer-events-none max-w-[min(100%,40rem)] rounded-2xl bg-white/95 border border-slate-200 shadow-lg px-4 py-2 text-center">
            {item.caption ? (
              <CircleGalleryCaptionView key={item.id} caption={item.caption} />
            ) : null}
            <p className="text-xs text-slate-500">
              {uploaderLabel}
              {' · '}
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const GalleryThumb = memo(function GalleryThumb({
  item,
  className,
  unseen,
}: {
  item: GalleryAlbumMedia;
  className?: string;
  unseen?: boolean;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const imageSrc = useGalleryImageSrc(item.isVideo ? undefined : item.url, item.thumbnailUrl);

  useEffect(() => {
    setLoadFailed(false);
  }, [item.id, imageSrc]);

  return (
    <div className={cn('relative w-full h-full bg-slate-100', className)}>
      {item.isVideo ? (
        item.thumbnailUrl && !loadFailed ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
            <Play size={28} fill="currentColor" />
          </div>
        )
      ) : imageSrc && !loadFailed ? (
        <img
          src={imageSrc}
          alt=""
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
          <ImageIcon size={28} />
        </div>
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
});
