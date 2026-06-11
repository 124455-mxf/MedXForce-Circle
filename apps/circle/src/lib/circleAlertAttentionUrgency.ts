import { threadHasUnreadPatientReply } from './circleMessageRead';

/** Pulsating urgency window after an alert/attention arrives. */
export const CIRCLE_ALERT_ATTENTION_URGENCY_MS = 2 * 60 * 1000;

/** Unread alert/attention auto-marked read (dismissed) after this window. */
export const CIRCLE_ALERT_ATTENTION_AUTO_DISMISS_MS = 30 * 60 * 1000;

export type CircleAlertAttentionKind = 'alert' | 'attention';

export function circleMessageAlertAttentionKind(
  msg: { type?: string },
): CircleAlertAttentionKind | null {
  if (msg.type === 'emergency') return 'alert';
  if (msg.type === 'attention') return 'attention';
  return null;
}

export function isUnreadAlertAttentionMessage(
  msg: { createdAt: number },
  patientId: string,
  messageId: string,
  replies: { isPatient?: boolean; timestamp: number }[] = [],
): boolean {
  return threadHasUnreadPatientReply(replies, patientId, messageId, msg);
}

export function isUrgentUnreadAlertAttentionMessage(
  msg: { type?: string; createdAt: number },
  patientId: string,
  messageId: string,
  replies: { isPatient?: boolean; timestamp: number }[] = [],
  now = Date.now(),
): boolean {
  if (!circleMessageAlertAttentionKind(msg)) return false;
  if (!isUnreadAlertAttentionMessage(msg, patientId, messageId, replies)) return false;
  const createdAt = msg.createdAt || 0;
  if (!createdAt) return false;
  return now - createdAt < CIRCLE_ALERT_ATTENTION_URGENCY_MS;
}

export function alertAttentionUrgencyRemainingMs(
  createdAt: number,
  now = Date.now(),
): number {
  return Math.max(0, CIRCLE_ALERT_ATTENTION_URGENCY_MS - (now - (createdAt || 0)));
}

export function isAlertAttentionAutoDismissDue(createdAt: number, now = Date.now()): boolean {
  if (!createdAt) return false;
  return now - createdAt >= CIRCLE_ALERT_ATTENTION_AUTO_DISMISS_MS;
}

export function alertAttentionAutoDismissRemainingMs(
  createdAt: number,
  now = Date.now(),
): number {
  return Math.max(0, CIRCLE_ALERT_ATTENTION_AUTO_DISMISS_MS - (now - (createdAt || 0)));
}

export function alertAttentionKindLabel(kind: CircleAlertAttentionKind): string {
  return kind === 'alert' ? 'Alert' : 'Attention';
}

export function alertAttentionBannerTitle(kind: CircleAlertAttentionKind): string {
  return kind === 'alert' ? 'Alert from your loved one' : 'Needs your attention';
}

/** Circle inbox — alert/attention threads are view-only; replies use normal Messages. */
export function circleAlertAttentionReadOnlyHint(): string {
  return 'This is a one-way alert — use Messages to reply to your loved one.';
}

export function formatAlertAttentionTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

/** Prefer alert over attention when both are urgent. */
export function pickDominantAlertAttentionKind(
  kinds: CircleAlertAttentionKind[],
): CircleAlertAttentionKind | null {
  if (kinds.includes('alert')) return 'alert';
  if (kinds.includes('attention')) return 'attention';
  return null;
}

export function alertAttentionMessagePreview(msg: {
  subject?: string;
  text?: string;
}): string {
  const subject = msg.subject?.trim();
  if (subject) return subject;
  const text = msg.text?.trim();
  if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  return kindFallbackPreview();
}

function kindFallbackPreview(): string {
  return 'Open Messages to read more.';
}

/** @deprecated Use translated preview in CircleAlertAttentionBanner when possible. */
export function alertAttentionFallbackPreview(): string {
  return kindFallbackPreview();
}
