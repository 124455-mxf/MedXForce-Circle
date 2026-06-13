import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Loader2, X } from 'lucide-react';
import { getCroppedImg } from '../lib/imageCrop';
import { useCircleT } from '../lib/circleI18nContext';

type CircleProfilePhotoCropModalProps = {
  file: File;
  onCancel: () => void;
  onApply: (croppedDataUrl: string) => void | Promise<void>;
};

export function CircleProfilePhotoCropModal({
  file,
  onCancel,
  onApply,
}: CircleProfilePhotoCropModalProps) {
  const t = useCircleT();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a fresh object URL from the File on each mount (StrictMode-safe).
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setImageSrc(null);
    };
  }, [file]);

  const handleApply = async () => {
    if (!croppedAreaPixels || !imageSrc) {
      setError('Move or zoom the image so the crop area is ready, then try again.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!cropped) throw new Error('Could not crop image.');
      await onApply(cropped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not apply crop.';
      setError(message);
      console.warn('[CircleProfilePhotoCropModal]', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Crop Profile Picture</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
            aria-label={t('common.close')}
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative h-[400px] bg-slate-900">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropAreaChange={(_area, pixels) => setCroppedAreaPixels(pixels)}
              onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
              onZoomChange={setZoom}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <Loader2 size={32} className="animate-spin" />
            </div>
          )}
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold text-slate-500 uppercase tracking-wider">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-label={t('common.aria.zoom')}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={processing}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing…
                </>
              ) : (
                'Apply Crop'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
