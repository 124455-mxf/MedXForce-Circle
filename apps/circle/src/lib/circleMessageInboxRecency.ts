/** @license SPDX-License-Identifier: Apache-2.0 */

/** Rolling recent window for Alerts & attention inbox lists (matches dashboard “last 7 days”). */
export const INBOX_RECENT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days since the message (0 = today). */
export function inboxCalendarDaysSince(ts: number, now = new Date()): number {
  if (!ts || !Number.isFinite(ts)) return 0;
  const event = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEventDay = new Date(
    event.getFullYear(),
    event.getMonth(),
    event.getDate(),
  );
  return Math.floor((startOfToday.getTime() - startOfEventDay.getTime()) / DAY_MS);
}

export function isInboxRecentMessage(
  createdAt: number,
  now = Date.now(),
): boolean {
  return inboxCalendarDaysSince(createdAt, new Date(now)) < INBOX_RECENT_DAYS;
}

export function splitInboxMessagesByRecency<T extends { createdAt: number }>(
  messages: T[],
  now = Date.now(),
): { recent: T[]; older: T[] } {
  const recent: T[] = [];
  const older: T[] = [];
  for (const msg of messages) {
    const ts = msg.createdAt || 0;
    if (isInboxRecentMessage(ts, now)) recent.push(msg);
    else older.push(msg);
  }
  return { recent, older };
}
