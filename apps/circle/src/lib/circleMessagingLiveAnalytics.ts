import type { CircleThreadMessage, CircleThreadReply } from '../hooks/circlePatientMessagingTypes';
import { CIRCLE_ANALYTICS_WINDOW_DAYS } from './circleAnalyticsChart';

const DAY_MS = 24 * 60 * 60 * 1000;

export type CircleMessagingDailyPoint = {
  date: string;
  value: number;
};

export type CircleMessagingLiveStats = {
  newMessages: number;
  replies: number;
  circleStarted: number;
  unreadToday: number;
  newMessagesTimeline: CircleMessagingDailyPoint[];
  repliesTimeline: CircleMessagingDailyPoint[];
  circleStartedTimeline: CircleMessagingDailyPoint[];
};

function asMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (value && typeof value === 'object') {
    const rec = value as { toMillis?: () => number; seconds?: number };
    if (typeof rec.toMillis === 'function') {
      const ms = rec.toMillis();
      if (typeof ms === 'number' && Number.isFinite(ms)) return ms;
    }
    if (typeof rec.seconds === 'number' && Number.isFinite(rec.seconds)) {
      return rec.seconds * 1000;
    }
  }
  return 0;
}

function dateKey(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function emptyBuckets(): Record<string, CircleMessagingDailyPoint> {
  const now = new Date();
  const buckets: Record<string, CircleMessagingDailyPoint> = {};
  for (let i = CIRCLE_ANALYTICS_WINDOW_DAYS - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const key = dateKey(day.getTime());
    buckets[key] = { date: key, value: 0 };
  }
  return buckets;
}

function inWindow(ts: number, nowMs: number): boolean {
  if (!ts) return false;
  const oldest = nowMs - CIRCLE_ANALYTICS_WINDOW_DAYS * DAY_MS;
  return ts >= oldest && ts <= nowMs + DAY_MS;
}

function isRegularMessage(message: CircleThreadMessage): boolean {
  const type = message.type || 'message';
  return type !== 'emergency' && type !== 'attention' && type !== 'icu_daily_summary';
}

function isCircleStarted(message: CircleThreadMessage): boolean {
  return message.initiatedBy === 'circle';
}

/** Patient unread threads this member can see — live snapshot, not a 30-day total. */
export function countPatientUnreadToday(messages: CircleThreadMessage[]): number {
  return messages.filter((message) => isRegularMessage(message) && message.hasNewReply === true)
    .length;
}

export function buildCircleMessagingLiveStats(
  messages: CircleThreadMessage[],
  repliesByMessageId: Record<string, CircleThreadReply[]>,
  nowMs = Date.now(),
): CircleMessagingLiveStats {
  const newBuckets = emptyBuckets();
  const replyBuckets = emptyBuckets();
  const circleBuckets = emptyBuckets();
  let newMessages = 0;
  let replies = 0;
  let circleStarted = 0;

  for (const message of messages) {
    if (!isRegularMessage(message)) continue;
    const createdAt = asMillis(message.createdAt);
    if (!inWindow(createdAt, nowMs)) continue;
    const key = dateKey(createdAt);
    if (isCircleStarted(message)) {
      circleStarted += 1;
      if (circleBuckets[key]) circleBuckets[key].value += 1;
    } else {
      newMessages += 1;
      if (newBuckets[key]) newBuckets[key].value += 1;
    }
  }

  for (const list of Object.values(repliesByMessageId)) {
    for (const reply of list || []) {
      if (!reply?.isPatient) continue;
      const ts = asMillis(reply.timestamp);
      if (!inWindow(ts, nowMs)) continue;
      replies += 1;
      const key = dateKey(ts);
      if (replyBuckets[key]) replyBuckets[key].value += 1;
    }
  }

  return {
    newMessages,
    replies,
    circleStarted,
    unreadToday: countPatientUnreadToday(messages),
    newMessagesTimeline: Object.values(newBuckets),
    repliesTimeline: Object.values(replyBuckets),
    circleStartedTimeline: Object.values(circleBuckets),
  };
}
