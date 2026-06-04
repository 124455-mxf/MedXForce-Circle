import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  isDiaryEntrySharedWithCircle,
  subscribeCircleDiaryEntries,
  type CircleDiaryEntry,
} from '@medxforce/shared';

export type DiaryListFilter = 'mine' | 'circle';

export function useCircleDiaryEntries(
  db: Firestore,
  patientId: string,
  user: User,
  filter: DiaryListFilter,
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<CircleDiaryEntry[]>([]);

  useEffect(() => {
    if (!patientId || !user.uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeCircleDiaryEntries(
      db,
      patientId,
      user.uid,
      (items) => {
        setEntries(items);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, patientId, user.uid]);

  const visibleEntries = useMemo(() => {
    if (filter === 'mine') {
      return entries.filter((e) => e.authorUid === user.uid);
    }
    return entries.filter((e) => isDiaryEntrySharedWithCircle(e));
  }, [entries, filter, user.uid]);

  return {
    loading,
    error,
    entries: visibleEntries,
    allEntries: entries,
  };
}
