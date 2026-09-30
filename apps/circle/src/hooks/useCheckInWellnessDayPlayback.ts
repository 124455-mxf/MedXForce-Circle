/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Hold each day before advancing (−6 → Today). */
export const CHECK_IN_DAY_PLAYBACK_MS = 1500;

/** Full −6→Today passes before autoplay stops on Today. */
export const CHECK_IN_DAY_PLAYBACK_RUNS = 2;

function closestScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Auto-advances the check-in week day index from −6 through Today.
 * Starts when the tile is on screen, then runs two full passes even if
 * intersection flickers. Stops on Today, or when the user picks a day.
 */
export function useCheckInWellnessDayPlayback(
  frameCount: number,
  frameKey: string,
  enabled = true,
): {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  playbackRootRef: RefObject<HTMLDivElement | null>;
} {
  const todayIndex = Math.max(0, frameCount - 1);
  const [selectedIndex, setSelectedIndexState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined');
  const tickRef = useRef(0);
  const userPausedRef = useRef(false);
  const startedRef = useRef(false);
  const playbackRootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = playbackRootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      {
        root: closestScrollParent(el),
        threshold: 0.05,
        rootMargin: '80px 0px',
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    startedRef.current = false;
    userPausedRef.current = false;
    tickRef.current = 0;
    setPlaying(false);
    setSelectedIndexState(0);
  }, [frameKey, frameCount]);

  useEffect(() => {
    if (!enabled || frameCount < 2 || userPausedRef.current) return;
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    tickRef.current = 0;
    setSelectedIndexState(0);
    setPlaying(true);
  }, [enabled, inView, frameCount, frameKey]);

  useEffect(() => {
    if (!enabled || !playing || frameCount < 2 || userPausedRef.current) return;

    const maxTicks = CHECK_IN_DAY_PLAYBACK_RUNS * frameCount - 1;
    const id = window.setInterval(() => {
      tickRef.current += 1;
      if (tickRef.current >= maxTicks) {
        setSelectedIndexState(todayIndex);
        setPlaying(false);
        return;
      }
      setSelectedIndexState((index) => (index + 1) % frameCount);
    }, CHECK_IN_DAY_PLAYBACK_MS);

    return () => window.clearInterval(id);
  }, [enabled, playing, frameCount, frameKey, todayIndex]);

  const setSelectedIndex = (index: number) => {
    userPausedRef.current = true;
    startedRef.current = true;
    setPlaying(false);
    setSelectedIndexState(index);
  };

  return { selectedIndex, setSelectedIndex, playbackRootRef };
}
