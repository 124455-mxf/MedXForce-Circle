import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';

export function CircleMessageExpandOverlay({
  open,
  title,
  subtitle,
  onClose,
  children,
  t,
  zClassName = 'z-[160]',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  t: CircleTranslator;
  zClassName?: string;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={cn('fixed inset-0 flex flex-col bg-white', zClassName)}>
      <div className="shrink-0 flex items-start gap-3 px-4 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900 leading-snug">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
          aria-label={t('circle.expandClose')}
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5">{children}</div>
    </div>,
    document.body,
  );
}
