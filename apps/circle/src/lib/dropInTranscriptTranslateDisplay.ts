import type { DropInTranscriptParsed } from './dropInTranscriptDisplay';
import type { CircleUiLanguage } from './circleLanguages';
import { translatePatientMessageForViewer } from './circlePatientMessageTranslate';

/** Translate drop-in transcript fields for the Circle viewer — speaker names stay as recorded. */
export async function translateDropInTranscriptParsedForViewer(
  parsed: DropInTranscriptParsed,
  viewerLanguage: CircleUiLanguage,
): Promise<{ parsed: DropInTranscriptParsed; differs: boolean }> {
  const [titleLine, metadata, utterances, footer] = await Promise.all([
    translatePatientMessageForViewer(parsed.titleLine, viewerLanguage),
    Promise.all(
      parsed.metadata.map(async (row) => ({
        label: row.label
          ? await translatePatientMessageForViewer(row.label, viewerLanguage)
          : '',
        value: row.value
          ? await translatePatientMessageForViewer(row.value, viewerLanguage)
          : '',
      })),
    ),
    Promise.all(
      parsed.utterances.map(async (line) => ({
        speaker: line.speaker,
        text: await translatePatientMessageForViewer(line.text, viewerLanguage),
      })),
    ),
    parsed.footer
      ? translatePatientMessageForViewer(parsed.footer, viewerLanguage)
      : Promise.resolve(undefined),
  ]);

  const next: DropInTranscriptParsed = {
    titleLine: titleLine.trim() || parsed.titleLine,
    metadata,
    utterances,
    footer: footer?.trim() || parsed.footer,
  };

  let differs = next.titleLine.trim() !== parsed.titleLine.trim();
  if (
    parsed.metadata.some(
      (row, index) =>
        row.label.trim() !== (next.metadata[index]?.label.trim() || '') ||
        row.value.trim() !== (next.metadata[index]?.value.trim() || ''),
    )
  ) {
    differs = true;
  }
  if (
    parsed.utterances.some(
      (line, index) => line.text.trim() !== (next.utterances[index]?.text.trim() || ''),
    )
  ) {
    differs = true;
  }
  if ((parsed.footer?.trim() || '') !== (next.footer?.trim() || '')) differs = true;

  return { parsed: next, differs };
}
