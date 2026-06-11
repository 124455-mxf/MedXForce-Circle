/** Shortest viewport edge — stable when the device rotates. */
export function circleViewportShortestSide(): number {
  if (typeof window === 'undefined') return 0;
  return Math.min(window.innerWidth, window.innerHeight);
}

export function isCircleLandscapeViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
}

/**
 * Tablets (including iPad mini) typically have a shortest side ≥ 600px.
 * Phones stay below that even in landscape (e.g. iPhone ~390–430).
 */
export const CIRCLE_TABLET_SHORTEST_SIDE_PX = 600;

export function isCircleTabletViewport(): boolean {
  return circleViewportShortestSide() >= CIRCLE_TABLET_SHORTEST_SIDE_PX;
}

/** Touch-first device — excludes desktop browsers with a mouse. */
export function isCircleCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Block landscape on phones only; tablets and desktop may use landscape. */
export function shouldRequireCirclePortrait(): boolean {
  if (!isCircleLandscapeViewport()) return false;
  if (!isCircleCoarsePointerDevice()) return false;
  return !isCircleTabletViewport();
}
