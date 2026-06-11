import { useEffect, useState } from 'react';
import {
  CIRCLE_THREAD_SORT_CHANGED,
  CIRCLE_THREAD_SORT_KEY,
  type CircleThreadSortOrder,
} from '../lib/circleMessagePreferences';

function readThreadSortFromStorage(): CircleThreadSortOrder {
  try {
    const v = localStorage.getItem(CIRCLE_THREAD_SORT_KEY);
    return v === 'newest' ? 'newest' : 'oldest';
  } catch {
    return 'oldest';
  }
}

export function useCircleThreadSortOrder(): CircleThreadSortOrder {
  const [threadSort, setThreadSort] = useState<CircleThreadSortOrder>(readThreadSortFromStorage);

  useEffect(() => {
    const sync = () => setThreadSort(readThreadSortFromStorage());
    window.addEventListener(CIRCLE_THREAD_SORT_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_THREAD_SORT_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return threadSort;
}
