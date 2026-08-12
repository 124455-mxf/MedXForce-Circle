/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useRef, useState } from 'react';

/** Hold each day before advancing (−6 → Today). */
export const CHECK_IN_DAY_PLAYBACK_MS = 1500;

/** Full −6→Today passes before autoplay stops on Today. */
export const CHECK_IN_DAY_PLAYBACK_RUNS = 2;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Auto-advances the check-in week day index from −6 through Today.
 * Stops after two full passes (lands on Today), or immediately when the user picks a day.
 */
export function useCheckInWellnessDayPlayback(
  frameCount: number,
  frameKey: string,
  enabled = true,
) {
  const todayIndex = Math.max(0, frameCount - 1);
  const [selectedIndex, setSelectedIndexState] = useState(0);
  const [playing, setPlaying] = useState(true);
  const tickRef = useRef(0);

  useEffect(() => {
    tickRef.current = 0;
    setSelectedIndexState(0);
    setPlaying(true);
  }, [frameKey, frameCount]);

  useEffect(() => {
    if (!enabled || frameCount < 2 || !playing || prefersReducedMotion()) {
      if (enabled && frameCount > 0 && prefersReducedMotion()) {
        setSelectedIndexState(todayIndex);
        setPlaying(false);
      }
      return;
    }

    // After two full passes, the last advance lands on Today and stops.
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
  }, [enabled, frameCount, frameKey, playing, todayIndex]);

  const setSelectedIndex = (index: number) => {
    setPlaying(false);
    setSelectedIndexState(index);
  };

  return { selectedIndex, setSelectedIndex };
}
