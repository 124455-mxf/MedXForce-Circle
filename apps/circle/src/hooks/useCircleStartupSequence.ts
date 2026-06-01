import { useEffect, useRef, useState } from 'react';

/** Minimum splash duration so Circle startup is visible (actual load is usually faster). */
const MIN_DISPLAY_MS = 10_000;
const MAX_WAIT_MS = 12_000;
const STEP_INTERVAL_MS = 3200;
const EXIT_MS = 550;

export type CircleStartupPhase = 0 | 1 | 2;

export function useCircleStartupSequence(appReady: boolean) {
  const [phase, setPhase] = useState<CircleStartupPhase>(0);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const startTimeRef = useRef(Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhase((current) => (current < 2 ? ((current + 1) as CircleStartupPhase) : current));
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setExiting(true);
      window.setTimeout(() => setVisible(false), EXIT_MS);
    };

    const elapsed = Date.now() - startTimeRef.current;
    const remainingMin = Math.max(0, MIN_DISPLAY_MS - elapsed);

    if (appReady) {
      const timer = window.setTimeout(finish, remainingMin);
      return () => window.clearTimeout(timer);
    }

    const maxTimer = window.setTimeout(finish, Math.max(0, MAX_WAIT_MS - elapsed));
    return () => window.clearTimeout(maxTimer);
  }, [appReady]);

  return { visible, exiting, phase };
}
