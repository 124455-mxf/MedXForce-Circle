import { useCallback, useEffect, useRef, useState } from 'react';

const STEP_INTERVAL_MS = 2000;
/** Brief hold on the final step before fade-out (cold start only). */
const FINAL_DWELL_MS = 400;
/** Fast path: signed-in return within the same session — dismiss as soon as the app is ready. */
const FAST_PATH_DWELL_MS = 120;
/** Never block the app longer than this if auth is slow. */
const MAX_WAIT_MS = 12_000;
const EXIT_MS = 550;
const STARTUP_SESSION_KEY = 'mx-circle-startup-seen';

export type CircleStartupPhase = 0 | 1 | 2;

/** True after splash finished once this browser/app session (survives backgrounding, cleared on cold start). */
function startupAlreadyShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(STARTUP_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markStartupShownThisSession(): void {
  try {
    sessionStorage.setItem(STARTUP_SESSION_KEY, '1');
  } catch {
    // Storage unavailable — splash may replay on next mount.
  }
}

export function useCircleStartupSequence(appReady: boolean) {
  /** Skip the long step animation, but still show branded splash until appReady. */
  const fastPath = useRef(startupAlreadyShownThisSession()).current;
  const [phase, setPhase] = useState<CircleStartupPhase>(fastPath ? 2 : 0);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markStartupShownThisSession();
    setExiting(true);
    window.setTimeout(() => setVisible(false), EXIT_MS);
  }, []);

  useEffect(() => {
    if (fastPath) return undefined;
    const interval = window.setInterval(() => {
      setPhase((current) => (current < 2 ? ((current + 1) as CircleStartupPhase) : current));
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [fastPath]);

  useEffect(() => {
    const timer = window.setTimeout(finish, MAX_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    if (!appReady) return undefined;
    if (fastPath) {
      const timer = window.setTimeout(finish, FAST_PATH_DWELL_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase < 2) return undefined;
    const timer = window.setTimeout(finish, FINAL_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [appReady, fastPath, finish, phase]);

  return { visible, exiting, phase, fastPath };
}
