/** @license SPDX-License-Identifier: Apache-2.0 */

export type DailyCheckInQuestionType = 'mood' | 'scale' | 'yesNo' | 'sleep' | 'vitalityPick';

export type DailyCheckInQuestionConditional = 'vitalityFeatures';

export type DailyCheckInQuestion = {
  id: string;
  enabled: boolean;
  type: DailyCheckInQuestionType;
  textKey?: string;
  customText?: string;
  conditional?: DailyCheckInQuestionConditional;
};

export const DAILY_CHECKIN_MAX_QUESTIONS = 5;

export const DEFAULT_DAILY_CHECKIN_QUESTIONS: DailyCheckInQuestion[] = [
  {
    id: 'feel-today',
    enabled: true,
    type: 'mood',
    textKey: 'dailyCheckIn.defaultQuestions.feelToday',
  },
  {
    id: 'pain-today',
    enabled: true,
    type: 'scale',
    textKey: 'dailyCheckIn.defaultQuestions.painToday',
  },
  {
    id: 'sleep',
    enabled: true,
    type: 'sleep',
    textKey: 'dailyCheckIn.defaultQuestions.sleep',
  },
  {
    id: 'vitality-offer',
    enabled: true,
    type: 'yesNo',
    textKey: 'dailyCheckIn.defaultQuestions.vitalityOffer',
    conditional: 'vitalityFeatures',
  },
  {
    id: 'custom-5',
    enabled: false,
    type: 'mood',
    textKey: 'dailyCheckIn.defaultQuestions.custom',
  },
];

const QUESTION_TYPES = new Set<DailyCheckInQuestionType>([
  'mood',
  'scale',
  'yesNo',
  'sleep',
  'vitalityPick',
]);

const DEFAULT_IDS = new Set(DEFAULT_DAILY_CHECKIN_QUESTIONS.map((q) => q.id));

function sanitizeQuestionType(value: unknown): DailyCheckInQuestionType {
  return typeof value === 'string' && QUESTION_TYPES.has(value as DailyCheckInQuestionType)
    ? (value as DailyCheckInQuestionType)
    : 'mood';
}

export function sanitizeDailyCheckInQuestion(raw: unknown): DailyCheckInQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === 'string' ? value.id : '';
  if (!DEFAULT_IDS.has(id)) return null;
  const def = DEFAULT_DAILY_CHECKIN_QUESTIONS.find((item) => item.id === id)!;
  const customText = typeof value.customText === 'string' ? value.customText : undefined;
  const type = sanitizeQuestionType(value.type);
  return {
    ...def,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : def.enabled,
    type: id === 'sleep' && type === 'yesNo' ? 'sleep' : type,
    customText,
    textKey: def.textKey,
    conditional: def.conditional,
  };
}

export function sanitizeDailyCheckInQuestions(raw: unknown): DailyCheckInQuestion[] {
  if (!Array.isArray(raw)) return DEFAULT_DAILY_CHECKIN_QUESTIONS.map((q) => ({ ...q }));
  const byId = new Map<string, DailyCheckInQuestion>();
  for (const item of raw) {
    const question = sanitizeDailyCheckInQuestion(item);
    if (question) byId.set(question.id, question);
  }
  return DEFAULT_DAILY_CHECKIN_QUESTIONS.map((def) => byId.get(def.id) ?? { ...def });
}

export function mergeDailyCheckInQuestions(
  stored: DailyCheckInQuestion[] | undefined,
): DailyCheckInQuestion[] {
  return sanitizeDailyCheckInQuestions(stored);
}

export function resolveDailyCheckInQuestionText(
  question: DailyCheckInQuestion,
  t: (path: string, params?: Record<string, unknown>) => string,
): string {
  const custom = question.customText?.trim();
  if (custom) return custom;
  if (question.textKey) return t(question.textKey);
  return '';
}
