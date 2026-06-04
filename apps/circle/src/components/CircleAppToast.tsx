import { cn } from '../lib/utils';
import type { CircleToastTone } from '../hooks/useCircleToast';

const toneClass: Record<CircleToastTone, string> = {
  success: 'bg-slate-900 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
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
          'rounded-2xl px-4 py-3 text-sm font-semibold text-center shadow-lg',
          toneClass[tone],
        )}
      >
        {message}
      </p>
    </div>
  );
}
