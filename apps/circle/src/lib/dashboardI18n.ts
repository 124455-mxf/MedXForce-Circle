import {
  displayProfileName,
  isRemoteSettingsCustomized,
  type CirclePatientInsightItem,
  type CirclePatientInsightKey,
  type CirclePatientProfileSnapshot,
  type PatientRemoteSettingsDoc,
} from '@medxforce/shared';
import { formatPatientOnlineDurationMinutes } from '../hooks/usePatientOnlinePresence';
import type { CircleTranslator } from './circleI18nContext';
import type { CircleUiLanguage } from './circleLanguages';

const LOCALE_BY_LANGUAGE: Record<CircleUiLanguage, string> = {
  English: 'en',
  German: 'de',
  Spanish: 'es',
  Polish: 'pl',
};

export function dashboardPlural(
  t: CircleTranslator,
  stem: string,
  count: number,
  extra?: Record<string, string | number>,
): string {
  return t(`dashboard.${stem}_${count === 1 ? 'one' : 'other'}`, { count, ...extra });
}

export function formatPatientLastSeenT(
  t: CircleTranslator,
  language: CircleUiLanguage,
  lastSeen: number,
): string {
  if (!lastSeen) return t('presence.unknown');
  return formatDashboardTimestamp(t, language, lastSeen);
}

export function formatDashboardTimestamp(
  t: CircleTranslator,
  language: CircleUiLanguage,
  ts: number | null | undefined,
): string {
  if (!ts) return t('dashboard.notRecordedYet');

  const d = new Date(ts);
  const locale = LOCALE_BY_LANGUAGE[language];
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const today = new Date();

  if (d.toDateString() === today.toDateString()) {
    return `${t('common.today')}, ${time}`;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `${t('common.yesterday')}, ${time}`;
  }

  return `${d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${time}`;
}

export function formatDashboardLastLine(
  t: CircleTranslator,
  language: CircleUiLanguage,
  ts: number | null | undefined,
): string {
  return t('dashboard.lastLine', { when: formatDashboardTimestamp(t, language, ts) });
}

const PATIENT_SECTION_KEYS: Record<string, string> = {
  dashboard: 'dashboard',
  'quick-answers': 'quickAnswers',
  'quick-settings': 'quickSettings',
  'dashboard/daily-check-in': 'dailyCheckIn',
  'dashboard/visit-capture': 'visitCapture',
  'dashboard/drop-in': 'dropInChat',
  communication: 'communication',
  messages: 'messages',
  companion: 'companion',
  vitality: 'vitality',
  diary: 'diary',
  assessments: 'assessments',
  camera: 'camera',
  statistics: 'analytics',
  settings: 'settings',
  'vitality/body': 'body',
  'vitality/mind': 'mind',
  'vitality/mind/games': 'vitalityGames',
  'vitality/soul': 'soul',
  'vitality/soul/gallery': 'mediaGallery',
  'vitality/soul/gallery/lightbox': 'lightbox',
  'vitality/soul/gallery/my-media': 'myMedia',
  'vitality/soul/gallery/videos': 'videos',
  'vitality/soul/gallery/people': 'peopleFaces',
  'vitality/soul/gallery/stimulus-library': 'stimulusLibrary',
  'vitality/soul/music': 'music',
};

export function formatPatientActiveSectionT(
  t: CircleTranslator,
  section: string | null | undefined,
): string {
  if (!section) return t('dashboard.patientSection.patientApp');

  const mapped = PATIENT_SECTION_KEYS[section];
  if (mapped) return t(`dashboard.patientSection.${mapped}`);

  if (section === 'vitality') return t('dashboard.patientSection.vitality');

  const segments = section.split('/');
  const last = segments[segments.length - 1] ?? section;
  return last
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function insightLabelT(t: CircleTranslator, key: CirclePatientInsightKey): string {
  const path = `dashboard.insights.${key}`;
  const translated = t(path);
  return translated === path ? key : translated;
}

export function profileCompletenessLabelT(
  t: CircleTranslator,
  snapshot: { identity: { firstName?: string } } | null,
  loading: boolean,
  isComplete: boolean,
): string {
  if (loading) return t('common.loading');
  if (!snapshot) return t('dashboard.dataIncomplete');
  return isComplete ? t('dashboard.dataComplete') : t('dashboard.dataIncomplete');
}

export function treatmentPhaseLabelT(t: CircleTranslator, phase: string | undefined | null): string {
  const raw = phase?.trim() ?? '';
  if (!raw) return t('dashboard.notSet');
  const key = raw.toLowerCase().replace(/\s+/g, '-');
  const path = `dashboard.treatmentPhase.${key}`;
  const translated = t(path);
  return translated === path ? raw : translated;
}

export function assistiveDevicesLabelT(
  t: CircleTranslator,
  devices: string[] | undefined | null,
): string {
  const list = (devices ?? []).map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return t('dashboard.deviceNone');
  return list.join(', ');
}

export function formatPatientOnlineDurationLabelT(
  t: CircleTranslator,
  onlineSince: number,
  now = Date.now(),
): string {
  const minutes = formatPatientOnlineDurationMinutes(onlineSince, now);
  if (minutes < 60) {
    return dashboardPlural(t, 'onlineMinutes', minutes);
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}:${String(remainder).padStart(2, '0')}`;
}

export function formatDashboardApplicationModeLineT(
  t: CircleTranslator,
  doc: PatientRemoteSettingsDoc | null | undefined,
  loading = false,
): string {
  if (loading) return t('dashboard.modeLoading');
  if (!doc?.appMode || isRemoteSettingsCustomized(doc)) {
    return t('dashboard.modeCustom');
  }

  const modeKey = doc.appMode;
  const labelPath = `dashboard.appModes.${modeKey}`;
  const label = t(labelPath);
  const modeLabel = label === labelPath ? t('dashboard.appModes.custom') : label;
  return t('dashboard.modePreset', { label: modeLabel });
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

function formatMonthDay(language: CircleUiLanguage, date: Date): string {
  return date.toLocaleDateString(LOCALE_BY_LANGUAGE[language], {
    month: 'long',
    day: 'numeric',
  });
}

export function formatDaysSinceOnsetT(t: CircleTranslator, days: number): string {
  if (days <= 0) return t('dashboard.daysSinceOnset.journeyStartToday');
  if (days === 1) return t('dashboard.daysSinceOnset.oneDay');
  if (days < 30) return t('dashboard.daysSinceOnset.days', { count: days });
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return dashboardPlural(t, 'daysSinceOnsetMonths', months);
  }
  const years = Math.floor(days / 365);
  const remainder = days % 365;
  if (remainder <= 14) {
    return years === 1
      ? t('dashboard.daysSinceOnset.oneYear')
      : t('dashboard.daysSinceOnset.yearsRunning', { years });
  }
  return t('dashboard.daysSinceOnset.days', { count: days });
}

export type LocalizedReminderCopy = {
  headline: string;
  body: string;
};

export type LocalizedBirthdayReminder = LocalizedReminderCopy & {
  daysUntil: number;
};

export function localizeBirthdayReminder(
  t: CircleTranslator,
  language: CircleUiLanguage,
  snapshot: CirclePatientProfileSnapshot | null,
  patientDisplayName: string,
  today = new Date(),
): LocalizedBirthdayReminder | null {
  if (!snapshot) return null;
  const dob = parseProfileDate(snapshot.identity.dob);
  if (!dob) return null;

  const todayStart = startOfDay(today);
  const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  const delta = daysBetween(thisYearBirthday, todayStart);

  if (delta < -2 || delta > 7) return null;

  const name = displayProfileName(snapshot, patientDisplayName);
  const ageOnBirthday = thisYearBirthday.getFullYear() - dob.getFullYear();
  const birthdayLabel = formatMonthDay(language, thisYearBirthday);

  let headline = '';
  let body = '';
  if (delta > 1) {
    headline = t('dashboard.reminders.birthdayInDays', { name, count: delta });
    body =
      ageOnBirthday > 0
        ? t('dashboard.reminders.turningOnDate', { age: ageOnBirthday, date: birthdayLabel })
        : t('dashboard.reminders.birthdayOnDate', { date: birthdayLabel });
  } else if (delta === 1) {
    headline = t('dashboard.reminders.birthdayTomorrow', { name });
    body =
      ageOnBirthday > 0
        ? t('dashboard.reminders.turningAge', { age: ageOnBirthday })
        : t('dashboard.reminders.goodMomentReachOut');
  } else if (delta === 0) {
    headline = t('dashboard.reminders.birthdayToday', { name });
    body =
      ageOnBirthday > 0
        ? t('dashboard.reminders.celebratingToday', { age: ageOnBirthday })
        : t('dashboard.reminders.goodMomentReachOut');
  } else if (delta === -1) {
    headline = t('dashboard.reminders.birthdayYesterday', { name });
    body = t('dashboard.reminders.belatedNote');
  } else {
    headline = t('dashboard.reminders.birthdayDaysAgo', {
      name,
      count: Math.abs(delta),
    });
    body = t('dashboard.reminders.belatedNote');
  }

  return { headline, body, daysUntil: delta };
}

export function localizeOnsetMilestone(
  t: CircleTranslator,
  snapshot: CirclePatientProfileSnapshot | null,
  today = new Date(),
): LocalizedReminderCopy | null {
  if (!snapshot) return null;
  const onset = parseProfileDate(snapshot.clinical.dateOfOnset);
  if (!onset) return null;

  const todayStart = startOfDay(today);
  const daysSince = daysBetween(onset, todayStart);
  if (daysSince < 0) return null;

  for (let years = 1; years <= 10; years += 1) {
    const anniversary = new Date(onset.getFullYear() + years, onset.getMonth(), onset.getDate());
    const delta = daysBetween(anniversary, todayStart);
    if (delta >= -2 && delta <= 7) {
      const headline =
        years === 1
          ? t('dashboard.reminders.oneYearSinceOnset')
          : t('dashboard.reminders.yearsUpAndRunning', { years });
      const body =
        delta > 1
          ? t('dashboard.reminders.yearMarkInDays', { years, days: delta })
          : delta === 1
            ? t('dashboard.reminders.yearMarkTomorrow', { years })
            : delta === 0
              ? t('dashboard.reminders.todayMarksYearsSinceOnset', { years })
              : t('dashboard.reminders.yearMarkDaysAgo', {
                  years,
                  days: Math.abs(delta),
                });
      return { headline, body };
    }
  }

  if (daysSince >= 358 && daysSince <= 372) {
    return {
      headline: t('dashboard.reminders.oneYearSinceOnset'),
      body: formatDaysSinceOnsetT(t, daysSince),
    };
  }

  return null;
}

export function localizePreviewBirthdayReminder(
  t: CircleTranslator,
  patientFirstName: string,
): LocalizedReminderCopy {
  const name = patientFirstName.trim() || 'Sarah';
  return {
    headline: t('dashboard.reminders.previewBirthdayHeadline', { name }),
    body: t('dashboard.reminders.previewBirthdayBody'),
  };
}

export function localizePreviewOnsetMilestoneFiveYear(t: CircleTranslator): LocalizedReminderCopy {
  return {
    headline: t('dashboard.reminders.previewOnsetFiveHeadline'),
    body: t('dashboard.reminders.previewOnsetFiveBody'),
  };
}

export function localizePreviewOnsetMilestoneOneYear(t: CircleTranslator): LocalizedReminderCopy {
  return {
    headline: t('dashboard.reminders.previewOnsetOneHeadline'),
    body: t('dashboard.reminders.previewOnsetOneBody'),
  };
}

export function insightHintT(t: CircleTranslator, key: CirclePatientInsightKey): string | undefined {
  const path = `dashboard.insightHints.${key}`;
  const translated = t(path);
  return translated === path ? undefined : translated;
}

export function localizeInsightItem(
  t: CircleTranslator,
  item: CirclePatientInsightItem,
): CirclePatientInsightItem {
  let value = item.value;

  if (item.overflowCount && item.overflowCount > 0) {
    const suffix =
      item.overflowCount === 1
        ? t('dashboard.insightList.andOneMore')
        : t('dashboard.insightList.andMore', { count: item.overflowCount });
    value = value.replace(/\s+and \d+ more$/, ` ${suffix}`);
  }

  if (item.key === 'dateOfOnset' && item.filled && value.includes(' · ')) {
    const [raw, suffix] = value.split(' · ', 2);
    const onset = parseProfileDate(raw);
    if (onset) {
      const daysSince = daysBetween(onset, startOfDay(new Date()));
      value = `${raw} · ${formatDaysSinceOnsetT(t, daysSince)}`;
    } else if (suffix) {
      value = raw;
    }
  }

  if (item.key === 'treatmentPhase' && item.filled && value) {
    value = treatmentPhaseLabelT(t, value);
  }

  return {
    ...item,
    value,
    hint: item.hint ? insightHintT(t, item.key) : undefined,
  };
}
