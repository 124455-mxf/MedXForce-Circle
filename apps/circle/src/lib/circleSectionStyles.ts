import { cn } from './utils';

/** ~iPhone SE / short Android — tighten layout without a separate UI. */
const short = '[@media(max-height:740px)]:';

/** Shared shell for Messages / Media (and similar) main panels in Circle. */
export const circleSectionPanelClass = cn(
  'bg-[#F8FAFC] rounded-[32px] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden',
  `${short}rounded-2xl`,
);

export const circleSectionHeaderClass = cn(
  'shrink-0 p-4 border-b border-slate-100 bg-white/80',
  `${short}p-3`,
);

export const circleSectionHeaderStackClass = cn('space-y-3', `${short}space-y-2`);

export const circleSectionTitleClass = cn(
  'text-base font-bold text-slate-800 leading-snug',
  `${short}text-[15px]`,
);

export const circleSectionSubtitleClass = cn(
  'text-xs text-slate-500 mt-0.5 leading-relaxed',
  `${short}line-clamp-2`,
);

/** Secondary hint under tabs — hidden on short screens to save vertical space. */
export const circleSectionContextHintClass = cn(
  'text-xs text-slate-500 leading-relaxed',
  `${short}hidden`,
);

export const circleSectionBodyClass =
  'flex-1 min-h-0 overflow-y-auto overscroll-contain';

export const circleSectionBodyPaddingClass = cn(
  'p-4 space-y-3',
  `${short}p-3`,
  `${short}space-y-2`,
);

export const circleSectionComposerClass = cn(
  'shrink-0 p-3 sm:p-4 border-t border-slate-200 bg-white space-y-3',
  `${short}p-2`,
  `${short}space-y-2`,
);

export const circleSectionEmptyCardClass = cn(
  'bg-white rounded-[32px] border border-slate-100 shadow-sm p-6',
  `${short}rounded-2xl`,
  `${short}p-4`,
);

export const circleSectionEmptyStateClass = cn(
  'py-10 text-center rounded-2xl border border-dashed border-slate-200 bg-white',
  `${short}py-6`,
);

export const circleHeaderActionButtonClass = cn(
  'shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors',
  `${short}w-8`,
  `${short}h-8`,
);

export const circleTabListClass = cn(
  'flex gap-1 p-1 bg-slate-100 rounded-xl',
  `${short}p-0.5`,
  `${short}rounded-lg`,
);

export function circleTabButtonClass(active: boolean, extra?: string): string {
  return cn(
    'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all',
    `${short}py-1.5`,
    `${short}px-1`,
    `${short}text-[10px]`,
    `${short}rounded-md`,
    active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
    extra,
  );
}

export const circleInsetCardClass =
  'bg-white rounded-2xl border border-slate-100 shadow-sm';

export const circleCompactCardClass = cn('border rounded-2xl p-4', `${short}p-3`);
