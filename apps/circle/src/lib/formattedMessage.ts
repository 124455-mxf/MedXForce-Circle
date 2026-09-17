export type FormattedMessageBlock =
  | { type: 'blank' }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; n: string; text: string }
  | { type: 'paragraph'; text: string };

export type FormattedInlineSegment = { bold: boolean; text: string };

export function messageLooksFormatted(text: string): boolean {
  return /\*\*|^\s*(\d+[.)]\s+|[-*•]\s+)/m.test(text);
}

export function parseFormattedInline(line: string): FormattedInlineSegment[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return { bold: true, text: part.slice(2, -2) };
    }
    return { bold: false, text: part.replace(/\*/g, '') };
  });
}

export function parseFormattedMessage(text: string): FormattedMessageBlock[] {
  return text.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'blank' as const };
    const bullet = trimmed.match(/^[*\-•]\s+(.+)$/);
    if (bullet) return { type: 'bullet' as const, text: bullet[1] };
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) return { type: 'numbered' as const, n: numbered[1], text: numbered[2] };
    return { type: 'paragraph' as const, text: trimmed };
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineHtml(line: string): string {
  return parseFormattedInline(line)
    .map((part) => {
      const safe = escapeHtml(part.text);
      return part.bold ? `<strong>${safe}</strong>` : safe;
    })
    .join('');
}

/** HTML for rich paste (Word/email). Circle discussion still uses the markdown plain text. */
export function formattedMessageToHtml(text: string): string {
  const blocks = parseFormattedMessage(text);
  const html = blocks
    .map((block) => {
      if (block.type === 'blank') return '';
      if (block.type === 'bullet') {
        return `<p style="margin:0 0 8px 0;">• ${inlineHtml(block.text)}</p>`;
      }
      if (block.type === 'numbered') {
        return `<p style="margin:0 0 8px 0;"><strong>${escapeHtml(block.n)}.</strong> ${inlineHtml(block.text)}</p>`;
      }
      return `<p style="margin:0 0 8px 0;">${inlineHtml(block.text)}</p>`;
    })
    .filter(Boolean)
    .join('');
  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#1e293b;">${html}</div>`;
}
