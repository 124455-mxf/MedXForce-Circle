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

/** Author or proxy may delete for everyone within this window (unless someone responded). */
export const CIRCLE_THREAD_POST_DELETE_WINDOW_MS = 30 * 60 * 1000;

/** All-to-all circle member threads (not patient ↔ member messaging). */
export type CircleMemberThreadKind = 'open' | 'restricted';

export interface CircleMemberThreadPost {
  id: string;
  patientId: string;
  threadKind: CircleMemberThreadKind;
  authorUid: string;
  authorName: string;
  authorRole: CircleMemberRole;
  text: string;
  createdAt: number;
  /** Set when another member posts after this one — blocks delete-for-everyone. */
  respondLocked?: boolean;
  postKind?: 'visit_capture';
  visitCaptureId?: string;
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
    return 'All circle members share updates here — everyone sees every message.';
  }
  return 'Proxies and caregivers only — for care coordination the wider circle does not see.';
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
    respondLocked: data.respondLocked === true,
    postKind: data.postKind === 'visit_capture' ? 'visit_capture' : undefined,
    visitCaptureId: data.visitCaptureId ? String(data.visitCaptureId) : undefined,
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
  },
): Promise<string> {
  const body = params.text.trim();
  if (!body) throw new Error('Please write a message before sending.');

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
  });

  await batch.commit();
  return postRef.id;
}
