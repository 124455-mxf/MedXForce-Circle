/** @license SPDX-License-Identifier: Apache-2.0 */

import { sanitizeCareCalendarAttendees } from './careCalendarAttendees';
import {
  hasCareCalendarAddress,
  type CareCalendarAddress,
  type CareCalendarEntry,
  type CareCalendarRecurrence,
} from './careCalendar';
import {
  sanitizeCareCalendarAppointmentTasks,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTask,
} from './careCalendarAppointment';

export type CareCalendarEntryFormComparable = {
  kind: CareCalendarEntry['kind'];
  title: string;
  details?: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  recurrence: CareCalendarRecurrence;
  address?: CareCalendarAddress;
  attendees?: CareCalendarEntry['attendees'];
  visitSubtype?: CareCalendarEntry['visitSubtype'];
  supportingNotes?: string;
  appointmentTasks?: CareCalendarAppointmentTask[];
  doctorName?: string;
};

function normalizeAddress(address: CareCalendarAddress | undefined) {
  if (!address || !hasCareCalendarAddress(address)) return null;
  return {
    label: address.label.trim() || address.line1?.trim() || 'Location',
    line1: address.line1?.trim() || undefined,
    suite: address.suite?.trim() || undefined,
    city: address.city?.trim() || undefined,
    state: address.state?.trim() || undefined,
    postalCode: address.postalCode?.trim() || undefined,
    country: address.country?.trim() || undefined,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

function normalizeRecurrence(recurrence: CareCalendarRecurrence): CareCalendarRecurrence {
  if (recurrence.type === 'weekly') {
    return {
      type: 'weekly',
      daysOfWeek: [...recurrence.daysOfWeek].sort((a, b) => a - b),
      untilDateKey: recurrence.untilDateKey || undefined,
    };
  }
  if (recurrence.type === 'daily') {
    return { type: 'daily', untilDateKey: recurrence.untilDateKey || undefined };
  }
  if (recurrence.type === 'monthly') {
    return { type: 'monthly', untilDateKey: recurrence.untilDateKey || undefined };
  }
  return { type: 'once' };
}

function normalizeAttendees(attendees: CareCalendarEntryFormComparable['attendees']) {
  const cleaned = sanitizeCareCalendarAttendees(attendees ?? []);
  return cleaned
    .map(({ contactId, name, role, proxyTier }) => ({ contactId, name, role, proxyTier }))
    .sort((a, b) => a.contactId.localeCompare(b.contactId));
}

export function careCalendarEntryFormSnapshot(input: CareCalendarEntryFormComparable): string {
  const episode = supportsCareCalendarAppointmentEpisode(input.kind);
  return JSON.stringify({
    kind: input.kind,
    title: input.title.trim(),
    details: (input.details ?? '').trim(),
    startDateKey: input.startDateKey,
    startTimeMinutes: input.startTimeMinutes ?? null,
    endTimeMinutes: input.endTimeMinutes ?? null,
    recurrence: normalizeRecurrence(input.recurrence),
    address: normalizeAddress(input.address),
    attendees: normalizeAttendees(input.attendees),
    visitSubtype: episode ? input.visitSubtype ?? null : null,
    supportingNotes: episode ? (input.supportingNotes ?? '').trim() : '',
    doctorName: input.kind === 'doctor' ? (input.doctorName ?? '').trim() : '',
    appointmentTasks: episode
      ? sanitizeCareCalendarAppointmentTasks(input.appointmentTasks ?? [])
      : [],
  });
}

export function careCalendarEntryFormSnapshotFromEntry(entry: CareCalendarEntry): string {
  return careCalendarEntryFormSnapshot({
    kind: entry.kind,
    title: entry.title,
    details: entry.details,
    startDateKey: entry.startDateKey,
    startTimeMinutes: entry.startTimeMinutes,
    endTimeMinutes: entry.endTimeMinutes,
    recurrence: entry.recurrence,
    address: entry.address,
    attendees: entry.attendees,
    visitSubtype: entry.visitSubtype,
    supportingNotes: entry.supportingNotes,
    doctorName: entry.doctorName,
    appointmentTasks: entry.appointmentTasks,
  });
}

export function careCalendarEntryHasCreateDraftContent(args: {
  title: string;
  details: string;
  doctorName: string;
  supportingNotes: string;
  attendeesCount: number;
  address: CareCalendarAddress;
  appointmentTasks: { title?: string }[];
}): boolean {
  if (args.title.trim() || args.details.trim() || args.supportingNotes.trim() || args.doctorName.trim()) {
    return true;
  }
  if (args.attendeesCount > 0) return true;
  if (hasCareCalendarAddress(args.address)) return true;
  if (args.appointmentTasks.some((task) => task.title?.trim())) return true;
  return false;
}
