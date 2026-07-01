/** Clinical visit capture — keep in sync with medxforce/src/lib/visitCapture.ts */

import type { CircleMemberRole } from './patientPermissions';

export const CARE_VISIT_CAPTURE_TYPE = 'care_visit_capture' as const;

export const VISIT_CAPTURE_AUDIO_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export type VisitCaptureRole = CircleMemberRole | 'patient';

export type VisitCaptureApp = 'patient' | 'circle';

export type VisitCaptureStatus =
  | 'consented'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'analyzing'
  | 'preview'
  | 'published'
  | 'discarded'
  | 'failed';

export type VisitCaptureActionOwner = 'care_team' | 'patient' | 'doctor' | 'unknown';

export interface VisitCaptureActionItem {
  text: string;
  owner?: VisitCaptureActionOwner;
  due?: string | null;
}

export interface VisitCaptureAnalysis {
  summary: string;
  actionItems: VisitCaptureActionItem[];
  followUpQuestions: string[];
  participantsMentioned?: string[];
  clinicalTopics?: string[];
}

export interface VisitCaptureCapturedBy {
  uid: string;
  name: string;
  role: VisitCaptureRole;
  app: VisitCaptureApp;
}

export interface VisitCaptureConsent {
  at: number;
  roomInformed: true;
}

export const VISIT_CAPTURE_LANGUAGES = ['English', 'German', 'Spanish', 'Polish'] as const;
export type VisitCaptureLanguage = (typeof VISIT_CAPTURE_LANGUAGES)[number];

export function normalizeVisitCaptureLanguage(
  raw: string | undefined | null,
): VisitCaptureLanguage {
  if (raw === 'German' || raw === 'Spanish' || raw === 'Polish') return raw;
  return 'English';
}

/** Translatable visit capture content (headline + AI analysis — not the transcript). */
export type VisitCaptureLocalizedBundle = {
  headingLine1: string;
  headingLine2: string;
  analysis: VisitCaptureAnalysis;
};

export interface VisitCaptureSession {
  id: string;
  patientId: string;
  capturedBy: VisitCaptureCapturedBy;
  consent: VisitCaptureConsent;
  status: VisitCaptureStatus;
  segmentCount: number;
  transcript?: string;
  analysis?: VisitCaptureAnalysis;
  /** Recorder UI language used for the preview translation. */
  previewLanguage?: VisitCaptureLanguage;
  /** Headline + analysis translated for preview (transcript stays separate). */
  localizedPreview?: VisitCaptureLocalizedBundle;
  audioExpiresAt: number;
  publishedPostId?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

const CAPTURE_ROLES = new Set<VisitCaptureRole>([
  'patient',
  'proxy',
  'caregiver',
  'professional_caregiver',
  'family',
]);

const CARE_COORDINATION_ROLES = new Set<CircleMemberRole>([
  'proxy',
  'caregiver',
  'professional_caregiver',
]);

export function canStartVisitCapture(role: VisitCaptureRole | string): boolean {
  return CAPTURE_ROLES.has(role as VisitCaptureRole);
}

/** Family visit captures publish to the open Circle thread; care team stays restricted. */
export function visitCapturePublishThreadKind(
  role: VisitCaptureRole | string,
): 'open' | 'restricted' {
  return role === 'family' ? 'open' : 'restricted';
}

export function canRecordVisitCaptureInCircleFolder(
  role: string,
  threadKind: 'open' | 'restricted',
): boolean {
  if (!canStartVisitCapture(role)) return false;
  if (canViewCareCoordinationCaptures(role)) return true;
  if (threadKind === 'open') return role === 'family';
  return false;
}

export function canViewCareCoordinationCaptures(role: CircleMemberRole | string): boolean {
  return CARE_COORDINATION_ROLES.has(role as CircleMemberRole);
}

export function visitCaptureRoleLabel(role: VisitCaptureRole): string {
  if (role === 'patient') return 'Patient';
  switch (role) {
    case 'proxy':
      return 'Proxy';
    case 'caregiver':
      return 'Caregiver';
    case 'professional_caregiver':
      return 'Professional caregiver';
    case 'family':
      return 'Family';
    case 'friend':
      return 'Friend';
    case 'facility_staff':
      return 'Facility staff';
    default:
      return 'Member';
  }
}

export function newVisitCaptureSessionId(): string {
  return `vc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function buildCanonicalVisitCaptureBundle(
  session: Pick<VisitCaptureSession, 'capturedBy' | 'analysis' | 'createdAt'>,
): VisitCaptureLocalizedBundle {
  const dateLabel = new Date(session.createdAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const starter = visitCaptureRoleLabel(session.capturedBy.role);
  return {
    headingLine1: `Visit capture — ${dateLabel}`,
    headingLine2: `Started by ${session.capturedBy.name} (${starter})`,
    analysis: session.analysis ?? { summary: '', actionItems: [], followUpQuestions: [] },
  };
}

export function formatVisitCapturePostTextFromBundle(
  bundle: VisitCaptureLocalizedBundle,
  transcript?: string,
): string {
  const lines: string[] = [bundle.headingLine1, bundle.headingLine2, ''];
  const analysis = bundle.analysis;

  if (analysis.summary?.trim()) {
    lines.push('SUMMARY', analysis.summary.trim(), '');
  }

  if (analysis.actionItems?.length) {
    lines.push('ACTION ITEMS');
    for (const item of analysis.actionItems) {
      lines.push(`• ${item.text}`);
    }
    lines.push('');
  }

  if (analysis.followUpQuestions?.length) {
    lines.push('FOLLOW-UP QUESTIONS');
    for (const q of analysis.followUpQuestions) {
      lines.push(`• ${q}`);
    }
    lines.push('');
  }

  const trimmedTranscript = transcript?.trim();
  if (trimmedTranscript) {
    lines.push('---', 'FULL TRANSCRIPT', trimmedTranscript);
  }

  const body = lines.join('\n').trim();
  return body.length > 5000 ? `${body.slice(0, 4980)}…` : body;
}

export function formatVisitCapturePostText(
  session: Pick<VisitCaptureSession, 'capturedBy' | 'analysis' | 'transcript' | 'createdAt'>,
): string {
  return formatVisitCapturePostTextFromBundle(
    buildCanonicalVisitCaptureBundle(session),
    session.transcript,
  );
}

export function formatVisitCapturePostTextForSession(session: VisitCaptureSession): string {
  if (session.localizedPreview) {
    return formatVisitCapturePostTextFromBundle(session.localizedPreview, session.transcript);
  }
  return formatVisitCapturePostText(session);
}

export function visitCapturePreviewAnalysis(
  session: VisitCaptureSession,
): VisitCaptureAnalysis | undefined {
  if (!session.analysis) return undefined;
  return session.localizedPreview?.analysis ?? session.analysis;
}

export function isVisitCaptureThreadPost(post: {
  text: string;
  postKind?: string;
}): boolean {
  if (post.postKind === 'visit_capture') return true;
  const firstLine = post.text.replace(/\r\n/g, '\n').split('\n')[0]?.trim() ?? '';
  if (!firstLine) return false;
  if (firstLine.startsWith('Visit capture —')) return true;
  return firstLine.includes(' — ') && post.text.includes('\nFULL TRANSCRIPT\n');
}

export function extractVisitCaptureTranscriptFromPostText(text: string): string | null {
  const parsed = parseVisitCapturePostText(text);
  return parsed?.transcript ?? null;
}

export type ParsedVisitCapturePost = {
  heading: string;
  dateLabel: string;
  /** Full second line (e.g. "Started by …") — use for display. */
  startedByLine: string;
  recordedBy: string;
  summary?: string;
  actionItems: string[];
  followUpQuestions: string[];
  transcript?: string;
};

function parseVisitCaptureBulletLines(block: string): string[] {
  return block
    .split('\n')
    .map((line) => line.replace(/^\s*[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

export function parseVisitCapturePostText(text: string): ParsedVisitCapturePost | null {
  if (!isVisitCaptureThreadPost({ text })) return null;

  const normalized = text.replace(/\r\n/g, '\n').trim();
  let transcript: string | undefined;
  let main = normalized;

  const transcriptMarker = '\n---\nFULL TRANSCRIPT\n';
  const transcriptIdx = normalized.indexOf(transcriptMarker);
  if (transcriptIdx >= 0) {
    transcript = normalized.slice(transcriptIdx + transcriptMarker.length).trim() || undefined;
    main = normalized.slice(0, transcriptIdx).trim();
  } else {
    const altMarker = '\nFULL TRANSCRIPT\n';
    const altIdx = normalized.indexOf(altMarker);
    if (altIdx >= 0) {
      transcript = normalized.slice(altIdx + altMarker.length).trim() || undefined;
      main = normalized.slice(0, altIdx).trim();
    }
  }

  const lines = main.split('\n');
  const heading = lines[0]?.trim() || 'Visit capture';
  const dateLabel = heading.replace(/^Visit capture —\s*/i, '').trim() || heading;
  const startedLine = lines[1]?.trim() || '';
  const startedByLine = startedLine;
  const recordedBy = startedLine.replace(/^Started by\s+/i, '').trim();

  const sections: Record<string, string> = {};
  let sectionKey = '';
  let sectionLines: string[] = [];

  for (let i = 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === 'SUMMARY' || line === 'ACTION ITEMS' || line === 'FOLLOW-UP QUESTIONS') {
      if (sectionKey) sections[sectionKey] = sectionLines.join('\n').trim();
      sectionKey = line;
      sectionLines = [];
    } else {
      sectionLines.push(line);
    }
  }
  if (sectionKey) sections[sectionKey] = sectionLines.join('\n').trim();

  return {
    heading,
    dateLabel,
    startedByLine,
    recordedBy,
    summary: sections.SUMMARY || undefined,
    actionItems: parseVisitCaptureBulletLines(sections['ACTION ITEMS'] || ''),
    followUpQuestions: parseVisitCaptureBulletLines(sections['FOLLOW-UP QUESTIONS'] || ''),
    transcript,
  };
}

const CLIPBOARD_RULE = '──────────────────────────────────────────────────';

function visitCapturePlainSection(title: string, body: string): string {
  return `${title}\n${CLIPBOARD_RULE}\n\n${body.trim()}\n`;
}

/** Word-friendly plain text for clipboard fallback. */
export function visitCaptureClipboardPlain(text: string): string {
  const parsed = parseVisitCapturePostText(text);
  if (!parsed) return text.replace(/\r\n/g, '\n').trim();

  const blocks: string[] = [
    'DOCTOR VISIT CAPTURE',
    '══════════════════════════════════════════════════',
    '',
    `Date: ${parsed.dateLabel}`,
    parsed.recordedBy ? `Recorded by: ${parsed.recordedBy}` : '',
    '',
  ];

  if (parsed.summary) {
    blocks.push(visitCapturePlainSection('Summary', parsed.summary), '');
  }

  if (parsed.actionItems.length) {
    blocks.push(
      visitCapturePlainSection(
        'Action items',
        parsed.actionItems.map((item) => `  • ${item}`).join('\n'),
      ),
      '',
    );
  }

  if (parsed.followUpQuestions.length) {
    blocks.push(
      visitCapturePlainSection(
        'Follow-up questions',
        parsed.followUpQuestions.map((q) => `  • ${q}`).join('\n'),
      ),
      '',
    );
  }

  if (parsed.transcript) {
    blocks.push(visitCapturePlainSection('Full transcript', parsed.transcript), '');
  }

  blocks.push('—', 'Shared via MedXForce Care coordination');

  return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeVisitCaptureHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Rich HTML so Word and email clients preserve headings and lists on paste. */
export function visitCaptureClipboardHtml(text: string): string {
  const parsed = parseVisitCapturePostText(text);
  if (!parsed) {
    return `<div>${escapeVisitCaptureHtml(text.replace(/\r\n/g, '\n').trim())}</div>`;
  }

  const parts: string[] = [
    '<div style="font-family:Calibri,Arial,sans-serif;color:#0f172a;font-size:11pt;line-height:1.5;">',
    '<h1 style="font-size:18pt;color:#1e3a8a;margin:0 0 8pt 0;">Doctor visit capture</h1>',
    `<p style="margin:0 0 4pt 0;"><strong>Date:</strong> ${escapeVisitCaptureHtml(parsed.dateLabel)}</p>`,
  ];

  if (parsed.recordedBy) {
    parts.push(
      `<p style="margin:0 0 16pt 0;"><strong>Recorded by:</strong> ${escapeVisitCaptureHtml(parsed.recordedBy)}</p>`,
    );
  }

  if (parsed.summary) {
    parts.push(
      '<h2 style="font-size:13pt;color:#334155;margin:18pt 0 6pt 0;">Summary</h2>',
      `<p style="margin:0 0 12pt 0;">${escapeVisitCaptureHtml(parsed.summary).replace(/\n/g, '<br>')}</p>`,
    );
  }

  if (parsed.actionItems.length) {
    parts.push(
      '<h2 style="font-size:13pt;color:#334155;margin:18pt 0 6pt 0;">Action items</h2>',
      '<ul style="margin:0 0 12pt 0;padding-left:18pt;">',
      ...parsed.actionItems.map(
        (item) => `<li style="margin:0 0 4pt 0;">${escapeVisitCaptureHtml(item)}</li>`,
      ),
      '</ul>',
    );
  }

  if (parsed.followUpQuestions.length) {
    parts.push(
      '<h2 style="font-size:13pt;color:#334155;margin:18pt 0 6pt 0;">Follow-up questions</h2>',
      '<ul style="margin:0 0 12pt 0;padding-left:18pt;">',
      ...parsed.followUpQuestions.map(
        (q) => `<li style="margin:0 0 4pt 0;">${escapeVisitCaptureHtml(q)}</li>`,
      ),
      '</ul>',
    );
  }

  if (parsed.transcript) {
    parts.push(
      '<h2 style="font-size:13pt;color:#334155;margin:18pt 0 6pt 0;">Full transcript</h2>',
      `<p style="margin:0 0 12pt 0;white-space:pre-wrap;">${escapeVisitCaptureHtml(parsed.transcript)}</p>`,
    );
  }

  parts.push(
    '<p style="margin:16pt 0 0 0;font-size:9pt;color:#64748b;">Shared via MedXForce Care coordination</p>',
    '</div>',
  );

  return parts.join('');
}

/** @deprecated Use visitCaptureClipboardPlain — kept for callers expecting plain text. */
export function visitCaptureClipboardText(text: string): string {
  return visitCaptureClipboardPlain(text);
}

export function parseVisitCaptureAnalysis(raw: unknown): VisitCaptureAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const summary = String(data.summary ?? '').trim();
  if (!summary) return null;

  const actionItems = Array.isArray(data.actionItems)
    ? data.actionItems
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          const text = String(row.text ?? '').trim();
          if (!text) return null;
          const owner = row.owner;
          return {
            text,
            owner:
              owner === 'care_team' ||
              owner === 'patient' ||
              owner === 'doctor' ||
              owner === 'unknown'
                ? owner
                : undefined,
            due: row.due != null ? String(row.due) : null,
          };
        })
        .filter(Boolean) as VisitCaptureActionItem[]
    : [];

  const followUpQuestions = Array.isArray(data.followUpQuestions)
    ? data.followUpQuestions.map((q) => String(q ?? '').trim()).filter(Boolean)
    : [];

  return {
    summary,
    actionItems,
    followUpQuestions,
    participantsMentioned: Array.isArray(data.participantsMentioned)
      ? data.participantsMentioned.map((p) => String(p ?? '').trim()).filter(Boolean)
      : undefined,
    clinicalTopics: Array.isArray(data.clinicalTopics)
      ? data.clinicalTopics.map((p) => String(p ?? '').trim()).filter(Boolean)
      : undefined,
  };
}
