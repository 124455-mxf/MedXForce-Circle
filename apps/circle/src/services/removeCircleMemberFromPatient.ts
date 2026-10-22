import { getAuth } from 'firebase/auth';
import { parseMedxforceApiJson, resolveMedxforceApiBase } from '../lib/medxforceApi';

/** Removes a person from one patient. Their MedXForce account stays. */
export async function removeCircleMemberFromPatient(params: {
  patientId: string;
  email: string;
  deleteContributions: boolean;
}): Promise<{ contributionsRemoved: boolean }> {
  const base = resolveMedxforceApiBase();
  if (!base) {
    throw new Error('Patient API is not configured (VITE_MEDXFORCE_API_URL).');
  }
  const token = await getAuth().currentUser?.getIdToken(true);
  if (!token) throw new Error('Sign in required');

  const res = await fetch(`${base}/api/circle/remove-from-patient`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientId: params.patientId,
      email: params.email.trim().toLowerCase(),
      deleteContributions: params.deleteContributions,
    }),
  });
  return parseMedxforceApiJson(res);
}
