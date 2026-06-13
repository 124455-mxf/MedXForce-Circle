import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  subscribeCircleMemberThreadPostReplies,
  type CircleMemberThreadKind,
  type CircleMemberThreadPostReply,
} from '@medxforce/shared';

export function useCircleMemberThreadPostReplies(
  db: Firestore,
  patientId: string,
  threadKind: CircleMemberThreadKind,
  postId: string | null,
  enabled: boolean,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replies, setReplies] = useState<CircleMemberThreadPostReply[]>([]);

  useEffect(() => {
    if (!enabled || !patientId || !postId) {
      setReplies([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    return subscribeCircleMemberThreadPostReplies(
      db,
      patientId,
      threadKind,
      postId,
      (items) => {
        setReplies(items);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [db, enabled, patientId, postId, threadKind]);

  return { replies, loading, error };
}
