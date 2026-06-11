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
