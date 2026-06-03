import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  diaryEntriesCollection,
  parseDiaryEntry,
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
    if (!patientId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      diaryEntriesCollection(db, patientId),
      orderBy('experienceAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) =>
          parseDiaryEntry(d.id, d.data() as Record<string, unknown>),
        );
        setEntries(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Could not load diary entries.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, patientId]);

  const visibleEntries = useMemo(() => {
    if (filter === 'mine') {
      return entries.filter((e) => e.authorUid === user.uid);
    }
    return entries.filter((e) => e.visibility === 'circle');
  }, [entries, filter, user.uid]);

  return {
    loading,
    error,
    entries: visibleEntries,
    allEntries: entries,
  };
}
