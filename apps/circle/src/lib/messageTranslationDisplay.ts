import { normalizeCircleUiLanguage, type CircleUiLanguage } from './circleLanguages';

export type StoredMessageTranslation = {
  language: string;
  text: string;
  subject?: string;
  isAuto?: boolean;
  pollOptions?: string[];
  pollDescription?: string;
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

export type ResolvedStoredPollOptions = {
  displayOptions: string[];
  originalOptions: string[];
  hasTranslation: boolean;
};

export function resolveStoredPollOptions(
  msg: { pollOptions?: string[]; translations?: StoredMessageTranslation[] },
  viewerLanguage: CircleUiLanguage,
): ResolvedStoredPollOptions {
  const originalOptions = msg.pollOptions ?? [];
  const viewerLang = normalizeCircleUiLanguage(viewerLanguage);
  const match = (msg.translations ?? []).find(
    (entry) => normalizeCircleUiLanguage(entry.language) === viewerLang,
  );
  const translated = match?.pollOptions;
  if (!translated || translated.length === 0) {
    return { displayOptions: originalOptions, originalOptions, hasTranslation: false };
  }
  const displayOptions = originalOptions.map((orig, index) => {
    const next = translated[index]?.trim() || '';
    if (next && next !== orig && !next.startsWith('[Translation failed:')) return next;
    return orig;
  });
  const hasTranslation = displayOptions.some((label, index) => label !== originalOptions[index]);
  return { displayOptions, originalOptions, hasTranslation };
}

export function resolveStoredPollDescription(
  msg: { pollDescription?: string; translations?: StoredMessageTranslation[] },
  viewerLanguage: CircleUiLanguage,
): ResolvedStoredMessageText {
  return resolveStoredMessageText(
    {
      text: msg.pollDescription,
      translations: (msg.translations ?? [])
        .filter((entry) => typeof entry.pollDescription === 'string' && entry.pollDescription.trim())
        .map((entry) => ({
          language: entry.language,
          text: entry.pollDescription!.trim(),
          isAuto: entry.isAuto,
        })),
    },
    viewerLanguage,
  );
}
