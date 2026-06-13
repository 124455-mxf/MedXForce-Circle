import {
  profileNotificationDocId,
  type CircleProfileNotification,
} from '@medxforce/shared';

const STORAGE_PREFIX = 'circle_profile_notif_dismissed';

function storageKey(patientId: string, readerUid: string): string {
  return `${STORAGE_PREFIX}_${patientId}_${readerUid}`;
}

function notificationSignatureKey(row: Pick<CircleProfileNotification, 'type' | 'changedLabels'>): string {
  return `sig:${profileNotificationDocId(row.type, row.changedLabels)}`;
}

function readDismissedIds(patientId: string, readerUid: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(patientId, readerUid));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(patientId: string, readerUid: string, ids: Set<string>): void {
  try {
    localStorage.setItem(storageKey(patientId, readerUid), JSON.stringify([...ids]));
  } catch {
    // ignore quota / private mode
  }
}

export function rememberDismissedProfileNotification(
  patientId: string,
  readerUid: string,
  notificationId: string,
): void {
  const ids = readDismissedIds(patientId, readerUid);
  ids.add(notificationId);
  writeDismissedIds(patientId, readerUid, ids);
}

export function rememberDismissedProfileNotificationRow(
  patientId: string,
  readerUid: string,
  row: Pick<CircleProfileNotification, 'id' | 'type' | 'changedLabels'>,
): void {
  const ids = readDismissedIds(patientId, readerUid);
  ids.add(row.id);
  ids.add(notificationSignatureKey(row));
  writeDismissedIds(patientId, readerUid, ids);
}

export function isProfileNotificationDismissedLocally(
  patientId: string,
  readerUid: string,
  row: Pick<CircleProfileNotification, 'id' | 'type' | 'changedLabels'>,
): boolean {
  const dismissed = readDismissedIds(patientId, readerUid);
  return dismissed.has(row.id) || dismissed.has(notificationSignatureKey(row));
}

export function filterLocallyDismissedProfileNotifications<
  T extends Pick<CircleProfileNotification, 'id' | 'type' | 'changedLabels'>,
>(patientId: string, readerUid: string, rows: T[]): T[] {
  const dismissed = readDismissedIds(patientId, readerUid);
  if (dismissed.size === 0) return rows;
  return rows.filter(
    (row) => !dismissed.has(row.id) && !dismissed.has(notificationSignatureKey(row)),
  );
}
