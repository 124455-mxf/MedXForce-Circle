import { useEffect, useMemo, useState } from 'react';
import type { CircleThreadMessage, CircleThreadReply } from './useCirclePatientThreads';
import {
  alertAttentionAutoDismissRemainingMs,
  alertAttentionUrgencyRemainingMs,
  circleMessageAlertAttentionKind,
  isAlertAttentionAutoDismissDue,
  isUnreadAlertAttentionMessage,
  isUrgentUnreadAlertAttentionMessage,
  pickDominantAlertAttentionKind,
  type CircleAlertAttentionKind,
} from '../lib/circleAlertAttentionUrgency';
import { CIRCLE_MSG_READ_CHANGED, markThreadRead } from '../lib/circleMessageRead';

export type CircleAlertAttentionItem = {
  id: string;
  kind: CircleAlertAttentionKind;
  type?: string;
  translations?: { language: string; text: string; subject?: string }[];
  createdAt: number;
  subject?: string;
  text: string;
  isUrgent: boolean;
};

export function useCircleAlertAttentionState(
  messages: CircleThreadMessage[],
  patientId: string,
  repliesByMessageId: Record<string, CircleThreadReply[]>,
) {
  const [now, setNow] = useState(() => Date.now());
  const [readTick, setReadTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onReadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (!detail?.patientId || detail.patientId === patientId) {
        setReadTick((value) => value + 1);
      }
    };
    window.addEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
    return () => window.removeEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
  }, [patientId]);

  const unreadItems = useMemo((): CircleAlertAttentionItem[] => {
    if (!patientId) return [];

    const items: CircleAlertAttentionItem[] = [];
    for (const msg of messages) {
      const kind = circleMessageAlertAttentionKind(msg);
      if (!kind) continue;
      const replies = repliesByMessageId[msg.id] || [];
      if (!isUnreadAlertAttentionMessage(msg, patientId, msg.id, replies)) continue;
      items.push({
        id: msg.id,
        kind,
        type: msg.type,
        translations: msg.translations,
        createdAt: msg.createdAt || 0,
        subject: msg.subject,
        text: msg.text || '',
        isUrgent: isUrgentUnreadAlertAttentionMessage(msg, patientId, msg.id, replies, now),
      });
    }

    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [messages, now, patientId, readTick, repliesByMessageId]);

  useEffect(() => {
    if (!patientId) return;

    let nextDismissMs = Infinity;

    for (const msg of messages) {
      const kind = circleMessageAlertAttentionKind(msg);
      if (!kind) continue;
      const replies = repliesByMessageId[msg.id] || [];
      if (!isUnreadAlertAttentionMessage(msg, patientId, msg.id, replies)) continue;

      const createdAt = msg.createdAt || 0;
      if (!createdAt) continue;

      if (isAlertAttentionAutoDismissDue(createdAt, now)) {
        markThreadRead(patientId, msg.id);
        continue;
      }

      nextDismissMs = Math.min(
        nextDismissMs,
        alertAttentionAutoDismissRemainingMs(createdAt, now),
      );
    }

    if (!Number.isFinite(nextDismissMs)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), nextDismissMs + 50);
    return () => window.clearTimeout(timer);
  }, [messages, now, patientId, readTick, repliesByMessageId]);

  const urgentItems = useMemo(
    () => unreadItems.filter((item) => item.isUrgent),
    [unreadItems],
  );

  const subduedItems = useMemo(
    () => unreadItems.filter((item) => !item.isUrgent),
    [unreadItems],
  );

  const navUrgencyKind = useMemo(
    () => pickDominantAlertAttentionKind(urgentItems.map((item) => item.kind)),
    [urgentItems],
  );

  const nextUrgencyExpiryMs = useMemo(() => {
    if (urgentItems.length === 0) return 0;
    return Math.min(...urgentItems.map((item) => alertAttentionUrgencyRemainingMs(item.createdAt, now)));
  }, [now, urgentItems]);

  useEffect(() => {
    if (nextUrgencyExpiryMs <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), nextUrgencyExpiryMs + 50);
    return () => window.clearTimeout(timer);
  }, [nextUrgencyExpiryMs]);

  return {
    unreadItems,
    urgentItems,
    subduedItems,
    navUrgencyKind,
    hasUrgentPulse: navUrgencyKind !== null,
  };
};
