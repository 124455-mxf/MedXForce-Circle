/** @license SPDX-License-Identifier: Apache-2.0 */

import type { CareCalendarEntryKind } from './careCalendar';
import { careCalendarDateKey } from './careCalendar';
import {
  careCalendarDayEventTiming,
  type CareCalendarDayEventTiming,
} from './careCalendarScheduleActions';

export function supportsVisitCaptureForAppointmentKind(kind: CareCalendarEntryKind): boolean {
  return kind === 'doctor';
}

/** Offer in-visit recording on today's doctor appointments (in progress or still upcoming). */
export function canOfferRecordVisitForAppointment(
  kind: CareCalendarEntryKind,
  timing: CareCalendarDayEventTiming,
  options?: { isAppointmentToday?: boolean },
): boolean {
  if (!supportsVisitCaptureForAppointmentKind(kind)) return false;
  if (!options?.isAppointmentToday) return false;
  return timing === 'in_progress' || timing === 'upcoming' || timing === 'unscheduled';
}

export function canOfferRecordVisitForAppointmentOnDate(
  kind: CareCalendarEntryKind,
  appointmentDateKey: string,
  startTimeMinutes?: number,
  endTimeMinutes?: number,
  now = new Date(),
): boolean {
  if (!appointmentDateKey.trim()) return false;
  const todayKey = careCalendarDateKey(now);
  const timing = careCalendarDayEventTiming(
    appointmentDateKey,
    startTimeMinutes,
    endTimeMinutes,
    now,
  );
  return canOfferRecordVisitForAppointment(kind, timing, {
    isAppointmentToday: appointmentDateKey === todayKey,
  });
}

/** Offer written visit notes during today's doctor appointments and after they end. */
export function canOfferVisitNotesForAppointment(
  kind: CareCalendarEntryKind,
  timing: CareCalendarDayEventTiming,
  options?: { isAppointmentToday?: boolean },
): boolean {
  if (!supportsVisitCaptureForAppointmentKind(kind)) return false;
  if (timing === 'past') return true;
  if (!options?.isAppointmentToday) return false;
  return timing === 'in_progress' || timing === 'upcoming' || timing === 'unscheduled';
}

export function canOfferVisitNotesForAppointmentOnDate(
  kind: CareCalendarEntryKind,
  appointmentDateKey: string,
  startTimeMinutes?: number,
  endTimeMinutes?: number,
  now = new Date(),
): boolean {
  if (!appointmentDateKey.trim()) return false;
  const todayKey = careCalendarDateKey(now);
  const timing = careCalendarDayEventTiming(
    appointmentDateKey,
    startTimeMinutes,
    endTimeMinutes,
    now,
  );
  return canOfferVisitNotesForAppointment(kind, timing, {
    isAppointmentToday: appointmentDateKey === todayKey,
  });
}
