import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { FamilyGalleryPreviewPhoto } from '../hooks/useFamilyGalleryDashboard';
import { useGalleryImageSrc } from '../lib/galleryHeicDisplay';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';

const ROTATE_MS = 4500;

function RotatingPhotoLayer({ photo }: { photo: FamilyGalleryPreviewPhoto }) {
  const src = useGalleryImageSrc(photo.url, photo.thumbnailUrl);

  if (!src) {
    return <div className="absolute inset-0 animate-pulse bg-slate-300" />;
  }

  return (
    <img
      key={photo.id}
      src={src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover animate-[galleryFadeIn_700ms_ease-in-out]"
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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [photos]);

  useEffect(() => {
    if (photos.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [photos]);

  const current = photos[index];
  const subtitle =
    current?.caption?.trim() ||
    (current?.senderName
      ? t('dashboard.fromSender', { name: current.senderName })
      : t('dashboard.tapToOpenGallery'));

  return (
    <button
      type="button"
      onClick={onOpenGallery}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-2xl border text-left transition-colors',
        'border-slate-100 bg-slate-900 hover:border-blue-200',
      )}
      aria-label={t('dashboard.openMediaGallery')}
    >
      <style>{`@keyframes galleryFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
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
          {current ? <RotatingPhotoLayer key={current.id} photo={current} /> : null}

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
                      dotIndex === index % 6 ? 'w-3 bg-white' : 'w-1.5 bg-white/40',
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
