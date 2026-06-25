import { useMemo } from 'react';
import type { CircleThreadMessage, CircleThreadReply } from './circlePatientMessagingTypes';
import { computePatientFirstEngagementFromThreads } from './computePatientFirstEngagement';

/** @deprecated Use computePatientFirstEngagementFromThreads with thread context instead. */
export function usePatientFirstEngagementAt(
  rawMessages: CircleThreadMessage[],
  repliesByMessageId: Record<string, CircleThreadReply[]>,
  patientId: string | undefined,
  loading: boolean,
): { firstEngagementAt: number | null; loading: boolean } {
  const firstEngagementAt = useMemo(() => {
    if (!patientId) return null;
    return computePatientFirstEngagementFromThreads(rawMessages, repliesByMessageId, patientId);
  }, [patientId, rawMessages, repliesByMessageId]);

  return { firstEngagementAt, loading };
}

export { computePatientFirstEngagementFromThreads } from './computePatientFirstEngagement';
