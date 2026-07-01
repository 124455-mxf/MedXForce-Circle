/** @license SPDX-License-Identifier: Apache-2.0 */

import type { CareCalendarEntryKind } from './careCalendar';

export type DoctorVisitSubtype =
  | 'ophthalmology'
  | 'neurology'
  | 'psychology'
  | 'pain_physical'
  | 'primary_care'
  | 'hearing'
  | 'balance'
  | 'doctor_other';

export type RehabVisitSubtype = 'pt' | 'ot' | 'speech' | 'rehab_other';

export type CareCalendarVisitSubtype = DoctorVisitSubtype | RehabVisitSubtype;

export type CareCalendarAppointmentTaskAssignee =
  | 'patient'
  | 'caregiver'
  | 'family'
  | 'proxy'
  | 'creator';

export type CareCalendarAppointmentTaskPhase = 'pre' | 'post';

export type CareCalendarAppointmentTaskStatus = 'open' | 'done' | 'dismissed';

export type CareCalendarAppointmentTaskSource = 'manual' | 'template';

export type CareCalendarAppointmentTask = {
  id: string;
  phase: CareCalendarAppointmentTaskPhase;
  assignee: CareCalendarAppointmentTaskAssignee;
  title: string;
  status: CareCalendarAppointmentTaskStatus;
  source: CareCalendarAppointmentTaskSource;
  doneAt?: number;
  doneByUid?: string;
};

export const DOCTOR_VISIT_SUBTYPES: DoctorVisitSubtype[] = [
  'ophthalmology',
  'neurology',
  'psychology',
  'pain_physical',
  'primary_care',
  'hearing',
  'balance',
  'doctor_other',
];

export const REHAB_VISIT_SUBTYPES: RehabVisitSubtype[] = ['pt', 'ot', 'speech', 'rehab_other'];

const DOCTOR_SUBTYPE_SET = new Set<string>(DOCTOR_VISIT_SUBTYPES);
const REHAB_SUBTYPE_SET = new Set<string>(REHAB_VISIT_SUBTYPES);

export function supportsCareCalendarAppointmentEpisode(kind: CareCalendarEntryKind): boolean {
  return kind === 'doctor' || kind === 'rehab';
}

export function visitSubtypesForKind(kind: CareCalendarEntryKind): CareCalendarVisitSubtype[] {
  if (kind === 'doctor') return DOCTOR_VISIT_SUBTYPES;
  if (kind === 'rehab') return REHAB_VISIT_SUBTYPES;
  return [];
}

export function defaultVisitSubtypeForKind(kind: CareCalendarEntryKind): CareCalendarVisitSubtype | undefined {
  if (kind === 'doctor') return 'primary_care';
  if (kind === 'rehab') return 'pt';
  return undefined;
}

export function isValidVisitSubtypeForKind(
  kind: CareCalendarEntryKind,
  subtype: string | undefined | null,
): subtype is CareCalendarVisitSubtype {
  if (!subtype) return false;
  if (kind === 'doctor') return DOCTOR_SUBTYPE_SET.has(subtype);
  if (kind === 'rehab') return REHAB_SUBTYPE_SET.has(subtype);
  return false;
}

export function newAppointmentTaskId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type TaskTemplate = {
  phase: CareCalendarAppointmentTaskPhase;
  assignee: CareCalendarAppointmentTaskAssignee;
  title: string;
};

const DEFAULT_TASK_TEMPLATES: Partial<Record<CareCalendarVisitSubtype, TaskTemplate[]>> = {
  ophthalmology: [
    { phase: 'pre', assignee: 'patient', title: 'Complete vision assessment' },
    { phase: 'pre', assignee: 'patient', title: 'Bring current glasses' },
    { phase: 'post', assignee: 'caregiver', title: 'Update glasses prescription in profile' },
  ],
  neurology: [
    { phase: 'pre', assignee: 'patient', title: 'Complete neurological assessment' },
    { phase: 'pre', assignee: 'caregiver', title: 'Note any new symptoms this week' },
    { phase: 'post', assignee: 'caregiver', title: 'Record follow-up plan' },
  ],
  psychology: [
    { phase: 'pre', assignee: 'patient', title: 'Complete psychological assessment' },
    { phase: 'post', assignee: 'patient', title: 'Practice recommended coping strategies' },
  ],
  pain_physical: [
    { phase: 'pre', assignee: 'patient', title: 'Log pain levels this week' },
    { phase: 'post', assignee: 'caregiver', title: 'Update medication list if changed' },
  ],
  primary_care: [
    { phase: 'pre', assignee: 'patient', title: 'Bring medication list' },
    { phase: 'pre', assignee: 'caregiver', title: 'Prepare questions for the doctor' },
    { phase: 'post', assignee: 'caregiver', title: 'Schedule any ordered follow-up' },
  ],
  pt: [
    { phase: 'pre', assignee: 'patient', title: 'Complete mobility assessment' },
    { phase: 'pre', assignee: 'patient', title: 'Wear comfortable clothing' },
    { phase: 'post', assignee: 'patient', title: 'Do home exercises as prescribed' },
  ],
  ot: [
    { phase: 'pre', assignee: 'patient', title: 'Note daily living tasks that are difficult' },
    { phase: 'post', assignee: 'caregiver', title: 'Update home setup recommendations' },
  ],
};

export function defaultAppointmentTasksForSubtype(
  subtype: CareCalendarVisitSubtype | undefined,
): CareCalendarAppointmentTask[] {
  if (!subtype) return [];
  const templates = DEFAULT_TASK_TEMPLATES[subtype] ?? [];
  return templates.map((template) => ({
    id: newAppointmentTaskId(),
    phase: template.phase,
    assignee: template.assignee,
    title: template.title,
    status: 'open',
    source: 'template',
  }));
}

const TASK_ASSIGNEES = new Set<CareCalendarAppointmentTaskAssignee>([
  'patient',
  'caregiver',
  'family',
  'proxy',
  'creator',
]);

export function parseCareCalendarAppointmentTasks(raw: unknown): CareCalendarAppointmentTask[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const tasks = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const t = item as Record<string, unknown>;
      const id = String(t.id || '').trim();
      const title = String(t.title || '').trim();
      const phase = t.phase === 'post' ? 'post' : t.phase === 'pre' ? 'pre' : null;
      const assignee = TASK_ASSIGNEES.has(t.assignee as CareCalendarAppointmentTaskAssignee)
        ? (t.assignee as CareCalendarAppointmentTaskAssignee)
        : 'patient';
      const status =
        t.status === 'done' || t.status === 'dismissed' ? t.status : ('open' as const);
      const source = t.source === 'template' ? 'template' : 'manual';
      if (!id || !title || !phase) return null;
      return {
        id,
        phase,
        assignee,
        title: title.slice(0, 300),
        status,
        source,
        ...(t.doneAt != null ? { doneAt: Number(t.doneAt) } : {}),
        ...(t.doneByUid ? { doneByUid: String(t.doneByUid) } : {}),
      } satisfies CareCalendarAppointmentTask;
    })
    .filter((t): t is CareCalendarAppointmentTask => !!t);
  return tasks.length ? tasks.slice(0, 40) : undefined;
}

export function appointmentTasksStatusMatch(
  a: CareCalendarAppointmentTask[] | undefined,
  b: CareCalendarAppointmentTask[] | undefined,
): boolean {
  if (!a?.length && !b?.length) return true;
  if (!a?.length || !b?.length || a.length !== b.length) return false;
  return a.every((task, index) => {
    const other = b[index];
    return task.id === other.id && task.status === other.status;
  });
}

export function applyAppointmentTaskStatusChange(
  tasks: CareCalendarAppointmentTask[],
  taskId: string,
  nextStatus: CareCalendarAppointmentTaskStatus,
  doneByUid?: string,
): CareCalendarAppointmentTask[] {
  const now = Date.now();
  return tasks.map((task) => {
    if (task.id !== taskId) return task;
    if (nextStatus === 'open') {
      const { doneAt: _doneAt, doneByUid: _doneByUid, ...rest } = task;
      return { ...rest, status: 'open' };
    }
    return {
      ...task,
      status: nextStatus,
      doneAt: now,
      ...(doneByUid ? { doneByUid } : {}),
    };
  });
}

export function sanitizeCareCalendarAppointmentTasks(
  tasks: CareCalendarAppointmentTask[],
): CareCalendarAppointmentTask[] {
  return tasks
    .filter((t) => t.title.trim())
    .slice(0, 40)
    .map((t) => {
      const title = t.title.trim().slice(0, 300);
      if (t.status === 'open') {
        const { doneAt: _doneAt, doneByUid: _doneByUid, ...rest } = t;
        return { ...rest, title, status: 'open' as const };
      }
      return { ...t, title };
    });
}

export function appointmentTasksForPhase(
  tasks: CareCalendarAppointmentTask[] | undefined,
  phase: CareCalendarAppointmentTaskPhase,
): CareCalendarAppointmentTask[] {
  return (tasks ?? []).filter((t) => t.phase === phase);
}

export function openAppointmentTaskCount(tasks: CareCalendarAppointmentTask[] | undefined): number {
  return (tasks ?? []).filter((t) => t.status === 'open').length;
}
