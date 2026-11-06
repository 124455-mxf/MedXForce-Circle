import { getAuth } from 'firebase/auth';
import { parseMedxforceApiJson, resolveMedxforceApiBase } from '../lib/medxforceApi';

async function authorizedPost<T>(path: string, body?: unknown): Promise<T> {
  const base = resolveMedxforceApiBase();
  if (!base) {
    throw new Error('Patient API is not configured (VITE_MEDXFORCE_API_URL).');
  }
  const token = await getAuth().currentUser?.getIdToken(true);
  if (!token) {
    throw new Error('Sign in required');
  }
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseMedxforceApiJson<T>(res);
}

/** Schedules account deletion in 30 days. The member can cancel until that day. */
export async function scheduleAccountDeletion(
  deleteContributions: boolean,
): Promise<{ eraseAt: number }> {
  return authorizedPost<{ ok: boolean; eraseAt: number }>('/api/account/delete', {
    deleteContributions,
  });
}

export async function cancelScheduledAccountDeletion(): Promise<void> {
  await authorizedPost<{ ok: boolean }>('/api/account/delete/cancel');
}
