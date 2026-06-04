import { useCallback, useEffect, useRef, useState } from 'react';

export type CircleToastTone = 'success' | 'error' | 'info';

type ToastState = { message: string; tone: CircleToastTone } | null;

export function useCircleToast(durationMs = 3200) {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<number | null>(null);

  const clearToast = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, tone: CircleToastTone = 'success') => {
      clearToast();
      setToast({ message, tone });
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, durationMs);
    },
    [clearToast, durationMs],
  );

  useEffect(() => () => clearToast(), [clearToast]);

  return { toast, showToast, clearToast };
}
