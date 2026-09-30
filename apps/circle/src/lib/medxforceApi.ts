/** Patient app API base (Cloud Run) — shared by visit capture, visit brief, episode patch. */

export function resolveMedxforceApiBase(): string {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '';
}

export function isMedxforceApiConfigured(): boolean {
  return Boolean(resolveMedxforceApiBase());
}

export async function parseMedxforceApiJson<T>(res: Response): Promise<T> {
  let data: T & { message?: string; error?: string; suggestion?: string };
  try {
    data = (await res.json()) as T & { message?: string; error?: string; suggestion?: string };
  } catch {
    throw new Error(
      res.ok
        ? 'Invalid server response'
        : `Request failed (${res.status}). Check VITE_MEDXFORCE_API_URL and restart the patient app server.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      data.message || data.error || data.suggestion || `Request failed (${res.status})`,
    );
  }
  return data;
}
