import { useEffect, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  circleMemberThreadPostsCollection,
  parseCircleMemberThreadPost,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';

export function useCircleMemberThread(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  enabled: boolean,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<CircleMemberThreadPost[]>([]);

  useEffect(() => {
    if (!patientId || !enabled) {
      setPosts([]);
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
        setPosts(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load conversation.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, enabled, patientId, threadKind]);

  return { loading, error, posts };
}
