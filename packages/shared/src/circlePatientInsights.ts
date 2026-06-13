import type { CirclePatientProfileSnapshot } from './circlePatientProfile';
import { displayProfileName } from './circlePatientProfile';
import { normalizeMemberRole } from './patientPermissions';

export type CirclePatientInsightKey =
  | 'activeHobbies'
  | 'passiveHobbies'
  | 'topicTriggers'
  | 'languagesSpoken'
  | 'personalGoals'
  | 'socialAnchors'
  | 'primaryDiagnosis'
  | 'dateOfOnset'
  | 'occupation'
  | 'treatmentPhase';

export type CirclePatientInsightAudience = 'everyone' | 'careCircle';

const INSIGHT_AUDIENCE: Record<CirclePatientInsightKey, CirclePatientInsightAudience> = {
  activeHobbies: 'everyone',
  passiveHobbies: 'everyone',
  socialAnchors: 'everyone',
  personalGoals: 'everyone',
  languagesSpoken: 'everyone',
  treatmentPhase: 'everyone',
  topicTriggers: 'careCircle',
  primaryDiagnosis: 'careCircle',
  dateOfOnset: 'careCircle',
  occupation: 'careCircle',
};

export const CIRCLE_PATIENT_INSIGHT_LABELS: Record<CirclePatientInsightKey, string> = {
  activeHobbies: 'Active hobbies',
  passiveHobbies: 'Creative / passive hobbies',
  topicTriggers: 'Topic triggers',
  languagesSpoken: 'Additional languages',
  personalGoals: 'Personal goals',
  socialAnchors: 'Social anchors',
  primaryDiagnosis: 'Primary diagnosis',
  dateOfOnset: 'Date of onset',
  occupation: 'Occupational profile',
  treatmentPhase: 'Current treatment phase',
};

const TREATMENT_PHASE_LABELS: Record<string, string> = {
  icu: 'ICU',
  acute: 'Acute',
  vitality: 'Vitality',
  maintenance: 'Maintenance',
  palliative: 'Palliative',
  'pre-op': 'Pre-op',
  'post-op': 'Post-op',
};

function hasText(value: string | undefined | null): boolean {
  return !!value?.trim();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseProfileDate(value: string | undefined | null): Date | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatTreatmentPhaseForInsights(phase: string | undefined | null): string {
  const raw = phase?.trim() ?? '';
  if (!raw) return '';
  return TREATMENT_PHASE_LABELS[raw.toLowerCase()] ?? raw;
}

export function formatInsightList(values: string[] | undefined | null): string {
  const items = (values ?? []).map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items.join(', ') : '';
}

/** Compact list for dashboard cards — shows a few items then "and N more". */
export function formatInsightListPreview(
  values: string[] | undefined | null,
  maxVisible = 2,
): { value: string; totalCount: number; overflowCount: number } {
  const items = (values ?? []).map((item) => item.trim()).filter(Boolean);
  const totalCount = items.length;
  if (totalCount === 0) {
    return { value: '', totalCount: 0, overflowCount: 0 };
  }
  if (totalCount <= maxVisible) {
    return { value: items.join(', '), totalCount, overflowCount: 0 };
  }

  const visible = items.slice(0, maxVisible);
  const overflowCount = totalCount - maxVisible;
  const value =
    overflowCount === 1
      ? `${visible.join(', ')} and 1 more`
      : `${visible.join(', ')} and ${overflowCount} more`;

  return { value, totalCount, overflowCount };
}

export function canViewPatientInsight(
  role: string,
  key: CirclePatientInsightKey,
): boolean {
  const normalized = normalizeMemberRole(role);
  const audience = INSIGHT_AUDIENCE[key];
  if (audience === 'everyone') return true;
  return normalized !== 'friend';
}

export function visiblePatientInsightKeys(role: string): CirclePatientInsightKey[] {
  return (Object.keys(INSIGHT_AUDIENCE) as CirclePatientInsightKey[]).filter((key) =>
    canViewPatientInsight(role, key),
  );
}

export type CirclePatientInsightItem = {
  key: CirclePatientInsightKey;
  label: string;
  value: string;
  filled: boolean;
  hint?: string;
  /** Total items when value is a truncated list preview. */
  totalCount?: number;
  overflowCount?: number;
};

export type CirclePatientBirthdayReminder = {
  visible: true;
  patientName: string;
  daysUntil: number;
  turningAge: number | null;
  headline: string;
  body: string;
};

export type CirclePatientOnsetMilestone = {
  visible: true;
  headline: string;
  body: string;
  daysSinceOnset: number;
};

function formatDaysSinceLabel(days: number): string {
  if (days <= 0) return 'Today marks the start of the journey';
  if (days === 1) return '1 day since onset';
  if (days < 30) return `${days} days since onset`;
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return `${months} month${months === 1 ? '' : 's'} since onset`;
  }
  const years = Math.floor(days / 365);
  const remainder = days % 365;
  if (remainder <= 14) {
    return years === 1 ? '1 year since onset' : `${years} years up and running`;
  }
  return `${days} days since onset`;
}

export function resolveBirthdayReminder(
  snapshot: CirclePatientProfileSnapshot | null,
  patientDisplayName: string,
  today = new Date(),
): CirclePatientBirthdayReminder | null {
  if (!snapshot) return null;
  const dob = parseProfileDate(snapshot.identity.dob);
  if (!dob) return null;

  const todayStart = startOfDay(today);
  const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  const delta = daysBetween(thisYearBirthday, todayStart);

  if (delta < -3 || delta > 7) return null;

  const name = displayProfileName(snapshot, patientDisplayName);
  const ageOnBirthday = thisYearBirthday.getFullYear() - dob.getFullYear();

  let headline = '';
  let body = '';
  if (delta > 1) {
    headline = `${name}'s birthday is in ${delta} days`;
    body =
      ageOnBirthday > 0
        ? `Turning ${ageOnBirthday} on ${thisYearBirthday.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.`
        : `Birthday on ${thisYearBirthday.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.`;
  } else if (delta === 1) {
    headline = `${name}'s birthday is tomorrow`;
    body = ageOnBirthday > 0 ? `Turning ${ageOnBirthday}.` : 'A good moment to reach out.';
  } else if (delta === 0) {
    headline = `Today is ${name}'s birthday`;
    body = ageOnBirthday > 0 ? `Celebrating ${ageOnBirthday} today.` : 'A good moment to reach out.';
  } else if (delta === -1) {
    headline = `${name}'s birthday was yesterday`;
    body = 'There is still time for a belated note or call.';
  } else {
    headline = `${name}'s birthday was ${Math.abs(delta)} days ago`;
    body = 'There is still time for a belated note or call.';
  }

  return {
    visible: true,
    patientName: name,
    daysUntil: delta,
    turningAge: ageOnBirthday > 0 ? ageOnBirthday : null,
    headline,
    body,
  };
}

export function resolveOnsetMilestone(
  snapshot: CirclePatientProfileSnapshot | null,
  today = new Date(),
): CirclePatientOnsetMilestone | null {
  if (!snapshot) return null;
  const onset = parseProfileDate(snapshot.clinical.dateOfOnset);
  if (!onset) return null;

  const todayStart = startOfDay(today);
  const daysSince = daysBetween(onset, todayStart);
  if (daysSince < 0) return null;

  for (let years = 1; years <= 10; years += 1) {
    const anniversary = new Date(onset.getFullYear() + years, onset.getMonth(), onset.getDate());
    const delta = daysBetween(anniversary, todayStart);
    if (delta >= -3 && delta <= 7) {
      const headline =
        years === 1
          ? '1 year since initial onset'
          : `${years} years up and running`;
      const body =
        delta > 1
          ? `The ${years}-year mark is in ${delta} days.`
          : delta === 1
            ? `The ${years}-year mark is tomorrow.`
            : delta === 0
              ? `Today marks ${years} year${years === 1 ? '' : 's'} since onset.`
              : `The ${years}-year mark was ${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} ago.`;
      return { visible: true, headline, body, daysSinceOnset: daysSince };
    }
  }

  if (daysSince >= 358 && daysSince <= 372) {
    return {
      visible: true,
      headline: '1 year since initial onset',
      body: formatDaysSinceLabel(daysSince),
      daysSinceOnset: daysSince,
    };
  }

  return null;
}

function insightValueForKey(
  snapshot: CirclePatientProfileSnapshot,
  key: CirclePatientInsightKey,
): {
  value: string;
  filled: boolean;
  hint?: string;
  totalCount?: number;
  overflowCount?: number;
} {
  switch (key) {
    case 'activeHobbies': {
      const preview = formatInsightListPreview(snapshot.engagement.activeHobbies);
      return {
        value: preview.value,
        filled: preview.totalCount > 0,
        totalCount: preview.totalCount,
        overflowCount: preview.overflowCount,
      };
    }
    case 'passiveHobbies': {
      const preview = formatInsightListPreview(snapshot.engagement.passiveHobbies);
      return {
        value: preview.value,
        filled: preview.totalCount > 0,
        totalCount: preview.totalCount,
        overflowCount: preview.overflowCount,
      };
    }
    case 'topicTriggers': {
      const preview = formatInsightListPreview(snapshot.engagement.topicTriggers);
      return {
        value: preview.value,
        filled: preview.totalCount > 0,
        totalCount: preview.totalCount,
        overflowCount: preview.overflowCount,
        hint: 'Helps avoid upsetting topics in conversation.',
      };
    }
    case 'languagesSpoken': {
      const preview = formatInsightListPreview(snapshot.extended.languagesSpoken);
      return {
        value: preview.value,
        filled: preview.totalCount > 0,
        totalCount: preview.totalCount,
        overflowCount: preview.overflowCount,
      };
    }
    case 'personalGoals': {
      const preview = formatInsightListPreview(snapshot.engagement.personalGoals);
      return {
        value: preview.value,
        filled: preview.totalCount > 0,
        totalCount: preview.totalCount,
        overflowCount: preview.overflowCount,
      };
    }
    case 'socialAnchors': {
      const preview = formatInsightListPreview(snapshot.engagement.socialAnchors);
      return {
        value: preview.value,
        filled: preview.totalCount > 0,
        totalCount: preview.totalCount,
        overflowCount: preview.overflowCount,
      };
    }
    case 'primaryDiagnosis': {
      const value = snapshot.clinical.primaryDiagnosis.trim();
      return { value, filled: hasText(value) };
    }
    case 'dateOfOnset': {
      const raw = snapshot.clinical.dateOfOnset.trim();
      if (!raw) return { value: '', filled: false };
      const onset = parseProfileDate(raw);
      const suffix =
        onset != null ? formatDaysSinceLabel(daysBetween(onset, startOfDay(new Date()))) : '';
      return {
        value: suffix ? `${raw} · ${suffix}` : raw,
        filled: true,
      };
    }
    case 'occupation': {
      const value = snapshot.lifestyle.occupation.trim();
      return {
        value,
        filled: hasText(value),
        hint: 'Add this in the Patient app if it is still missing.',
      };
    }
    case 'treatmentPhase': {
      const value = formatTreatmentPhaseForInsights(snapshot.clinical.treatmentPhase);
      return {
        value,
        filled: hasText(value),
        hint: 'Shows where they are in recovery today.',
      };
    }
    default:
      return { value: '', filled: false };
  }
}

export function buildPatientInsightItems(
  snapshot: CirclePatientProfileSnapshot | null,
  role: string,
): CirclePatientInsightItem[] {
  if (!snapshot) return [];

  return visiblePatientInsightKeys(role).map((key) => {
    const { value, filled, hint, totalCount, overflowCount } = insightValueForKey(snapshot, key);
    return {
      key,
      label: CIRCLE_PATIENT_INSIGHT_LABELS[key],
      value,
      filled,
      hint,
      ...(totalCount != null && totalCount > 0 ? { totalCount } : {}),
      ...(overflowCount != null && overflowCount > 0 ? { overflowCount } : {}),
    };
  });
}

export function countFilledPatientInsights(items: CirclePatientInsightItem[]): {
  filled: number;
  total: number;
} {
  return {
    filled: items.filter((item) => item.filled).length,
    total: items.length,
  };
}

/** Sample reminders for UI preview — append ?previewReminders=1 to the Circle URL. */
export function buildPreviewBirthdayReminder(patientFirstName: string): CirclePatientBirthdayReminder {
  const name = patientFirstName.trim() || 'Sarah';
  return {
    visible: true,
    patientName: name,
    daysUntil: 3,
    turningAge: 42,
    headline: `${name}'s birthday is in 3 days`,
    body: 'Turning 42 on June 12.',
  };
}

export function buildPreviewOnsetMilestoneFiveYear(): CirclePatientOnsetMilestone {
  return {
    visible: true,
    headline: '5 years up and running',
    body: 'Today marks 5 years since onset.',
    daysSinceOnset: 365 * 5,
  };
}

export function buildPreviewOnsetMilestoneOneYear(): CirclePatientOnsetMilestone {
  return {
    visible: true,
    headline: '1 year since initial onset',
    body: 'The 1-year mark is in 3 days.',
    daysSinceOnset: 362,
  };
}

export function isPatientInsightsPreviewRemindersEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('previewReminders') === '1';
}
