/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { countScheduleTabBadge, type CirclePatientSummary } from '@medxforce/shared';
import { useCareCalendarEntries, buildCareCalendarEntriesSubscription } from './useCareCalendarEntries';
import { useCircleMemberInviteContext } from './useCircleMemberInviteContext';

export function useScheduleActionBadgeCount(
  db: Firestore,
  patientId: string | undefined,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const { inviteContext, inviteContextReady } = useCircleMemberInviteContext(db, user, patient);
  const calendarSubscription = useMemo(
    () =>
      buildCareCalendarEntriesSubscription(patient, user.uid, inviteContext, {
        inviteContextReady,
      }),
    [inviteContext, inviteContextReady, patient, user.uid],
  );
  const { entries } = useCareCalendarEntries(db, patientId, calendarSubscription);

  return useMemo(
    () =>
      patientId
        ? countScheduleTabBadge(entries, {
            inviteContext,
            memberRole: patient?.role ?? 'friend',
            viewerUid: user.uid,
          })
        : 0,
    [entries, inviteContext, patient?.role, patientId, user.uid],
  );
}
