import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { FamilyGalleryPreviewPhoto } from '../hooks/useFamilyGalleryDashboard';
import { useGalleryImageSrc } from '../lib/galleryHeicDisplay';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';

const ROTATE_MS = 4500;

function GalleryPhotoBuffer({
  photo,
  visible,
  onReady,
}: {
  photo: FamilyGalleryPreviewPhoto;
  visible: boolean;
  onReady?: () => void;
}) {
  const src = useGalleryImageSrc(photo.url, photo.thumbnailUrl);

  useEffect(() => {
    if (!src || !onReady) return undefined;
    const probe = new Image();
    probe.onload = onReady;
    probe.onerror = onReady;
    probe.src = src;
    if (probe.complete) onReady();
    return undefined;
  }, [onReady, src]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      className={cn(
        'absolute inset-0 h-full w-full object-cover',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

type CircleGalleryRotatingPreviewWidgetProps = {
  photos: FamilyGalleryPreviewPhoto[];
  loading?: boolean;
  onOpenGallery: () => void;
};

export function CircleGalleryRotatingPreviewWidget({
  photos,
  loading = false,
  onOpenGallery,
}: CircleGalleryRotatingPreviewWidgetProps) {
  const t = useCircleT();
  const [shownIndex, setShownIndex] = useState(0);
  const nextReadyRef = useRef(false);
  const photosKey = useMemo(() => photos.map((photo) => photo.id).join('|'), [photos]);

  useEffect(() => {
    setShownIndex(0);
    nextReadyRef.current = false;
  }, [photosKey]);

  const shownPhoto = photos[shownIndex];
  const nextPhoto =
    photos.length > 1 ? photos[(shownIndex + 1) % photos.length] : undefined;

  useEffect(() => {
    nextReadyRef.current = false;
  }, [shownIndex, nextPhoto?.id]);

  const markNextReady = useCallback(() => {
    nextReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (photos.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      if (!nextReadyRef.current) return;
      nextReadyRef.current = false;
      setShownIndex((current) => (current + 1) % photos.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [photos.length, photosKey]);

  const subtitle =
    shownPhoto?.caption?.trim() ||
    (shownPhoto?.senderName
      ? t('dashboard.fromSender', { name: shownPhoto.senderName })
      : t('dashboard.tapToOpenGallery'));

  return (
    <button
      type="button"
      onClick={onOpenGallery}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-2xl border text-left transition-colors',
        'border-slate-100 bg-slate-100 hover:border-blue-200',
      )}
      aria-label={t('dashboard.openMediaGallery')}
    >
      {loading ? (
        <div className="absolute inset-0 animate-pulse bg-slate-200" />
      ) : photos.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-blue-50/60 p-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <ImageIcon size={20} className="text-blue-600" aria-hidden />
          </div>
          <p className="text-sm font-bold text-slate-800">{t('dashboard.mediaGallery')}</p>
          <p className="text-xs text-slate-500 leading-snug">{t('dashboard.sharePhotoToStart')}</p>
        </div>
      ) : (
        <>
          {shownPhoto ? (
            <GalleryPhotoBuffer
              key={shownPhoto.id}
              photo={shownPhoto}
              visible
            />
          ) : null}
          {nextPhoto && nextPhoto.id !== shownPhoto?.id ? (
            <GalleryPhotoBuffer
              key={nextPhoto.id}
              photo={nextPhoto}
              visible={false}
              onReady={markNextReady}
            />
          ) : null}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              {t('dashboard.gallery')}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white leading-snug line-clamp-2">
              {subtitle}
            </p>
            {photos.length > 1 ? (
              <div className="mt-2 flex items-center gap-1">
                {photos.slice(0, Math.min(photos.length, 6)).map((photo, dotIndex) => (
                  <span
                    key={photo.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      dotIndex === shownIndex % 6 ? 'w-3 bg-white' : 'w-1.5 bg-white/40',
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </button>
  );
}
