import { useCallback, useEffect, useRef, useState } from 'react';

const STEP_INTERVAL_MS = 2000;
/** Brief hold on the final step before fade-out. */
const FINAL_DWELL_MS = 400;
/** Never block the app longer than this if auth is slow. */
const MAX_WAIT_MS = 12_000;
const EXIT_MS = 550;

export type CircleStartupPhase = 0 | 1 | 2;

export function useCircleStartupSequence(appReady: boolean) {
  const [phase, setPhase] = useState<CircleStartupPhase>(0);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setExiting(true);
    window.setTimeout(() => setVisible(false), EXIT_MS);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhase((current) => (current < 2 ? ((current + 1) as CircleStartupPhase) : current));
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(finish, MAX_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    if (!appReady || phase < 2) return;
    const timer = window.setTimeout(finish, FINAL_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [appReady, phase, finish]);

  return { visible, exiting, phase };
}
