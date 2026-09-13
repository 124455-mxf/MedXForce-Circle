import type { DiaryEntryTranslation } from '@medxforce/shared';
import { normalizeCircleUiLanguage, type CircleUiLanguage } from './circleLanguages';
import {
  detectTypedTextLanguage,
  translatePatientMessageForViewer,
} from './circlePatientMessageTranslate';

/**
 * Detect diary language and build translations for target viewer languages
 * (typically patient primary language + the author's Circle UI language).
 */
export async function buildCircleDiaryTranslations(params: {
  title: string;
  body: string;
  targetLanguages: string[];
  fallbackSourceLanguage?: string;
}): Promise<{ sourceLanguage: string; translations: DiaryEntryTranslation[] }> {
  const title = params.title.trim();
  const body = params.body.trim();
  const detectSample = [title, body].filter(Boolean).join('\n').trim();
  const detected =
    (await detectTypedTextLanguage(detectSample)) ||
    normalizeCircleUiLanguage(params.fallbackSourceLanguage || 'English');
  const sourceLanguage = detected as CircleUiLanguage;

  const targets = [
    ...new Set(
      params.targetLanguages
        .map((lang) => normalizeCircleUiLanguage(lang))
        .filter((lang) => lang !== sourceLanguage),
    ),
  ];

  const translations: DiaryEntryTranslation[] = [];
  for (const language of targets) {
    try {
      const [translatedBody, translatedTitle] = await Promise.all([
        translatePatientMessageForViewer(body, language),
        title
          ? translatePatientMessageForViewer(title, language)
          : Promise.resolve(''),
      ]);
      const text = translatedBody.trim();
      if (!text || text === body) continue;
      const nextTitle = translatedTitle.trim();
      translations.push({
        language,
        text,
        ...(nextTitle && nextTitle !== title ? { title: nextTitle } : {}),
        isAuto: true,
      });
    } catch (err) {
      console.warn('[diary] translation failed for', language, err);
    }
  }

  return { sourceLanguage, translations };
}
