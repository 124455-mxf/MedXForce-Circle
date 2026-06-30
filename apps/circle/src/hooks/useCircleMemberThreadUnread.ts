import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  circleMemberThreadPostsCollection,
  isCircleThreadPostHiddenForUser,
  mergeAppointmentInvitePostsWithCareCalendar,
  parseCircleMemberThreadPost,
  type CircleMemberThreadPost,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { countUnreadPostsForInboxView, countUnreadPostsForThread } from '../lib/circlePostInboxViews';
import {
  getCirclePostThreadLastReadAt,
  getCirclePostThreadReadSnapshot,
  subscribeCirclePostThreadRead,
} from '../lib/circlePostThreadRead';
import { useHiddenCircleThreadPosts } from './useHiddenCircleThreadPosts';
import { useCareCalendarEntries } from './useCareCalendarEntries';
import { useCircleMemberInviteContext } from './useCircleMemberInviteContext';

export function useCircleMemberThreadUnread(
  db: Firestore,
  patientId: string,
  user: User,
  memberRole: string,
  patient: CirclePatientSummary | null = null,
) {
  const userId = user.uid;
  const canOpen = canParticipateInCircleOpenThread(memberRole);
  const canRestricted = canSeeCircleRestrictedThread(memberRole);
  const { hiddenByPostId } = useHiddenCircleThreadPosts(db, patientId, userId);
  const { entries: careCalendarEntries } = useCareCalendarEntries(db, patientId);
  const { inviteContext } = useCircleMemberInviteContext(db, user, patient);
  const postReadTick = useSyncExternalStore(
    subscribeCirclePostThreadRead,
    getCirclePostThreadReadSnapshot,
    () => 0,
  );

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

  const openPostsWithInvites = useMemo(
    () =>
      canOpen && patientId
        ? mergeAppointmentInvitePostsWithCareCalendar(
            openPosts,
            careCalendarEntries,
            inviteContext,
            patientId,
          )
        : openPosts,
    [canOpen, careCalendarEntries, inviteContext, openPosts, patientId],
  );

  const visibleOpenPosts = useMemo(
    () =>
      openPostsWithInvites.filter(
        (post) => !isCircleThreadPostHiddenForUser(hiddenByPostId, post.id, 'open'),
      ),
    [hiddenByPostId, openPostsWithInvites],
  );

  const visibleRestrictedPosts = useMemo(
    () =>
      restrictedPosts.filter(
        (post) => !isCircleThreadPostHiddenForUser(hiddenByPostId, post.id, 'restricted'),
      ),
    [hiddenByPostId, restrictedPosts],
  );

  const getOpenPostLastRead = useMemo(
    () => (postId: string) => getCirclePostThreadLastReadAt(patientId, userId, 'open', postId),
    [patientId, userId],
  );

  const getRestrictedPostLastRead = useMemo(
    () => (postId: string) => getCirclePostThreadLastReadAt(patientId, userId, 'restricted', postId),
    [patientId, userId],
  );

  const announcementsOpenUnreadCount = useMemo(
    () =>
      canOpen
        ? countUnreadPostsForInboxView(
            openPostsWithInvites,
            'announcements',
            hiddenByPostId,
            'open',
            userId,
            getOpenPostLastRead,
            inviteContext,
          )
        : 0,
    [canOpen, getOpenPostLastRead, hiddenByPostId, inviteContext, openPostsWithInvites, postReadTick, userId],
  );

  const announcementsRestrictedUnreadCount = useMemo(
    () =>
      canRestricted
        ? countUnreadPostsForInboxView(
            restrictedPosts,
            'announcements',
            hiddenByPostId,
            'restricted',
            userId,
            getRestrictedPostLastRead,
          )
        : 0,
    [
      canRestricted,
      getRestrictedPostLastRead,
      hiddenByPostId,
      postReadTick,
      restrictedPosts,
      userId,
    ],
  );

  const announcementsUnreadCount = useMemo(
    () => announcementsOpenUnreadCount + announcementsRestrictedUnreadCount,
    [announcementsOpenUnreadCount, announcementsRestrictedUnreadCount],
  );

  const discussionsOpenUnreadCount = useMemo(
    () =>
      canOpen
        ? countUnreadPostsForInboxView(
            openPostsWithInvites,
            'discussion',
            hiddenByPostId,
            'open',
            userId,
            getOpenPostLastRead,
            inviteContext,
          )
        : 0,
    [canOpen, getOpenPostLastRead, hiddenByPostId, inviteContext, openPostsWithInvites, postReadTick, userId],
  );

  const discussionsRestrictedUnreadCount = useMemo(
    () =>
      canRestricted
        ? countUnreadPostsForInboxView(
            restrictedPosts,
            'discussion',
            hiddenByPostId,
            'restricted',
            userId,
            getRestrictedPostLastRead,
          )
        : 0,
    [
      canRestricted,
      getRestrictedPostLastRead,
      hiddenByPostId,
      postReadTick,
      restrictedPosts,
      userId,
    ],
  );

  const discussionsUnreadCount = useMemo(
    () => discussionsOpenUnreadCount + discussionsRestrictedUnreadCount,
    [discussionsOpenUnreadCount, discussionsRestrictedUnreadCount],
  );

  const dropInsUnreadCount = useMemo(
    () =>
      canRestricted
        ? countUnreadPostsForInboxView(
            restrictedPosts,
            'drop_ins',
            hiddenByPostId,
            'restricted',
            userId,
            getRestrictedPostLastRead,
          )
        : 0,
    [
      canRestricted,
      getRestrictedPostLastRead,
      hiddenByPostId,
      postReadTick,
      restrictedPosts,
      userId,
    ],
  );

  const visitCapturesUnreadCount = useMemo(() => {
    let total = 0;
    if (canOpen) {
      total += countUnreadPostsForInboxView(
        openPostsWithInvites,
        'visit_captures',
        hiddenByPostId,
        'open',
        userId,
        getOpenPostLastRead,
        inviteContext,
      );
    }
    if (canRestricted) {
      total += countUnreadPostsForInboxView(
        restrictedPosts,
        'visit_captures',
        hiddenByPostId,
        'restricted',
        userId,
        getRestrictedPostLastRead,
      );
    }
    return total;
  }, [
    canOpen,
    canRestricted,
    getOpenPostLastRead,
    getRestrictedPostLastRead,
    hiddenByPostId,
    inviteContext,
    openPostsWithInvites,
    postReadTick,
    restrictedPosts,
    userId,
  ]);

  const visitCapturesOpenUnreadCount = useMemo(
    () =>
      canOpen
        ? countUnreadPostsForInboxView(
            openPostsWithInvites,
            'visit_captures',
            hiddenByPostId,
            'open',
            userId,
            getOpenPostLastRead,
            inviteContext,
          )
        : 0,
    [canOpen, getOpenPostLastRead, hiddenByPostId, inviteContext, openPostsWithInvites, postReadTick, userId],
  );

  const visitCapturesRestrictedUnreadCount = useMemo(
    () =>
      canRestricted
        ? countUnreadPostsForInboxView(
            restrictedPosts,
            'visit_captures',
            hiddenByPostId,
            'restricted',
            userId,
            getRestrictedPostLastRead,
          )
        : 0,
    [
      canRestricted,
      getRestrictedPostLastRead,
      hiddenByPostId,
      postReadTick,
      restrictedPosts,
      userId,
    ],
  );

  const openUnreadCount = useMemo(
    () =>
      canOpen
        ? countUnreadPostsForThread(
            openPostsWithInvites,
            hiddenByPostId,
            'open',
            memberRole,
            userId,
            (postId) => getCirclePostThreadLastReadAt(patientId, userId, 'open', postId),
            inviteContext,
          )
        : 0,
    [canOpen, hiddenByPostId, inviteContext, memberRole, openPostsWithInvites, patientId, postReadTick, userId],
  );

  const restrictedUnreadCount = useMemo(
    () =>
      canRestricted
        ? countUnreadPostsForThread(
            restrictedPosts,
            hiddenByPostId,
            'restricted',
            memberRole,
            userId,
            (postId) => getCirclePostThreadLastReadAt(patientId, userId, 'restricted', postId),
          )
        : 0,
    [canRestricted, hiddenByPostId, memberRole, patientId, postReadTick, restrictedPosts, userId],
  );

  const unreadCount = openUnreadCount + restrictedUnreadCount;
  const circlePostCount = visibleOpenPosts.length + visibleRestrictedPosts.length;

  return {
    unreadCount,
    openUnreadCount,
    restrictedUnreadCount,
    announcementsUnreadCount,
    announcementsOpenUnreadCount,
    announcementsRestrictedUnreadCount,
    discussionsUnreadCount,
    discussionsOpenUnreadCount,
    discussionsRestrictedUnreadCount,
    dropInsUnreadCount,
    visitCapturesUnreadCount,
    visitCapturesOpenUnreadCount,
    visitCapturesRestrictedUnreadCount,
    circlePostCount,
  };
}
