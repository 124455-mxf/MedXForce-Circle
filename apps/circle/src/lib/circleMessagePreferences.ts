export type CircleReplySortOrder = 'oldest' | 'newest';

export const CIRCLE_REPLY_SORT_KEY = 'circleMessageReplySort';

export const CIRCLE_REPLY_SORT_CHANGED = 'circle-reply-sort-changed';

export function getCircleReplySortOrder(): CircleReplySortOrder {
  try {
    const v = localStorage.getItem(CIRCLE_REPLY_SORT_KEY);
    return v === 'newest' ? 'newest' : 'oldest';
  } catch {
    return 'oldest';
  }
}

export function setCircleReplySortOrder(order: CircleReplySortOrder): void {
  try {
    localStorage.setItem(CIRCLE_REPLY_SORT_KEY, order);
    window.dispatchEvent(new Event(CIRCLE_REPLY_SORT_CHANGED));
  } catch {
    /* ignore */
  }
}
