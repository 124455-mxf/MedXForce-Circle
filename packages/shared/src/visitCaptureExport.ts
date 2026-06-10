import {
  formatVisitCapturePostText,
  visitCaptureClipboardHtml,
  type VisitCaptureSession,
} from './visitCapture';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportFilename(session: VisitCaptureSession, ext: string): string {
  const d = new Date(session.createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `visit-capture-${y}-${m}-${day}.${ext}`;
}

function sessionExportHtmlBody(session: VisitCaptureSession): string {
  return visitCaptureClipboardHtml(formatVisitCapturePostText(session));
}

/** Word-compatible .doc download (HTML payload Word opens with formatting). */
export function downloadVisitCaptureWord(session: VisitCaptureSession): void {
  const body = sessionExportHtmlBody(session);
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Doctor visit capture</title></head>
<body>${body}</body>
</html>`;
  triggerDownload(
    new Blob(['\ufeff', html], { type: 'application/msword' }),
    exportFilename(session, 'doc'),
  );
}

export function downloadVisitCaptureHtml(session: VisitCaptureSession): void {
  const body = sessionExportHtmlBody(session);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doctor visit capture</title></head>
<body>${body}</body>
</html>`;
  triggerDownload(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    exportFilename(session, 'html'),
  );
}
