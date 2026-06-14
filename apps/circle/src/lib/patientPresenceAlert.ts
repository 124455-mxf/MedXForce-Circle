import { normalizeMemberRole } from '@medxforce/shared';
import { isPatientPresenceOnline } from '../hooks/usePatientOnlinePresence';
import type { AlertAttentionRecencyUrgency } from './circleDashboardStats';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Show alert after the patient has been out of the app for more than three full days. */
export const PATIENT_OFFLINE_ALERT_MIN_DAYS = 3;

export function canSeePatientOfflineAlert(memberRole: string): boolean {
  const role = normalizeMemberRole(memberRole);
  return role === 'proxy' || role === 'caregiver';
}

export function getPatientOfflineAlertDays(
  lastSeen: number,
  online: boolean,
  now = Date.now(),
): number | null {
  if (online || !lastSeen) return null;
  if (isPatientPresenceOnline(lastSeen, now)) return null;

  const daysAway = Math.floor((now - lastSeen) / DAY_MS);
  if (daysAway <= PATIENT_OFFLINE_ALERT_MIN_DAYS) return null;
  return daysAway;
}

export function patientOfflineAlertRecencyTint(
  daysAway: number,
): AlertAttentionRecencyUrgency {
  if (daysAway >= 7) return 'red';
  if (daysAway >= 5) return 'orange';
  return 'orange';
}

export type PreviewPatientOfflineAlert = {
  daysAway: number;
  lastSeen: number;
};

/** Sample reachability alert — use with ?previewReminders=1 on the Circle URL. */
export function buildPreviewPatientOfflineAlert(now = Date.now()): PreviewPatientOfflineAlert {
  const daysAway = 6;
  return {
    daysAway,
    lastSeen: now - daysAway * DAY_MS - 2 * 60 * 60 * 1000,
  };
}
