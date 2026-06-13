import { normalizeCircleUiLanguage, type CircleUiLanguage } from './circleLanguages';

export type StoredMessageTranslation = {
  language: string;
  text: string;
  subject?: string;
  isAuto?: boolean;
};

export type ResolvedStoredMessageText = {
  displayText: string;
  originalText: string;
  hasTranslation: boolean;
};

export function resolveStoredMessageText(
  msg: { text?: string; translations?: StoredMessageTranslation[] },
  viewerLanguage: CircleUiLanguage,
): ResolvedStoredMessageText {
  const originalText = msg.text?.trim() || '';
  const viewerLang = normalizeCircleUiLanguage(viewerLanguage);
  const match = (msg.translations ?? []).find(
    (entry) => normalizeCircleUiLanguage(entry.language) === viewerLang,
  );
  const translated = match?.text?.trim() || '';
  if (
    translated &&
    translated !== originalText &&
    !translated.startsWith('[Translation failed:')
  ) {
    return {
      displayText: translated,
      originalText,
      hasTranslation: true,
    };
  }
  return {
    displayText: originalText,
    originalText,
    hasTranslation: false,
  };
}
