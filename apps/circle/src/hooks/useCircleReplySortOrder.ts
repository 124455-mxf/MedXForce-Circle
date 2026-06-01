import { useEffect, useState } from 'react';
import {
  CIRCLE_REPLY_SORT_CHANGED,
  CIRCLE_REPLY_SORT_KEY,
  type CircleReplySortOrder,
} from '../lib/circleMessagePreferences';

function readReplySortFromStorage(): CircleReplySortOrder {
  try {
    const v = localStorage.getItem(CIRCLE_REPLY_SORT_KEY);
    return v === 'newest' ? 'newest' : 'oldest';
  } catch {
    return 'oldest';
  }
}

export function useCircleReplySortOrder(): CircleReplySortOrder {
  const [replySort, setReplySort] = useState<CircleReplySortOrder>(readReplySortFromStorage);

  useEffect(() => {
    const sync = () => setReplySort(readReplySortFromStorage());
    window.addEventListener(CIRCLE_REPLY_SORT_CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CIRCLE_REPLY_SORT_CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return replySort;
}
