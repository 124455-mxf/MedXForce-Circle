/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { countScheduleTabBadge, type CirclePatientSummary } from '@medxforce/shared';
import { useCareCalendarEntries } from './useCareCalendarEntries';
import { useCircleMemberInviteContext } from './useCircleMemberInviteContext';

export function useScheduleActionBadgeCount(
  db: Firestore,
  patientId: string | undefined,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const { entries } = useCareCalendarEntries(db, patientId);
  const { inviteContext } = useCircleMemberInviteContext(db, user, patient);

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
