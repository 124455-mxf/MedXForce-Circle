import type {
  VisitCaptureCapturedBy,
  VisitCaptureSession,
} from '@medxforce/shared';

function resolveApiBase(): string {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '';
}

function apiBase(): string {
  return resolveApiBase();
}

async function parseJson<T>(res: Response): Promise<T> {
  let data: T & { message?: string; error?: string; suggestion?: string };
  try {
    data = (await res.json()) as T & { message?: string; error?: string; suggestion?: string };
  } catch {
    throw new Error(
      res.ok
        ? 'Invalid server response'
        : `Request failed (${res.status}). Check VITE_MEDXFORCE_API_URL and restart npm run dev on the patient app.`,
    );
  }
  if (!res.ok) {
    const detail =
      data.message ||
      data.error ||
      data.suggestion ||
      `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

export function isVisitCaptureApiConfigured(): boolean {
  return Boolean(resolveApiBase());
}

export async function createVisitCaptureSession(params: {
  patientId: string;
  capturedBy: VisitCaptureCapturedBy;
  consent: { at: number; roomInformed: true };
}): Promise<VisitCaptureSession> {
  const res = await fetch(`${apiBase()}/api/visit-capture/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseJson<{ success: boolean; session: VisitCaptureSession }>(res);
  return data.session;
}

export async function uploadVisitCaptureSegment(params: {
  patientId: string;
  sessionId: string;
  segmentIndex: number;
  blob: Blob;
  durationMs?: number;
}): Promise<number> {
  const form = new FormData();
  form.append('patientId', params.patientId);
  form.append('segmentIndex', String(params.segmentIndex));
  if (params.durationMs != null) form.append('durationMs', String(params.durationMs));
  form.append('audio', params.blob, `segment-${params.segmentIndex}.webm`);

  const res = await fetch(
    `${apiBase()}/api/visit-capture/sessions/${params.sessionId}/segments`,
    { method: 'POST', body: form },
  );
  const data = await parseJson<{ success: boolean; segmentCount: number }>(res);
  return data.segmentCount;
}

export async function finishVisitCaptureSession(params: {
  patientId: string;
  sessionId: string;
}): Promise<VisitCaptureSession> {
  const res = await fetch(
    `${apiBase()}/api/visit-capture/sessions/${params.sessionId}/finish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: params.patientId }),
    },
  );
  const data = await parseJson<{ success: boolean; session: VisitCaptureSession }>(res);
  return data.session;
}

export async function publishVisitCaptureSession(params: {
  patientId: string;
  sessionId: string;
}): Promise<VisitCaptureSession> {
  const res = await fetch(
    `${apiBase()}/api/visit-capture/sessions/${params.sessionId}/publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: params.patientId }),
    },
  );
  const data = await parseJson<{ success: boolean; session: VisitCaptureSession }>(res);
  return data.session;
}

export async function discardVisitCaptureSession(params: {
  patientId: string;
  sessionId: string;
}): Promise<void> {
  const res = await fetch(
    `${apiBase()}/api/visit-capture/sessions/${params.sessionId}/discard`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: params.patientId }),
    },
  );
  await parseJson<{ success: boolean }>(res);
}
