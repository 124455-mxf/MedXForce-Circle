import type { ParsedVisitCapturePost } from '@medxforce/shared';
import type { DropInTranscriptParsed } from './dropInTranscriptDisplay';

export const CIRCLE_POST_BODY_PREVIEW_CHARS = 200;

export function trimCirclePostBodyPreview(
  text: string,
  max = CIRCLE_POST_BODY_PREVIEW_CHARS,
): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function buildDropInPostPreviewText(parsed: DropInTranscriptParsed): string {
  const parts: string[] = [];
  for (const row of parsed.metadata) {
    const line = [row.label, row.value].filter(Boolean).join(' ').trim();
    if (line) parts.push(line);
  }
  for (const utterance of parsed.utterances) {
    const line = utterance.text.trim();
    if (line) parts.push(line);
  }
  if (parsed.footer?.trim()) parts.push(parsed.footer.trim());
  return parts.join('\n\n');
}

export function buildVisitCapturePostPreviewText(parsed: ParsedVisitCapturePost): string {
  const parts: string[] = [];
  if (parsed.summary?.trim()) parts.push(parsed.summary.trim());
  if (parsed.actionItems.length > 0) parts.push(parsed.actionItems.join('\n'));
  if (parsed.followUpQuestions.length > 0) parts.push(parsed.followUpQuestions.join('\n'));
  return parts.join('\n\n');
}
