import { cn } from '../lib/utils';
import type { CircleToastTone } from '../hooks/useCircleToast';

const toneClass: Record<CircleToastTone, string> = {
  success: 'bg-slate-900/95 text-white border border-slate-700/50 backdrop-blur-sm',
  error:
    'bg-white text-slate-800 border border-red-100 shadow-lg shadow-red-100/40 circle-urgency-banner-card-alert pl-5',
  info:
    'bg-white text-slate-800 border border-sky-100 shadow-lg shadow-sky-100/40 circle-urgency-banner-card-attention pl-5',
};

export function CircleAppToast({
  message,
  tone = 'success',
}: {
  message: string | null;
  tone?: CircleToastTone;
}) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 z-[200] -translate-x-1/2 px-4 w-full max-w-sm pointer-events-none"
    >
      <p
        className={cn(
          'relative overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold text-center',
          toneClass[tone],
        )}
      >
        {message}
      </p>
    </div>
  );
}
