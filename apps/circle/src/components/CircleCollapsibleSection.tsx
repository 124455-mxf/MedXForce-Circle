import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

type CircleCollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

export function CircleCollapsibleSection({
  title,
  children,
  className,
  defaultOpen = false,
}: CircleCollapsibleSectionProps) {
  return (
    <details
      open={defaultOpen || undefined}
      className={cn(
        'rounded-2xl border border-slate-100 bg-white shadow-sm group',
        className,
      )}
    >
      <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none select-none">
        <span className="font-bold text-slate-800">{title}</span>
        <ChevronDown
          size={18}
          className="text-slate-400 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-slate-100">{children}</div>
    </details>
  );
}
