import { CIRCLE_UI_LANGUAGE_STORAGE_KEY } from './circleLanguages';

/** Clears shared session cache so the next sign-in does not inherit UI state from another account. */
export function clearCircleActiveSessionStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CIRCLE_UI_LANGUAGE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function circleUiLanguageKeyForUid(uid: string): string {
  return `medx_circle_ui_language:${uid}`;
}
