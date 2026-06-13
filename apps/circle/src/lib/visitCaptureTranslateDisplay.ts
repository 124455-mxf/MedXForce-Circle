import type { ParsedVisitCapturePost } from '@medxforce/shared';
import type { CircleUiLanguage } from './circleLanguages';
import { translatePatientMessageForViewer } from './circlePatientMessageTranslate';

/** Translate headline + AI analysis only — transcript stays on the original parsed object. */
export async function translateVisitCaptureParsedForViewer(
  parsed: ParsedVisitCapturePost,
  viewerLanguage: CircleUiLanguage,
): Promise<{ parsed: ParsedVisitCapturePost; differs: boolean }> {
  const [heading, startedByLine, summary, actionItems, followUpQuestions] = await Promise.all([
    translatePatientMessageForViewer(parsed.heading, viewerLanguage),
    parsed.startedByLine
      ? translatePatientMessageForViewer(parsed.startedByLine, viewerLanguage)
      : Promise.resolve(''),
    parsed.summary?.trim()
      ? translatePatientMessageForViewer(parsed.summary, viewerLanguage)
      : Promise.resolve(''),
    Promise.all(
      parsed.actionItems.map((item) => translatePatientMessageForViewer(item, viewerLanguage)),
    ),
    Promise.all(
      parsed.followUpQuestions.map((question) =>
        translatePatientMessageForViewer(question, viewerLanguage),
      ),
    ),
  ]);

  const next: ParsedVisitCapturePost = {
    ...parsed,
    heading: heading.trim() || parsed.heading,
    startedByLine: startedByLine.trim() || parsed.startedByLine,
    summary: summary.trim() || parsed.summary,
    actionItems: actionItems.map((item, index) => item.trim() || parsed.actionItems[index] || ''),
    followUpQuestions: followUpQuestions.map(
      (question, index) => question.trim() || parsed.followUpQuestions[index] || '',
    ),
    transcript: parsed.transcript,
  };

  let differs = next.heading.trim() !== parsed.heading.trim();
  if (parsed.startedByLine && next.startedByLine.trim() !== parsed.startedByLine.trim()) {
    differs = true;
  }
  if ((parsed.summary?.trim() || '') !== (next.summary?.trim() || '')) differs = true;
  if (
    parsed.actionItems.some((item, index) => item.trim() !== (next.actionItems[index]?.trim() || ''))
  ) {
    differs = true;
  }
  if (
    parsed.followUpQuestions.some(
      (question, index) => question.trim() !== (next.followUpQuestions[index]?.trim() || ''),
    )
  ) {
    differs = true;
  }

  return { parsed: next, differs };
}
