const PREFIX = 'circleGalleryView:';

/** Fired on window after gallery items are marked viewed. */
export const CIRCLE_GALLERY_VIEWED_CHANGED = 'circle-gallery-viewed-changed';

export type CircleGalleryViewedChangedDetail = {
  patientId: string;
  memberUid?: string;
  mediaId?: string;
  mediaIds?: string[];
  /** When false, listeners should refresh UI but skip a cloud write (remote merge). */
  persist?: boolean;
};

const memoryCache = new Map<string, Set<string>>();

function legacyStorageKey(patientId: string): string {
  return `${PREFIX}${patientId}`;
}

function memberStorageKey(patientId: string, memberUid: string): string {
  return `${PREFIX}${patientId}:${memberUid}`;
}

function cacheKey(patientId: string, memberUid?: string): string {
  return memberUid ? `${patientId}:${memberUid}` : patientId;
}

function readIdSet(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

function writeIdSet(storageKey: string, ids: Set<string>): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}

function hasStoredValue(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) !== null;
  } catch {
    return false;
  }
}

function unionIdSets(...sets: Set<string>[]): Set<string> {
  const merged = new Set<string>();
  for (const set of sets) {
    for (const id of set) {
      if (id) merged.add(id);
    }
  }
  return merged;
}

/**
 * Viewed media ids for this Circle member + patient.
 * Memory first (survives quota / PWA flushes during the session), then localStorage.
 * The old patient-only value is migrated once, before a member-scoped value exists.
 */
export function getCircleGalleryViewedIds(patientId: string, memberUid?: string): Set<string> {
  if (!patientId) return new Set();
  const key = cacheKey(patientId, memberUid);
  const fromMemory = memoryCache.get(key) ?? new Set<string>();
  if (!memberUid) {
    const merged = unionIdSets(fromMemory, readIdSet(legacyStorageKey(patientId)));
    memoryCache.set(key, merged);
    return new Set(merged);
  }

  const memberKey = memberStorageKey(patientId, memberUid);
  const hasMemberValue = hasStoredValue(memberKey);
  const fromMember = readIdSet(memberKey);
  const fromLegacy = hasMemberValue ? new Set<string>() : readIdSet(legacyStorageKey(patientId));
  const merged = unionIdSets(fromMemory, fromMember, fromLegacy);
  memoryCache.set(key, merged);

  if (!hasMemberValue) {
    writeIdSet(memberKey, merged);
  }

  return new Set(merged);
}

function emitViewedChanged(detail: CircleGalleryViewedChangedDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CircleGalleryViewedChangedDetail>(CIRCLE_GALLERY_VIEWED_CHANGED, {
      detail,
    }),
  );
}

function rememberViewedIds(
  patientId: string,
  mediaIds: string[],
  memberUid: string | undefined,
  persist: boolean,
): string[] {
  if (!patientId || !mediaIds.length) return [];
  const unique = [...new Set(mediaIds.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const set = getCircleGalleryViewedIds(patientId, memberUid);
  const added: string[] = [];
  for (const id of unique) {
    if (set.has(id)) continue;
    set.add(id);
    added.push(id);
  }
  if (!added.length) return [];

  memoryCache.set(cacheKey(patientId, memberUid), set);

  const key = memberUid
    ? memberStorageKey(patientId, memberUid)
    : legacyStorageKey(patientId);
  writeIdSet(key, set);

  emitViewedChanged({
    patientId,
    memberUid,
    mediaId: added[0],
    mediaIds: added,
    persist,
  });
  return added;
}

/** Mark one or many media items viewed for this member. Returns newly marked ids. */
export function markCircleGalleryMediaViewedMany(
  patientId: string,
  mediaIds: string[],
  memberUid?: string,
): string[] {
  return rememberViewedIds(patientId, mediaIds, memberUid, true);
}

export function markCircleGalleryMediaViewed(
  patientId: string,
  mediaId: string,
  memberUid?: string,
): void {
  markCircleGalleryMediaViewedMany(patientId, [mediaId], memberUid);
}

/** Merge viewed ids from Firestore without scheduling another cloud write. */
export function mergeRemoteCircleGalleryViewedIds(
  patientId: string,
  memberUid: string,
  remoteIds: string[] | undefined,
): string[] {
  if (!remoteIds?.length) return [];
  return rememberViewedIds(patientId, remoteIds, memberUid, false);
}

export function parseCircleGalleryViewedFromProfile(
  data: Record<string, unknown> | undefined,
  patientId: string,
): string[] {
  const raw = data?.galleryViewedByPatient;
  if (!raw || typeof raw !== 'object') return [];
  const list = (raw as Record<string, unknown>)[patientId];
  if (!Array.isArray(list)) return [];
  return list.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Unseen for the member = not opened yet, and not their own upload. */
export function isCircleGalleryMediaUnseenForMember(
  media: { id: string; uploadedByUid?: string | null },
  viewedIds: ReadonlySet<string>,
  memberUid: string,
): boolean {
  if (media.uploadedByUid && media.uploadedByUid === memberUid) return false;
  return !viewedIds.has(media.id);
}
