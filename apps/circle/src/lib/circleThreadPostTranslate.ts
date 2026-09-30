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

/** Translate a Circle-help title and optional details for other members' UI languages. */
export async function buildCircleHelpTaskTranslations(
  title: string,
  note: string,
  authorLanguage: CircleUiLanguage,
  targetLanguages: CircleUiLanguage[],
): Promise<Array<{ language: string; title: string; note?: string; isAuto?: boolean }>> {
  const trimmedTitle = title.trim();
  const trimmedNote = note.trim().slice(0, 500);
  if (!trimmedTitle) return [];

  const uniqueTargets = [...new Set(targetLanguages.filter((lang) => lang !== authorLanguage))];
  if (uniqueTargets.length === 0) return [];

  const entries: Array<{ language: string; title: string; note?: string; isAuto?: boolean }> = [];
  for (const language of uniqueTargets) {
    const translatedTitle = (
      await translatePatientMessageForViewer(trimmedTitle, language)
    )
      .trim()
      .slice(0, 200);
    const translatedNote = trimmedNote
      ? (await translatePatientMessageForViewer(trimmedNote, language)).trim().slice(0, 500)
      : '';
    const titleText = translatedTitle || trimmedTitle;
    const noteText = translatedNote || trimmedNote;
    const titleChanged = titleText !== trimmedTitle;
    const noteChanged = Boolean(trimmedNote && noteText !== trimmedNote);
    if (!titleChanged && !noteChanged) continue;
    entries.push({
      language,
      title: titleText,
      isAuto: true,
      ...(noteText ? { note: noteText } : {}),
    });
  }
  return entries;
}
