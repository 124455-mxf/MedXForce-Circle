import { doc, writeBatch, type Firestore } from 'firebase/firestore';
import type { CircleMemberThreadKind } from './circleMemberThreads';

export interface CircleThreadPostReadRecord {
  postId: string;
  threadKind: CircleMemberThreadKind;
  lastReadAt: number;
}

const WRITE_CHUNK = 400;

export function circleThreadInboxReadDocId(
  threadKind: CircleMemberThreadKind,
  postId: string,
): string {
  return `${threadKind}_${postId}`;
}

export function circleThreadInboxReadDocPath(
  patientId: string,
  uid: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): [string, string, string, string, string, string] {
  return [
    'patients',
    patientId,
    'circle_thread_inbox',
    uid,
    'read',
    circleThreadInboxReadDocId(threadKind, postId),
  ];
}

export function parseCircleThreadPostReadRecord(
  id: string,
  data: Record<string, unknown> | undefined,
): CircleThreadPostReadRecord | null {
  const postId =
    (typeof data?.postId === 'string' && data.postId.trim()) ||
    id.replace(/^(open|restricted)_/, '').trim();
  const threadKind: CircleMemberThreadKind =
    data?.threadKind === 'restricted' || id.startsWith('restricted_') ? 'restricted' : 'open';
  const lastReadAt = typeof data?.lastReadAt === 'number' ? data.lastReadAt : 0;
  if (!postId || lastReadAt <= 0) return null;
  return { postId, threadKind, lastReadAt };
}

/** Per-member Circle post last-read timestamps. Never decreases a stored value. */
export async function persistCircleThreadInboxReads(
  db: Firestore,
  patientId: string,
  uid: string,
  records: CircleThreadPostReadRecord[],
): Promise<void> {
  const entries = records.filter(
    (row) => row.postId.trim().length > 0 && row.lastReadAt > 0,
  );
  for (let i = 0; i < entries.length; i += WRITE_CHUNK) {
    const batch = writeBatch(db);
    for (const row of entries.slice(i, i + WRITE_CHUNK)) {
      batch.set(
        doc(db, ...circleThreadInboxReadDocPath(patientId, uid, row.threadKind, row.postId)),
        {
          postId: row.postId,
          threadKind: row.threadKind,
          lastReadAt: row.lastReadAt,
        },
        { merge: true },
      );
    }
    await batch.commit();
  }
}
