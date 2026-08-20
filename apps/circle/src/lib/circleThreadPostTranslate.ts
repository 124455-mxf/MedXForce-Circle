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

  const entries: CircleMemberThreadPostTranslation[] = [];
  for (const language of uniqueTargets) {
    const translated = (await translatePatientMessageForViewer(trimmed, language)).trim();
    if (!translated || translated === trimmed) continue;
    entries.push({ language, text: translated, isAuto: true });
  }
  return entries;
}

async function translatePollOptionLabel(
  option: string,
  language: CircleUiLanguage,
): Promise<string> {
  const translated = (await translatePatientMessageForViewer(option, language)).trim();
  const label = (translated || option).slice(0, 80);
  return label || option;
}

/** Translate the poll question, description, and each option; keep option indexes aligned. */
export async function buildCirclePollTranslations(
  question: string,
  options: string[],
  authorLanguage: CircleUiLanguage,
  targetLanguages: CircleUiLanguage[],
  description = '',
): Promise<CircleMemberThreadPostTranslation[]> {
  const trimmedQuestion = question.trim();
  const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);
  const trimmedDescription = description.trim().slice(0, 1000);
  if (!trimmedQuestion || trimmedOptions.length < 2) return [];

  const uniqueTargets = [...new Set(targetLanguages.filter((lang) => lang !== authorLanguage))];
  if (uniqueTargets.length === 0) return [];

  const entries: CircleMemberThreadPostTranslation[] = [];
  for (const language of uniqueTargets) {
    const translatedQuestion = (
      await translatePatientMessageForViewer(trimmedQuestion, language)
    ).trim();
    const translatedOptions = await Promise.all(
      trimmedOptions.map((option) => translatePollOptionLabel(option, language)),
    );
    const translatedDescription = trimmedDescription
      ? (await translatePatientMessageForViewer(trimmedDescription, language)).trim().slice(0, 1000)
      : '';
    const questionText = translatedQuestion || trimmedQuestion;
    const questionChanged = questionText !== trimmedQuestion;
    const optionsChanged = translatedOptions.some((label, index) => label !== trimmedOptions[index]);
    const descriptionText = translatedDescription || trimmedDescription;
    const descriptionChanged = Boolean(trimmedDescription && descriptionText !== trimmedDescription);
    if (!questionChanged && !optionsChanged && !descriptionChanged) continue;
    entries.push({
      language,
      text: questionText,
      isAuto: true,
      pollOptions: translatedOptions,
      ...(descriptionText ? { pollDescription: descriptionText } : {}),
    });
  }
  return entries;
}
