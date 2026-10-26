/** @license SPDX-License-Identifier: Apache-2.0 */

import type { CareCalendarEntryKind } from './careCalendar';
import {
  isValidVisitSubtypeForKind,
  sanitizeCareCalendarAppointmentTasks,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTask,
  type CareCalendarVisitSubtype,
} from './careCalendarAppointment';
import { sanitizeClinicalReferenceIds } from './clinicalReferences';
import type { CareCalendarVisitBrief, CareCalendarVisitDebrief } from './visitBrief';

export type CareCalendarEpisodePatchInput = {
  visitSubtype?: CareCalendarVisitSubtype;
  supportingNotes?: string;
  appointmentTasks?: CareCalendarAppointmentTask[];
  clinicalReferenceIds?: string[];
  visitBrief?: CareCalendarVisitBrief | null;
  visitDebrief?: CareCalendarVisitDebrief | null;
};

const EPISODE_PATCH_KEYS = new Set([
  'visitSubtype',
  'supportingNotes',
  'appointmentTasks',
  'clinicalReferenceIds',
  'visitBrief',
  'visitDebrief',
]);

export function isEpisodeOnlyCareCalendarUpdate(
  input: Record<string, unknown>,
): input is { kind: CareCalendarEntryKind } & CareCalendarEpisodePatchInput {
  if (!input.kind || typeof input.kind !== 'string') return false;
  const keys = Object.keys(input).filter((key) => key !== 'kind');
  if (!keys.length) return false;
  return keys.every((key) => EPISODE_PATCH_KEYS.has(key));
}

export function buildCareCalendarEpisodeFirestorePatch(
  kind: CareCalendarEntryKind,
  input: CareCalendarEpisodePatchInput,
): Record<string, unknown> {
  if (!supportsCareCalendarAppointmentEpisode(kind)) {
    return {
      visitSubtype: null,
      supportingNotes: null,
      appointmentTasks: null,
      clinicalReferenceIds: null,
      visitBrief: null,
      visitDebrief: null,
    };
  }
  const patch: Record<string, unknown> = {};
  if (input.visitSubtype !== undefined) {
    patch.visitSubtype =
      input.visitSubtype && isValidVisitSubtypeForKind(kind, input.visitSubtype)
        ? input.visitSubtype
        : null;
  }
  if (input.supportingNotes !== undefined) {
    patch.supportingNotes = input.supportingNotes?.trim().slice(0, 2000) || null;
  }
  if (input.appointmentTasks !== undefined) {
    const tasks = input.appointmentTasks?.length
      ? sanitizeCareCalendarAppointmentTasks(input.appointmentTasks)
      : [];
    patch.appointmentTasks = tasks.length ? tasks : null;
  }
  if (input.clinicalReferenceIds !== undefined) {
    const ids = sanitizeClinicalReferenceIds(input.clinicalReferenceIds);
    patch.clinicalReferenceIds = ids.length ? ids : null;
  }
  if (input.visitBrief !== undefined) {
    patch.visitBrief = input.visitBrief ?? null;
  }
  if (input.visitDebrief !== undefined) {
    patch.visitDebrief = input.visitDebrief ?? null;
  }
  return patch;
}
