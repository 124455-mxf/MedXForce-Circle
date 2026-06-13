import type { CircleMemberThreadPostTranslation } from '@medxforce/shared';
import type { CircleUiLanguage } from './circleLanguages';
import { translatePatientMessageForViewer } from './circlePatientMessageTranslate';

/** Build stored translations for other Circle members' UI languages at send time. */
export async function buildCircleThreadPostTranslations(
  text: string,
  authorLanguage: CircleUiLanguage,
  targetLanguages: CircleUiLanguage[],
): Promise<CircleMemberThreadPostTranslation[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const uniqueTargets = [...new Set(targetLanguages.filter((lang) => lang !== authorLanguage))];
  if (uniqueTargets.length === 0) return [];

  const entries = await Promise.all(
    uniqueTargets.map(async (language) => {
      const translated = (await translatePatientMessageForViewer(trimmed, language)).trim();
      if (!translated || translated === trimmed) return null;
      return { language, text: translated, isAuto: true as const };
    }),
  );

  return entries.filter(
    (entry): entry is CircleMemberThreadPostTranslation => entry !== null,
  );
}
