import { ICU_DAILY_SUMMARY_TYPE } from '../lib/circleCommunicationLog';
import type { CircleThreadMessage, CircleThreadReply } from './circlePatientMessagingTypes';

function minTimestamp(current: number | null, candidate: number | undefined | null): number | null {
  if (candidate == null || !Number.isFinite(candidate) || candidate <= 0) return current;
  if (current == null || candidate < current) return candidate;
  return current;
}

/** Derive earliest patient activity from threads this member can already read (no extra queries). */
export function computePatientFirstEngagementFromThreads(
  rawMessages: CircleThreadMessage[],
  repliesByMessageId: Record<string, CircleThreadReply[]>,
  patientId: string,
): number | null {
  let min: number | null = null;

  for (const msg of rawMessages) {
    if (msg.type === ICU_DAILY_SUMMARY_TYPE) {
      const entries = Array.isArray(msg.summaryEntries) ? msg.summaryEntries : [];
      for (const entry of entries) {
        if (entry && typeof entry === 'object') {
          const ts = (entry as { timestamp?: number }).timestamp;
          min = minTimestamp(min, ts);
        }
      }
      min = minTimestamp(min, msg.createdAt);
      continue;
    }

    if (msg.senderUid === patientId) {
      min = minTimestamp(min, msg.createdAt);
    }

    for (const reply of repliesByMessageId[msg.id] || []) {
      if (reply.isPatient) {
        min = minTimestamp(min, reply.timestamp);
      }
    }
  }

  return min;
}
