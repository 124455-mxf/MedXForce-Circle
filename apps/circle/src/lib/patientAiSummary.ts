/** @license SPDX-License-Identifier: Apache-2.0 */

export type PatientAiSummarySourceKind =
  | 'profile'
  | 'document'
  | 'assessment'
  | 'reference_link';

export type PatientAiSummarySource = {
  label: string;
  kind: PatientAiSummarySourceKind;
  /** Human-readable date the data is from (document date, assessment date, etc.). */
  asOfLabel?: string;
  /** e.g. "15 years old", "3 days old". */
  ageLabel?: string;
};

export type PatientAiSummaryIdentity = {
  name: string;
  dob?: string;
  ageYears?: number;
  treatmentPhase?: string;
  nickname?: string;
};

export type PatientAiSummaryTrendPoint = {
  date: string;
  /** Single-series assessments */
  value?: number;
  /** Daily check-in answer trends (pain 1–10, mood/sleep 1–3) */
  pain?: number;
  mood?: number;
  sleep?: number;
};

export type PatientAiSummaryTrend = {
  metricId: string;
  title: string;
  /** e.g. "Avg", "Entries", "Completed" */
  primaryLabel: string;
  /** Display value for the primary metric */
  primaryValue: string;
  /** Extra line, e.g. "Skipped 1 · Last 7d: 2" or "Latest: Jul 1" */
  secondaryText?: string;
  /** Daily check-in skip rate percent (0–100) */
  skipRate?: number;
  average: number | null;
  trend: 'up' | 'down' | 'flat' | 'mixed' | null;
  latestAt: number | null;
  ageLabel?: string;
  summaryText: string;
  points: PatientAiSummaryTrendPoint[];
};

export type PatientAiSummary = {
  generatedAt: number;
  headline: string;
  overview: string;
  identity: PatientAiSummaryIdentity;
  sources: PatientAiSummarySource[];
  trends: PatientAiSummaryTrend[];
  clinicalHighlights: string[];
  medications: string[];
  openQuestions: string[];
  documentInsights: string[];
  documentWarnings: string[];
  profileCompleteness?: string;
};

export function patientAiSummaryPlainText(summary: PatientAiSummary): string {
  const lines: string[] = [];
  lines.push(summary.headline);
  lines.push('');
  lines.push(`Name: ${summary.identity.name}`);
  if (summary.identity.nickname) lines.push(`Nickname: ${summary.identity.nickname}`);
  if (summary.identity.dob) {
    const age =
      summary.identity.ageYears != null ? ` (age ${summary.identity.ageYears})` : '';
    lines.push(`DOB: ${summary.identity.dob}${age}`);
  }
  if (summary.identity.treatmentPhase) {
    lines.push(`Treatment phase: ${summary.identity.treatmentPhase}`);
  }
  lines.push('');
  lines.push(summary.overview);
  if (summary.profileCompleteness) {
    lines.push('');
    lines.push(summary.profileCompleteness);
  }
  const warnings = summary.documentWarnings ?? [];
  if (warnings.length) {
    lines.push('');
    lines.push('Document identity warnings:');
    warnings.forEach((item) => lines.push(`- ${item}`));
  }
  const highlights = summary.clinicalHighlights ?? [];
  if (highlights.length) {
    lines.push('');
    lines.push('Clinical highlights:');
    highlights.forEach((item) => lines.push(`- ${item}`));
  }
  const medications = summary.medications ?? [];
  if (medications.length) {
    lines.push('');
    lines.push('Medications:');
    medications.forEach((item) => lines.push(`- ${item}`));
  }
  const insights = summary.documentInsights ?? [];
  if (insights.length) {
    lines.push('');
    lines.push('From matching documents:');
    insights.forEach((item) => lines.push(`- ${item}`));
  }
  const questions = summary.openQuestions ?? [];
  if (questions.length) {
    lines.push('');
    lines.push('Open questions:');
    questions.forEach((item) => lines.push(`- ${item}`));
  }
  if (summary.trends?.length) {
    lines.push('');
    lines.push('Assessment trends:');
    summary.trends.forEach((trend) => {
      const age = trend.ageLabel ? ` · ${trend.ageLabel}` : '';
      const skip =
        trend.skipRate != null ? ` · Skip rate ${trend.skipRate}%` : '';
      const secondary = trend.secondaryText ? ` · ${trend.secondaryText}` : '';
      lines.push(
        `- ${trend.title}: ${trend.primaryLabel} ${trend.primaryValue}${age}${skip}${secondary} — ${trend.summaryText}`,
      );
    });
  }
  const sources = summary.sources ?? [];
  if (sources.length) {
    lines.push('');
    lines.push('Data sources:');
    sources.forEach((source) => {
      const ageBits = [source.asOfLabel, source.ageLabel].filter(Boolean).join(' · ');
      lines.push(ageBits ? `- ${source.label} (${ageBits})` : `- ${source.label}`);
    });
  }
  lines.push('');
  lines.push(`Generated ${new Date(summary.generatedAt).toLocaleString()}`);
  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Word-safe block card — avoid HTML tables (Word collapses them into 1-char columns). */
function cardHtml(title: string, body: string, borderColor = '#e2e8f0', bg = '#ffffff'): string {
  return `<p style="margin:0 0 12px 0;padding:12px 14px;border:1px solid ${borderColor};background:${bg};font-family:Segoe UI,Arial,sans-serif;">
<span style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;">${escapeHtml(title)}</span><br>
${body}
</p>`;
}

function listHtml(items: string[]): string {
  if (!items.length) {
    return '<span style="color:#94a3b8;font-size:13px;">None</span>';
  }
  // Use <br> not display:block — Word ignores block layout on spans.
  return items
    .map((item) => `<br>&bull; ${escapeHtml(item)}`)
    .join('');
}

function sectionHtml(title: string, items: string[]): string {
  return cardHtml(title, listHtml(items));
}

/** Plain numeric series — Word-safe (unicode sparklines break Word layout). */
function seriesValuesText(
  points: PatientAiSummaryTrendPoint[],
  key: 'value' | 'pain' | 'mood' | 'sleep',
): string {
  const values = points
    .map((point) => point[key])
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return '';
  return values.join(' &rarr; ');
}

function trendSeriesHtml(trend: PatientAiSummaryTrend): string {
  const isCheckIn = trend.metricId === 'daily-check-in';
  if (isCheckIn) {
    const rows = (
      [
        ['Pain (1-10)', 'pain'],
        ['Mood (1-3)', 'mood'],
        ['Sleep (1-3)', 'sleep'],
      ] as const
    )
      .map(([label, key]) => {
        const series = seriesValuesText(trend.points, key);
        if (!series) return '';
        return `<br><span style="font-size:12px;color:#334155;"><b>${label}:</b> ${series}</span>`;
      })
      .filter(Boolean)
      .join('');
    return rows;
  }
  const series = seriesValuesText(trend.points, 'value');
  return series
    ? `<br><span style="font-size:12px;color:#334155;"><b>Trend:</b> ${series}</span>`
    : '';
}

/** Rich HTML fragment for pasting into Word, Outlook, Docs, etc. */
export function patientAiSummaryRichHtml(summary: PatientAiSummary): string {
  const identity = summary.identity ?? { name: 'Unknown patient' };
  const name = identity.nickname
    ? `${identity.name} (${identity.nickname})`
    : identity.name;
  const dobAge = identity.dob
    ? `${identity.dob}${identity.ageYears != null ? ` · age ${identity.ageYears}` : ''}`
    : 'Not on profile';
  const phase = identity.treatmentPhase || 'Not on profile';
  const trends = summary.trends ?? [];
  const sources = summary.sources ?? [];
  const warnings = summary.documentWarnings ?? [];
  const highlights = summary.clinicalHighlights ?? [];
  const medications = summary.medications ?? [];
  const insights = summary.documentInsights ?? [];
  const questions = summary.openQuestions ?? [];

  // Stacked paragraphs only — Word mangles multi-column tables into vertical text.
  const identityHtml = `<p style="margin:0 0 12px 0;padding:12px 14px;border:1px solid #ddd6fe;background:#f5f3ff;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.5;color:#0f172a;">
<span style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;">Patient</span><br>
<b>Name:</b> ${escapeHtml(name)}<br>
<b>DOB / age:</b> ${escapeHtml(dobAge)}<br>
<b>Treatment phase:</b> ${escapeHtml(phase)}
</p>`;

  const warningsHtml = warnings.length
    ? cardHtml('Document identity warnings', listHtml(warnings), '#fcd34d', '#fffbeb')
    : '';

  const trendsHtml = trends.length
    ? `<p style="margin:0 0 6px 0;font-family:Segoe UI,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#7c3aed;">Assessment trends</p>
${trends
  .map((trend) => {
    const age = trend.ageLabel || 'Date unknown';
    const skip =
      trend.skipRate != null
        ? `<br><span style="font-size:12px;color:#b45309;">Skip rate ${trend.skipRate}%</span>`
        : '';
    const secondary = trend.secondaryText
      ? `<br><span style="font-size:12px;color:#64748b;">${escapeHtml(trend.secondaryText)}</span>`
      : '';
    const series = trendSeriesHtml(trend);
    return `<p style="margin:0 0 12px 0;padding:12px 14px;border:1px solid #e2e8f0;background:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.45;color:#0f172a;">
<b>${escapeHtml(trend.title)}</b><br>
<span style="font-size:11px;color:#64748b;">${escapeHtml(age)}</span><br>
<span style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">${escapeHtml(trend.primaryLabel || 'Value')}</span>
<span style="font-size:18px;font-weight:700;color:#7c3aed;"> ${escapeHtml(trend.primaryValue || '—')}</span>${skip}${secondary}
${series}
<br><span style="font-size:12px;color:#475569;">${escapeHtml(trend.summaryText)}</span>
</p>`;
  })
  .join('')}`
    : '';

  const sourcesHtml = sources.length
    ? cardHtml(
        'Data sources & age',
        sources
          .map((source) => {
            const ageBits =
              [source.asOfLabel, source.ageLabel].filter(Boolean).join(' · ') || 'Date unknown';
            return `<br><b>${escapeHtml(source.label)}</b><br><span style="font-size:11px;color:#64748b;">${escapeHtml(ageBits)}</span>`;
          })
          .join(''),
      )
    : '';

  return `<div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;font-size:14px;">
<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;">AI patient summary</p>
${identityHtml}
<p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(summary.headline)}</p>
<p style="margin:0 0 12px 0;font-size:14px;color:#475569;line-height:1.55;">${escapeHtml(summary.overview)}</p>
${
  summary.profileCompleteness
    ? `<p style="margin:0 0 12px 0;padding:8px 10px;font-size:12px;font-weight:600;color:#6d28d9;background:#f5f3ff;border:1px solid #ddd6fe;">${escapeHtml(summary.profileCompleteness)}</p>`
    : ''
}
${warningsHtml}
${sectionHtml('Clinical highlights', highlights)}
${sectionHtml('Medications', medications)}
${trendsHtml}
${sectionHtml('From matching documents', insights)}
${sectionHtml('Open questions', questions)}
${sourcesHtml}
<p style="margin:8px 0 0 0;font-size:11px;color:#94a3b8;">Generated ${escapeHtml(new Date(summary.generatedAt).toLocaleString())}</p>
</div>`;
}

/** Select contenteditable HTML and copy — most reliable for rich paste from modals. */
function copyRichViaSelection(html: string, plain: string): boolean {
  const host = document.createElement('div');
  host.setAttribute('contenteditable', 'true');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    overflow: 'hidden',
  });
  host.innerHTML = html;
  document.body.appendChild(host);

  const listener = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.clipboardData.setData('text/html', html);
    event.clipboardData.setData('text/plain', plain);
    event.preventDefault();
  };
  document.addEventListener('copy', listener);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(host);
  selection?.removeAllRanges();
  selection?.addRange(range);
  host.focus();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.removeEventListener('copy', listener);
    selection?.removeAllRanges();
    host.remove();
  }
  return ok;
}

function copyPlainViaTextarea(plain: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = plain;
  ta.setAttribute('readonly', '');
  Object.assign(ta.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    opacity: '0',
  });
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, plain.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    ta.remove();
  }
  return ok;
}

/** Copies rich HTML (for Word/email) plus plain-text fallback. */
export async function copyPatientAiSummaryToClipboard(summary: PatientAiSummary): Promise<void> {
  const plain = patientAiSummaryPlainText(summary);
  const html = patientAiSummaryRichHtml(summary);

  // Selection-based copy works from modals where Clipboard API is flaky.
  if (copyRichViaSelection(html, plain)) return;

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {
      /* fall through */
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(plain);
      return;
    }
  } catch {
    /* fall through */
  }

  if (copyPlainViaTextarea(plain)) return;

  throw new Error('Copy failed');
}

function summaryHtmlDocument(summary: PatientAiSummary): string {
  const body = patientAiSummaryRichHtml(summary);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(summary.headline || 'Patient summary')}</title>
  <style>
    body { margin: 32px; background: #fff; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function summaryFilename(summary: PatientAiSummary, ext: string): string {
  const stamp = new Date(summary.generatedAt).toISOString().slice(0, 10);
  const name = (summary.identity?.name || 'patient')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `patient-summary-${name || 'patient'}-${stamp}.${ext}`;
}

function downloadHtmlFile(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a print-ready view so the user can Save as PDF. */
export function downloadPatientAiSummaryPdf(summary: PatientAiSummary): void {
  const html = summaryHtmlDocument(summary);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Blob URL avoids empty about:blank windows (noopener blocks document.write).
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    const triggerPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        /* popup may block print; file download still available below */
      }
    };
    // Some browsers fire load before script can attach; also try delayed print.
    printWindow.addEventListener('load', triggerPrint, { once: true });
    window.setTimeout(triggerPrint, 400);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  // Popup blocked — download HTML the user can open and print to PDF.
  downloadHtmlFile(html, summaryFilename(summary, 'html'));
  URL.revokeObjectURL(url);
}
