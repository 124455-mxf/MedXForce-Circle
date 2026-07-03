/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  newAppointmentTaskId,
  type CareCalendarAppointmentTask,
} from './careCalendarAppointment';

export type VisitBriefReferenceNote = {
  refId: string;
  title: string;
  category: string;
  relevance: string;
};

/** AI-generated pre-visit brief stored on the care calendar appointment. */
export type CareCalendarVisitBrief = {
  generatedAt: number;
  generatedByUid?: string;
  generatedByName?: string;
  headline: string;
  patientContext: string;
  keyTopics: string[];
  questionsForDoctor: string[];
  medicationsToDiscuss: string[];
  referenceNotes: VisitBriefReferenceNote[];
  assessmentHighlights: string[];
  priorVisitSummary?: string;
};

export type CareCalendarVisitDebriefActionItem = {
  text: string;
  owner?: 'care_team' | 'patient' | 'doctor' | 'unknown';
  due?: string;
};

/** Post-visit debrief from visit capture, stored on the appointment. */
export type CareCalendarVisitDebrief = {
  visitCaptureId: string;
  publishedAt: number;
  capturedByName?: string;
  summary: string;
  actionItems: CareCalendarVisitDebriefActionItem[];
  followUpQuestions: string[];
  editedAt?: number;
  editedByUid?: string;
};

const BRIEF_OWNERS = new Set(['care_team', 'patient', 'doctor', 'unknown']);

function trimString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function trimStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim().slice(0, maxLen) : ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseReferenceNotes(raw: unknown): VisitBriefReferenceNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const refId = trimString(row.refId, 80);
      const title = trimString(row.title, 200);
      const category = trimString(row.category, 40);
      const relevance = trimString(row.relevance, 500);
      if (!refId || !title || !relevance) return null;
      return {
        refId,
        title,
        category: category ?? 'other',
        relevance,
      } satisfies VisitBriefReferenceNote;
    })
    .filter((item): item is VisitBriefReferenceNote => !!item)
    .slice(0, 20);
}

export function parseCareCalendarVisitBrief(raw: unknown): CareCalendarVisitBrief | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const headline = trimString(data.headline, 300);
  const patientContext = trimString(data.patientContext, 4000);
  const generatedAt = Number(data.generatedAt);
  if (!headline || !patientContext || !Number.isFinite(generatedAt)) return undefined;
  return {
    generatedAt,
    ...(trimString(data.generatedByUid, 128) ? { generatedByUid: trimString(data.generatedByUid, 128) } : {}),
    ...(trimString(data.generatedByName, 200) ? { generatedByName: trimString(data.generatedByName, 200) } : {}),
    headline,
    patientContext,
    keyTopics: trimStringList(data.keyTopics, 12, 200),
    questionsForDoctor: trimStringList(data.questionsForDoctor, 15, 400),
    medicationsToDiscuss: trimStringList(data.medicationsToDiscuss, 20, 200),
    referenceNotes: parseReferenceNotes(data.referenceNotes),
    assessmentHighlights: trimStringList(data.assessmentHighlights, 12, 300),
    ...(trimString(data.priorVisitSummary, 2000)
      ? { priorVisitSummary: trimString(data.priorVisitSummary, 2000) }
      : {}),
  };
}

function parseDebriefActionItems(raw: unknown): CareCalendarVisitDebriefActionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const text = trimString(row.text, 500);
      if (!text) return null;
      const owner = BRIEF_OWNERS.has(String(row.owner))
        ? (row.owner as CareCalendarVisitDebriefActionItem['owner'])
        : undefined;
      const due = trimString(row.due, 40);
      return {
        text,
        ...(owner ? { owner } : {}),
        ...(due ? { due } : {}),
      } satisfies CareCalendarVisitDebriefActionItem;
    })
    .filter((item): item is CareCalendarVisitDebriefActionItem => !!item)
    .slice(0, 20);
}

export function parseCareCalendarVisitDebrief(raw: unknown): CareCalendarVisitDebrief | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const visitCaptureId = trimString(data.visitCaptureId, 80);
  const summary = trimString(data.summary, 4000);
  const publishedAt = Number(data.publishedAt);
  if (!visitCaptureId || !summary || !Number.isFinite(publishedAt)) return undefined;
  return {
    visitCaptureId,
    publishedAt,
    summary,
    actionItems: parseDebriefActionItems(data.actionItems),
    followUpQuestions: trimStringList(data.followUpQuestions, 15, 400),
    ...(trimString(data.capturedByName, 200) ? { capturedByName: trimString(data.capturedByName, 200) } : {}),
    ...(data.editedAt != null && Number.isFinite(Number(data.editedAt))
      ? { editedAt: Number(data.editedAt) }
      : {}),
    ...(trimString(data.editedByUid, 128) ? { editedByUid: trimString(data.editedByUid, 128) } : {}),
  };
}

export function visitBriefPlainText(brief: CareCalendarVisitBrief, appointmentTitle?: string): string {
  const lines: string[] = [];
  if (appointmentTitle) lines.push(`Appointment: ${appointmentTitle}`, '');
  lines.push(brief.headline, '', 'Patient context', brief.patientContext);
  if (brief.keyTopics.length) {
    lines.push('', 'Key topics');
    brief.keyTopics.forEach((topic) => lines.push(`• ${topic}`));
  }
  if (brief.medicationsToDiscuss.length) {
    lines.push('', 'Medications to discuss');
    brief.medicationsToDiscuss.forEach((med) => lines.push(`• ${med}`));
  }
  if (brief.referenceNotes.length) {
    lines.push('', 'Clinical references');
    brief.referenceNotes.forEach((ref) => {
      lines.push(`• [${ref.category}] ${ref.title}: ${ref.relevance}`);
    });
  }
  if (brief.assessmentHighlights.length) {
    lines.push('', 'Recent assessments');
    brief.assessmentHighlights.forEach((item) => lines.push(`• ${item}`));
  }
  if (brief.priorVisitSummary) {
    lines.push('', 'Prior visit', brief.priorVisitSummary);
  }
  if (brief.questionsForDoctor.length) {
    lines.push('', 'Questions for the doctor');
    brief.questionsForDoctor.forEach((q, index) => lines.push(`${index + 1}. ${q}`));
  }
  return lines.join('\n');
}

export function visitDebriefPlainText(debrief: CareCalendarVisitDebrief): string {
  const lines: string[] = ['Visit debrief', '', debrief.summary];
  if (debrief.actionItems.length) {
    lines.push('', 'Action items');
    debrief.actionItems.forEach((item) => lines.push(`• ${item.text}`));
  }
  if (debrief.followUpQuestions.length) {
    lines.push('', 'Follow-up questions');
    debrief.followUpQuestions.forEach((q, index) => lines.push(`${index + 1}. ${q}`));
  }
  return lines.join('\n');
}

export function mergeDebriefActionItemsIntoPostTasks(
  existing: CareCalendarAppointmentTask[] | undefined,
  actionItems: CareCalendarVisitDebriefActionItem[],
): CareCalendarAppointmentTask[] {
  const tasks = [...(existing ?? [])];
  const existingTitles = new Set(tasks.map((task) => task.title.trim().toLowerCase()));
  for (const item of actionItems) {
    const title = item.text.trim().slice(0, 300);
    if (!title) continue;
    const key = title.toLowerCase();
    if (existingTitles.has(key)) continue;
    existingTitles.add(key);
    const assignee =
      item.owner === 'patient'
        ? 'patient'
        : 'care_team';
    tasks.push({
      id: newAppointmentTaskId(),
      phase: 'post',
      assignee,
      title,
      status: 'open',
      source: 'ai',
    });
  }
  return tasks.slice(0, 40);
}
