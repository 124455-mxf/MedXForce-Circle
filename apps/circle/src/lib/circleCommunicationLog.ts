/** @license SPDX-License-Identifier: Apache-2.0 */

export const ICU_DAILY_SUMMARY_TYPE = 'icu_daily_summary' as const;

export type IcuSummaryEntry = {
  text: string;
  timestamp: number;
  source?: 'save' | 'speak';
};

export type CircleInboxMessage = {
  id: string;
  subject?: string;
  text: string;
  type?: string;
  createdAt: number;
  updatedAt: number;
  summaryEntries?: IcuSummaryEntry[];
};

export function isIcuDailySummary(msg: { type?: string }): boolean {
  return msg.type === ICU_DAILY_SUMMARY_TYPE;
}

export function splitCircleInbox<T extends CircleInboxMessage>(messages: T[]): {
  communicationLog: T[];
  directMessages: T[];
} {
  const communicationLog: T[] = [];
  const directMessages: T[] = [];
  for (const msg of messages) {
    if (isIcuDailySummary(msg)) communicationLog.push(msg);
    else directMessages.push(msg);
  }
  communicationLog.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { communicationLog, directMessages };
}

const ICU_SUMMARY_ID_PREFIX = 'msg_icu_summary_';

/** Calendar day the patient spoke/saved (YYYY-MM-DD), encoded in the Firestore message id. */
export function summaryDateKeyFromMessage(msg: CircleInboxMessage): string | null {
  if (!msg.id.startsWith(ICU_SUMMARY_ID_PREFIX)) return null;
  const key = msg.id.slice(ICU_SUMMARY_ID_PREFIX.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function localDateKeyFromTimestamp(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function summaryDeliveredAt(msg: CircleInboxMessage): number {
  return msg.updatedAt || msg.createdAt || Date.now();
}

/** True when the summary reached Circle on a later calendar day than the patient log day. */
export function isSummaryDeliveredOnDifferentDay(msg: CircleInboxMessage): boolean {
  const logKey = summaryDateKeyFromMessage(msg);
  if (!logKey) return false;
  return localDateKeyFromTimestamp(summaryDeliveredAt(msg)) !== logKey;
}

export function summaryDateLabel(msg: CircleInboxMessage): string {
  const logKey = summaryDateKeyFromMessage(msg);
  if (logKey) {
    const [y, m, d] = logKey.split('-').map((x) => parseInt(x, 10));
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return new Date(msg.createdAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function summaryUtteranceCount(msg: CircleInboxMessage): number {
  if (Array.isArray(msg.summaryEntries) && msg.summaryEntries.length > 0) {
    return msg.summaryEntries.length;
  }
  const lines = (msg.text || '').split('\n').filter((l) => l.trim());
  return lines.length || 1;
}

export function orderedSummaryEntries(msg: CircleInboxMessage): IcuSummaryEntry[] {
  if (Array.isArray(msg.summaryEntries) && msg.summaryEntries.length > 0) {
    return [...msg.summaryEntries].sort((a, b) => a.timestamp - b.timestamp);
  }
  return [{ text: msg.text || '', timestamp: msg.createdAt || Date.now() }];
}
