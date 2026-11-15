import { getAuth } from 'firebase/auth';

/** Headers for a Patient API call, using the Circle member's existing sign-in. */
export async function patientApiAuthHeaders(extra?: HeadersInit): Promise<Headers | null> {
  const token = await getAuth().currentUser?.getIdToken();
  if (!token) return null;
  const headers = new Headers(extra);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}
