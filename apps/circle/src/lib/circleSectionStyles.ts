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

/** Secondary hint under tabs — one line on short screens instead of hidden. */
export const circleSectionContextHintClass = cn(
  'text-xs text-slate-500 leading-relaxed',
  `${short}line-clamp-1`,
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

/** Horizontally scrollable browse pills (matches patient app Media Gallery). */
export const circleBrowsePillListClass = cn(
  'max-w-full overflow-x-auto overscroll-x-contain p-1.5 bg-slate-50 rounded-2xl border border-slate-100',
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
  `${short}p-1`,
);

export const circleBrowsePillRowClass = 'flex flex-nowrap gap-2 w-max min-w-full';

export function circleBrowsePillButtonClass(active: boolean): string {
  return cn(
    'px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 whitespace-nowrap',
    `${short}px-3`,
    `${short}py-1.5`,
    `${short}text-xs`,
    active
      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
      : 'text-slate-500 hover:text-slate-700 hover:bg-white',
  );
}

/** Work-tab chrome: tighter panels when the compact app header is active. */
export function circleWorkTabPanelClass(compact: boolean): string {
  return cn(circleSectionPanelClass, compact && 'rounded-2xl');
}

export function circleWorkTabHeaderClass(compact: boolean): string {
  return cn(
    'shrink-0 border-b border-slate-100 bg-white/80',
    compact ? 'px-3 pt-3.5 pb-3' : 'p-4',
    `${short}px-3`,
    compact ? `${short}pt-3 ${short}pb-2.5` : `${short}p-3`,
  );
}

export const circleInsetCardClass =
  'bg-white rounded-2xl border border-slate-100 shadow-sm';

/** Compact analytics / analysis metric row (icon + title + status). */
export const circleAnalyticsMetricRowClass = cn(
  circleInsetCardClass,
  'flex items-center gap-3 p-3 min-h-[56px]',
  `${short}p-2.5`,
  `${short}min-h-[52px]`,
  `${short}gap-2.5`,
);

export const circleCompactCardClass = cn('border rounded-2xl p-4', `${short}p-3`);
