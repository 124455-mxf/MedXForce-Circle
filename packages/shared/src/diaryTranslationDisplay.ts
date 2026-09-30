/** Stored auto-translations for diary title/body (mirrors message translations). */
export type DiaryEntryTranslation = {
  language: string;
  /** Translated body text. */
  text: string;
  /** Translated title when the original had a title. */
  title?: string;
  isAuto?: boolean;
};

export type ResolvedDiaryEntryText = {
  displayTitle: string;
  displayBody: string;
  originalTitle: string;
  originalBody: string;
  hasTranslation: boolean;
};

function normalizeLang(language: string | undefined): string {
  const value = (language || '').trim();
  if (!value) return 'English';
  const lower = value.toLowerCase();
  if (lower === 'english' || lower === 'en') return 'English';
  if (lower === 'german' || lower === 'deutsch' || lower === 'de') return 'German';
  if (lower === 'spanish' || lower === 'español' || lower === 'espanol' || lower === 'es') {
    return 'Spanish';
  }
  if (lower === 'polish' || lower === 'polski' || lower === 'pl') return 'Polish';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Prefer a stored translation for the viewer language; otherwise keep the original.
 * Originals stay in `title` / `body` on the diary document.
 */
export function resolveDiaryEntryText(
  entry: {
    title?: string | null;
    body?: string | null;
    translations?: DiaryEntryTranslation[] | null;
  },
  viewerLanguage: string,
): ResolvedDiaryEntryText {
  const originalTitle = (entry.title || '').trim();
  const originalBody = (entry.body || '').trim();
  const viewerLang = normalizeLang(viewerLanguage);
  const match = (entry.translations ?? []).find(
    (item) => normalizeLang(item.language) === viewerLang,
  );
  const translatedBody = match?.text?.trim() || '';
  const translatedTitle = (match?.title ?? '').trim();
  const bodyOk =
    !!translatedBody &&
    translatedBody !== originalBody &&
    !translatedBody.startsWith('[Translation failed:');
  const titleOk =
    !!translatedTitle &&
    translatedTitle !== originalTitle &&
    !translatedTitle.startsWith('[Translation failed:');

  if (bodyOk || titleOk) {
    return {
      displayTitle: titleOk ? translatedTitle : originalTitle,
      displayBody: bodyOk ? translatedBody : originalBody,
      originalTitle,
      originalBody,
      hasTranslation: true,
    };
  }

  return {
    displayTitle: originalTitle,
    displayBody: originalBody,
    originalTitle,
    originalBody,
    hasTranslation: false,
  };
}
