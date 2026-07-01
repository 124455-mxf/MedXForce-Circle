/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { CareCalendarEntry, CirclePatientSummary } from '@medxforce/shared';
import { canViewCircleAppointmentInvites, careCalendarInviteQueryContactIds } from '@medxforce/shared';
import {
  subscribeCareCalendarEntries,
  type CareCalendarEntriesSubscriptionOptions,
} from '../services/careCalendarService';
import type { CareCalendarMemberInviteContext } from '@medxforce/shared';

function memberContactIdsKey(ids: string[] | undefined): string {
  if (!ids?.length) return '';
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort().join('\0');
}

function inviteContextKey(context: CareCalendarMemberInviteContext | undefined): string {
  if (!context) return '';
  return [
    context.memberUid,
    context.contactId ?? '',
    context.memberDocContactId ?? '',
    context.inviteContactId ?? '',
  ].join('\0');
}

function careCalendarEntriesEqual(a: CareCalendarEntry[], b: CareCalendarEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id || a[i]?.updatedAt !== b[i]?.updatedAt) {
      return false;
    }
  }
  return true;
}

export function buildCareCalendarEntriesSubscription(
  patient: Pick<CirclePatientSummary, 'capabilities'> | null | undefined,
  memberUid: string | undefined,
  inviteContext?: CareCalendarMemberInviteContext,
  options?: { inviteContextReady?: boolean; memberRole?: string },
): CareCalendarEntriesSubscriptionOptions | undefined {
  if (!memberUid) return undefined;
  if (options?.memberRole && !canViewCircleAppointmentInvites(options.memberRole)) {
    return undefined;
  }
  const canReadAllEntries = patient?.capabilities?.remoteSettings === true;
  if (!canReadAllEntries && options?.inviteContextReady === false) {
    return undefined;
  }
  const memberContactIds = inviteContext
    ? careCalendarInviteQueryContactIds(inviteContext)
    : undefined;
  return {
    canReadAllEntries,
    memberUid,
    memberContactIds: memberContactIds?.length ? memberContactIds : undefined,
    inviteContext,
  };
}

export function useCareCalendarEntries(
  db: Firestore | undefined,
  patientId: string | undefined,
  subscription?: CareCalendarEntriesSubscriptionOptions,
) {
  const [entries, setEntries] = useState<CareCalendarEntry[]>([]);
  const [loading, setLoading] = useState(!!patientId);

  const memberUid = subscription?.memberUid;
  const canReadAllEntries = subscription?.canReadAllEntries === true;
  const hasSubscription = subscription != null;
  const contactIdsKey = memberContactIdsKey(subscription?.memberContactIds);
  const inviteCtxKey = inviteContextKey(subscription?.inviteContext);

  const stableSubscription = useMemo((): CareCalendarEntriesSubscriptionOptions | undefined => {
    if (!memberUid || !subscription) return undefined;
    const memberContactIds = contactIdsKey
      ? contactIdsKey.split('\0').filter(Boolean)
      : undefined;
    return {
      canReadAllEntries,
      memberUid,
      memberContactIds,
      inviteContext: subscription.inviteContext,
    };
  }, [canReadAllEntries, contactIdsKey, hasSubscription, inviteCtxKey, memberUid]);

  useEffect(() => {
    if (!db || !patientId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!stableSubscription) {
      setEntries([]);
      setLoading(Boolean(memberUid));
      return;
    }

    let cancelled = false;
    const unsub = subscribeCareCalendarEntries(
      db,
      patientId,
      (next) => {
        if (cancelled) return;
        setEntries((prev) => (careCalendarEntriesEqual(prev, next) ? prev : next));
        setLoading(false);
      },
      () => {
        if (!cancelled) setLoading(false);
      },
      stableSubscription,
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [db, memberUid, patientId, stableSubscription]);

  return { entries, loading };
}
