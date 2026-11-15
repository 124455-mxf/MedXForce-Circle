/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  countScheduleTabBadge,
  normalizeMemberRole,
  shouldHideDeclinedAppointmentForContact,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCareCalendarEntries, buildCareCalendarEntriesSubscription } from './useCareCalendarEntries';
import { useCircleMemberInviteContext } from './useCircleMemberInviteContext';

export function useScheduleActionBadgeCount(
  db: Firestore,
  patientId: string | undefined,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const { inviteContext, memberContactId, inviteContextReady } = useCircleMemberInviteContext(
    db,
    user,
    patient,
  );
  const badgeInviteContext = useMemo(
    () => ({
      ...inviteContext,
      contactId: memberContactId ?? inviteContext.contactId,
    }),
    [inviteContext, memberContactId],
  );
  const calendarSubscription = useMemo(
    () =>
      buildCareCalendarEntriesSubscription(patient, user.uid, badgeInviteContext, {
        inviteContextReady,
      }),
    [badgeInviteContext, inviteContextReady, patient, user.uid],
  );
  const { entries } = useCareCalendarEntries(db, patientId, calendarSubscription);
  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          !shouldHideDeclinedAppointmentForContact(
            entry.attendees,
            memberContactId,
            badgeInviteContext,
          ),
      ),
    [badgeInviteContext, entries, memberContactId],
  );

  return useMemo(
    () =>
      patientId
        ? countScheduleTabBadge(visibleEntries, {
            inviteContext: badgeInviteContext,
            memberRole: normalizeMemberRole(patient?.role ?? 'friend'),
            viewerUid: user.uid,
          })
        : 0,
    [badgeInviteContext, patient?.role, patientId, user.uid, visibleEntries],
  );
}
