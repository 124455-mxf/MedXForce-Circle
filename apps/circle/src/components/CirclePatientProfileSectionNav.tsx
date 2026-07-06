/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  circleHorizontalScrollClass,
  circleHorizontalScrollInnerClass,
} from '../lib/circleSectionStyles';

export type CirclePatientProfileNavSection = {
  id: string;
  title: string;
  shortTitle: string;
  icon: LucideIcon;
};

type CirclePatientProfileSectionNavProps = {
  sections: CirclePatientProfileNavSection[];
  currentIndex: number;
  onSelect: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  stepOfLabel: string;
};

/** Minimum pointer movement before we treat the gesture as scroll (not a tab click). */
const DRAG_THRESHOLD_PX = 6;

export function CirclePatientProfileSectionNav({
  sections,
  currentIndex,
  onSelect,
  onPrev,
  onNext,
  stepOfLabel,
}: CirclePatientProfileSectionNavProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
  } | null>(null);
  const current = sections[currentIndex];
  const isLastStep = currentIndex >= sections.length - 1;

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const activeButton = slider.querySelector<HTMLElement>(`[data-profile-step="${currentIndex}"]`);
    if (!activeButton) return;
    const containerWidth = slider.offsetWidth;
    const buttonOffset = activeButton.offsetLeft;
    const buttonWidth = activeButton.offsetWidth;
    slider.scrollTo({
      left: buttonOffset - containerWidth / 2 + buttonWidth / 2,
      behavior: 'smooth',
    });
  }, [currentIndex]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = sliderRef.current;
    if (!el || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = sliderRef.current;
    const drag = dragRef.current;
    if (!el || !drag || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(delta) <= DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      el.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    el.scrollLeft = drag.scrollLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = sliderRef.current;
    const drag = dragRef.current;
    if (!el) return;

    if (drag && drag.pointerId === event.pointerId) {
      if (drag.moved) {
        const suppressClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          el.removeEventListener('click', suppressClick, true);
        };
        el.addEventListener('click', suppressClick, true);
      }
      dragRef.current = null;
    }

    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = sliderRef.current;
    if (!el) return;
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;
    if (!delta) return;
    el.scrollLeft += delta;
    event.preventDefault();
  };

  if (!current) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {stepOfLabel}
          </div>
          <h4 className="text-base font-bold text-slate-800 truncate">{current.title}</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className={cn(
              'p-2 rounded-xl transition-all',
              currentIndex === 0
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
            )}
            aria-label="Previous section"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isLastStep}
            className={cn(
              'p-2.5 rounded-2xl transition-all shadow-lg',
              isLastStep
                ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed'
                : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700',
            )}
            aria-label="Next section"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={sliderRef}
        className={cn(
          circleHorizontalScrollClass,
          'cursor-grab active:cursor-grabbing py-1 -mx-1 px-1',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        <div className={cn(circleHorizontalScrollInnerClass, 'gap-2')}>
          {sections.map((section, idx) => {
            const Icon = section.icon;
            const isActive = currentIndex === idx;
            return (
              <button
                key={section.id}
                type="button"
                data-profile-step={idx}
                onClick={() => onSelect(section.id)}
                aria-label={section.title}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center border-2 shrink-0',
                  'px-2.5 py-2 gap-1.5',
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200/80 z-10'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-700',
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
                <span className="flex items-center gap-1.5 leading-none text-left">
                  <span className="text-[10px] tabular-nums font-bold opacity-70 shrink-0">
                    {idx + 1}
                  </span>
                  <span>{section.shortTitle}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
