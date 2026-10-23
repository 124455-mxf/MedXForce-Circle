import { Lock } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';

export function CircleCareTransitionDraftBadge({ className }: { className?: string }) {
  const t = useCircleT();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-200 text-amber-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        className,
      )}
    >
      <Lock size={10} strokeWidth={2.5} aria-hidden />
      {t('careTransition.packNotLiveBadge')}
    </span>
  );
}
