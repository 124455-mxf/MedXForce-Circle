import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  circleMemberThreadPostsCollection,
  parseCircleMemberThreadPost,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import {
  countUnreadCircleThreadPosts,
  getCircleThreadLastReadAt,
  subscribeCircleThreadRead,
} from '../lib/circleMemberThreadRead';

function useCircleThreadLastRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
): number {
  return useSyncExternalStore(
    subscribeCircleThreadRead,
    () => getCircleThreadLastReadAt(patientId, userId, threadKind),
    () => 0,
  );
}

export function useCircleMemberThreadUnread(
  db: Firestore,
  patientId: string,
  user: User,
  memberRole: string,
) {
  const userId = user.uid;
  const canOpen = canParticipateInCircleOpenThread(memberRole);
  const canRestricted = canSeeCircleRestrictedThread(memberRole);

  const openLastRead = useCircleThreadLastRead(patientId, userId, 'open');
  const restrictedLastRead = useCircleThreadLastRead(patientId, userId, 'restricted');

  const [openPosts, setOpenPosts] = useState<CircleMemberThreadPost[]>([]);
  const [restrictedPosts, setRestrictedPosts] = useState<CircleMemberThreadPost[]>([]);

  useEffect(() => {
    if (!patientId || !canOpen) {
      setOpenPosts([]);
      return;
    }
    const q = query(
      circleMemberThreadPostsCollection(db, patientId, 'open'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setOpenPosts(
        snap.docs.map((d) =>
          parseCircleMemberThreadPost(d.id, d.data() as Record<string, unknown>),
        ),
      );
    });
  }, [canOpen, db, patientId]);

  useEffect(() => {
    if (!patientId || !canRestricted) {
      setRestrictedPosts([]);
      return;
    }
    const q = query(
      circleMemberThreadPostsCollection(db, patientId, 'restricted'),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setRestrictedPosts(
        snap.docs.map((d) =>
          parseCircleMemberThreadPost(d.id, d.data() as Record<string, unknown>),
        ),
      );
    });
  }, [canRestricted, db, patientId]);

  const unreadCount = useMemo(() => {
    let total = 0;
    if (canOpen) {
      total += countUnreadCircleThreadPosts(openPosts, userId, openLastRead);
    }
    if (canRestricted) {
      total += countUnreadCircleThreadPosts(restrictedPosts, userId, restrictedLastRead);
    }
    return total;
  }, [
    canOpen,
    canRestricted,
    openLastRead,
    openPosts,
    restrictedLastRead,
    restrictedPosts,
    userId,
  ]);

  return { unreadCount };
}
