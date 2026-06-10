import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  isDiaryEntrySharedWithCircle,
  subscribeCircleDiaryEntries,
  type CircleDiaryEntry,
} from '@medxforce/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

export type DiaryDashboardPreview = {
  sharedCount: number;
  milestoneCount: number;
  entriesLast7: number;
  latest: CircleDiaryEntry | null;
  loading: boolean;
};

const EMPTY: DiaryDashboardPreview = {
  sharedCount: 0,
  milestoneCount: 0,
  entriesLast7: 0,
  latest: null,
  loading: true,
};

export function diaryEntryPreviewLine(entry: CircleDiaryEntry, maxLength = 52): string {
  const title = entry.title?.trim();
  if (title) return title.length > maxLength ? `${title.slice(0, maxLength)}…` : title;

  const body = entry.body.trim().replace(/\s+/g, ' ');
  if (!body) return `From ${entry.authorName}`;

  return body.length > maxLength ? `${body.slice(0, maxLength)}…` : body;
}

/** Latest shared diary entry and counts for the dashboard tile. */
export function useDiaryDashboardPreview(
  db: Firestore,
  patientId: string | undefined,
  user: User | undefined,
  windowDays = 7,
): DiaryDashboardPreview {
  const [entries, setEntries] = useState<CircleDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId || !user?.uid) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeCircleDiaryEntries(
      db,
      patientId,
      user.uid,
      (next) => {
        setEntries(next);
        setLoading(false);
      },
      () => {
        setEntries([]);
        setLoading(false);
      },
    );
  }, [db, patientId, user?.uid]);

  return useMemo(() => {
    if (!user?.uid) return { ...EMPTY, loading };

    const shared = entries.filter(isDiaryEntrySharedWithCircle);
    const cutoff = Date.now() - windowDays * DAY_MS;
    const entriesLast7 = shared.filter((entry) => entry.experienceAt >= cutoff).length;
    const milestoneCount = shared.filter((entry) => entry.isMilestone).length;
    const latest = shared[0] ?? null;

    return {
      sharedCount: shared.length,
      milestoneCount,
      entriesLast7,
      latest,
      loading,
    };
  }, [entries, loading, user?.uid, windowDays]);
}
