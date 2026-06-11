import {
  circlePatientMessageBucket,
  type CirclePatientMessageBucket,
} from '@medxforce/shared';
import { circleMessageAlertAttentionKind } from './circleAlertAttentionUrgency';
import { threadHasUnreadPatientReply } from './circleMessageRead';

export type CircleMessagesInboxView =
  | CirclePatientMessageBucket
  | 'communication_log'
  | 'alert'
  | 'attention';

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

/** Unread alert/attention stay in In/Out until acknowledged; all appear under Alert/Attention tabs. */
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

export function shouldShowInAlertTab(
  msg: InboxMessage,
  _replies: { isPatient?: boolean; timestamp: number }[],
  _patientId: string,
): boolean {
  if (circleMessageAlertAttentionKind(msg) !== 'alert') return false;
  return isInOutStatus(msg);
}

export function shouldShowInAttentionTab(
  msg: InboxMessage,
  _replies: { isPatient?: boolean; timestamp: number }[],
  _patientId: string,
): boolean {
  if (circleMessageAlertAttentionKind(msg) !== 'attention') return false;
  return isInOutStatus(msg);
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
    case 'alert':
      return shouldShowInAlertTab(msg, replies, patientId);
    case 'attention':
      return shouldShowInAttentionTab(msg, replies, patientId);
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

export function countUnreadAlertsInInbox<T extends InboxMessage>(
  directMessages: T[],
  repliesByMessageId: Record<string, { isPatient?: boolean; timestamp: number }[]>,
  patientId: string,
): number {
  return directMessages.filter((msg) => {
    if (circleMessageAlertAttentionKind(msg) !== 'alert') return false;
    if (!isInOutStatus(msg)) return false;
    const replies = repliesByMessageId[msg.id] || [];
    return isThreadUnread(msg, replies, patientId);
  }).length;
}

export function countUnreadAttentionsInInbox<T extends InboxMessage>(
  directMessages: T[],
  repliesByMessageId: Record<string, { isPatient?: boolean; timestamp: number }[]>,
  patientId: string,
): number {
  return directMessages.filter((msg) => {
    if (circleMessageAlertAttentionKind(msg) !== 'attention') return false;
    if (!isInOutStatus(msg)) return false;
    const replies = repliesByMessageId[msg.id] || [];
    return isThreadUnread(msg, replies, patientId);
  }).length;
}

export function countAlertsInInbox<T extends InboxMessage>(directMessages: T[]): number {
  return directMessages.filter(
    (msg) => circleMessageAlertAttentionKind(msg) === 'alert' && isInOutStatus(msg),
  ).length;
}

export function countAttentionsInInbox<T extends InboxMessage>(directMessages: T[]): number {
  return directMessages.filter(
    (msg) => circleMessageAlertAttentionKind(msg) === 'attention' && isInOutStatus(msg),
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
