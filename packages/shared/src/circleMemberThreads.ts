import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';
import { isDropInThreadPost } from './dropIn';
import { isVisitCaptureThreadPost } from './visitCapture';

/** Author or proxy may delete for everyone within this window (unless someone responded). */
export const CIRCLE_THREAD_POST_DELETE_WINDOW_MS = 30 * 60 * 1000;

/** All-to-all circle member threads (not patient ↔ member messaging). */
export type CircleMemberThreadKind = 'open' | 'restricted';

export type CircleMemberThreadPostTranslation = {
  language: string;
  text: string;
  isAuto?: boolean;
};

export interface CircleMemberThreadPost {
  id: string;
  patientId: string;
  threadKind: CircleMemberThreadKind;
  authorUid: string;
  authorName: string;
  authorRole: CircleMemberRole;
  text: string;
  createdAt: number;
  translations?: CircleMemberThreadPostTranslation[];
  /** Set when another member posts after this one — blocks delete-for-everyone. */
  respondLocked?: boolean;
  postKind?: 'discussion' | 'announcement' | 'visit_capture' | 'drop_in';
  visitCaptureId?: string;
  replyCount?: number;
  lastReplyAt?: number;
  lastReplyAuthorUid?: string;
  lastReplyAuthorName?: string;
  lastReplyPreviewText?: string;
}

function parseCircleMemberThreadPostTranslations(
  data: Record<string, unknown>,
): CircleMemberThreadPostTranslation[] | undefined {
  const raw = data.translations;
  if (!Array.isArray(raw)) return undefined;
  const parsed = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const language = typeof row.language === 'string' ? row.language.trim() : '';
      const text = typeof row.text === 'string' ? row.text.trim() : '';
      if (!language || !text) return null;
      return {
        language,
        text,
        ...(row.isAuto === true ? { isAuto: true as const } : {}),
      };
    })
    .filter((entry): entry is CircleMemberThreadPostTranslation => entry !== null);
  return parsed.length > 0 ? parsed : undefined;
}

const OPEN_THREAD_ROLES = new Set<CircleMemberRole>([
  'proxy',
  'caregiver',
  'professional_caregiver',
  'family',
  'friend',
  'facility_staff',
]);

const RESTRICTED_THREAD_ROLES = new Set<CircleMemberRole>([
  'proxy',
  'caregiver',
  'professional_caregiver',
]);

export function canParticipateInCircleOpenThread(role: string): boolean {
  return OPEN_THREAD_ROLES.has(role as CircleMemberRole);
}

export function canParticipateInCircleRestrictedThread(role: string): boolean {
  return RESTRICTED_THREAD_ROLES.has(role as CircleMemberRole);
}

/** Family and friends must not see restricted threads exist. */
export function canSeeCircleRestrictedThread(role: string): boolean {
  return canParticipateInCircleRestrictedThread(role);
}

export function circleMemberThreadLabel(kind: CircleMemberThreadKind): string {
  return kind === 'open' ? 'Circle conversation' : 'Care coordination';
}

export function circleMemberThreadDescription(kind: CircleMemberThreadKind): string {
  if (kind === 'open') {
    return 'All circle members share updates here.';
  }
  return 'Proxies and caregivers only.';
}

export function circleMemberRoleLabel(role: CircleMemberRole): string {
  switch (role) {
    case 'proxy':
      return 'Proxy';
    case 'caregiver':
      return 'Caregiver';
    case 'professional_caregiver':
      return 'Professional caregiver';
    case 'family':
      return 'Family';
    case 'friend':
      return 'Friend';
    case 'facility_staff':
      return 'Facility staff';
    default:
      return 'Member';
  }
}

/** Bold the first title line for structured care posts (visit capture, drop-in). */
export function circleThreadPostBoldTitleLine(post: {
  text: string;
  postKind?: string;
}): boolean {
  return isVisitCaptureThreadPost(post) || isDropInThreadPost(post);
}

export function isAnnouncementThreadPost(post: { postKind?: string }): boolean {
  return post.postKind === 'announcement';
}

/** Member posts that support discussion replies (not announcements or care artifacts). */
export function isDiscussionThreadPost(post: {
  text: string;
  postKind?: string;
}): boolean {
  if (isVisitCaptureThreadPost(post) || isDropInThreadPost(post) || isAnnouncementThreadPost(post)) {
    return false;
  }
  return post.postKind === 'discussion' || !post.postKind;
}

/** Proxies and caregivers may post one-way announcements. */
export function canPostCircleAnnouncement(role: string): boolean {
  return (
    role === 'proxy' || role === 'caregiver' || role === 'professional_caregiver'
  );
}

export function circleMemberThreadPostsCollection(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
) {
  return collection(db, 'patients', patientId, 'circle_threads', threadKind, 'posts');
}

export function parseCircleMemberThreadPost(
  id: string,
  data: Record<string, unknown>,
): CircleMemberThreadPost {
  return {
    id,
    patientId: String(data.patientId || ''),
    threadKind: data.threadKind === 'restricted' ? 'restricted' : 'open',
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Circle member'),
    authorRole: String(data.authorRole || 'friend') as CircleMemberRole,
    text: String(data.text || ''),
    createdAt: Number(data.createdAt || 0),
    translations: parseCircleMemberThreadPostTranslations(data),
    respondLocked: data.respondLocked === true,
    postKind:
      data.postKind === 'visit_capture'
        ? 'visit_capture'
        : data.postKind === 'drop_in'
          ? 'drop_in'
          : data.postKind === 'announcement'
            ? 'announcement'
            : data.postKind === 'discussion'
              ? 'discussion'
              : undefined,
    visitCaptureId: data.visitCaptureId ? String(data.visitCaptureId) : undefined,
    replyCount: typeof data.replyCount === 'number' ? data.replyCount : undefined,
    lastReplyAt: typeof data.lastReplyAt === 'number' ? data.lastReplyAt : undefined,
    lastReplyAuthorUid:
      typeof data.lastReplyAuthorUid === 'string' ? data.lastReplyAuthorUid : undefined,
    lastReplyAuthorName:
      typeof data.lastReplyAuthorName === 'string' ? data.lastReplyAuthorName : undefined,
    lastReplyPreviewText:
      typeof data.lastReplyPreviewText === 'string' ? data.lastReplyPreviewText : undefined,
  };
}

export function isWithinCircleThreadDeleteWindow(createdAt: number, now = Date.now()): boolean {
  return createdAt > 0 && now - createdAt < CIRCLE_THREAD_POST_DELETE_WINDOW_MS;
}

export function canDeleteCircleThreadPostForEveryone(
  post: Pick<CircleMemberThreadPost, 'authorUid' | 'createdAt' | 'respondLocked'>,
  options: { uid: string; isProxy: boolean; now?: number },
): boolean {
  if (post.respondLocked) return false;
  if (!isWithinCircleThreadDeleteWindow(post.createdAt, options.now)) return false;
  if (post.authorUid === options.uid) return true;
  return options.isProxy;
}

export async function deleteCircleThreadPostForEveryone(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'circle_threads', threadKind, 'posts', postId));
}

export async function createCircleMemberThreadPost(
  db: Firestore,
  params: {
    patientId: string;
    threadKind: CircleMemberThreadKind;
    authorUid: string;
    authorName: string;
    authorRole: CircleMemberRole;
    text: string;
    translations?: CircleMemberThreadPostTranslation[];
    postKind?: 'discussion' | 'announcement' | 'visit_capture' | 'drop_in';
    visitCaptureId?: string;
  },
): Promise<string> {
  const body = params.text.trim();
  if (!body) throw new Error('Please write a message before sending.');

  const kind = params.postKind ?? 'discussion';
  if (kind === 'announcement' && !canPostCircleAnnouncement(params.authorRole)) {
    throw new Error('Only proxies and caregivers can post announcements.');
  }

  const now = Date.now();
  const col = circleMemberThreadPostsCollection(db, params.patientId, params.threadKind);
  const priorSnap = await getDocs(query(col, orderBy('createdAt', 'asc')));
  const batch = writeBatch(db);

  for (const prior of priorSnap.docs) {
    const priorData = prior.data();
    const priorAuthor = String(priorData.authorUid || '');
    if (priorAuthor && priorAuthor !== params.authorUid && priorData.respondLocked !== true) {
      batch.update(prior.ref, { respondLocked: true });
    }
  }

  const postRef = doc(col);
  batch.set(postRef, {
    patientId: params.patientId,
    threadKind: params.threadKind,
    authorUid: params.authorUid,
    authorName: params.authorName.trim() || 'Circle member',
    authorRole: params.authorRole,
    text: body,
    createdAt: now,
    respondLocked: false,
    postKind: kind,
    ...(params.translations?.length ? { translations: params.translations } : {}),
    ...(params.visitCaptureId ? { visitCaptureId: params.visitCaptureId } : {}),
  });

  await batch.commit();
  return postRef.id;
}
