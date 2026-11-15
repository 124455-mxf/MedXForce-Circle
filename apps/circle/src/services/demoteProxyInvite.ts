import { getAuth } from 'firebase/auth';
import type { ProxySeatDemotionResult } from '@medxforce/shared';
import { parseMedxforceApiJson, resolveMedxforceApiBase } from '../lib/medxforceApi';

/** Asks the Patient server to lower a proxy invite when that seat is already taken. */
export async function demoteFullProxySeat(inviteId: string): Promise<ProxySeatDemotionResult> {
  const base = resolveMedxforceApiBase();
  if (!base) return { demoted: false };
  const token = await getAuth().currentUser?.getIdToken(true);
  if (!token) return { demoted: false };

  const res = await fetch(`${base}/api/circle/demote-proxy-invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inviteId }),
  });
  return parseMedxforceApiJson<ProxySeatDemotionResult>(res);
}
