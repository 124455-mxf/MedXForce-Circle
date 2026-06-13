import type { CircleTranslator } from './circleI18nContext';
import type { CircleAlertAttentionKind } from './circleAlertAttentionUrgency';
import type { CircleThreadMessage, CircleThreadReply } from '../hooks/useCirclePatientThreads';
import { isIcuDailySummary, summaryDateLabel, summaryDeliveredAt, isSummaryDeliveredOnDifferentDay } from './circleCommunicationLog';
import { resolveAlertAttentionMessageDisplay } from './alertAttentionNotificationCopy';
import { resolveStoredMessageText } from './messageTranslationDisplay';
import type { CircleUiLanguage } from './circleLanguages';
import type { CircleReplySortOrder } from './circleMessagePreferences';

const INBOX_TITLE_MAX = 80;
const INBOX_SNIPPET_MAX = 120;

function trimInboxPreview(text: string, max: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function latestReplyForInboxSnippet(replies: CircleThreadReply[]): CircleThreadReply | undefined {
  if (replies.length === 0) return undefined;
  return replies.reduce((best, reply) =>
    (reply.timestamp || 0) >= (best.timestamp || 0) ? reply : best,
  );
}

function resolveReplyInboxText(
  reply: CircleThreadReply,
  viewerLanguage?: CircleUiLanguage,
): string {
  if (viewerLanguage) {
    return resolveStoredMessageText(reply, viewerLanguage).displayText;
  }
  return reply.text?.trim() || '';
}

export function formatMessagesThreadTime(t: CircleTranslator, ts: number): string {
  const d = new Date(ts);
  const today = new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today) {
    return t('messages.threadTimeToday', { time });
  }
  return t('messages.threadTimeDate', { date: d.toLocaleDateString(), time });
}

export function messagesThreadHeaderTitle(
  t: CircleTranslator,
  msg: CircleThreadMessage,
  viewerLanguage?: CircleUiLanguage,
  context: 'inbox' | 'thread' = 'thread',
): string {
  if (isIcuDailySummary(msg)) {
    return t('messages.communicationLogTitle', { date: summaryDateLabel(msg) });
  }
  const localized = viewerLanguage
    ? resolveAlertAttentionMessageDisplay(msg, viewerLanguage)
    : null;
  if (localized?.subject) return localized.subject;
  const subject = msg.subject?.trim();
  if (subject) return subject;
  if (context === 'inbox') {
    const body = viewerLanguage
      ? resolveStoredMessageText(msg, viewerLanguage).displayText
      : msg.text?.trim() || '';
    if (body) {
      return trimInboxPreview(body, INBOX_TITLE_MAX);
    }
    return t('messages.fallbackMessageTitle');
  }
  const body = viewerLanguage
    ? resolveStoredMessageText(msg, viewerLanguage).displayText
    : msg.text?.trim() || '';
  if (body) {
    return trimInboxPreview(body, INBOX_TITLE_MAX);
  }
  return t('messages.patientMessage');
}

/** Second line in the Circle inbox — mirrors patient app threadRowSnippet. */
export function messagesThreadInboxSnippet(
  msg: CircleThreadMessage,
  replies: CircleThreadReply[],
  viewerLanguage: CircleUiLanguage | undefined,
  _replySort: CircleReplySortOrder,
  options?: {
    resurrected?: boolean;
    latestVisiblePatientReply?: CircleThreadReply | null;
  },
): string {
  if (isIcuDailySummary(msg)) return '';

  if (options?.resurrected && options.latestVisiblePatientReply?.text) {
    return trimInboxPreview(
      resolveReplyInboxText(options.latestVisiblePatientReply, viewerLanguage),
      INBOX_SNIPPET_MAX,
    );
  }

  if (replies.length > 0) {
    const latest = latestReplyForInboxSnippet(replies);
    const latestText = latest ? resolveReplyInboxText(latest, viewerLanguage) : '';
    if (latestText) {
      return trimInboxPreview(latestText, INBOX_SNIPPET_MAX);
    }
  }

  return trimInboxPreview(messagesThreadBodyText(msg, viewerLanguage), INBOX_SNIPPET_MAX);
}

export function messagesThreadBodyText(
  msg: CircleThreadMessage,
  viewerLanguage?: CircleUiLanguage,
): string {
  const localized = viewerLanguage
    ? resolveAlertAttentionMessageDisplay(msg, viewerLanguage)
    : null;
  if (localized?.text) return localized.text;
  if (viewerLanguage) {
    return resolveStoredMessageText(msg, viewerLanguage).displayText;
  }
  return msg.text?.trim() || '';
}

export function messagesCommunicationLogInboxTime(
  t: CircleTranslator,
  msg: CircleThreadMessage,
): string | null {
  if (!isSummaryDeliveredOnDifferentDay(msg)) return null;
  return t('messages.sentAt', { when: formatMessagesThreadTime(t, summaryDeliveredAt(msg)) });
}

export function messagesCommunicationLogThreadSubtitle(
  t: CircleTranslator,
  msg: CircleThreadMessage,
): string {
  if (!isSummaryDeliveredOnDifferentDay(msg)) {
    return t('messages.readOnlyLog');
  }
  return t('messages.sentToCircle', {
    when: formatMessagesThreadTime(t, summaryDeliveredAt(msg)),
  });
}

export function messagesPatientStatusLabel(
  t: CircleTranslator,
  status: string | undefined,
): string {
  if (status === 'archived') return t('messages.statusArchived');
  if (status === 'deleted') return t('messages.statusDeleted');
  return t('messages.statusInOut');
}

export function messagesPatientStatusHint(
  t: CircleTranslator,
  status: string | undefined,
): string {
  if (status === 'archived') return t('messages.hintArchived');
  if (status === 'deleted') return t('messages.hintDeleted');
  return '';
}

export function messagesAlertAttentionKindLabel(
  t: CircleTranslator,
  kind: CircleAlertAttentionKind,
): string {
  return kind === 'alert' ? t('alertAttention.alert') : t('alertAttention.attention');
}

export function messagesAlertAttentionReadOnlyHint(t: CircleTranslator): string {
  return t('messages.readOnlyAlertHint');
}

export function messagesCountLabel(
  t: CircleTranslator,
  count: number,
  oneKey: string,
  otherKey: string,
): string {
  return t(count === 1 ? oneKey : otherKey, { count });
}

export function messagesInboxSubtitle(
  t: CircleTranslator,
  inboxView: string,
): string {
  switch (inboxView) {
    case 'communication_log':
      return t('messages.subtitleCommunicationLog');
    case 'archived':
      return t('messages.subtitleArchived');
    case 'deleted':
      return t('messages.subtitleDeleted');
    case 'alert':
      return t('messages.subtitleAlert');
    case 'attention':
      return t('messages.subtitleAttention');
    default:
      return t('messages.subtitleInOut');
  }
}

export function messagesInboxEmptyMessage(t: CircleTranslator, inboxView: string): string {
  switch (inboxView) {
    case 'archived':
      return t('messages.emptyArchived');
    case 'deleted':
      return t('messages.emptyDeleted');
    case 'alert':
      return t('messages.emptyAlert');
    case 'attention':
      return t('messages.emptyAttention');
    default:
      return t('messages.emptyInOut');
  }
}
