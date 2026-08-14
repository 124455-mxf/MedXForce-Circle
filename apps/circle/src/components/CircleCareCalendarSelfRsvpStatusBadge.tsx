/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo } from 'react';
import {
  isCareCalendarAppointmentPast,
  resolveSelfInviteRsvpForCareEvent,
  type CareCalendarAttendeeResponse,
  type CareCalendarDayEvent,
  type CareCalendarMemberInviteContext,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleCareCalendarSelfRsvpStatusBadgeProps = {
  event: CareCalendarDayEvent;
  inviteContext: CareCalendarMemberInviteContext;
  t: (path: string, params?: Record<string, unknown>) => string;
  className?: string;
  /** Occurrence date for past filtering (week/day cards). */
  dateKey?: string;
  /** Compact week/day chips use shorter labels. */
  size?: 'sm' | 'md';
};

function labelForResponse(
  response: CareCalendarAttendeeResponse,
  t: CircleCareCalendarSelfRsvpStatusBadgeProps['t'],
): string {
  if (response === 'accepted') return t('schedulePage.views.yourRsvpAccepted');
  if (response === 'declined') return t('schedulePage.views.yourRsvpDeclined');
  return t('schedulePage.views.yourRsvpPending');
}

export function CircleCareCalendarSelfRsvpStatusBadge({
  event,
  inviteContext,
  t,
  className,
  dateKey,
  size = 'md',
}: CircleCareCalendarSelfRsvpStatusBadgeProps) {
  const response = useMemo(
    () => resolveSelfInviteRsvpForCareEvent(event, inviteContext),
    [event, inviteContext],
  );
  if (!response) return null;

  const isPast =
    event.status === 'past' ||
    (dateKey
      ? isCareCalendarAppointmentPast(
          dateKey,
          event.startTimeMinutes,
          event.endTimeMinutes,
        )
      : false);
  // Outstanding accept/decline is irrelevant once the appointment has ended.
  if (isPast && response === 'pending') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-wide',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        response === 'pending' && 'bg-blue-600 text-white',
        response === 'accepted' && 'bg-emerald-600 text-white',
        response === 'declined' && 'bg-slate-500 text-white',
        className,
      )}
    >
      {labelForResponse(response, t)}
    </span>
  );
}
