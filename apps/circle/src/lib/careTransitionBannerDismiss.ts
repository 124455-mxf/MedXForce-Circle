/** @license SPDX-License-Identifier: Apache-2.0 */

const STORAGE_PREFIX = 'circle_care_transition_banner_hidden';

/** Home nudge only — checklist remains available in Circle after this. */
export const CARE_TRANSITION_HOME_BANNER_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

function storageKey(patientId: string, readerUid: string): string {
  return `${STORAGE_PREFIX}_${patientId}_${readerUid}`;
}

/** Stable id for one pack activation — new pack or re-activate shows the banner again. */
export function careTransitionBannerHideKey(
  packId: string,
  packActivatedAt: number | null | undefined,
): string {
  const started =
    typeof packActivatedAt === 'number' && packActivatedAt > 0 ? String(packActivatedAt) : '0';
  return `${packId}:${started}`;
}

function readHiddenKeys(patientId: string, readerUid: string): Set<string> {
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

function writeHiddenKeys(patientId: string, readerUid: string, keys: Set<string>): void {
  try {
    localStorage.setItem(storageKey(patientId, readerUid), JSON.stringify([...keys].slice(-40)));
  } catch {
    // ignore quota / private mode
  }
}

export function isCareTransitionBannerHiddenLocally(
  patientId: string,
  readerUid: string,
  packId: string,
  packActivatedAt: number | null | undefined,
): boolean {
  return readHiddenKeys(patientId, readerUid).has(
    careTransitionBannerHideKey(packId, packActivatedAt),
  );
}

export function rememberCareTransitionBannerHidden(
  patientId: string,
  readerUid: string,
  packId: string,
  packActivatedAt: number | null | undefined,
): void {
  const keys = readHiddenKeys(patientId, readerUid);
  keys.add(careTransitionBannerHideKey(packId, packActivatedAt));
  writeHiddenKeys(patientId, readerUid, keys);
}

/** True when the Home banner should stop nudging (pack started ≥ max age ago). */
export function isCareTransitionHomeBannerExpired(
  packActivatedAt: number | null | undefined,
  now = Date.now(),
  maxAgeMs = CARE_TRANSITION_HOME_BANNER_MAX_AGE_MS,
): boolean {
  if (typeof packActivatedAt !== 'number' || !Number.isFinite(packActivatedAt) || packActivatedAt <= 0) {
    return false;
  }
  return now - packActivatedAt >= maxAgeMs;
}

export function formatCareTransitionPackStartedAt(ms: number, language: string): string {
  const locale =
    language === 'German'
      ? 'de'
      : language === 'Spanish'
        ? 'es'
        : language === 'Polish'
          ? 'pl'
          : 'en';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}
