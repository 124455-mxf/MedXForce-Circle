import { addDoc, collection, type Firestore } from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';

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
  };
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
  const ref = await addDoc(circleMemberThreadPostsCollection(db, params.patientId, params.threadKind), {
    patientId: params.patientId,
    threadKind: params.threadKind,
    authorUid: params.authorUid,
    authorName: params.authorName.trim() || 'Circle member',
    authorRole: params.authorRole,
    text: body,
    createdAt: now,
  });
  return ref.id;
}
