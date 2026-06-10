import {
  collection,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { CircleMemberThreadKind } from './circleMemberThreads';

export interface CircleThreadPostHiddenRecord {
  postId: string;
  threadKind: CircleMemberThreadKind;
  hiddenAt: number;
}

function hiddenPostsCollection(db: Firestore, patientId: string, uid: string) {
  return collection(db, 'patients', patientId, 'circle_thread_inbox', uid, 'hidden');
}

export async function listHiddenCircleThreadPosts(
  db: Firestore,
  patientId: string,
  uid: string,
): Promise<Record<string, CircleThreadPostHiddenRecord>> {
  const snap = await getDocs(hiddenPostsCollection(db, patientId, uid));
  const map: Record<string, CircleThreadPostHiddenRecord> = {};
  for (const row of snap.docs) {
    const data = row.data();
    const hiddenAt = typeof data.hiddenAt === 'number' ? data.hiddenAt : 0;
    const threadKind = data.threadKind === 'restricted' ? 'restricted' : 'open';
    if (hiddenAt <= 0) continue;
    map[row.id] = {
      postId: row.id,
      threadKind,
      hiddenAt,
    };
  }
  return map;
}

/** Per-user feed hide — does not delete the post for others. */
export async function hideCircleThreadPostForUser(
  db: Firestore,
  patientId: string,
  uid: string,
  threadKind: CircleMemberThreadKind,
  postId: string,
): Promise<void> {
  const hiddenAt = Date.now();
  await setDoc(
    doc(db, 'patients', patientId, 'circle_thread_inbox', uid, 'hidden', postId),
    {
      postId,
      threadKind,
      hiddenAt,
    },
    { merge: true },
  );
}

export function isCircleThreadPostHiddenForUser(
  hidden: Record<string, CircleThreadPostHiddenRecord>,
  postId: string,
  threadKind: CircleMemberThreadKind,
): boolean {
  const row = hidden[postId];
  return !!row && row.threadKind === threadKind;
}
