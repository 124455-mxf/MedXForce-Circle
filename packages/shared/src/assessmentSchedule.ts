/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  normalizeTreatmentPhaseForSchedule,
  type TreatmentPhaseValue,
} from './treatmentPhase';
import { isScheduleEnabled } from './activeTab';

export type AssessmentHistoryKey =
  | 'pain'
  | 'impact'
  | 'numbness'
  | 'temperature'
  | 'mobility'
  | 'vision'
  | 'neurological'
  | 'strengthReflex'
  | 'psychological'
  | 'speech';

export type AssessmentHistoryMap = Partial<Record<AssessmentHistoryKey, { timestamp: number }[]>>;

export type AssessmentScheduleId =
  | 'impact'
  | 'physical'
  | 'strength-reflex'
  | 'mobility'
  | 'numbness'
  | 'temperature'
  | 'balance'
  | 'vision'
  | 'speech'
  | 'neurological'
  | 'physiological'
  | 'psychological';

export type AssessmentRecurrenceKind = 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type AssessmentRecurrence =
  | { kind: 'daily' }
  | { kind: 'weekdays'; daysOfWeek: number[] }
  | { kind: 'weekly'; dayOfWeek: number }
  | { kind: 'monthly'; dayOfMonth: number };

export type AssessmentScheduleRule = {
  assessmentId: AssessmentScheduleId;
  enabled: boolean;
  recurrence: AssessmentRecurrence;
};

export type AssessmentSchedulePreferences = {
  rules?: Partial<Record<AssessmentScheduleId, AssessmentScheduleRule>>;
  /** Circle-managed rules the patient cannot edit */
  lockedIds?: AssessmentScheduleId[];
  updatedAt?: number;
};

export type RemoteAssessmentSchedule = {
  rules: Partial<Record<AssessmentScheduleId, AssessmentScheduleRule>>;
  lockedIds?: AssessmentScheduleId[];
};

export type SchedulableAssessmentMeta = {
  id: AssessmentScheduleId;
  sectionId: 'physical' | 'visionHearing' | 'speech' | 'neurologicalPhysiological';
  featureKey: string;
  historyKey: AssessmentHistoryKey | null;
  modal:
    | 'physical'
    | 'impact'
    | 'numbness'
    | 'temperature'
    | 'mobility'
    | 'vision'
    | 'strengthReflex'
    | 'neurological'
    | 'emotional'
    | 'balance'
    | 'speech'
    | null;
  titleKey: string;
  descriptionKey: string;
  released: boolean;
};

export const SCHEDULABLE_ASSESSMENTS: SchedulableAssessmentMeta[] = [
  {
    id: 'impact',
    sectionId: 'physical',
    featureKey: 'impactAssessment',
    historyKey: 'impact',
    modal: 'impact',
    titleKey: 'assessments.items.impact.title',
    descriptionKey: 'assessments.items.impact.description',
    released: true,
  },
  {
    id: 'physical',
    sectionId: 'physical',
    featureKey: 'painAssessment',
    historyKey: 'pain',
    modal: 'physical',
    titleKey: 'assessments.items.physical.title',
    descriptionKey: 'assessments.items.physical.description',
    released: true,
  },
  {
    id: 'strength-reflex',
    sectionId: 'physical',
    featureKey: 'strengthReflexAssessment',
    historyKey: 'strengthReflex',
    modal: 'strengthReflex',
    titleKey: 'assessments.items.strengthReflex.title',
    descriptionKey: 'assessments.items.strengthReflex.description',
    released: true,
  },
  {
    id: 'mobility',
    sectionId: 'physical',
    featureKey: 'mobilityAssessment',
    historyKey: 'mobility',
    modal: 'mobility',
    titleKey: 'assessments.items.mobility.title',
    descriptionKey: 'assessments.items.mobility.description',
    released: true,
  },
  {
    id: 'numbness',
    sectionId: 'physical',
    featureKey: 'numbnessAssessment',
    historyKey: 'numbness',
    modal: 'numbness',
    titleKey: 'assessments.items.numbness.title',
    descriptionKey: 'assessments.items.numbness.description',
    released: true,
  },
  {
    id: 'temperature',
    sectionId: 'physical',
    featureKey: 'temperatureAssessment',
    historyKey: 'temperature',
    modal: 'temperature',
    titleKey: 'assessments.items.temperature.title',
    descriptionKey: 'assessments.items.temperature.description',
    released: true,
  },
  {
    id: 'balance',
    sectionId: 'physical',
    featureKey: 'balanceAssessment',
    historyKey: null,
    modal: 'balance',
    titleKey: 'assessments.items.balance.title',
    descriptionKey: 'assessments.items.balance.description',
    released: false,
  },
  {
    id: 'vision',
    sectionId: 'visionHearing',
    featureKey: 'visionAssessment',
    historyKey: 'vision',
    modal: 'vision',
    titleKey: 'assessments.items.vision.title',
    descriptionKey: 'assessments.items.vision.description',
    released: true,
  },
  {
    id: 'speech',
    sectionId: 'speech',
    featureKey: 'speechAssessment',
    historyKey: 'speech',
    modal: 'speech',
    titleKey: 'assessments.items.speech.title',
    descriptionKey: 'assessments.items.speech.description',
    released: true,
  },
  {
    id: 'neurological',
    sectionId: 'neurologicalPhysiological',
    featureKey: 'neurologicalAssessment',
    historyKey: 'neurological',
    modal: 'neurological',
    titleKey: 'assessments.items.neurological.title',
    descriptionKey: 'assessments.items.neurological.description',
    released: true,
  },
  {
    id: 'physiological',
    sectionId: 'neurologicalPhysiological',
    featureKey: 'physiologicalAssessment',
    historyKey: null,
    modal: null,
    titleKey: 'assessments.items.physiological.title',
    descriptionKey: 'assessments.items.physiological.description',
    released: false,
  },
  {
    id: 'psychological',
    sectionId: 'neurologicalPhysiological',
    featureKey: 'psychologicalAssessment',
    historyKey: 'psychological',
    modal: 'emotional',
    titleKey: 'assessments.items.psychological.title',
    descriptionKey: 'assessments.items.psychological.description',
    released: true,
  },
];

const MS_DAY = 24 * 60 * 60 * 1000;

export const TREATMENT_PHASES = [
  'icu',
  'acute',
  'rehab',
  'maintenance',
  'palliative',
] as const;

export type TreatmentPhase = (typeof TREATMENT_PHASES)[number];

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function sanitizeDaysOfWeek(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  const seen = new Set<number>();
  const next: number[] = [];
  for (const value of days) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 6) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  return next.sort((a, b) => a - b);
}

export function sanitizeRecurrence(raw: unknown): AssessmentRecurrence | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const kind = value.kind;
  if (kind === 'daily') return { kind: 'daily' };
  if (kind === 'weekdays') {
    const daysOfWeek = sanitizeDaysOfWeek(value.daysOfWeek);
    if (daysOfWeek.length === 0) return null;
    return { kind: 'weekdays', daysOfWeek };
  }
  if (kind === 'weekly') {
    const dayOfWeek = value.dayOfWeek;
    if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) return null;
    return { kind: 'weekly', dayOfWeek };
  }
  if (kind === 'monthly') {
    const dayOfMonth = value.dayOfMonth;
    if (typeof dayOfMonth !== 'number' || dayOfMonth < 1 || dayOfMonth > 28) return null;
    return { kind: 'monthly', dayOfMonth };
  }
  return null;
}

export function sanitizeScheduleRule(raw: unknown): AssessmentScheduleRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const assessmentId = value.assessmentId;
  if (typeof assessmentId !== 'string' || !isAssessmentScheduleId(assessmentId)) return null;
  const recurrence = sanitizeRecurrence(value.recurrence);
  if (!recurrence) return null;
  return {
    assessmentId,
    enabled: value.enabled !== false,
    recurrence,
  };
}

export function isAssessmentScheduleId(value: string): value is AssessmentScheduleId {
  return SCHEDULABLE_ASSESSMENTS.some((item) => item.id === value);
}

export function sanitizeAssessmentSchedulePreferences(raw: unknown): AssessmentSchedulePreferences {
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as Record<string, unknown>;
  const rules: Partial<Record<AssessmentScheduleId, AssessmentScheduleRule>> = {};
  const rulesRaw = value.rules;
  if (rulesRaw && typeof rulesRaw === 'object') {
    for (const [key, ruleRaw] of Object.entries(rulesRaw as Record<string, unknown>)) {
      if (!isAssessmentScheduleId(key)) continue;
      const rule = sanitizeScheduleRule({ ...(ruleRaw as object), assessmentId: key });
      if (rule) rules[key] = rule;
    }
  }
  const lockedIds = Array.isArray(value.lockedIds)
    ? value.lockedIds.filter((id): id is AssessmentScheduleId => typeof id === 'string' && isAssessmentScheduleId(id))
    : undefined;
  const updatedAt = typeof value.updatedAt === 'number' ? value.updatedAt : undefined;
  return { rules, lockedIds, updatedAt };
}

export function sanitizeRemoteAssessmentSchedule(raw: unknown): RemoteAssessmentSchedule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const rules: Partial<Record<AssessmentScheduleId, AssessmentScheduleRule>> = {};
  const rulesRaw = value.rules;
  if (!rulesRaw || typeof rulesRaw !== 'object') return undefined;
  for (const [key, ruleRaw] of Object.entries(rulesRaw as Record<string, unknown>)) {
    if (!isAssessmentScheduleId(key)) continue;
    const rule = sanitizeScheduleRule({ ...(ruleRaw as object), assessmentId: key });
    if (rule) rules[key] = rule;
  }
  const lockedIds = Array.isArray(value.lockedIds)
    ? value.lockedIds.filter((id): id is AssessmentScheduleId => typeof id === 'string' && isAssessmentScheduleId(id))
    : undefined;
  return { rules, lockedIds };
}

export function isRecurrenceActiveOnDate(recurrence: AssessmentRecurrence, date: Date): boolean {
  switch (recurrence.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return recurrence.daysOfWeek.includes(date.getDay());
    case 'weekly':
      return date.getDay() === recurrence.dayOfWeek;
    case 'monthly':
      return date.getDate() === recurrence.dayOfMonth;
    default:
      return false;
  }
}

export function getCurrentPeriodStart(recurrence: AssessmentRecurrence, date: Date): number {
  switch (recurrence.kind) {
    case 'daily':
    case 'weekdays':
      return startOfDay(date);
    case 'weekly': {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const diff = (d.getDay() - recurrence.dayOfWeek + 7) % 7;
      d.setDate(d.getDate() - diff);
      return d.getTime();
    }
    case 'monthly': {
      const anchor = new Date(date.getFullYear(), date.getMonth(), recurrence.dayOfMonth);
      anchor.setHours(0, 0, 0, 0);
      if (date.getTime() < anchor.getTime()) {
        return new Date(date.getFullYear(), date.getMonth() - 1, recurrence.dayOfMonth).getTime();
      }
      return anchor.getTime();
    }
    default:
      return startOfDay(date);
  }
}

/**
 * Early completion credit before a scheduled day:
 * - monthly: 5 days
 * - weekly (or a single selected weekday): 2 days
 * - daily / multiple selected weekdays: none
 */
export function graceDaysForRecurrence(recurrence: AssessmentRecurrence): number {
  if (recurrence.kind === 'monthly') return 5;
  if (recurrence.kind === 'weekly') return 2;
  if (recurrence.kind === 'weekdays' && recurrence.daysOfWeek.length <= 1) return 2;
  return 0;
}

/** Earliest completion timestamp that still counts for the period containing `date`. */
export function getPeriodCreditStart(recurrence: AssessmentRecurrence, date: Date): number {
  const periodStart = getCurrentPeriodStart(recurrence, date);
  return periodStart - graceDaysForRecurrence(recurrence) * MS_DAY;
}

export function isAssessmentDueForRecurrence(
  lastCompletedAt: number | null,
  recurrence: AssessmentRecurrence,
  now = new Date(),
): boolean {
  // Only look from "now" forward. Past missed days stay visible on the calendar
  // for that date, but do not keep nagging in "due now" until the next
  // early-completion window (or scheduled day) opens.
  for (let offset = 0; offset < 366; offset += 1) {
    const candidate = addDays(now, offset);
    if (!isRecurrenceActiveOnDate(recurrence, candidate)) continue;
    const creditStart = getPeriodCreditStart(recurrence, candidate);
    if (lastCompletedAt !== null && lastCompletedAt >= creditStart) continue;
    return now.getTime() >= creditStart;
  }
  return false;
}

export function getNextDueTimestamp(
  lastCompletedAt: number | null,
  recurrence: AssessmentRecurrence,
  from = new Date(),
): number | null {
  for (let offset = 0; offset < 366; offset += 1) {
    const candidate = addDays(from, offset);
    if (!isRecurrenceActiveOnDate(recurrence, candidate)) continue;
    const creditStart = getPeriodCreditStart(recurrence, candidate);
    if (lastCompletedAt === null || lastCompletedAt < creditStart) {
      return getCurrentPeriodStart(recurrence, candidate);
    }
  }
  return null;
}

/** When early completion next becomes available (null if no grace or already due). */
export function getNextEarlyCompletionTimestamp(
  lastCompletedAt: number | null,
  recurrence: AssessmentRecurrence,
  from = new Date(),
): number | null {
  if (graceDaysForRecurrence(recurrence) === 0) return null;
  const nextPeriodStart = getNextDueTimestamp(lastCompletedAt, recurrence, from);
  if (nextPeriodStart == null) return null;
  return getPeriodCreditStart(recurrence, new Date(nextPeriodStart));
}

const DAILY: AssessmentRecurrence = { kind: 'daily' };
const MON_THU: AssessmentRecurrence = { kind: 'weekdays', daysOfWeek: [1, 4] };
const TUE_FRI: AssessmentRecurrence = { kind: 'weekdays', daysOfWeek: [2, 5] };
const WEEKLY_MON: AssessmentRecurrence = { kind: 'weekly', dayOfWeek: 1 };
const WEEKLY_WED: AssessmentRecurrence = { kind: 'weekly', dayOfWeek: 3 };
const MONTHLY_1: AssessmentRecurrence = { kind: 'monthly', dayOfMonth: 1 };
const MONTHLY_15: AssessmentRecurrence = { kind: 'monthly', dayOfMonth: 15 };

type PhaseScheduleCell = { on: boolean; recurrence: AssessmentRecurrence };

/** Bump when the recovery-stage default table changes so existing unlocked rules refresh once. */
export const ASSESSMENT_SCHEDULE_PHASE_DEFAULTS_VERSION = 2;

const PHASE_SCHEDULE_DEFAULTS: Record<
  TreatmentPhaseValue,
  Record<AssessmentScheduleId, PhaseScheduleCell>
> = {
  icu: {
    impact: { on: true, recurrence: DAILY },
    physical: { on: true, recurrence: DAILY },
    'strength-reflex': { on: true, recurrence: WEEKLY_WED },
    mobility: { on: true, recurrence: MON_THU },
    numbness: { on: true, recurrence: MON_THU },
    temperature: { on: true, recurrence: MON_THU },
    balance: { on: true, recurrence: WEEKLY_MON },
    vision: { on: true, recurrence: MON_THU },
    speech: { on: true, recurrence: TUE_FRI },
    neurological: { on: true, recurrence: WEEKLY_MON },
    physiological: { on: true, recurrence: WEEKLY_MON },
    psychological: { on: true, recurrence: DAILY },
  },
  acute: {
    impact: { on: true, recurrence: MON_THU },
    physical: { on: true, recurrence: MON_THU },
    'strength-reflex': { on: true, recurrence: WEEKLY_WED },
    mobility: { on: true, recurrence: WEEKLY_WED },
    numbness: { on: true, recurrence: WEEKLY_WED },
    temperature: { on: true, recurrence: WEEKLY_WED },
    balance: { on: true, recurrence: WEEKLY_MON },
    vision: { on: true, recurrence: WEEKLY_MON },
    speech: { on: true, recurrence: WEEKLY_WED },
    neurological: { on: true, recurrence: WEEKLY_MON },
    physiological: { on: true, recurrence: WEEKLY_MON },
    psychological: { on: true, recurrence: WEEKLY_WED },
  },
  rehab: {
    impact: { on: true, recurrence: WEEKLY_MON },
    physical: { on: true, recurrence: WEEKLY_MON },
    'strength-reflex': { on: true, recurrence: WEEKLY_WED },
    mobility: { on: true, recurrence: WEEKLY_WED },
    numbness: { on: false, recurrence: WEEKLY_WED },
    temperature: { on: false, recurrence: WEEKLY_WED },
    balance: { on: true, recurrence: WEEKLY_WED },
    vision: { on: true, recurrence: WEEKLY_MON },
    speech: { on: true, recurrence: WEEKLY_WED },
    neurological: { on: true, recurrence: WEEKLY_MON },
    physiological: { on: true, recurrence: WEEKLY_WED },
    psychological: { on: true, recurrence: WEEKLY_WED },
  },
  maintenance: {
    impact: { on: true, recurrence: MONTHLY_15 },
    physical: { on: true, recurrence: MONTHLY_15 },
    'strength-reflex': { on: false, recurrence: MONTHLY_15 },
    mobility: { on: true, recurrence: MONTHLY_15 },
    numbness: { on: false, recurrence: MONTHLY_15 },
    temperature: { on: false, recurrence: MONTHLY_15 },
    balance: { on: true, recurrence: MONTHLY_15 },
    vision: { on: true, recurrence: MONTHLY_1 },
    speech: { on: true, recurrence: MONTHLY_1 },
    neurological: { on: true, recurrence: MONTHLY_1 },
    physiological: { on: true, recurrence: MONTHLY_1 },
    psychological: { on: true, recurrence: MONTHLY_1 },
  },
  palliative: {
    impact: { on: true, recurrence: MONTHLY_15 },
    physical: { on: true, recurrence: MONTHLY_15 },
    'strength-reflex': { on: true, recurrence: MONTHLY_15 },
    mobility: { on: true, recurrence: MONTHLY_15 },
    numbness: { on: true, recurrence: MONTHLY_15 },
    temperature: { on: true, recurrence: MONTHLY_15 },
    balance: { on: true, recurrence: MONTHLY_15 },
    vision: { on: true, recurrence: MONTHLY_1 },
    speech: { on: true, recurrence: MONTHLY_1 },
    neurological: { on: true, recurrence: MONTHLY_1 },
    physiological: { on: true, recurrence: MONTHLY_1 },
    psychological: { on: true, recurrence: MONTHLY_1 },
  },
};

function defaultRecurrenceFor(
  assessmentId: AssessmentScheduleId,
  phase: TreatmentPhaseValue,
): AssessmentRecurrence {
  return PHASE_SCHEDULE_DEFAULTS[phase][assessmentId].recurrence;
}

export function buildDefaultAssessmentScheduleRules(
  phase?: string | null,
): Record<AssessmentScheduleId, AssessmentScheduleRule> {
  const normalizedPhase: TreatmentPhaseValue =
    normalizeTreatmentPhaseForSchedule(phase) ?? 'rehab';
  const rules = {} as Record<AssessmentScheduleId, AssessmentScheduleRule>;
  for (const meta of SCHEDULABLE_ASSESSMENTS) {
    const cell = PHASE_SCHEDULE_DEFAULTS[normalizedPhase][meta.id];
    rules[meta.id] = {
      assessmentId: meta.id,
      enabled: meta.released && cell.on,
      recurrence: defaultRecurrenceFor(meta.id, normalizedPhase),
    };
  }
  return rules;
}

/** True when stored rules look like ICU/Hospital force-off leftovers (all released items off). */
export function assessmentScheduleLooksFullyDisabled(
  schedule: unknown,
): boolean {
  const local = sanitizeAssessmentSchedulePreferences(schedule);
  const rules = local.rules ?? {};
  const released = SCHEDULABLE_ASSESSMENTS.filter((item) => item.released);
  if (released.length === 0) return false;
  const hasAnyStored = released.some((item) => !!rules[item.id]);
  if (!hasAnyStored) return false;
  return released.every((item) => rules[item.id]?.enabled === false);
}

/** Apply recovery-stage defaults. Circle-locked assessments keep their current rule. */
export function withPhaseAssessmentScheduleDefaults<T extends Record<string, unknown>>(
  preferences: T,
): T {
  const phase =
    (preferences.fullUserDetails as { clinical?: { treatmentPhase?: string } } | null | undefined)
      ?.clinical?.treatmentPhase ?? null;
  const current = sanitizeAssessmentSchedulePreferences(preferences.assessmentSchedule);
  const nextRules = buildDefaultAssessmentScheduleRules(phase);
  for (const id of current.lockedIds ?? []) {
    const existing = current.rules?.[id];
    if (existing) nextRules[id] = existing;
  }
  return {
    ...preferences,
    assessmentSchedule: {
      ...current,
      rules: nextRules,
      updatedAt: Date.now(),
    },
  };
}

/** Restore phase defaults for Daily Life (and clear stale all-off rules from ICU/Hospital). */
export function withDailyLifeAssessmentScheduleDefaults<T extends Record<string, unknown>>(
  preferences: T,
): T {
  return withPhaseAssessmentScheduleDefaults(preferences);
}

function isFeatureEnabled(
  preferences: { featuresVisibility?: Record<string, unknown> },
  featureKey: string,
): boolean {
  const fv = preferences.featuresVisibility;
  if (!fv) return true;
  const value = fv[featureKey];
  return value === undefined ? true : !!value;
}

function latestTimestamp(entries: { timestamp: number }[]): number | null {
  if (!entries.length) return null;
  return Math.max(...entries.map((entry) => entry.timestamp));
}

export function resolveEffectiveAssessmentScheduleRules(params: {
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  };
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
}): Record<AssessmentScheduleId, AssessmentScheduleRule> {
  const appMode = params.preferences.appMode;
  const phase = params.preferences.fullUserDetails?.clinical?.treatmentPhase;
  const defaults = buildDefaultAssessmentScheduleRules(phase);
  const local = sanitizeAssessmentSchedulePreferences(params.preferences.assessmentSchedule);
  const remote = params.remoteAssessmentSchedule;
  const locked = new Set<AssessmentScheduleId>([
    ...(local.lockedIds ?? []),
    ...(remote?.lockedIds ?? []),
  ]);

  const merged = { ...defaults };
  for (const meta of SCHEDULABLE_ASSESSMENTS) {
    const remoteRule = remote?.rules?.[meta.id];
    const localRule = local.rules?.[meta.id];
    if (remoteRule) merged[meta.id] = remoteRule;
    if (localRule && !locked.has(meta.id)) merged[meta.id] = localRule;
    if (appMode === 'intensive_care' || appMode === 'hospital') {
      merged[meta.id] = { ...merged[meta.id], enabled: false };
    }
  }
  return merged;
}

export type DueAssessmentScheduleItem = {
  id: AssessmentScheduleId;
  modal: NonNullable<SchedulableAssessmentMeta['modal']>;
  titleKey: string;
  descriptionKey: string;
};

export function getScheduledDueAssessments(
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  },
  histories: AssessmentHistoryMap,
  remoteAssessmentSchedule?: RemoteAssessmentSchedule,
  now = new Date(),
): DueAssessmentScheduleItem[] {
  if (!isScheduleEnabled(preferences)) return [];
  const rules = resolveEffectiveAssessmentScheduleRules({ preferences, remoteAssessmentSchedule });
  const due: DueAssessmentScheduleItem[] = [];

  for (const meta of SCHEDULABLE_ASSESSMENTS) {
    const rule = rules[meta.id];
    if (!rule?.enabled || !meta.released || !meta.modal) continue;
    if (!isFeatureEnabled(preferences, meta.featureKey)) continue;
    if (!meta.historyKey) continue;
    const latest = latestTimestamp(histories[meta.historyKey] ?? []);
    if (!isAssessmentDueForRecurrence(latest, rule.recurrence, now)) continue;
    due.push({
      id: meta.id,
      modal: meta.modal,
      titleKey: meta.titleKey,
      descriptionKey: meta.descriptionKey,
    });
  }
  return due;
}

export function countUpcomingScheduledAssessmentsWithinDays(
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  },
  histories: AssessmentHistoryMap,
  windowDays = 7,
  remoteAssessmentSchedule?: RemoteAssessmentSchedule,
  now = new Date(),
): number {
  if (!isScheduleEnabled(preferences)) return 0;
  const rules = resolveEffectiveAssessmentScheduleRules({ preferences, remoteAssessmentSchedule });
  const windowEnd = now.getTime() + windowDays * MS_DAY;
  let count = 0;

  for (const meta of SCHEDULABLE_ASSESSMENTS) {
    const rule = rules[meta.id];
    if (!rule?.enabled || !meta.released || !meta.modal) continue;
    if (!isFeatureEnabled(preferences, meta.featureKey)) continue;
    if (!meta.historyKey) continue;
    const latest = latestTimestamp(histories[meta.historyKey] ?? []);
    if (isAssessmentDueForRecurrence(latest, rule.recurrence, now)) continue;
    const nextCreditStart = getNextEarlyCompletionTimestamp(latest, rule.recurrence, now);
    const nowMs = now.getTime();
    if (nextCreditStart != null && nextCreditStart > nowMs && nextCreditStart <= windowEnd) {
      count += 1;
    }
  }
  return count;
}

export function assessmentScheduleDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type AssessmentScheduleDayEvent = {
  id: AssessmentScheduleId;
  modal: NonNullable<SchedulableAssessmentMeta['modal']>;
  titleKey: string;
  status: 'due' | 'upcoming' | 'completed';
};

export function getAssessmentScheduleCalendar(
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  },
  histories: AssessmentHistoryMap,
  rangeStart: Date,
  rangeEnd: Date,
  remoteAssessmentSchedule?: RemoteAssessmentSchedule,
): Map<string, AssessmentScheduleDayEvent[]> {
  const result = new Map<string, AssessmentScheduleDayEvent[]>();
  if (!isScheduleEnabled(preferences)) return result;

  const rules = resolveEffectiveAssessmentScheduleRules({ preferences, remoteAssessmentSchedule });
  const todayStart = startOfDay(new Date());

  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  for (let ts = start; ts <= end; ts += MS_DAY) {
    const day = new Date(ts);
    day.setHours(12, 0, 0, 0);
    const dateKey = assessmentScheduleDateKey(day);
    const events: AssessmentScheduleDayEvent[] = [];

    for (const meta of SCHEDULABLE_ASSESSMENTS) {
      const rule = rules[meta.id];
      if (!rule?.enabled || !meta.released || !meta.modal || !meta.historyKey) continue;
      if (!isFeatureEnabled(preferences, meta.featureKey)) continue;
      if (!isRecurrenceActiveOnDate(rule.recurrence, day)) continue;

      const latest = latestTimestamp(histories[meta.historyKey] ?? []);
      const due = isAssessmentDueForRecurrence(latest, rule.recurrence, day);
      const dayStart = startOfDay(day);
      let status: AssessmentScheduleDayEvent['status'];
      if (!due) {
        status = 'completed';
      } else if (dayStart < todayStart) {
        status = 'due';
      } else if (dayStart === todayStart) {
        status = 'due';
      } else {
        status = 'upcoming';
      }

      events.push({
        id: meta.id,
        modal: meta.modal,
        titleKey: meta.titleKey,
        status,
      });
    }

    if (events.length > 0) result.set(dateKey, events);
  }

  return result;
}

export function formatRecurrenceLabel(
  recurrence: AssessmentRecurrence,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  switch (recurrence.kind) {
    case 'daily':
      return t('settings.assessmentSchedule.recurrence.daily');
    case 'weekly':
      return t('settings.assessmentSchedule.recurrence.weekly', {
        day: t(`settings.assessmentSchedule.weekday.${recurrence.dayOfWeek}`),
      });
    case 'monthly':
      return t('settings.assessmentSchedule.recurrence.monthly', {
        day: recurrence.dayOfMonth,
      });
    case 'weekdays':
      return t('settings.assessmentSchedule.recurrence.weekdays', {
        days: recurrence.daysOfWeek
          .map((day) => t(`settings.assessmentSchedule.weekdayShort.${day}`))
          .join(', '),
      });
    default:
      return '';
  }
}

export type AssessmentSchedulePreset = {
  id: string;
  name: string;
  rules: Partial<Record<AssessmentScheduleId, AssessmentScheduleRule>>;
  createdAt: number;
};

export function sanitizeAssessmentSchedulePresets(raw: unknown): AssessmentSchedulePreset[] {
  if (!Array.isArray(raw)) return [];
  const presets: AssessmentSchedulePreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    const id = typeof value.id === 'string' ? value.id : '';
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    if (!id || !name) continue;
    const rulesRaw = value.rules;
    const rules: Partial<Record<AssessmentScheduleId, AssessmentScheduleRule>> = {};
    if (rulesRaw && typeof rulesRaw === 'object') {
      for (const [key, ruleRaw] of Object.entries(rulesRaw as Record<string, unknown>)) {
        if (!isAssessmentScheduleId(key)) continue;
        const rule = sanitizeScheduleRule({ ...(ruleRaw as object), assessmentId: key });
        if (rule) rules[key] = rule;
      }
    }
    presets.push({
      id,
      name,
      rules,
      createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    });
  }
  return presets;
}

export function getAssessmentCardScheduleFooter(
  cardId: string,
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  },
  histories: AssessmentHistoryMap,
  t: (key: string, params?: Record<string, unknown>) => string,
): { text: string; color: string } | null {
  if (!isAssessmentScheduleId(cardId)) return null;
  if (!isScheduleEnabled(preferences)) return null;

  const meta = SCHEDULABLE_ASSESSMENTS.find((item) => item.id === cardId);
  if (!meta?.released || !meta.historyKey) return null;
  if (!isFeatureEnabled(preferences, meta.featureKey)) return null;

  const rules = resolveEffectiveAssessmentScheduleRules({ preferences });
  const rule = rules[cardId];
  if (!rule?.enabled) return null;

  const now = new Date();
  const latest = latestTimestamp(histories[meta.historyKey] ?? []);

  if (isAssessmentDueForRecurrence(latest, rule.recurrence, now)) {
    return {
      text: t('assessments.scheduleDueToday'),
      color: 'text-rose-600 font-bold',
    };
  }

  const nextDue = getNextDueTimestamp(latest, rule.recurrence, now);
  if (nextDue != null && nextDue <= now.getTime() + 7 * MS_DAY) {
    const date = new Date(nextDue);
    const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return {
      text: t('assessments.scheduleDueOn', { date: dateStr }),
      color: 'text-amber-600 font-bold',
    };
  }

  return {
    text: formatRecurrenceLabel(rule.recurrence, t),
    color: 'text-slate-400',
  };
}
