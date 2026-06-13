import { useRef, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import {
  circleHorizontalScrollClass,
  circleHorizontalScrollInnerClass,
} from '../lib/circleSectionStyles';

type CircleHorizontalScrollStripProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  role?: string;
  'aria-label'?: string;
};

/** Minimum pointer movement before we treat the gesture as scroll (not a tab click). */
const DRAG_THRESHOLD_PX = 6;

/** Horizontal scroll row — pointer-drag + touch pan, including when the gesture starts on tabs. */
export function CircleHorizontalScrollStrip({
  children,
  className,
  innerClassName,
  role,
  'aria-label': ariaLabel,
}: CircleHorizontalScrollStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number; moved: boolean } | null>(
    null,
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
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
    const el = ref.current;
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
    const el = ref.current;
    if (!el) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (!delta) return;
    el.scrollLeft += delta;
    event.preventDefault();
  };

  return (
    <div
      ref={ref}
      className={cn(
        circleHorizontalScrollClass,
        'cursor-grab active:cursor-grabbing',
        className,
      )}
      role={role}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
    >
      <div className={cn(circleHorizontalScrollInnerClass, innerClassName)}>{children}</div>
    </div>
  );
}
