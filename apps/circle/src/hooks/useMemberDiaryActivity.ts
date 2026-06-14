import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { diaryEntriesCollection, parseDiaryEntry } from '@medxforce/shared';

export function useMemberDiaryActivity(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
): { latestMyDiaryAt: number | null; entryCount: number; loading: boolean } {
  const [latestMyDiaryAt, setLatestMyDiaryAt] = useState<number | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId || !memberUid) {
      setLatestMyDiaryAt(null);
      setEntryCount(0);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(
      diaryEntriesCollection(db, patientId),
      where('authorUid', '==', memberUid),
      orderBy('experienceAt', 'desc'),
    );

    return onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs.map((d) =>
          parseDiaryEntry(d.id, d.data() as Record<string, unknown>),
        );
        setEntryCount(entries.length);
        setLatestMyDiaryAt(entries[0]?.experienceAt ?? null);
        setLoading(false);
      },
      () => {
        setLatestMyDiaryAt(null);
        setEntryCount(0);
        setLoading(false);
      },
    );
  }, [db, memberUid, patientId]);

  return { latestMyDiaryAt, entryCount, loading };
}
