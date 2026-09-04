import {
  visitBriefPlainText,
  visitDebriefPlainText,
  type CareCalendarVisitBrief,
  type CareCalendarVisitDebrief,
} from '@medxforce/shared';

export async function copyVisitBriefToClipboard(
  brief: CareCalendarVisitBrief,
  appointmentTitle?: string,
): Promise<void> {
  await navigator.clipboard.writeText(visitBriefPlainText(brief, appointmentTitle));
}

export async function copyVisitDebriefToClipboard(debrief: CareCalendarVisitDebrief): Promise<void> {
  await navigator.clipboard.writeText(visitDebriefPlainText(debrief));
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function briefFilename(prefix: string, generatedAt: number, ext: string): string {
  const d = new Date(generatedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${prefix}-${y}-${m}-${day}.${ext}`;
}

function briefHtmlBody(brief: CareCalendarVisitBrief, appointmentTitle?: string): string {
  const text = visitBriefPlainText(brief, appointmentTitle);
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `<h1>Visit brief</h1><div>${escaped}</div>`;
}

export function downloadVisitBriefWord(
  brief: CareCalendarVisitBrief,
  appointmentTitle?: string,
): void {
  const body = briefHtmlBody(brief, appointmentTitle);
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Visit brief</title></head>
<body>${body}</body>
</html>`;
  triggerDownload(
    new Blob(['\ufeff', html], { type: 'application/msword' }),
    briefFilename('visit-brief', brief.generatedAt, 'doc'),
  );
}

export function downloadVisitBriefHtml(
  brief: CareCalendarVisitBrief,
  appointmentTitle?: string,
): void {
  const body = briefHtmlBody(brief, appointmentTitle);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Visit brief</title></head>
<body>${body}</body>
</html>`;
  triggerDownload(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    briefFilename('visit-brief', brief.generatedAt, 'html'),
  );
}
