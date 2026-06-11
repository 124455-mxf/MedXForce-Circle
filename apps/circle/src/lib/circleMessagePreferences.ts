export type CircleMessageSortOrder = 'oldest' | 'newest';

export type CircleReplySortOrder = CircleMessageSortOrder;

export type CircleThreadSortOrder = CircleMessageSortOrder;

export const CIRCLE_REPLY_SORT_KEY = 'circleMessageReplySort';

export const CIRCLE_REPLY_SORT_CHANGED = 'circle-reply-sort-changed';

export const CIRCLE_THREAD_SORT_KEY = 'circleThreadSort';

export const CIRCLE_THREAD_SORT_CHANGED = 'circle-thread-sort-changed';

function readSortOrder(key: string): CircleMessageSortOrder {
  try {
    const v = localStorage.getItem(key);
    return v === 'newest' ? 'newest' : 'oldest';
  } catch {
    return 'oldest';
  }
}

function writeSortOrder(key: string, order: CircleMessageSortOrder, changedEvent: string): void {
  try {
    localStorage.setItem(key, order);
    window.dispatchEvent(new Event(changedEvent));
  } catch {
    /* ignore */
  }
}

export function getCircleReplySortOrder(): CircleReplySortOrder {
  return readSortOrder(CIRCLE_REPLY_SORT_KEY);
}

export function setCircleReplySortOrder(order: CircleReplySortOrder): void {
  writeSortOrder(CIRCLE_REPLY_SORT_KEY, order, CIRCLE_REPLY_SORT_CHANGED);
}

export function getCircleThreadSortOrder(): CircleThreadSortOrder {
  return readSortOrder(CIRCLE_THREAD_SORT_KEY);
}

export function setCircleThreadSortOrder(order: CircleThreadSortOrder): void {
  writeSortOrder(CIRCLE_THREAD_SORT_KEY, order, CIRCLE_THREAD_SORT_CHANGED);
}
