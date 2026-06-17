import { useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCirclePatientThreads } from '../hooks/useCirclePatientThreads';
import { useCircleMemberThreadUnread } from '../hooks/useCircleMemberThreadUnread';
import { useCircleAlertAttentionState } from '../hooks/useCircleAlertAttentionState';
import {
  computePatientDashboardAttentionTotal,
  type CirclePatientAttentionBadge,
} from '../lib/circlePatientAttentionBadge';

interface CirclePatientAttentionMonitorProps {
  db: Firestore;
  user: User;
  patient: CirclePatientSummary;
  onBadge: (patientId: string, badge: CirclePatientAttentionBadge) => void;
}

/** Invisible listener — tracks unread / alert counts for one patient (background patients). */
export function CirclePatientAttentionMonitor({
  db,
  user,
  patient,
  onBadge,
}: CirclePatientAttentionMonitorProps) {
  const threadState = useCirclePatientThreads(
    db,
    patient.patientId,
    user,
    patient.role,
  );

  const circleUnread = useCircleMemberThreadUnread(
    db,
    patient.patientId,
    user,
    patient.role,
  );

  const alertAttention = useCircleAlertAttentionState(
    threadState.messages,
    patient.patientId,
    threadState.repliesByMessageId,
  );

  const badge = useMemo((): CirclePatientAttentionBadge => {
    const totalUnread = computePatientDashboardAttentionTotal({
      memberRole: patient.role,
      messagingEnabled: patient.capabilities.messaging === true,
      messageUnreadCount: threadState.unreadCount,
      discussionsUnreadCount: circleUnread.discussionsUnreadCount,
      announcementsUnreadCount: circleUnread.announcementsUnreadCount,
      dropInsUnreadCount: circleUnread.dropInsUnreadCount,
      visitCapturesUnreadCount: circleUnread.visitCapturesUnreadCount,
    });

    return {
      totalUnread,
      hasUrgentAlert: alertAttention.urgentItems.length > 0,
    };
  }, [
    alertAttention.urgentItems.length,
    circleUnread.announcementsUnreadCount,
    circleUnread.discussionsUnreadCount,
    circleUnread.dropInsUnreadCount,
    circleUnread.visitCapturesUnreadCount,
    patient.capabilities.messaging,
    patient.role,
    threadState.unreadCount,
  ]);

  useEffect(() => {
    onBadge(patient.patientId, badge);
  }, [badge, onBadge, patient.patientId]);

  return null;
}
