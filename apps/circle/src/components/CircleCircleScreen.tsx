import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2, BarChart2, CalendarClock, ClipboardList, CircleDot, HeartHandshake, Megaphone, MessageCircle, Plus, Shield, Sparkles, Trash2, Undo2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  canDeleteCircleThreadPostForEveryone,
  canParticipateInCircleOpenThread,
  canPostCircleAnnouncement,
  canRecordVisitCaptureInCircleFolder,
  canReplyToCircleMemberThreadPost,
  canSeeCircleRestrictedThread,
  canViewCircleAppointmentInvites,
  createCircleMemberThreadPost,
  createCircleMemberThreadPostReply,
  deleteCircleThreadPostForEveryone,
  hideCircleThreadPostForUser,
  isAnnouncementThreadPost,
  isAppointmentInviteThreadPost,
  isAppointmentInviteVisibleToMember,
  isDiscussionThreadPost,
  isPollThreadPost,
  isSyntheticAppointmentInvitePostId,
  isPastAppointmentInvitePost,
  mergeAppointmentInvitePostsWithCareCalendar,
  normalizeMemberRole,
  unhideCircleThreadPostForUser,
  type CircleMemberRole,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import { useCirclePatientMemberLanguages } from '../hooks/useCirclePatientMemberLanguages';
import { buildCirclePollTranslations, buildCircleThreadPostTranslations } from '../lib/circleThreadPostTranslate';
import {
  circleThreadLabelI18n,
  formatCirclePostTime,
  formatCircleThreadActionError,
  translateCircleMemberRole,
} from '../lib/circleScreenI18n';
import {
  circleHeaderActionButtonClass,
  circleInboxIconTabExtraClass,
  circleInboxTabStripClass,
  circleInboxTextTabExtraClass,
  CIRCLE_INBOX_TAB_ICON_SIZE,
  circleSectionEmptyStateClass,
  circleSectionHeaderClass,
  circleSectionHeaderStackClass,
  circleSectionPanelClass,
  circleTabButtonClass,
  circleTabListClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { isCircleAiAssistAvailable } from '../lib/circleAiAssist';
import { CircleAiGuidanceModal } from './CircleAiGuidanceModal';
import { CirclePollComposer } from './CirclePollComposer';
import { CircleThreadMembersRow } from './CircleThreadMembersRow';
import { useCircleMemberThread } from '../hooks/useCircleMemberThread';
import { useCircleMemberThreadPostReplies } from '../hooks/useCircleMemberThreadPostReplies';
import {
  circlePostInboxTitle,
  circlePostInboxSnippet,
  circlePostInboxRowAuthorLine,
} from '../lib/circlePostInboxI18n';
import {
  countPostsForInboxView,
  countUnreadPostsForInboxView,
  filterPostsForInboxView,
  getCirclePostLatestActivityAt,
  isCirclePostUnread,
  circlePostInboxViewsForThread,
  partitionCirclePostInboxViews,
  type CirclePostInboxView,
} from '../lib/circlePostInboxViews';
import {
  getCirclePostThreadLastReadAt,
  getCirclePostThreadReadSnapshot,
  markCirclePostThreadReadThroughActivity,
  markCirclePostsRead,
  subscribeCirclePostThreadRead,
} from '../lib/circlePostThreadRead';
import { CircleExpandableMessageComposer } from './CircleExpandableMessageComposer';
import { CircleMessageDeleteConfirmModal } from './CircleMessageDeleteConfirmModal';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { CirclePostDetailView } from './CirclePostDetailView';
import { useCirclePatientMemberDisplayNames } from '../hooks/useCirclePatientMemberDisplayNames';
import { resolveCircleThreadAuthorName } from '../lib/circleReplySenderDisplay';
import { useCircleRemoteSettingsFromShell } from '../context/CircleSelectedPatientContext';
import { normalizeCircleUiLanguage } from '../lib/circleLanguages';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { ResponsiveTabLabel } from './ResponsiveTabLabel';
import { CircleTabCountBadge, CircleFolderCountBadge, formatCircleBadgeCount } from './CircleCountBadge';
import { CircleHorizontalScrollStrip } from './CircleHorizontalScrollStrip';
import {
  CirclePostFolderActionCard,
  type CirclePostFolderActionVariant,
} from './CirclePostFolderActionCard';
import {
  circleUrgencyInboxRowClass,
  circleUrgencyLeftAccentClass,
  circleUrgencyStatusBadgeClass,
} from '../lib/circleUrgencyStyles';
import { useCircleMemberOnboarding } from '../hooks/useCircleMemberOnboarding';
import { useCircleInitiateMessagesNotice } from '../hooks/useCircleInitiateMessagesNotice';
import { CircleOnboardingWelcomeCard } from './CircleOnboardingWelcomeCard';
import { CircleInitiateMessagesWelcomeCard } from './CircleInitiateMessagesWelcomeCard';
import { useCircleMemberInviteContext } from '../hooks/useCircleMemberInviteContext';
import { useCareCalendarEntries, buildCareCalendarEntriesSubscription } from '../hooks/useCareCalendarEntries';
import { useCareTransitionReadiness } from '../hooks/useCareTransitionReadiness';
import { CircleCareTransitionReadinessBanner } from './CircleCareTransitionReadinessBanner';
import { CircleCareTransitionReadinessPanel } from './CircleCareTransitionReadinessPanel';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';
import { careTransitionOpenItemCount } from '@medxforce/shared';

interface CircleCircleScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  unreadCount: number;
  openUnreadCount: number;
  restrictedUnreadCount: number;
  canInitiateDropIn?: boolean;
  /** When false, Drop-in folder action shows a Remote Settings hint instead of start. */
  patientDropInFeatureEnabled?: boolean;
  patientOnline?: boolean;
  patientDoNotDisturb?: boolean;
  onStartDropIn?: () => void;
  onResumeDropIn?: () => void;
  dropInActive?: boolean;
  dropInChatOpen?: boolean;
  onRecordVisit?: (entryId?: string) => void;
  circleInboxIntent?: { thread: CircleMemberThreadKind; view: CirclePostInboxView } | null;
  onCircleInboxIntentConsumed?: () => void;
}

function circlePostInboxSubtitle(t: ReturnType<typeof useCircleT>, view: CirclePostInboxView): string {
  switch (view) {
    case 'announcements':
      return t('circle.inboxSubtitleAnnouncement');
    case 'care_transition':
      return t('circle.inboxSubtitleCareTransition');
    case 'drop_ins':
      return t('circle.inboxSubtitleDropIns');
    case 'visit_captures':
      return t('circle.inboxSubtitleVisitCaptures');
    case 'appointments':
      return t('circle.inboxSubtitleAppointments');
    case 'hidden':
      return t('circle.inboxSubtitleHidden');
    default:
      return t('circle.inboxSubtitleDiscussion');
  }
}

function circlePostInboxEmptyMessage(
  t: ReturnType<typeof useCircleT>,
  view: CirclePostInboxView,
  canPostAnnouncement: boolean,
): string {
  switch (view) {
    case 'announcements':
      return canPostAnnouncement
        ? t('circle.inboxEmptyAnnouncement')
        : t('circle.inboxEmptyAnnouncementReadOnly');
    case 'care_transition':
      return t('circle.inboxEmptyCareTransition');
    case 'drop_ins':
      return t('circle.inboxEmptyDropIns');
    case 'visit_captures':
      return t('circle.inboxEmptyVisitCaptures');
    case 'appointments':
      return t('circle.inboxEmptyAppointments');
    case 'hidden':
      return t('circle.inboxEmptyHidden');
    default:
      return t('circle.inboxEmptyDiscussion');
  }
}

function circlePostInboxTabLabel(t: ReturnType<typeof useCircleT>, view: CirclePostInboxView): string {
  switch (view) {
    case 'announcements':
      return t('circle.tabAnnouncement');
    case 'care_transition':
      return t('circle.tabCareTransition');
    case 'drop_ins':
      return t('circle.tabDropIns');
    case 'visit_captures':
      return t('circle.tabVisitCaptures');
    case 'appointments':
      return t('circle.tabAppointments');
    case 'hidden':
      return t('circle.tabHidden');
    default:
      return t('circle.tabDiscussion');
  }
}

function circlePostInboxTabIcon(view: CirclePostInboxView): LucideIcon | null {
  switch (view) {
    case 'announcements':
      return Megaphone;
    case 'care_transition':
      return ClipboardList;
    case 'visit_captures':
      return CircleDot;
    case 'appointments':
      return CalendarClock;
    case 'drop_ins':
      return MessageCircle;
    case 'hidden':
      return Trash2;
    default:
      return null;
  }
}

function circlePostInboxTabIconClass(view: CirclePostInboxView, active: boolean): string {
  if (!active) return 'text-slate-500';
  switch (view) {
    case 'announcements':
      return 'text-violet-600';
    case 'care_transition':
      return 'text-amber-700';
    case 'visit_captures':
      return 'text-teal-600';
    case 'appointments':
      return 'text-amber-600';
    case 'drop_ins':
      return 'text-blue-600';
    case 'hidden':
      return 'text-blue-600';
    default:
      return 'text-slate-500';
  }
}

function formatCircleThreadActionErrorLocalized(
  t: ReturnType<typeof useCircleT>,
  err: unknown,
  fallbackKey: 'circle.hideFailed' | 'circle.deleteFailed',
): string {
  return formatCircleThreadActionError(t, err, fallbackKey);
}

export function CircleCircleScreen({
  user,
  db,
  patient,
  unreadCount,
  openUnreadCount,
  restrictedUnreadCount,
  canInitiateDropIn = false,
  patientDropInFeatureEnabled = true,
  patientOnline = false,
  patientDoNotDisturb = false,
  onStartDropIn,
  onResumeDropIn,
  dropInActive = false,
  dropInChatOpen = false,
  onRecordVisit,
  circleInboxIntent = null,
  onCircleInboxIntentConsumed,
}: CircleCircleScreenProps) {
  const t = useCircleT();
  const { language: viewerLanguage } = useCircleI18nContext();
  const { settings: remoteSettings } = useCircleRemoteSettingsFromShell();
  const patientLanguage = normalizeCircleUiLanguage(remoteSettings?.primaryLanguage);
  const memberLanguages = useCirclePatientMemberLanguages(db, patient.patientId, user.uid, {
    pendingProvision: patient.isPendingProvision === true,
  });
  const memberRole = patient.role as CircleMemberRole;
  const { inviteContext: memberInviteContext, memberContactId, inviteContextReady } = useCircleMemberInviteContext(
    db,
    user,
    patient,
  );
  const ownRoleLabel = translateCircleMemberRole(t, memberRole);
  const memberDisplayNames = useCirclePatientMemberDisplayNames(db, patient.patientId);
  const isProxy = patient.role === 'proxy' && !!patient.capabilities.inviteMembers;
  const canOpen = canParticipateInCircleOpenThread(memberRole);
  const canRestricted = canSeeCircleRestrictedThread(memberRole);
  const canPostAnnouncement = canPostCircleAnnouncement(memberRole);
  const compactChrome = useCircleCompactChrome();
  const onboardingEnabled = patient.isPendingProvision !== true;
  const {
    showWelcome: showOnboardingWelcome,
    dismissWelcome,
    dismissing: onboardingDismissing,
  } = useCircleMemberOnboarding(db, patient.patientId, user.uid, onboardingEnabled);
  const {
    showNotice: showInitiateNotice,
    dismissNotice: dismissInitiateNotice,
    dismissing: initiateDismissing,
  } = useCircleInitiateMessagesNotice(
    db,
    patient.patientId,
    user.uid,
    patient.role,
    remoteSettings,
    onboardingEnabled,
  );

  const [activeThread, setActiveThread] = useState<CircleMemberThreadKind>('open');
  const [inboxView, setInboxView] = useState<CirclePostInboxView>('discussion');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const [composeMenuOpen, setComposeMenuOpen] = useState(false);
  const composeMenuRef = useRef<HTMLDivElement | null>(null);
  const [helpComposerOpen, setHelpComposerOpen] = useState(false);
  const [packStarterOpen, setPackStarterOpen] = useState(false);
  const [aiGuidanceOpen, setAiGuidanceOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replySendError, setReplySendError] = useState<string | null>(null);
  const [hideTarget, setHideTarget] = useState<CircleMemberThreadPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CircleMemberThreadPost | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [careTransitionOpen, setCareTransitionOpen] = useState(false);

  const {
    state: careTransitionState,
    loading: careTransitionLoading,
    openItemCount: careTransitionOpenCount,
    canAddHelp,
    canManage: canManageCareTransition,
  } = useCareTransitionReadiness(db, patient.patientId, user.uid, memberRole, t);

  const showCareTransitionUnderAnnouncements = useMemo(() => {
    if (inboxView !== 'announcements' || careTransitionLoading || !careTransitionState?.activePackId) {
      return false;
    }
    return careTransitionOpenCount > 0;
  }, [
    careTransitionLoading,
    careTransitionOpenCount,
    careTransitionState?.activePackId,
    inboxView,
  ]);

  const postReadTick = useSyncExternalStore(
    subscribeCirclePostThreadRead,
    getCirclePostThreadReadSnapshot,
    () => 0,
  );

  const getPostLastRead = useCallback(
    (postId: string) =>
      getCirclePostThreadLastReadAt(patient.patientId, user.uid, activeThread, postId),
    [activeThread, patient.patientId, user.uid],
  );

  const skipInboxResetForThreadRef = useRef(false);
  const pendingAttentionFolderRef = useRef<CirclePostInboxView | null>(null);

  useEffect(() => {
    if (!circleInboxIntent) return;
    skipInboxResetForThreadRef.current = true;
    pendingAttentionFolderRef.current = circleInboxIntent.view;
    setActiveThread(circleInboxIntent.thread);
    setInboxView(circleInboxIntent.view);
    setSelectedPostId(null);
    onCircleInboxIntentConsumed?.();
  }, [circleInboxIntent, onCircleInboxIntentConsumed]);

  useEffect(() => {
    if (!canRestricted && activeThread === 'restricted') {
      setActiveThread('open');
    }
  }, [activeThread, canRestricted]);

  useEffect(() => {
    if (skipInboxResetForThreadRef.current) {
      skipInboxResetForThreadRef.current = false;
      return;
    }
    setInboxView('discussion');
    setSelectedPostId(null);
  }, [activeThread]);

  useEffect(() => {
    setSelectedPostId(null);
    setComposeMenuOpen(false);
    setHelpComposerOpen(false);
    setPackStarterOpen(false);
  }, [inboxView]);

  useEffect(() => {
    if (!composeMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (composeMenuRef.current?.contains(event.target as Node)) return;
      setComposeMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setComposeMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [composeMenuOpen]);

  const threadEnabled = activeThread === 'open' ? canOpen : canRestricted;

  const { loading, error, rawPosts, hiddenByPostId } = useCircleMemberThread(
    db,
    patient.patientId,
    activeThread,
    threadEnabled,
    user.uid,
  );
  const calendarSubscription = useMemo(
    () =>
      canViewCircleAppointmentInvites(memberRole)
        ? buildCareCalendarEntriesSubscription(patient, user.uid, memberInviteContext, {
            inviteContextReady,
            memberRole,
          })
        : undefined,
    [inviteContextReady, memberInviteContext, memberRole, patient, user.uid],
  );
  const { entries: careCalendarEntries } = useCareCalendarEntries(
    db,
    patient.patientId,
    calendarSubscription,
  );

  const careCalendarEntryById = useMemo(
    () => new Map(careCalendarEntries.map((entry) => [entry.id, entry])),
    [careCalendarEntries],
  );

  const suppressPastAppointmentInviteUnread = useCallback(
    (post: CircleMemberThreadPost) =>
      isPastAppointmentInvitePost(post, careCalendarEntryById),
    [careCalendarEntryById],
  );

  const allPosts = useMemo(
    () =>
      activeThread === 'open' && canViewCircleAppointmentInvites(memberRole)
        ? mergeAppointmentInvitePostsWithCareCalendar(
            rawPosts,
            careCalendarEntries,
            memberInviteContext,
            patient.patientId,
            memberRole,
          )
        : rawPosts,
    [activeThread, careCalendarEntries, memberInviteContext, memberRole, patient.patientId, rawPosts],
  );

  useEffect(() => {
    const view = pendingAttentionFolderRef.current;
    if (!view || loading) return;
    pendingAttentionFolderRef.current = null;
    markCirclePostsRead(
      patient.patientId,
      user.uid,
      activeThread,
      filterPostsForInboxView(
        allPosts,
        view,
        hiddenByPostId,
        activeThread,
        user.uid,
        memberInviteContext,
        memberRole,
      ),
    );
  }, [
    activeThread,
    allPosts,
    hiddenByPostId,
    loading,
    memberInviteContext,
    memberRole,
    patient.patientId,
    user.uid,
  ]);

  const showCircleOnboarding =
    showOnboardingWelcome && activeThread === 'open' && inboxView === 'discussion';
  const showCircleInitiateNotice =
    showInitiateNotice && activeThread === 'open' && inboxView === 'discussion';

  const inboxViews = useMemo(() => {
    const views = circlePostInboxViewsForThread(activeThread, memberRole);
    // Friends stay informed via announcements; checklist tab is for care team + family.
    if (normalizeMemberRole(memberRole) === 'friend') {
      return views.filter((view) => view !== 'care_transition');
    }
    return views;
  }, [activeThread, memberRole]);

  useEffect(() => {
    if (!inboxViews.includes(inboxView)) {
      setInboxView('discussion');
    }
  }, [inboxView, inboxViews]);

  const showComposer =
    inboxView === 'discussion' || (inboxView === 'announcements' && canPostAnnouncement);
  const canStartCareTransitionPack =
    canManageCareTransition && !careTransitionState?.activePackId;
  const showTasksCompose =
    inboxView === 'care_transition' && (canAddHelp || canStartCareTransitionPack);
  const showHeaderPlus = showComposer || showTasksCompose;

  useEffect(() => {
    if (!showComposer) {
      setComposerOpen(false);
      setPollComposerOpen(false);
      setComposeMenuOpen(false);
      setAiGuidanceOpen(false);
    }
  }, [showComposer]);

  const { iconViews: inboxIconViews, textViews: inboxTextViews } = useMemo(
    () => partitionCirclePostInboxViews(inboxViews),
    [inboxViews],
  );
  const showInboxTabDivider = inboxIconViews.length > 0 && inboxTextViews.length > 0;

  const dropInFolderVariant = useMemo((): CirclePostFolderActionVariant | null => {
    if (inboxView !== 'drop_ins' || activeThread !== 'restricted' || !canInitiateDropIn) {
      return null;
    }
    if (dropInActive && !dropInChatOpen) return 'drop_in_resume';
    if (dropInActive && dropInChatOpen) return null;
    if (!patientDropInFeatureEnabled) return 'drop_in_disabled';
    if (!patientOnline) return 'drop_in_offline';
    if (patientDoNotDisturb) return 'drop_in_dnd';
    return onStartDropIn ? 'drop_in_start' : null;
  }, [
    activeThread,
    canInitiateDropIn,
    dropInActive,
    dropInChatOpen,
    inboxView,
    onStartDropIn,
    patientDoNotDisturb,
    patientDropInFeatureEnabled,
    patientOnline,
  ]);

  const showRecordVisitAction =
    inboxView === 'visit_captures' &&
    canRecordVisitCaptureInCircleFolder(memberRole, activeThread) &&
    !!onRecordVisit;

  const folderActionCard = dropInFolderVariant ? (
    <CirclePostFolderActionCard
      variant={dropInFolderVariant}
      onAction={
        dropInFolderVariant === 'drop_in_resume'
          ? onResumeDropIn
          : dropInFolderVariant === 'drop_in_start'
            ? onStartDropIn
            : undefined
      }
      t={t}
      className="mb-3"
    />
  ) : showRecordVisitAction ? (
    <CirclePostFolderActionCard variant="record_visit" onAction={onRecordVisit} t={t} className="mb-3" />
  ) : null;

  const filteredPosts = useMemo(
    () =>
      filterPostsForInboxView(
        allPosts,
        inboxView,
        hiddenByPostId,
        activeThread,
        user.uid,
        memberInviteContext,
        memberRole,
      ),
    [activeThread, allPosts, hiddenByPostId, inboxView, memberInviteContext, memberRole, user.uid],
  );

  const orderedPosts = useMemo(
    () =>
      [...filteredPosts].sort(
        (a, b) => getCirclePostLatestActivityAt(b) - getCirclePostLatestActivityAt(a),
      ),
    [filteredPosts],
  );

  const selectedPost = useMemo(() => {
    const post = allPosts.find((row) => row.id === selectedPostId);
    if (!post) return null;
    if (!isAppointmentInviteVisibleToMember(post, user.uid, memberInviteContext, memberRole)) return null;
    return post;
  }, [allPosts, memberInviteContext, memberRole, selectedPostId, user.uid]);

  const selectedPostIsDiscussion = useMemo(
    () => !!selectedPost && isDiscussionThreadPost(selectedPost),
    [selectedPost],
  );

  const selectedPostSupportsReplies = useMemo(
    () =>
      selectedPostIsDiscussion &&
      canReplyToCircleMemberThreadPost(selectedPost!, memberRole, activeThread),
    [activeThread, memberRole, selectedPost, selectedPostIsDiscussion],
  );

  const {
    replies: selectedPostReplies,
    loading: selectedPostRepliesLoading,
    error: selectedPostRepliesError,
  } = useCircleMemberThreadPostReplies(
    db,
    patient.patientId,
    activeThread,
    selectedPostId,
    selectedPostIsDiscussion,
  );

  const inboxTabCounts = useMemo(() => {
    const counts = inboxViews.reduce(
      (acc, view) => {
        acc[view] = {
          total: countPostsForInboxView(
            allPosts,
            view,
            hiddenByPostId,
            activeThread,
            user.uid,
            memberInviteContext,
            memberRole,
          ),
          unread: countUnreadPostsForInboxView(
            allPosts,
            view,
            hiddenByPostId,
            activeThread,
            user.uid,
            getPostLastRead,
            memberInviteContext,
            memberRole,
            activeThread === 'open' ? suppressPastAppointmentInviteUnread : undefined,
          ),
        };
        return acc;
      },
      {} as Record<CirclePostInboxView, { total: number; unread: number }>,
    );
    if (inboxViews.includes('care_transition')) {
      counts.care_transition = {
        total: careTransitionOpenCount,
        unread: careTransitionOpenCount,
      };
    }
    return counts;
  }, [
    activeThread,
    allPosts,
    careTransitionOpenCount,
    getPostLastRead,
    hiddenByPostId,
    inboxViews,
    memberInviteContext,
    memberRole,
    postReadTick,
    suppressPastAppointmentInviteUnread,
    user.uid,
  ]);

  const activeTabUnread = inboxTabCounts[inboxView]?.unread ?? 0;

  const authorName = useMemo(
    () => user.displayName?.trim() || user.email?.split('@')[0] || t('circle.circleMemberFallback'),
    [t, user.displayName, user.email],
  );

  const recentContext = useMemo(
    () =>
      allPosts
        .filter(
          (post) =>
            !hiddenByPostId[post.id] &&
            isAppointmentInviteVisibleToMember(post, user.uid, memberInviteContext, memberRole),
        )
        .slice(-6)
        .map((p) => `${p.authorName}: ${p.text}`)
        .join('\n'),
    [allPosts, hiddenByPostId, memberInviteContext, memberRole, user.uid],
  );

  const handleMarkTabRead = useCallback(() => {
    markCirclePostsRead(
      patient.patientId,
      user.uid,
      activeThread,
      filterPostsForInboxView(
        allPosts,
        inboxView,
        hiddenByPostId,
        activeThread,
        user.uid,
        memberInviteContext,
        memberRole,
      ),
    );
  }, [activeThread, allPosts, hiddenByPostId, inboxView, memberInviteContext, memberRole, patient.patientId, user.uid]);

  const openPost = useCallback(
    (postId: string) => {
      const post = allPosts.find((row) => row.id === postId);
      if (!post) return;
      setReplyDraft('');
      setReplySendError(null);
      setSelectedPostId(postId);
      markCirclePostThreadReadThroughActivity(
        patient.patientId,
        user.uid,
        activeThread,
        postId,
        getCirclePostLatestActivityAt(post),
      );
    },
    [activeThread, allPosts, patient.patientId, user.uid],
  );

  const leavePost = useCallback(() => {
    setSelectedPostId(null);
    setReplyDraft('');
    setReplySendError(null);
  }, []);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    const postingDiscussion = inboxView === 'discussion';
    const postingAnnouncement = inboxView === 'announcements' && canPostAnnouncement;
    if (!text || sending || !threadEnabled || (!postingDiscussion && !postingAnnouncement)) {
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const targetLanguages = [
        ...new Set(Object.values(memberLanguages.byUid)),
      ] as CircleUiLanguage[];
      const translations = await buildCircleThreadPostTranslations(
        text,
        viewerLanguage,
        targetLanguages,
      );
      await createCircleMemberThreadPost(db, {
        patientId: patient.patientId,
        threadKind: activeThread,
        authorUid: user.uid,
        authorName,
        authorRole: memberRole,
        text,
        postKind: postingAnnouncement ? 'announcement' : 'discussion',
        ...(translations.length > 0 ? { translations } : {}),
      });
      setDraft('');
      setComposerOpen(false);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('circle.sendFailed'));
    } finally {
      setSending(false);
    }
  }, [
    activeThread,
    authorName,
    canPostAnnouncement,
    db,
    draft,
    inboxView,
    memberLanguages.byUid,
    memberRole,
    patient.patientId,
    sending,
    threadEnabled,
    user.uid,
    viewerLanguage,
    t,
  ]);

  const handleSendPoll = useCallback(
    async (question: string, options: string[], closesAt: number, description: string) => {
      if (sending || !threadEnabled || inboxView !== 'discussion') return;
      setSending(true);
      setSendError(null);
      try {
        const targetLanguages = [
          ...new Set(Object.values(memberLanguages.byUid)),
        ] as CircleUiLanguage[];
        const translations = await buildCirclePollTranslations(
          question,
          options,
          viewerLanguage,
          targetLanguages,
          description,
        );
        await createCircleMemberThreadPost(db, {
          patientId: patient.patientId,
          threadKind: activeThread,
          authorUid: user.uid,
          authorName,
          authorRole: memberRole,
          text: question,
          postKind: 'poll',
          pollOptions: options,
          pollDescription: description,
          pollClosesAt: closesAt,
          ...(translations.length > 0 ? { translations } : {}),
        });
        setPollComposerOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('circle.sendFailed');
        setSendError(
          /permission-denied|insufficient permissions/i.test(message)
            ? t('circle.pollPermissionDenied')
            : message,
        );
      } finally {
        setSending(false);
      }
    },
    [
      activeThread,
      authorName,
      db,
      inboxView,
      memberLanguages.byUid,
      memberRole,
      patient.patientId,
      sending,
      threadEnabled,
      user.uid,
      viewerLanguage,
      t,
    ],
  );

  const handleSendReply = useCallback(async () => {
    const text = replyDraft.trim();
    if (!text || replySending || !selectedPost || !selectedPostSupportsReplies) return;
    setReplySending(true);
    setReplySendError(null);
    let translations: Awaited<ReturnType<typeof buildCircleThreadPostTranslations>> = [];
    try {
      const targetLanguages = [
        ...new Set(Object.values(memberLanguages.byUid)),
      ] as CircleUiLanguage[];
      translations = await buildCircleThreadPostTranslations(
        text,
        viewerLanguage,
        targetLanguages,
      );
      await createCircleMemberThreadPostReply(db, {
        patientId: patient.patientId,
        threadKind: activeThread,
        postId: selectedPost.id,
        post: selectedPost,
        authorUid: user.uid,
        authorName,
        authorRole: memberRole,
        text,
        ...(translations.length > 0 ? { translations } : {}),
      });
      setReplyDraft('');
      markCirclePostThreadReadThroughActivity(
        patient.patientId,
        user.uid,
        activeThread,
        selectedPost.id,
        Date.now(),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t('circle.replyFailed');
      // If stored translations trip rules/size edge cases, retry once without them.
      if (
        translations.length > 0 &&
        /permission-denied|insufficient permissions/i.test(message)
      ) {
        try {
          await createCircleMemberThreadPostReply(db, {
            patientId: patient.patientId,
            threadKind: activeThread,
            postId: selectedPost.id,
            post: selectedPost,
            authorUid: user.uid,
            authorName,
            authorRole: memberRole,
            text,
          });
          setReplyDraft('');
          markCirclePostThreadReadThroughActivity(
            patient.patientId,
            user.uid,
            activeThread,
            selectedPost.id,
            Date.now(),
          );
          return;
        } catch (retryErr) {
          setReplySendError(
            retryErr instanceof Error ? retryErr.message : t('circle.replyFailed'),
          );
          return;
        }
      }
      setReplySendError(message);
    } finally {
      setReplySending(false);
    }
  }, [
    activeThread,
    authorName,
    db,
    memberLanguages.byUid,
    memberRole,
    patient.patientId,
    replyDraft,
    replySending,
    selectedPost,
    selectedPostSupportsReplies,
    user.uid,
    viewerLanguage,
    t,
  ]);

  const confirmHide = useCallback(async () => {
    if (!hideTarget) return;
    setActionPending(true);
    setActionError(null);
    try {
      await hideCircleThreadPostForUser(
        db,
        patient.patientId,
        user.uid,
        activeThread,
        hideTarget.id,
      );
      setHideTarget(null);
      if (selectedPostId === hideTarget.id) {
        setSelectedPostId(null);
      }
    } catch (err) {
      setActionError(formatCircleThreadActionErrorLocalized(t, err, 'circle.hideFailed'));
    } finally {
      setActionPending(false);
    }
  }, [activeThread, db, hideTarget, patient.patientId, selectedPostId, user.uid, t]);

  const restorePost = useCallback(
    async (post: CircleMemberThreadPost) => {
      setActionError(null);
      try {
        await unhideCircleThreadPostForUser(db, patient.patientId, user.uid, post.id);
        if (selectedPostId === post.id) {
          setSelectedPostId(null);
        }
      } catch (err) {
        setActionError(formatCircleThreadActionErrorLocalized(t, err, 'circle.hideFailed'));
      }
    },
    [db, patient.patientId, selectedPostId, user.uid, t],
  );

  const confirmDeleteForEveryone = useCallback(async () => {
    if (!deleteTarget) return;
    setActionPending(true);
    setActionError(null);
    try {
      await deleteCircleThreadPostForEveryone(
        db,
        patient.patientId,
        activeThread,
        deleteTarget.id,
      );
      setDeleteTarget(null);
      if (selectedPostId === deleteTarget.id) {
        setSelectedPostId(null);
      }
    } catch (err) {
      setActionError(formatCircleThreadActionErrorLocalized(t, err, 'circle.deleteFailed'));
    } finally {
      setActionPending(false);
    }
  }, [activeThread, db, deleteTarget, patient.patientId, selectedPostId, t]);

  const renderInboxRow = (post: CircleMemberThreadPost) => {
    const unread = isCirclePostUnread(post, user.uid, getPostLastRead(post.id), {
      suppressUnread: suppressPastAppointmentInviteUnread(post),
    });
    const title = circlePostInboxTitle(t, post, viewerLanguage, user.uid);
    const authorDisplayName = resolveCircleThreadAuthorName(post, memberDisplayNames);
    const authorLine = circlePostInboxRowAuthorLine(
      t,
      post,
      user.uid,
      ownRoleLabel,
      authorDisplayName,
    );
    const snippet = circlePostInboxSnippet(post, viewerLanguage, user.uid, t);
    const replyCount = post.replyCount ?? 0;
    const activityAt = getCirclePostLatestActivityAt(post);
    const replyCountLabel = t(replyCount === 1 ? 'circle.reply_one' : 'circle.reply_other', {
      count: replyCount,
    });

    return (
      <li key={post.id} className="list-none">
        <div
          className={cn(
            'flex items-stretch transition-colors relative overflow-hidden rounded-xl border border-transparent',
            circleUrgencyInboxRowClass(null, false, unread, false),
          )}
        >
          {(() => {
            const accentClass = circleUrgencyLeftAccentClass(null, false, unread, false);
            return accentClass ? <span className={accentClass} aria-hidden /> : null;
          })()}
          <div
            className={cn(
              'flex flex-1 min-w-0 items-center gap-2',
              compactChrome ? 'py-2.5 px-3' : 'py-3 px-3',
              unread ? 'pl-3' : undefined,
            )}
          >
            <button
              type="button"
              onClick={() => openPost(post.id)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    {unread && (
                      <span className={circleUrgencyStatusBadgeClass('new-message')}>
                        {t('circle.badgeNew')}
                      </span>
                    )}
                    {isAppointmentInviteThreadPost(post) ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md">
                        {t('dashboard.careCalendar.legendAppointment')}
                      </span>
                    ) : null}
                    {isPollThreadPost(post) ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        {t('circle.inboxSnippetPoll')}
                      </span>
                    ) : null}
                    {replyCount > 0 && inboxView === 'discussion' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {replyCountLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-base font-bold truncate leading-snug text-slate-800">{title}</p>
                  <p className="text-xs mt-0.5 truncate text-slate-400">{authorLine}</p>
                  {snippet ? (
                    <p className="text-sm mt-0.5 line-clamp-2 leading-relaxed text-slate-500">
                      {snippet}
                    </p>
                  ) : null}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap text-right leading-snug pt-0.5">
                  {formatCirclePostTime(t, activityAt)}
                </span>
              </div>
            </button>
          </div>
          {inboxView === 'hidden' ? (
            <button
              type="button"
              onClick={() => void restorePost(post)}
              className="shrink-0 self-center px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/80 transition-colors"
              aria-label={t('circle.restoreToInbox')}
            >
              <Undo2 size={16} />
            </button>
          ) : !isSyntheticAppointmentInvitePostId(post.id) ? (
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setHideTarget(post);
              }}
              className="shrink-0 self-center px-2 text-slate-400 hover:text-red-600 hover:bg-red-50/80 transition-colors"
              aria-label={t('circle.removeFromView')}
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      </li>
    );
  };

  const messageModals = (
    <>
      <CircleMessageDeleteConfirmModal
        open={!!hideTarget}
        onClose={() => {
          if (actionPending) return;
          setHideTarget(null);
          setActionError(null);
        }}
        onConfirm={() => void confirmHide()}
        isDeleting={actionPending}
        errorMessage={actionError}
        title={t('circle.hideTitle')}
        description={t('circle.hideDescription')}
        confirmLabel={t('circle.hideConfirm')}
      />
      <CircleMessageDeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (actionPending) return;
          setDeleteTarget(null);
          setActionError(null);
        }}
        onConfirm={() => void confirmDeleteForEveryone()}
        isDeleting={actionPending}
        errorMessage={actionError}
        title={t('circle.deleteTitle')}
        description={
          deleteTarget && deleteTarget.authorUid === user.uid
            ? t('circle.deleteDescriptionOwn')
            : t('circle.deleteDescriptionProxy')
        }
        confirmLabel={t('circle.deleteConfirm')}
      />
    </>
  );

  if (!canOpen) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
        <p className="text-sm text-slate-500 leading-relaxed">{t('circle.unavailable')}</p>
      </div>
    );
  }

  if (selectedPost) {
    const isOwn = selectedPost.authorUid === user.uid;
    const highlightAsUnread = isCirclePostUnread(selectedPost, user.uid, getPostLastRead(selectedPost.id), {
      suppressUnread: suppressPastAppointmentInviteUnread(selectedPost),
    });
    const canDeleteForEveryone = canDeleteCircleThreadPostForEveryone(selectedPost, {
      uid: user.uid,
      isProxy,
    });

    return (
      <>
        <CirclePostDetailView
          post={selectedPost}
          isOwn={isOwn}
          ownRoleLabel={ownRoleLabel}
          viewerLanguage={viewerLanguage}
          patientLanguage={patientLanguage}
          highlightAsUnread={highlightAsUnread}
          readOnlyAnnouncement={isAnnouncementThreadPost(selectedPost)}
          canReply={!!selectedPostSupportsReplies}
          replies={selectedPostReplies}
          repliesLoading={selectedPostRepliesLoading}
          repliesError={selectedPostRepliesError}
          replyDraft={replyDraft}
          replySending={replySending}
          replySendError={replySendError}
          currentUserUid={user.uid}
          threadLastReadAt={getPostLastRead(selectedPost.id)}
          onReplyDraftChange={setReplyDraft}
          onSendReply={() => void handleSendReply()}
          canDeleteForEveryone={canDeleteForEveryone}
          onBack={leavePost}
          onHide={
            inboxView === 'hidden'
              ? undefined
              : () => {
                  setActionError(null);
                  setHideTarget(selectedPost);
                }
          }
          onRestore={
            inboxView === 'hidden' ? () => void restorePost(selectedPost) : undefined
          }
          onDeleteForEveryone={
            canDeleteForEveryone
              ? () => {
                  setActionError(null);
                  setDeleteTarget(selectedPost);
                }
              : undefined
          }
          t={t}
          db={db}
          patientId={patient.patientId}
          memberContactId={memberContactId}
          memberDocContactId={memberInviteContext.memberDocContactId}
          inviteContactId={memberInviteContext.inviteContactId}
          memberDisplayName={memberInviteContext.displayName}
          memberRole={memberRole}
          authorDisplayName={resolveCircleThreadAuthorName(selectedPost, memberDisplayNames)}
          onRecordVisit={onRecordVisit}
          translationTargetLanguages={[...new Set(Object.values(memberLanguages.byUid))] as CircleUiLanguage[]}
        />
        {messageModals}
      </>
    );
  }

  const showAiGuidanceAction = showComposer && isCircleAiAssistAvailable();

  const composerPlaceholder =
    inboxView === 'announcements'
      ? t('circle.composerPlaceholderAnnouncement')
      : activeThread === 'open'
        ? t('circle.composerPlaceholderCircle')
        : t('circle.composerPlaceholderCareTeam');

  const composerSendLabel =
    inboxView === 'announcements'
      ? t('circle.sendAnnouncement')
      : activeThread === 'open'
        ? t('circle.sendToEveryone')
        : t('circle.sendToCareTeam');

  const composerExpandTitle =
    inboxView === 'announcements'
      ? t('circle.expandTitleAnnouncement')
      : activeThread === 'open'
        ? t('circle.expandTitleCircle')
        : t('circle.expandTitleCareTeam');

  const composerExpandSubtitle =
    inboxView === 'announcements'
      ? t('circle.expandSubtitleAnnouncement')
      : activeThread === 'open'
        ? t('circle.expandSubtitleCircle')
        : t('circle.expandSubtitleCareTeam');

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div
          className={cn(
            circleSectionHeaderClass,
            circleSectionHeaderStackClass,
            circleWorkTabHeaderClass(compactChrome),
            'space-y-2 min-w-0',
          )}
        >
          <CircleWorkTabSectionIntro
            icon={Users}
            iconClassName="text-indigo-600"
            title={t('circle.title')}
            subtitle={circlePostInboxSubtitle(t, inboxView)}
            titleExtra={
              unreadCount > 0 ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                  {t('circle.unreadBadge', { count: formatCircleBadgeCount(unreadCount) })}
                </span>
              ) : undefined
            }
            trailing={
              showHeaderPlus ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  {showAiGuidanceAction ? (
                    <button
                      type="button"
                      onClick={() => setAiGuidanceOpen(true)}
                      className={cn(
                        circleHeaderActionButtonClass,
                        'bg-violet-100 text-violet-700 hover:bg-violet-200 hover:text-violet-800',
                      )}
                      aria-label={t('common.aria.privateAiGuidance')}
                      title={t('common.aria.privateAiGuidance')}
                    >
                      <Sparkles size={18} className="[@media(max-height:740px)]:size-4" />
                    </button>
                  ) : null}
                  {inboxView === 'discussion' ? (
                    <div className="relative" ref={composeMenuRef}>
                      <button
                        type="button"
                        onClick={() => setComposeMenuOpen((open) => !open)}
                        className={circleHeaderActionButtonClass}
                        aria-label={t('circle.composeNewMenuAria')}
                        title={t('circle.composeNewMenuAria')}
                        aria-haspopup="menu"
                        aria-expanded={composeMenuOpen}
                      >
                        <Plus size={18} className="[@media(max-height:740px)]:size-4" />
                      </button>
                      {composeMenuOpen ? (
                        <div
                          role="menu"
                          className="absolute right-0 mt-1.5 z-20 min-w-[11.5rem] rounded-2xl border border-slate-100 bg-white py-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setComposeMenuOpen(false);
                              setPollComposerOpen(false);
                              setComposerOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <MessageCircle size={16} className="text-blue-600 shrink-0" />
                            {t('circle.composeNewDiscussion')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setComposeMenuOpen(false);
                              setComposerOpen(false);
                              setPollComposerOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <BarChart2 size={16} className="text-blue-600 shrink-0" />
                            {t('circle.composeNewPoll')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : inboxView === 'care_transition' ? (
                    <div className="relative" ref={composeMenuRef}>
                      <button
                        type="button"
                        onClick={() => {
                          if (canAddHelp && canStartCareTransitionPack) {
                            setComposeMenuOpen((open) => !open);
                            return;
                          }
                          if (canStartCareTransitionPack) {
                            setPackStarterOpen((open) => !open);
                            return;
                          }
                          setHelpComposerOpen((open) => !open);
                        }}
                        className={circleHeaderActionButtonClass}
                        aria-label={
                          canAddHelp && canStartCareTransitionPack
                            ? t('circle.composeNewTasksMenuAria')
                            : canStartCareTransitionPack
                              ? t('circle.composeNewCareTransitionPack')
                              : t('circle.composeNewCircleHelp')
                        }
                        title={
                          canAddHelp && canStartCareTransitionPack
                            ? t('circle.composeNewTasksMenuAria')
                            : canStartCareTransitionPack
                              ? t('circle.composeNewCareTransitionPack')
                              : t('circle.composeNewCircleHelp')
                        }
                        aria-haspopup={canAddHelp && canStartCareTransitionPack ? 'menu' : undefined}
                        aria-expanded={
                          canAddHelp && canStartCareTransitionPack
                            ? composeMenuOpen
                            : canStartCareTransitionPack
                              ? packStarterOpen
                              : helpComposerOpen
                        }
                      >
                        <Plus size={18} className="[@media(max-height:740px)]:size-4" />
                      </button>
                      {composeMenuOpen && canAddHelp && canStartCareTransitionPack ? (
                        <div
                          role="menu"
                          className="absolute right-0 mt-1.5 z-20 min-w-[11.5rem] rounded-2xl border border-slate-100 bg-white py-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setComposeMenuOpen(false);
                              setPackStarterOpen(false);
                              setHelpComposerOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <HeartHandshake size={16} className="text-sky-700 shrink-0" />
                            {t('circle.composeNewCircleHelp')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setComposeMenuOpen(false);
                              setHelpComposerOpen(false);
                              setPackStarterOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <ClipboardList size={16} className="text-amber-700 shrink-0" />
                            {t('circle.composeNewCareTransitionPack')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPollComposerOpen(false);
                        setComposerOpen(true);
                      }}
                      className={circleHeaderActionButtonClass}
                      aria-label={t('circle.composeAnnouncementAria')}
                      title={t('circle.composeAnnouncementTitle')}
                    >
                      <Plus size={18} className="[@media(max-height:740px)]:size-4" />
                    </button>
                  )}
                </div>
              ) : undefined
            }
          />

          {canRestricted ? (
          <div className={circleTabListClass} role="tablist" aria-label={t('circle.threadsAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeThread === 'open'}
              onClick={() => setActiveThread('open')}
              className={circleTabButtonClass(activeThread === 'open')}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Users size={14} className="shrink-0 [@media(max-height:740px)]:hidden" />
                <ResponsiveTabLabel
                  long={t('circle.tabCircleLong')}
                  compact={t('circle.tabCircleCompact')}
                />
                <CircleTabCountBadge count={openUnreadCount} />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeThread === 'restricted'}
              onClick={() => setActiveThread('restricted')}
              className={circleTabButtonClass(activeThread === 'restricted')}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Shield size={14} className="shrink-0 [@media(max-height:740px)]:hidden" />
                <ResponsiveTabLabel
                  long={t('circle.tabCareCoordinationLong')}
                  compact={t('circle.tabCareCoordinationCompact')}
                />
                <CircleTabCountBadge count={restrictedUnreadCount} />
              </span>
            </button>
          </div>
          ) : null}

          <CircleThreadMembersRow
            key={activeThread}
            db={db}
            patientId={patient.patientId}
            patientDisplayName={patient.displayName}
            patientPhotoUrl={patient.photoUrl}
            isPendingProvision={patient.isPendingProvision === true}
            threadKind={activeThread}
            includeRestrictedPosts={canRestricted}
          />

          <CircleHorizontalScrollStrip
            className={cn('w-full min-w-0', circleInboxTabStripClass)}
            innerClassName="gap-1"
            role="tablist"
            aria-label={t('circle.inboxTabBucketsAria')}
          >
            {inboxIconViews.map((view) => {
              const Icon = circlePostInboxTabIcon(view);
              if (!Icon) return null;
              const active = inboxView === view;
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={circlePostInboxTabLabel(t, view)}
                  onClick={() => setInboxView(view)}
                  className={circleTabButtonClass(
                    active,
                    circleInboxIconTabExtraClass,
                  )}
                >
                  <span className="relative inline-flex items-center justify-center pr-1 pt-0.5">
                    <Icon
                      size={CIRCLE_INBOX_TAB_ICON_SIZE}
                      className={circlePostInboxTabIconClass(view, active)}
                      aria-hidden
                    />
                    <CircleFolderCountBadge {...inboxTabCounts[view]} placement="overlay" />
                  </span>
                </button>
              );
            })}
            {showInboxTabDivider ? (
              <span
                className="w-px h-7 bg-slate-200/90 shrink-0 mx-0.5 self-center"
                aria-hidden
              />
            ) : null}
            {inboxTextViews.map((view) => {
              const active = inboxView === view;
              if (view === 'hidden') {
                const Icon = circlePostInboxTabIcon(view);
                return (
                  <button
                    key={view}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={circlePostInboxTabLabel(t, view)}
                    onClick={() => setInboxView(view)}
                    className={circleTabButtonClass(
                      active,
                      circleInboxIconTabExtraClass,
                    )}
                  >
                    <span className="relative inline-flex items-center justify-center pr-1 pt-0.5">
                      {Icon ? (
                        <Icon
                          size={CIRCLE_INBOX_TAB_ICON_SIZE}
                          className={circlePostInboxTabIconClass(view, active)}
                          aria-hidden
                        />
                      ) : null}
                      <CircleFolderCountBadge {...inboxTabCounts[view]} placement="overlay" />
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setInboxView(view)}
                  className={circleTabButtonClass(
                    active,
                    circleInboxTextTabExtraClass,
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {circlePostInboxTabLabel(t, view)}
                    <CircleFolderCountBadge {...inboxTabCounts[view]} />
                  </span>
                </button>
              );
            })}
          </CircleHorizontalScrollStrip>

          <div className="flex items-start justify-between gap-2">
            {inboxView === 'care_transition' ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t('circle.tabCareTransition')}
              </p>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('circle.inboxListHeading')}
                </p>
                {activeTabUnread > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkTabRead}
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:text-red-900 px-2 py-1 rounded-lg hover:bg-red-100/80"
                  >
                    {t('circle.markAllRead')}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3">
          {(error || sendError || actionError) && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
              {error || sendError || actionError}
            </p>
          )}

          {showCircleOnboarding ? (
            <div className="mb-3">
              <CircleOnboardingWelcomeCard
                patient={patient}
                variant="circle"
                onDismiss={() => void dismissWelcome()}
                dismissing={onboardingDismissing}
              />
            </div>
          ) : null}

          {showCircleInitiateNotice ? (
            <div className="mb-3">
              <CircleInitiateMessagesWelcomeCard
                patient={patient}
                onDismiss={() => void dismissInitiateNotice()}
                dismissing={initiateDismissing}
              />
            </div>
          ) : null}

          {showCareTransitionUnderAnnouncements ? (
            <div className="mb-3">
              <CircleCareTransitionReadinessBanner
                patient={patient}
                readerUid={user.uid}
                state={careTransitionState}
                loading={careTransitionLoading}
                onOpen={() => setCareTransitionOpen(true)}
              />
            </div>
          ) : null}

          {inboxView === 'care_transition' ? (
            <CircleCareTransitionReadinessPanel
              user={user}
              db={db}
              patient={patient}
              compact
              composeInHeader
              helpComposerOpen={helpComposerOpen}
              onHelpComposerOpenChange={setHelpComposerOpen}
              packStarterOpen={packStarterOpen}
              onPackStarterOpenChange={setPackStarterOpen}
              onExpand={() => setCareTransitionOpen(true)}
            />
          ) : loading ? (
            <div className="py-12 flex justify-center text-slate-400 [@media(max-height:740px)]:py-8">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : orderedPosts.length === 0 ? (
            <div className={circleSectionEmptyStateClass}>
              {folderActionCard}
              <p className="text-sm font-bold text-slate-700">
                {circleThreadLabelI18n(t, activeThread)} · {circlePostInboxTabLabel(t, inboxView)}
              </p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto [@media(max-height:740px)]:mt-1 [@media(max-height:740px)]:text-xs">
                {circlePostInboxEmptyMessage(t, inboxView, canPostAnnouncement)}
              </p>
            </div>
          ) : (
            <>
              {folderActionCard}
              <ol className="space-y-2 list-none p-0 m-0">{orderedPosts.map(renderInboxRow)}</ol>
            </>
          )}
        </div>

        {showComposer ? (
          <CircleExpandableMessageComposer
            presentation="overlay"
            expanded={composerOpen}
            onExpandedChange={setComposerOpen}
            showAiButton={false}
            value={draft}
            onChange={setDraft}
            placeholder={composerPlaceholder}
            disabled={sending}
            sending={sending}
            onClear={() => setDraft('')}
            onSend={handleSend}
            clearLabel={t('circle.clear')}
            sendLabel={composerSendLabel}
            sendingLabel={t('circle.sending')}
            maxLength={5000}
            expandTitle={composerExpandTitle}
            expandSubtitle={composerExpandSubtitle}
            error={sendError}
          />
        ) : null}

        {showComposer && inboxView === 'discussion' ? (
          <CirclePollComposer
            open={pollComposerOpen}
            sending={sending}
            error={sendError}
            onClose={() => setPollComposerOpen(false)}
            onPost={handleSendPoll}
          />
        ) : null}

        {showAiGuidanceAction ? (
          <CircleAiGuidanceModal
            open={aiGuidanceOpen}
            onClose={() => setAiGuidanceOpen(false)}
            threadLabel={circleThreadLabelI18n(t, activeThread)}
            memberRole={memberRole}
            recentContext={recentContext || undefined}
          />
        ) : null}
      </div>

      {messageModals}

      <CircleMessageExpandOverlay
        open={careTransitionOpen}
        title={t('careTransition.title')}
        subtitle={t('careTransition.subtitle', { name: patient.displayName })}
        onClose={() => setCareTransitionOpen(false)}
        t={t}
      >
        <CircleCareTransitionReadinessPanel
          user={user}
          db={db}
          patient={patient}
          hideHeader
          showCircleHelp={false}
        />
      </CircleMessageExpandOverlay>
    </div>
  );
}
