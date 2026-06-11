import type { CirclePatientInsightKey } from '@medxforce/shared';
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
