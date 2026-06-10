import {
  visitCaptureClipboardHtml,
  visitCaptureClipboardPlain,
} from '@medxforce/shared';

export async function writeVisitCaptureToClipboard(postText: string): Promise<void> {
  const plain = visitCaptureClipboardPlain(postText);
  const html = visitCaptureClipboardHtml(postText);

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plain], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    } catch {
      /* fall through to plain text */
    }
  }

  await navigator.clipboard.writeText(plain);
}
