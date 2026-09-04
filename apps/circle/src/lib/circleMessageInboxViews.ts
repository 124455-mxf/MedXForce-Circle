import {
  circlePatientMessageBucket,
  type CirclePatientMessageBucket,
} from '@medxforce/shared';
import { circleMessageAlertAttentionKind } from './circleAlertAttentionUrgency';
import { threadHasUnreadPatientReply } from './circleMessageRead';

export type CircleMessagesInboxView =
  | CirclePatientMessageBucket
  | 'communication_log'
  | 'alerts_attention'
  /** @deprecated Use `alerts_attention`. */
  | 'alert'
  /** @deprecated Use `alerts_attention`. */
  | 'attention';

export function isAlertsAttentionInboxView(view: CircleMessagesInboxView): boolean {
  return view === 'alerts_attention' || view === 'alert' || view === 'attention';
}

export function normalizeMessagesInboxView(
  view: CircleMessagesInboxView,
): CircleMessagesInboxView {
  return isAlertsAttentionInboxView(view) ? 'alerts_attention' : view;
}

type InboxMessage = {
  id: string;
  status?: string;
  type?: string;
  createdAt: number;
  updatedAt?: number;
};

function isInOutStatus(msg: InboxMessage): boolean {
  return circlePatientMessageBucket(msg.status) === 'in_out';
}

function isThreadUnread(
  msg: InboxMessage,
  replies: { isPatient?: boolean; timestamp: number }[],
  patientId: string,
): boolean {
  return threadHasUnreadPatientReply(replies, patientId, msg.id, msg);
}

/** Unread alert/attention stay in In/Out until acknowledged; all appear under Alerts & attention. */
export function shouldShowInInOutDirectList(
  msg: InboxMessage,
  replies: { isPatient?: boolean; timestamp: number }[],
  patientId: string,
): boolean {
  if (!isInOutStatus(msg)) return false;
  const kind = circleMessageAlertAttentionKind(msg);
  if (!kind) return true;
  return isThreadUnread(msg, replies, patientId);
}

export function shouldShowInAlertsAttentionTab(
  msg: InboxMessage,
  _replies: { isPatient?: boolean; timestamp: number }[],
  _patientId: string,
): boolean {
  return circleMessageAlertAttentionKind(msg) != null && isInOutStatus(msg);
}

export function messageMatchesInboxView(
  msg: InboxMessage,
  view: CircleMessagesInboxView,
  replies: { isPatient?: boolean; timestamp: number }[],
  patientId: string,
): boolean {
  switch (view) {
    case 'in_out':
      return shouldShowInInOutDirectList(msg, replies, patientId);
    case 'alerts_attention':
    case 'alert':
    case 'attention':
      return shouldShowInAlertsAttentionTab(msg, replies, patientId);
    case 'archived':
    case 'deleted':
      return circlePatientMessageBucket(msg.status) === view;
    default:
      return false;
  }
}

export function filterDirectMessagesForInboxView<T extends InboxMessage>(
  directMessages: T[],
  view: CircleMessagesInboxView,
  repliesByMessageId: Record<string, { isPatient?: boolean; timestamp: number }[]>,
  patientId: string,
): T[] {
  return directMessages.filter((msg) => {
    const replies = repliesByMessageId[msg.id] || [];
    return messageMatchesInboxView(msg, view, replies, patientId);
  });
}

export function countUnreadAlertsAttentionInInbox<T extends InboxMessage>(
  directMessages: T[],
  repliesByMessageId: Record<string, { isPatient?: boolean; timestamp: number }[]>,
  patientId: string,
): number {
  return directMessages.filter((msg) => {
    if (!circleMessageAlertAttentionKind(msg) || !isInOutStatus(msg)) return false;
    const replies = repliesByMessageId[msg.id] || [];
    return isThreadUnread(msg, replies, patientId);
  }).length;
}

export function countAlertsAttentionInInbox<T extends InboxMessage>(directMessages: T[]): number {
  return directMessages.filter(
    (msg) => circleMessageAlertAttentionKind(msg) != null && isInOutStatus(msg),
  ).length;
}

export function countDirectMessagesForInboxView<T extends InboxMessage>(
  directMessages: T[],
  view: CircleMessagesInboxView,
  repliesByMessageId: Record<string, { isPatient?: boolean; timestamp: number }[]>,
  patientId: string,
): number {
  return filterDirectMessagesForInboxView(
    directMessages,
    view,
    repliesByMessageId,
    patientId,
  ).length;
}
