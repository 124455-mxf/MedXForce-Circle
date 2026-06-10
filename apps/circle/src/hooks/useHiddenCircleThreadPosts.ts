import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  isCircleThreadPostHiddenForUser,
  type CircleThreadPostHiddenRecord,
} from '@medxforce/shared';

export function useHiddenCircleThreadPosts(
  db: Firestore,
  patientId: string,
  uid: string | undefined,
) {
  const [hiddenByPostId, setHiddenByPostId] = useState<
    Record<string, CircleThreadPostHiddenRecord>
  >({});

  useEffect(() => {
    if (!patientId || !uid) {
      setHiddenByPostId({});
      return;
    }

    const hiddenRef = collection(db, 'patients', patientId, 'circle_thread_inbox', uid, 'hidden');
    return onSnapshot(
      hiddenRef,
      (snap) => {
        const next: Record<string, CircleThreadPostHiddenRecord> = {};
        for (const row of snap.docs) {
          const data = row.data();
          const hiddenAt = typeof data.hiddenAt === 'number' ? data.hiddenAt : 0;
          const threadKind = data.threadKind === 'restricted' ? 'restricted' : 'open';
          if (hiddenAt <= 0) continue;
          next[row.id] = {
            postId: row.id,
            threadKind,
            hiddenAt,
          };
        }
        setHiddenByPostId(next);
      },
      (err) => {
        console.warn('[useHiddenCircleThreadPosts]', err);
        setHiddenByPostId({});
      },
    );
  }, [db, patientId, uid]);

  return useMemo(() => ({ hiddenByPostId }), [hiddenByPostId]);
}
