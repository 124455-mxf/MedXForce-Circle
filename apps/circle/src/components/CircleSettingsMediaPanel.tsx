import { Image as ImageIcon } from 'lucide-react';
import {
  setCircleGallerySkipPhotoDeleteConfirm,
  setCircleGalleryThumbnailSize,
  type CircleGalleryThumbnailSize,
} from '../lib/circleGalleryPreferences';
import { useCircleGallerySkipPhotoDeleteConfirm } from '../hooks/useCircleGallerySkipPhotoDeleteConfirm';
import { useCircleGalleryThumbnailSize } from '../hooks/useCircleGalleryThumbnailSize';
import { cn } from '../lib/utils';

const SIZE_OPTIONS: { id: CircleGalleryThumbnailSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Large' },
];

export function CircleSettingsMediaPanel() {
  const thumbnailSize = useCircleGalleryThumbnailSize();
  const skipPhotoDeleteConfirm = useCircleGallerySkipPhotoDeleteConfirm();

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <ImageIcon size={22} />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-800">Media settings</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Control how photos and videos appear in the media gallery.
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">Thumbnail size</p>
          <p className="text-sm text-slate-400">
            Choose how large each picture appears in album grids.
          </p>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5 flex-wrap"
          role="group"
          aria-label="Thumbnail size"
        >
          {SIZE_OPTIONS.map(({ id, label }) => {
            const active = thumbnailSize === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCircleGalleryThumbnailSize(id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-slate-800">Skip photo delete confirmation</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              When on, deleting a photo or video removes it immediately without asking again.
              Deleting an album always asks for confirmation.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={skipPhotoDeleteConfirm}
            onClick={() =>
              setCircleGallerySkipPhotoDeleteConfirm(!skipPhotoDeleteConfirm)
            }
            className={cn(
              'w-14 h-8 rounded-full transition-all duration-300 relative shrink-0 mt-0.5',
              skipPhotoDeleteConfirm ? 'bg-blue-600' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-0 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300',
                skipPhotoDeleteConfirm ? 'translate-x-7' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
