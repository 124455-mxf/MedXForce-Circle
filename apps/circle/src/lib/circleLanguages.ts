import {
  REMOTE_PRIMARY_LANGUAGE_OPTIONS,
  type RemotePrimaryLanguage,
} from '@medxforce/shared';

/** UI languages aligned with the patient app primary languages. */
export const CIRCLE_UI_LANGUAGES = [
  { value: 'English', label: 'English (EN)' },
  { value: 'German', label: 'German (DE)' },
  { value: 'Spanish', label: 'Spanish (ES)' },
  { value: 'Polish', label: 'Polish (PL)' },
] as const;

export type CircleUiLanguage = (typeof CIRCLE_UI_LANGUAGES)[number]['value'];

export function normalizeCircleUiLanguage(raw: string | undefined | null): CircleUiLanguage {
  if (raw === 'German' || raw === 'Spanish' || raw === 'Polish') return raw;
  return 'English';
}

export const CIRCLE_UI_LANGUAGE_STORAGE_KEY = 'medx_circle_ui_language';

export function resolveIdentityPrimaryLanguage(
  raw: string | undefined | null,
): RemotePrimaryLanguage {
  const short = String(raw || '').split(' ')[0];
  if (short === 'German' || short === 'Spanish' || short === 'Polish') return short;
  return 'English';
}

/** Stored profile language label — keep English so remote settings stay language-stable. */
export function identityLanguageLabel(value: RemotePrimaryLanguage): string {
  return (
    REMOTE_PRIMARY_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ??
    'English (EN)'
  );
}

const UI_LANGUAGE_LABEL_KEYS: Record<string, string> = {
  English: 'common.languageEnglish',
  German: 'common.languageGerman',
  Spanish: 'common.languageSpanish',
  Polish: 'common.languagePolish',
};

/** Localized label for a stored language value (`English`, `German`, or `English (EN)`). */
export function circleUiLanguageLabel(
  t: (path: string) => string,
  value: string | undefined | null,
): string {
  const short = String(value || '').split(' ')[0];
  const key = UI_LANGUAGE_LABEL_KEYS[short];
  return key ? t(key) : String(value || '').trim() || t('common.languageEnglish');
}

/** BCP 47 locale for `toLocaleDateString` / `toLocaleString` from the Circle UI language. */
export function circleUiLanguageToLocale(language: CircleUiLanguage): string {
  switch (language) {
    case 'German':
      return 'de';
    case 'Spanish':
      return 'es';
    case 'Polish':
      return 'pl';
    default:
      return 'en';
  }
}

export function formatCircleDate(
  date: Date,
  language: CircleUiLanguage,
  options: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(circleUiLanguageToLocale(language), options);
}
