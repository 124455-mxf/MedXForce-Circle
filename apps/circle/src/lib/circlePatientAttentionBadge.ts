import { canSeeCircleRestrictedThread } from '@medxforce/shared';

export type CirclePatientAttentionBadge = {
  totalUnread: number;
  hasUrgentAlert: boolean;
};

export function computePatientDashboardAttentionTotal(params: {
  memberRole: string;
  messagingEnabled: boolean;
  messageUnreadCount: number;
  discussionsUnreadCount: number;
  announcementsUnreadCount: number;
  dropInsUnreadCount: number;
  visitCapturesUnreadCount: number;
}): number {
  const canSeeDropIns = canSeeCircleRestrictedThread(params.memberRole);
  return (
    (params.messagingEnabled ? params.messageUnreadCount : 0) +
    params.discussionsUnreadCount +
    params.announcementsUnreadCount +
    (canSeeDropIns ? params.dropInsUnreadCount : 0) +
    params.visitCapturesUnreadCount
  );
}

export function summarizeOtherPatientsAttention(
  badges: Record<string, CirclePatientAttentionBadge>,
  selectedPatientId: string | null,
): { totalUnread: number; hasUrgentAlert: boolean; patientCount: number } {
  let totalUnread = 0;
  let hasUrgentAlert = false;
  let patientCount = 0;

  for (const [patientId, badge] of Object.entries(badges)) {
    if (patientId === selectedPatientId) continue;
    if (badge.totalUnread <= 0 && !badge.hasUrgentAlert) continue;
    patientCount += 1;
    totalUnread += badge.totalUnread;
    if (badge.hasUrgentAlert) hasUrgentAlert = true;
  }

  return { totalUnread, hasUrgentAlert, patientCount };
}
