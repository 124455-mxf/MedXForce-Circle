import {
  DROP_IN_THREAD_FOOTER_MARKERS,
  DROP_IN_THREAD_TITLE_PREFIXES,
  isDropInThreadPost,
} from '@medxforce/shared';

export type DropInTranscriptUtterance = {
  speaker: string;
  text: string;
};

export type DropInTranscriptParsed = {
  titleLine: string;
  metadata: Array<{ label: string; value: string }>;
  utterances: DropInTranscriptUtterance[];
  footer?: string;
};

function splitLabelValue(line: string): { label: string; value: string } {
  const colonIdx = line.indexOf(':');
  if (colonIdx <= 0) return { label: '', value: line.trim() };
  return {
    label: line.slice(0, colonIdx + 1).trim(),
    value: line.slice(colonIdx + 1).trim(),
  };
}

/** Parse a care-coordination drop-in transcript into metadata + speaker lines. */
export function parseDropInTranscriptText(text: string): DropInTranscriptParsed | null {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  if (!trimmed || !isDropInThreadPost({ text: trimmed })) return null;

  const lines = trimmed.split('\n');
  if (lines.length < 2) return null;

  const titleLine = lines[0]?.trim() ?? '';
  const metadata: Array<{ label: string; value: string }> = [];

  let index = 1;
  while (index < lines.length && lines[index]?.trim() !== '') {
    metadata.push(splitLabelValue(lines[index]!.trim()));
    index += 1;
  }

  if (index < lines.length && lines[index]?.trim() === '') index += 1;

  const utterances: DropInTranscriptUtterance[] = [];
  while (index < lines.length && lines[index]?.trim() !== '') {
    const line = lines[index]!.trim();
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      utterances.push({
        speaker: line.slice(0, colonIdx).trim(),
        text: line.slice(colonIdx + 1).trim(),
      });
    }
    index += 1;
  }

  if (index < lines.length && lines[index]?.trim() === '') index += 1;

  let footer: string | undefined;
  const remaining = lines.slice(index).join('\n').trim();
  if (remaining) {
    const isFooter = DROP_IN_THREAD_FOOTER_MARKERS.some((marker) => remaining.includes(marker));
    footer = isFooter ? remaining : undefined;
    if (!footer && !DROP_IN_THREAD_TITLE_PREFIXES.some((prefix) => titleLine.startsWith(prefix))) {
      return null;
    }
  }

  if (utterances.length === 0 && metadata.length === 0) return null;
  return { titleLine, metadata, utterances, footer };
}
