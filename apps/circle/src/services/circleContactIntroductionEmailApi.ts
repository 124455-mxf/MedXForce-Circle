import type { CircleContactEmailAudience } from '../lib/circleContactEmailAudience';

function patientApiBaseUrl(): string | null {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  return explicit ? explicit.replace(/\/$/, '') : null;
}

export function circleAppPublicUrl(): string {
  const explicit = (import.meta.env.VITE_CIRCLE_APP_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'https://gen-lang-client-0333368246.web.app';
}

export async function sendCircleContactIntroductionEmail(params: {
  email: string;
  patientId: string;
  audience?: CircleContactEmailAudience;
}): Promise<{ success: boolean; message?: string }> {
  return sendCircleContactEmail({ ...params, kind: 'introduction' });
}

export async function sendCircleContactAddedEmail(params: {
  email: string;
  patientId: string;
  audience?: CircleContactEmailAudience;
}): Promise<{ success: boolean; message?: string }> {
  return sendCircleContactEmail({ ...params, kind: 'contact_added' });
}

async function sendCircleContactEmail(params: {
  email: string;
  patientId: string;
  kind: 'introduction' | 'contact_added';
  audience?: CircleContactEmailAudience;
}): Promise<{ success: boolean; message?: string }> {
  const base = patientApiBaseUrl();
  if (!base) {
    return { success: false, message: 'Patient API URL not configured.' };
  }

  try {
    const res = await fetch(`${base}/api/send-contact-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        kind: params.kind,
        patientId: params.patientId,
        ...(params.audience ?? {}),
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return {
        success: false,
        message: body?.message || `Patient API returned ${res.status}`,
      };
    }
    return res.json() as Promise<{ success: boolean; message?: string }>;
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Could not reach patient API.',
    };
  }
}
