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

export function identityLanguageLabel(value: RemotePrimaryLanguage): string {
  return (
    REMOTE_PRIMARY_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ??
    'English (EN)'
  );
}
