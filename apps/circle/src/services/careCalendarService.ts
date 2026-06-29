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
  CareCalendarEntry,
  CareCalendarEntryKind,
  CareCalendarRecurrence,
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
    city: a.city ? String(a.city) : undefined,
    state: a.state ? String(a.state) : undefined,
    postalCode: a.postalCode ? String(a.postalCode) : undefined,
    country: a.country ? String(a.country) : undefined,
    latitude: a.latitude != null ? Number(a.latitude) : undefined,
    longitude: a.longitude != null ? Number(a.longitude) : undefined,
  };
}

function parseEntry(id: string, data: Record<string, unknown>): CareCalendarEntry {
  return {
    id,
    patientId: String(data.patientId || ''),
    kind: (['doctor', 'wellness', 'rehab', 'other'].includes(String(data.kind))
      ? data.kind
      : 'other') as CareCalendarEntryKind,
    title: String(data.title || ''),
    details: data.details ? String(data.details) : undefined,
    startDateKey: String(data.startDateKey || ''),
    startTimeMinutes:
      data.startTimeMinutes != null ? Number(data.startTimeMinutes) : undefined,
    endTimeMinutes: data.endTimeMinutes != null ? Number(data.endTimeMinutes) : undefined,
    recurrence: parseRecurrence(data.recurrence),
    address: parseAddress(data.address),
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
  source: 'patient' | 'circle';
  createdByName: string;
};

export async function createCareCalendarEntry(
  db: Firestore,
  patientId: string,
  input: CareCalendarEntryInput,
): Promise<string> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const now = Date.now();
  const ref = await addDoc(entriesCollection(db, patientId), {
    patientId,
    kind: input.kind,
    title: input.title.trim(),
    details: input.details?.trim() || null,
    startDateKey: input.startDateKey,
    startTimeMinutes: input.startTimeMinutes ?? null,
    endTimeMinutes: input.endTimeMinutes ?? null,
    recurrence: input.recurrence,
    address: input.address ?? null,
    source: input.source,
    createdByUid: uid,
    createdByName: input.createdByName.trim(),
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  });
  return ref.id;
}

export async function updateCareCalendarEntry(
  db: Firestore,
  patientId: string,
  entryId: string,
  input: Partial<CareCalendarEntryInput>,
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (input.kind) patch.kind = input.kind;
  if (input.title != null) patch.title = input.title.trim();
  if (input.details !== undefined) patch.details = input.details?.trim() || null;
  if (input.startDateKey) patch.startDateKey = input.startDateKey;
  if (input.startTimeMinutes !== undefined) {
    patch.startTimeMinutes = input.startTimeMinutes ?? null;
  }
  if (input.endTimeMinutes !== undefined) {
    patch.endTimeMinutes = input.endTimeMinutes ?? null;
  }
  if (input.recurrence) patch.recurrence = input.recurrence;
  if (input.address !== undefined) patch.address = input.address ?? null;

  await updateDoc(doc(db, 'patients', patientId, 'care_calendar', entryId), patch);
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
