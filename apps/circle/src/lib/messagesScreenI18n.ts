import type { CircleTranslator } from './circleI18nContext';
import type { CircleAlertAttentionKind } from './circleAlertAttentionUrgency';
import type { CircleThreadMessage } from '../hooks/useCirclePatientThreads';
import { isIcuDailySummary, summaryDateLabel, summaryDeliveredAt, isSummaryDeliveredOnDifferentDay } from './circleCommunicationLog';
import { resolveAlertAttentionMessageDisplay } from './alertAttentionNotificationCopy';
import type { CircleUiLanguage } from './circleLanguages';

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
    const body = msg.text?.trim();
    if (body) {
      return body.length > 80 ? `${body.slice(0, 80).trimEnd()}…` : body;
    }
    return t('messages.fallbackMessageTitle');
  }
  return t('messages.patientMessage');
}

export function messagesThreadBodyText(
  msg: CircleThreadMessage,
  viewerLanguage?: CircleUiLanguage,
): string {
  const localized = viewerLanguage
    ? resolveAlertAttentionMessageDisplay(msg, viewerLanguage)
    : null;
  if (localized?.text) return localized.text;
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
