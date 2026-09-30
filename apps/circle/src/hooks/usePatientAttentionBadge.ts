import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import { CIRCLE_MSG_READ_CHANGED } from '../lib/circleMessageRead';
import {
  buildCirclePatientInboxMessages,
  computeCirclePatientHasUrgentAlert,
  computeCirclePatientMessageUnreadCount,
  useCirclePatientHiddenInbox,
  useCirclePatientRawMessages,
  useCirclePatientRepliesByMessageId,
} from './circlePatientMessagingCore';
import { useCircleMemberThreadUnread } from './useCircleMemberThreadUnread';
import { useCircleMemberInviteContext } from './useCircleMemberInviteContext';
import { useCareCalendarEntries, buildCareCalendarEntriesSubscription } from './useCareCalendarEntries';
import { countAcceptedAppointmentsTodayForMember } from '@medxforce/shared';
import {
  computePatientDashboardAttentionTotal,
  type CirclePatientAttentionBadge,
} from '../lib/circlePatientAttentionBadge';

/**
 * Lightweight badge hook for background patients — avoids mounting the full
 * thread UI stack (alert attention state, per-screen thread consumers).
 *
 * Runs outside CircleSelectedPatientProvider, so remote settings are not available
 * here. ICU communication-log eligibility still works when summaries already exist
 * (count > 0); empty eligibility is only needed in the selected-patient Messages UI.
 */
export function usePatientAttentionBadge(
  db: Firestore,
  user: User,
  patient: CirclePatientSummary,
): CirclePatientAttentionBadge {
  const { rawMessages, normalizedEmail } = useCirclePatientRawMessages(
    db,
    patient.patientId,
    user,
  );
  const hiddenAtByMessageId = useCirclePatientHiddenInbox(db, patient.patientId, user.uid);
  const repliesByMessageId = useCirclePatientRepliesByMessageId(
    db,
    patient.patientId,
    rawMessages,
  );

  const circleUnread = useCircleMemberThreadUnread(
    db,
    patient.patientId,
    user,
    patient.role,
  );

  const { inviteContext, inviteContextReady } = useCircleMemberInviteContext(db, user, patient);
  const calendarSubscription = useMemo(
    () =>
      buildCareCalendarEntriesSubscription(patient, user.uid, inviteContext, {
        inviteContextReady,
      }),
    [inviteContext, inviteContextReady, patient, user.uid],
  );
  const { entries: careCalendarEntries } = useCareCalendarEntries(
    db,
    patient.patientId,
    calendarSubscription,
  );

  const [readTick, setReadTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const onReadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (!detail?.patientId || detail.patientId === patient.patientId) {
        setReadTick((v) => v + 1);
      }
    };
    window.addEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
    return () => window.removeEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
  }, [patient.patientId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const messages = useMemo(
    () =>
      buildCirclePatientInboxMessages(
        rawMessages,
        hiddenAtByMessageId,
        repliesByMessageId,
        patient.role,
      ),
    [rawMessages, hiddenAtByMessageId, repliesByMessageId, patient.role],
  );

  const messageUnreadCount = useMemo(
    () =>
      computeCirclePatientMessageUnreadCount({
        messages,
        repliesByMessageId,
        patientId: patient.patientId,
        memberRole: patient.role,
        user,
        normalizedEmail,
        readTick,
      }),
    [
      messages,
      repliesByMessageId,
      patient.patientId,
      patient.role,
      user,
      normalizedEmail,
      readTick,
    ],
  );

  const hasUrgentAlert = useMemo(
    () =>
      computeCirclePatientHasUrgentAlert({
        messages,
        repliesByMessageId,
        patientId: patient.patientId,
        now,
      }),
    [messages, repliesByMessageId, patient.patientId, now],
  );

  const acceptedAppointmentsTodayCount = useMemo(
    () =>
      inviteContextReady && inviteContext.memberUid
        ? countAcceptedAppointmentsTodayForMember(careCalendarEntries, inviteContext, new Date(now))
        : 0,
    [careCalendarEntries, inviteContext, inviteContextReady, now],
  );

  return useMemo(
    (): CirclePatientAttentionBadge => ({
      totalUnread: computePatientDashboardAttentionTotal({
        memberRole: patient.role,
        messagingEnabled: patient.capabilities.messaging === true,
        messageUnreadCount,
        discussionsUnreadCount: circleUnread.discussionsUnreadCount,
        announcementsUnreadCount: circleUnread.announcementsUnreadCount,
        dropInsUnreadCount: circleUnread.dropInsUnreadCount,
        visitCapturesUnreadCount: circleUnread.visitCapturesUnreadCount,
        acceptedAppointmentsTodayCount,
      }),
      hasUrgentAlert,
    }),
    [
      acceptedAppointmentsTodayCount,
      circleUnread.announcementsUnreadCount,
      circleUnread.discussionsUnreadCount,
      circleUnread.dropInsUnreadCount,
      circleUnread.visitCapturesUnreadCount,
      hasUrgentAlert,
      messageUnreadCount,
      patient.capabilities.messaging,
      patient.role,
    ],
  );
}
