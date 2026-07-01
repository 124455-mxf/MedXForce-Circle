/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { RESPONSIVE_FORM_MODAL_NAV_CLASS } from '../lib/responsiveModalClasses';
import { cn } from '../lib/utils';

export type CircleCareCalendarFormSectionId = 'general' | 'schedule' | 'tasks' | 'invitees';

export type CircleCareCalendarFormSection = {
  id: CircleCareCalendarFormSectionId;
  title: string;
  shortTitle: string;
  icon: LucideIcon;
};

type CircleCareCalendarEntryFormNavProps = {
  sections: CircleCareCalendarFormSection[];
  currentIndex: number;
  onSelect: (id: CircleCareCalendarFormSectionId) => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  busy?: boolean;
  stepOfLabel: string;
};

export function CircleCareCalendarEntryFormNav({
  sections,
  currentIndex,
  onSelect,
  onPrev,
  onNext,
  onFinish,
  busy = false,
  stepOfLabel,
}: CircleCareCalendarEntryFormNavProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isLastStep = currentIndex >= sections.length - 1;
  const current = sections[currentIndex];

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const activeButton = slider.children[currentIndex] as HTMLElement | undefined;
    if (!activeButton) return;
    const containerWidth = slider.offsetWidth;
    const buttonOffset = activeButton.offsetLeft;
    const buttonWidth = activeButton.offsetWidth;
    slider.scrollTo({
      left: buttonOffset - containerWidth / 2 + buttonWidth / 2,
      behavior: 'smooth',
    });
  }, [currentIndex]);

  if (!current) return null;

  return (
    <div className={RESPONSIVE_FORM_MODAL_NAV_CLASS}>
      <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3 md:mb-2 tablet-portrait:mb-2 landscape:mb-1.5 landscape-short:mb-1">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <div className="inline-flex px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {stepOfLabel}
          </div>
          <h4 className="text-base font-bold text-slate-800 truncate tablet-portrait:hidden landscape-short:hidden">
            {current.title}
          </h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0 || busy}
            className={cn(
              'p-2 rounded-xl transition-all',
              currentIndex === 0 || busy
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
            )}
            aria-label="Previous section"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={isLastStep ? onFinish : onNext}
            disabled={busy}
            className="p-2.5 rounded-2xl transition-all shadow-lg disabled:opacity-50 bg-violet-600 text-white shadow-violet-100 hover:bg-violet-700"
            aria-label={isLastStep ? 'Save appointment' : 'Next section'}
          >
            {isLastStep ? <Check size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      <div
        ref={sliderRef}
        className="flex items-center gap-2 md:grid md:grid-cols-4 md:gap-1.5 md:overflow-visible overflow-x-auto -mx-4 px-4 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 landscape:flex landscape:overflow-x-auto landscape:-mx-4 landscape:px-4 py-1 no-scrollbar scroll-smooth"
      >
        {sections.map((section, idx) => {
          const Icon = section.icon;
          const isActive = currentIndex === idx;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-label={section.title}
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center border-2 shrink-0',
                'px-2.5 py-2 gap-1.5 landscape-short:px-2 landscape-short:py-1.5',
                'md:w-full md:min-w-0 md:justify-center md:px-2 md:py-2 md:gap-1.5',
                'landscape:w-auto landscape:shrink-0',
                isActive
                  ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200/80 z-10'
                  : 'bg-white border-slate-100 text-slate-500 hover:border-violet-200 hover:text-violet-700',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-xl flex items-center justify-center shrink-0',
                  isActive ? 'bg-white/20' : 'bg-slate-50',
                )}
              >
                <Icon size={14} />
              </span>
              <span className="hidden landscape-short:flex items-center gap-1 leading-none text-left min-w-0">
                <span className="text-[10px] tabular-nums opacity-70 shrink-0">{idx + 1}</span>
                <span className="truncate">{section.shortTitle}</span>
              </span>
              <span className="landscape-short:hidden flex items-center gap-1.5 leading-none text-left">
                <span className="text-[10px] tabular-nums font-bold opacity-70 shrink-0">{idx + 1}</span>
                <span className="xl:hidden">{section.shortTitle}</span>
                <span className="hidden xl:inline">{section.title}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
