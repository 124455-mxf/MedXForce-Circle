import { formattedMessageToHtml } from './formattedMessage';

export async function writeFormattedTextToClipboard(plain: string): Promise<void> {
  const text = plain.trim();
  if (!text) return;
  const html = formattedMessageToHtml(text);

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    } catch {
      /* fall through */
    }
  }

  await navigator.clipboard.writeText(text);
}
