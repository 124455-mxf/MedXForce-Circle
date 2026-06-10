import { useEffect, useMemo, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  circleMemberThreadPostsCollection,
  isCircleThreadPostHiddenForUser,
  parseCircleMemberThreadPost,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import { useHiddenCircleThreadPosts } from './useHiddenCircleThreadPosts';

export function useCircleMemberThread(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  enabled: boolean,
  uid?: string,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawPosts, setRawPosts] = useState<CircleMemberThreadPost[]>([]);
  const { hiddenByPostId } = useHiddenCircleThreadPosts(db, patientId, uid);

  useEffect(() => {
    if (!patientId || !enabled) {
      setRawPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      circleMemberThreadPostsCollection(db, patientId, threadKind),
      orderBy('createdAt', 'asc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) =>
          parseCircleMemberThreadPost(d.id, d.data() as Record<string, unknown>),
        );
        setRawPosts(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load conversation.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, enabled, patientId, threadKind]);

  const posts = useMemo(
    () =>
      rawPosts.filter(
        (post) => !isCircleThreadPostHiddenForUser(hiddenByPostId, post.id, threadKind),
      ),
    [hiddenByPostId, rawPosts, threadKind],
  );

  return { loading, error, posts };
}
