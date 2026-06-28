import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const RING_CIRCUMFERENCE = 100.5;

function ringDashOffset(progress: number): number {
  const safe = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  return RING_CIRCUMFERENCE * (1 - safe / 100);
}

export function CircleGalleryLightboxSlideshowTimer({
  active,
  progress,
  label,
}: {
  active: boolean;
  progress: number;
  label: string;
}) {
  const dashOffset = ringDashOffset(progress);

  return (
    <div className="relative w-8 h-8 shrink-0" aria-hidden={!active}>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-white rounded-full border border-slate-200 shadow-xl transition-opacity duration-200',
          active ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40" aria-hidden>
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            className="text-slate-100"
          />
          <motion.circle
            cx="20"
            cy="20"
            r="16"
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            className="text-blue-600"
          />
        </svg>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold text-slate-800 tabular-nums',
            label.length > 2 ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
