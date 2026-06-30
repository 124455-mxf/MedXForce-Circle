/** @license SPDX-License-Identifier: Apache-2.0 */
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type {
  CareCalendarAddress,
  CareCalendarAttendee,
  CareCalendarAttendeeResponse,
  CareCalendarAttendeeResponseSummary,
  CareCalendarEntry,
  CareCalendarEntryKind,
  CareCalendarRecurrence,
} from '@medxforce/shared';
import type { CircleMemberRole } from '@medxforce/shared';
import {
  isValidVisitSubtypeForKind,
  parseCareCalendarAppointmentTasks,
  sanitizeCareCalendarAppointmentTasks,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTask,
  type CareCalendarVisitSubtype,
} from '@medxforce/shared';
import {
  buildAttendeeResponseSummary,
  buildInviteeContactIds,
  mergeAttendeeResponses,
  normalizeCareCalendarAttendeesForSave,
  parseAttendeeResponseSummary,
  publishCareCalendarInvitePosts,
  resolveInviteeMemberUids,
  sanitizeCareCalendarAddressForFirestore,
} from '@medxforce/shared';

const entriesCollection = (db: Firestore, patientId: string) =>
  collection(db, 'patients', patientId, 'care_calendar');

function parseRecurrence(raw: unknown): CareCalendarRecurrence {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const type = r.type;
  if (type === 'daily') {
    return {
      type: 'daily',
      untilDateKey: r.untilDateKey ? String(r.untilDateKey) : undefined,
    };
  }
  if (type === 'weekly') {
    const days = Array.isArray(r.daysOfWeek)
      ? r.daysOfWeek.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
      : [];
    return {
      type: 'weekly',
      daysOfWeek: days.length ? days : [0],
      untilDateKey: r.untilDateKey ? String(r.untilDateKey) : undefined,
    };
  }
  if (type === 'monthly') {
    return {
      type: 'monthly',
      untilDateKey: r.untilDateKey ? String(r.untilDateKey) : undefined,
    };
  }
  return { type: 'once' };
}

function parseAddress(raw: unknown): CareCalendarAddress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const a = raw as Record<string, unknown>;
  const label = String(a.label || '').trim();
  if (!label) return undefined;
  return {
    label,
    line1: a.line1 ? String(a.line1) : undefined,
    suite: a.suite ? String(a.suite) : undefined,
    city: a.city ? String(a.city) : undefined,
    state: a.state ? String(a.state) : undefined,
    postalCode: a.postalCode ? String(a.postalCode) : undefined,
    country: a.country ? String(a.country) : undefined,
    latitude: a.latitude != null ? Number(a.latitude) : undefined,
    longitude: a.longitude != null ? Number(a.longitude) : undefined,
  };
}

function parseAttendeeResponse(raw: unknown): CareCalendarAttendeeResponse | undefined {
  return raw === 'pending' || raw === 'accepted' || raw === 'declined' ? raw : undefined;
}

function parseAttendees(raw: unknown): CareCalendarAttendee[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const attendees = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const a = item as Record<string, unknown>;
      const contactId = String(a.contactId || '').trim();
      const name = String(a.name || '').trim();
      const role = String(a.role || '');
      if (!contactId || !name) return null;
      const mappedRole = ['proxy', 'caregiver', 'family', 'friend', 'patient', 'other'].includes(role)
        ? (role as CareCalendarAttendee['role'])
        : 'other';
      const proxyTier =
        a.proxyTier === 'primary' || a.proxyTier === 'backup' ? a.proxyTier : undefined;
      const response = parseAttendeeResponse(a.response);
      const respondedAt = a.respondedAt != null ? Number(a.respondedAt) : undefined;
      const respondedByUid = a.respondedByUid ? String(a.respondedByUid) : undefined;
      return {
        contactId,
        name,
        role: mappedRole,
        ...(proxyTier ? { proxyTier } : {}),
        ...(response ? { response } : {}),
        ...(respondedAt != null ? { respondedAt } : {}),
        ...(respondedByUid ? { respondedByUid } : {}),
      };
    })
    .filter((a): a is CareCalendarAttendee => !!a);
  return attendees.length ? attendees : undefined;
}

function parseVisitSubtype(
  kind: CareCalendarEntryKind,
  raw: unknown,
): CareCalendarVisitSubtype | undefined {
  const subtype = raw ? String(raw) : undefined;
  return isValidVisitSubtypeForKind(kind, subtype) ? subtype : undefined;
}

function episodeFieldsFromData(
  kind: CareCalendarEntryKind,
  data: Record<string, unknown>,
): Pick<CareCalendarEntry, 'visitSubtype' | 'supportingNotes' | 'appointmentTasks'> {
  if (!supportsCareCalendarAppointmentEpisode(kind)) {
    return {};
  }
  const visitSubtype = parseVisitSubtype(kind, data.visitSubtype);
  const supportingNotes = data.supportingNotes ? String(data.supportingNotes).trim() : undefined;
  const appointmentTasks = parseCareCalendarAppointmentTasks(data.appointmentTasks);
  return {
    ...(visitSubtype ? { visitSubtype } : {}),
    ...(supportingNotes ? { supportingNotes: supportingNotes.slice(0, 2000) } : {}),
    ...(appointmentTasks ? { appointmentTasks } : {}),
  };
}

function parseEntry(id: string, data: Record<string, unknown>): CareCalendarEntry {
  const kind = (['doctor', 'wellness', 'rehab', 'other'].includes(String(data.kind))
    ? data.kind
    : 'other') as CareCalendarEntryKind;
  const attendeeResponseSummary = parseAttendeeResponseSummary(data.attendeeResponseSummary);
  const attendees = mergeAttendeeResponses(parseAttendees(data.attendees), attendeeResponseSummary);
  return {
    id,
    patientId: String(data.patientId || ''),
    kind,
    title: String(data.title || ''),
    details: data.details ? String(data.details) : undefined,
    startDateKey: String(data.startDateKey || ''),
    startTimeMinutes:
      data.startTimeMinutes != null ? Number(data.startTimeMinutes) : undefined,
    endTimeMinutes: data.endTimeMinutes != null ? Number(data.endTimeMinutes) : undefined,
    recurrence: parseRecurrence(data.recurrence),
    address: parseAddress(data.address),
    attendees,
    ...(attendeeResponseSummary ? { attendeeResponseSummary } : {}),
    inviteeContactIds: Array.isArray(data.inviteeContactIds)
      ? data.inviteeContactIds.map((id) => String(id)).filter(Boolean)
      : undefined,
    inviteeMemberUids: Array.isArray(data.inviteeMemberUids)
      ? data.inviteeMemberUids.map((uid) => String(uid)).filter(Boolean)
      : undefined,
    ...episodeFieldsFromData(kind, data),
    doctorName: data.doctorName ? String(data.doctorName).trim() : undefined,
    source: data.source === 'circle' ? 'circle' : 'patient',
    createdByUid: String(data.createdByUid || ''),
    createdByName: String(data.createdByName || ''),
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
    cancelledAt: data.cancelledAt != null ? Number(data.cancelledAt) : undefined,
  };
}

export function subscribeCareCalendarEntries(
  db: Firestore,
  patientId: string,
  onEntries: (entries: CareCalendarEntry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(entriesCollection(db, patientId), orderBy('startDateKey', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs
        .map((d) => parseEntry(d.id, d.data() as Record<string, unknown>))
        .filter((e) => !e.cancelledAt);
      onEntries(entries);
    },
    (err) => onError?.(err),
  );
}

export type CareCalendarEntryInput = {
  kind: CareCalendarEntryKind;
  title: string;
  details?: string;
  startDateKey: string;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  recurrence: CareCalendarRecurrence;
  address?: CareCalendarAddress;
  attendees?: CareCalendarAttendee[];
  visitSubtype?: CareCalendarVisitSubtype;
  supportingNotes?: string;
  appointmentTasks?: CareCalendarAppointmentTask[];
  doctorName?: string;
  source: 'patient' | 'circle';
  createdByName: string;
};

export type CareCalendarInviteContext = {
  authorUid: string;
  authorRole: CircleMemberRole;
  authorName: string;
  previousAttendees?: CareCalendarAttendee[];
};

function attendeesFirestorePayload(
  attendees: CareCalendarAttendee[] | undefined,
  previous?: CareCalendarAttendee[],
): {
  attendees: CareCalendarAttendee[] | null;
  attendeeResponseSummary: CareCalendarAttendeeResponseSummary | null;
  inviteeContactIds: string[] | null;
} {
  const normalized = normalizeCareCalendarAttendeesForSave(attendees, previous);
  if (!normalized?.length) {
    return { attendees: null, attendeeResponseSummary: null, inviteeContactIds: null };
  }
  const inviteeContactIds = buildInviteeContactIds(normalized);
  return {
    attendees: normalized,
    attendeeResponseSummary: buildAttendeeResponseSummary(normalized) ?? null,
    inviteeContactIds: inviteeContactIds.length ? inviteeContactIds : null,
  };
}

function episodeFirestorePayload(
  kind: CareCalendarEntryKind,
  input: Pick<CareCalendarEntryInput, 'visitSubtype' | 'supportingNotes' | 'appointmentTasks'>,
): Record<string, unknown> {
  if (!supportsCareCalendarAppointmentEpisode(kind)) {
    return {
      visitSubtype: null,
      supportingNotes: null,
      appointmentTasks: null,
    };
  }
  const tasks = input.appointmentTasks?.length
    ? sanitizeCareCalendarAppointmentTasks(input.appointmentTasks)
    : [];
  return {
    visitSubtype:
      input.visitSubtype && isValidVisitSubtypeForKind(kind, input.visitSubtype)
        ? input.visitSubtype
        : null,
    supportingNotes: input.supportingNotes?.trim().slice(0, 2000) || null,
    appointmentTasks: tasks.length ? tasks : null,
  };
}

function episodeFirestorePatch(
  kind: CareCalendarEntryKind,
  input: Partial<Pick<CareCalendarEntryInput, 'visitSubtype' | 'supportingNotes' | 'appointmentTasks'>>,
): Record<string, unknown> {
  if (!supportsCareCalendarAppointmentEpisode(kind)) {
    return {
      visitSubtype: null,
      supportingNotes: null,
      appointmentTasks: null,
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
  return patch;
}

export type CareCalendarSaveResult = {
  id: string;
  inviteNotifyFailed?: boolean;
};

export async function createCareCalendarEntry(
  db: Firestore,
  patientId: string,
  input: CareCalendarEntryInput,
  inviteContext?: CareCalendarInviteContext,
): Promise<CareCalendarSaveResult> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const now = Date.now();
  const attendeePayload = attendeesFirestorePayload(input.attendees);
  const inviteeMemberUids =
    attendeePayload.attendees?.length
      ? await resolveInviteeMemberUids(db, patientId, attendeePayload.attendees)
      : null;
  const ref = await addDoc(entriesCollection(db, patientId), {
    patientId,
    kind: input.kind,
    title: input.title.trim(),
    details: input.details?.trim() ?? '',
    startDateKey: input.startDateKey,
    startTimeMinutes: input.startTimeMinutes ?? null,
    endTimeMinutes: input.endTimeMinutes ?? null,
    recurrence: input.recurrence,
    address: sanitizeCareCalendarAddressForFirestore(input.address),
    attendees: attendeePayload.attendees,
    attendeeResponseSummary: attendeePayload.attendeeResponseSummary,
    inviteeContactIds: attendeePayload.inviteeContactIds,
    inviteeMemberUids,
    ...episodeFirestorePayload(input.kind, input),
    doctorName: input.doctorName?.trim() || null,
    source: input.source,
    createdByUid: uid,
    createdByName: input.createdByName.trim(),
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  });

  let inviteNotifyFailed = false;
  const needsInvite = attendeePayload.attendees?.some((attendee) => attendee.role !== 'patient');
  if (inviteContext && needsInvite) {
    const delivered = await publishCareCalendarInvitePosts(db, {
      patientId,
      entry: {
        id: ref.id,
        title: input.title.trim(),
        startDateKey: input.startDateKey,
        startTimeMinutes: input.startTimeMinutes,
        endTimeMinutes: input.endTimeMinutes,
        kind: input.kind,
        visitSubtype: input.visitSubtype,
        attendees: attendeePayload.attendees,
      },
      previousAttendees: inviteContext.previousAttendees,
      authorUid: inviteContext.authorUid,
      authorName: inviteContext.authorName,
      authorRole: inviteContext.authorRole,
    });
    inviteNotifyFailed = !delivered;
  }

  return { id: ref.id, ...(inviteNotifyFailed ? { inviteNotifyFailed: true } : {}) };
}

export async function updateCareCalendarEntry(
  db: Firestore,
  patientId: string,
  entryId: string,
  input: Partial<CareCalendarEntryInput>,
  inviteContext?: CareCalendarInviteContext,
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (input.kind) patch.kind = input.kind;
  if (input.title != null) patch.title = input.title.trim();
  if (input.details !== undefined) patch.details = input.details?.trim() ?? '';
  if (input.startDateKey) patch.startDateKey = input.startDateKey;
  if (input.startTimeMinutes !== undefined) {
    patch.startTimeMinutes = input.startTimeMinutes ?? null;
  }
  if (input.endTimeMinutes !== undefined) {
    patch.endTimeMinutes = input.endTimeMinutes ?? null;
  }
  if (input.recurrence) patch.recurrence = input.recurrence;
  if (input.address !== undefined) {
    patch.address = sanitizeCareCalendarAddressForFirestore(input.address);
  }
  if (input.doctorName !== undefined) patch.doctorName = input.doctorName?.trim() || null;
  if (input.attendees !== undefined) {
    const attendeePayload = attendeesFirestorePayload(
      input.attendees,
      inviteContext?.previousAttendees,
    );
    patch.attendees = attendeePayload.attendees;
    patch.attendeeResponseSummary = attendeePayload.attendeeResponseSummary;
    patch.inviteeContactIds = attendeePayload.inviteeContactIds;
    patch.inviteeMemberUids = attendeePayload.attendees?.length
      ? await resolveInviteeMemberUids(db, patientId, attendeePayload.attendees)
      : null;
  }
  if (input.kind) {
    if (!supportsCareCalendarAppointmentEpisode(input.kind)) {
      Object.assign(patch, episodeFirestorePayload(input.kind, {}));
    } else if (
      input.visitSubtype !== undefined ||
      input.supportingNotes !== undefined ||
      input.appointmentTasks !== undefined
    ) {
      const isFullEpisodeSave =
        input.visitSubtype !== undefined &&
        input.supportingNotes !== undefined &&
        input.appointmentTasks !== undefined;
      Object.assign(
        patch,
        isFullEpisodeSave
          ? episodeFirestorePayload(input.kind, input)
          : episodeFirestorePatch(input.kind, input),
      );
    }
  }

  await updateDoc(doc(db, 'patients', patientId, 'care_calendar', entryId), patch);

  if (inviteContext && input.attendees !== undefined) {
    const attendeePayload = attendeesFirestorePayload(
      input.attendees,
      inviteContext.previousAttendees,
    );
    if (attendeePayload.attendees?.length) {
      try {
        await publishCareCalendarInvitePosts(db, {
          patientId,
          entry: {
            id: entryId,
            title: input.title?.trim() || '',
            startDateKey: input.startDateKey || '',
            startTimeMinutes: input.startTimeMinutes,
            endTimeMinutes: input.endTimeMinutes,
            kind: input.kind || 'doctor',
            visitSubtype: input.visitSubtype,
            attendees: attendeePayload.attendees,
          },
          previousAttendees: inviteContext.previousAttendees,
          authorUid: inviteContext.authorUid,
          authorName: inviteContext.authorName,
          authorRole: inviteContext.authorRole,
        });
      } catch (err) {
        console.warn('Care calendar invite notification failed', err);
      }
    }
  }
}

export async function cancelCareCalendarEntry(
  db: Firestore,
  patientId: string,
  entryId: string,
): Promise<void> {
  await updateDoc(doc(db, 'patients', patientId, 'care_calendar', entryId), {
    cancelledAt: Date.now(),
    updatedAt: Date.now(),
  });
}
