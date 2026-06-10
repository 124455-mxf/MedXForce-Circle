import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  circleMemberThreadPostsCollection,
  isCircleThreadPostHiddenForUser,
  parseCircleMemberThreadPost,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
} from '@medxforce/shared';
import {
  countUnreadCircleThreadPosts,
  getCircleThreadLastReadAt,
  subscribeCircleThreadRead,
} from '../lib/circleMemberThreadRead';
import { useHiddenCircleThreadPosts } from './useHiddenCircleThreadPosts';

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
  const { hiddenByPostId } = useHiddenCircleThreadPosts(db, patientId, userId);

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

  const visibleOpenPosts = useMemo(
    () =>
      openPosts.filter(
        (post) => !isCircleThreadPostHiddenForUser(hiddenByPostId, post.id, 'open'),
      ),
    [hiddenByPostId, openPosts],
  );

  const visibleRestrictedPosts = useMemo(
    () =>
      restrictedPosts.filter(
        (post) => !isCircleThreadPostHiddenForUser(hiddenByPostId, post.id, 'restricted'),
      ),
    [hiddenByPostId, restrictedPosts],
  );

  const openUnreadCount = useMemo(
    () =>
      canOpen ? countUnreadCircleThreadPosts(visibleOpenPosts, userId, openLastRead) : 0,
    [canOpen, openLastRead, userId, visibleOpenPosts],
  );

  const restrictedUnreadCount = useMemo(
    () =>
      canRestricted
        ? countUnreadCircleThreadPosts(visibleRestrictedPosts, userId, restrictedLastRead)
        : 0,
    [canRestricted, restrictedLastRead, userId, visibleRestrictedPosts],
  );

  const unreadCount = openUnreadCount + restrictedUnreadCount;
  const circlePostCount = visibleOpenPosts.length + visibleRestrictedPosts.length;

  return {
    unreadCount,
    openUnreadCount,
    restrictedUnreadCount,
    circlePostCount,
  };
}
