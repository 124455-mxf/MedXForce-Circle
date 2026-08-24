import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { AnalyticsMetricId, CircleMemberThreadKind, CirclePatientSummary } from '@medxforce/shared';
import type { CircleMessagesAnalyticsFocus } from './CircleMessagesAnalyticsDetail';
import {
  canCircleMemberUseDropIn,
  canSendPatientRemoteCommands,
  canStartVisitCapture,
  canViewRemoteSettingsTab,
  circleDisplayFirstName,
  normalizeMemberRole,
  parseCircleDropInAccessConfig,
  repairInactiveAcceptedMemberDocsForUser,
  repairOrphanAcceptedInvitesForUser,
  visitCapturePublishThreadKind,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleChromeProvider } from '../lib/circleChromeContext';

import { CircleAdminScreen } from './CircleAdminScreen';
import { CirclePatientProfileScreen } from './CirclePatientProfileScreen';
import { CircleAppHeader } from './CircleAppHeader';
import {
  CircleBottomNav,
  allNavItemsForPatient,
  moreNavItemsForPatient,
  localizeNavItems,
  primaryNavItemsForPatient,
  type CircleMainTab,
} from './CircleBottomNav';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { CircleDiaryScreen } from './CircleDiaryScreen';
import { CircleScheduleScreen } from './CircleScheduleScreen';
import { CircleKnowScreen } from './CircleKnowScreen';
import { CircleMedXForceLabScreen } from './CircleMedXForceLabScreen';
import { CirclePatientSwitcher } from './CirclePatientSwitcher';
import { CircleCircleScreen } from './CircleCircleScreen';
import { CircleDashboardScreen } from './CircleDashboardScreen';

const CircleAnalyticsScreen = lazy(() =>
  import('./CircleAnalyticsScreen').then((m) => ({ default: m.CircleAnalyticsScreen })),
);
const PatientGalleryScreen = lazy(() =>
  import('./PatientGalleryScreen').then((m) => ({ default: m.PatientGalleryScreen })),
);
const PatientMessagesScreen = lazy(() =>
  import('./PatientMessagesScreen').then((m) => ({ default: m.PatientMessagesScreen })),
);
const CircleRemoteSettingsScreen = lazy(() =>
  import('./CircleRemoteSettingsScreen').then((m) => ({ default: m.CircleRemoteSettingsScreen })),
);
import { useCircleOwnManagedContact } from '../hooks/useCircleOwnManagedContact';
import { useCircleOnlineVisibility } from '../hooks/useCircleOnlineVisibility';
import { startCircleMemberLastOpenHeartbeat, startCircleMemberPresenceHeartbeat } from '../services/circleMemberPresenceService';
import { useCircleAlertAttentionState } from '../hooks/useCircleAlertAttentionState';
import { useFamilyGalleryDashboard } from '../hooks/useFamilyGalleryDashboard';
import { DASHBOARD_STATS_DAYS } from '../lib/circleDashboardStats';
import { useCircleMemberThreadUnread } from '../hooks/useCircleMemberThreadUnread';
import { useScheduleActionBadgeCount } from '../hooks/useScheduleActionBadgeCount';
import { useCirclePatientThreads } from '../hooks/useCirclePatientThreads';
import { CirclePatientThreadsProvider } from '../context/CirclePatientThreadsContext';
import { useCircleToast } from '../hooks/useCircleToast';
import {
  isPatientDoNotDisturbSection,
  usePatientOnlinePresence,
} from '../hooks/usePatientOnlinePresence';
import type { UnsavedReplyDraftGuard } from '../lib/unsavedReplyDraft';
import { CircleAppToast } from './CircleAppToast';
import { VisitCaptureFlow } from './VisitCaptureFlow';
import { useCirclePatientRemoteCommand } from '../hooks/useCirclePatientRemoteCommand';
import { CirclePatientCommandResponseModal } from './CirclePatientCommandResponseModal';
import { CircleDropInConfirmModal } from './CircleDropInConfirmModal';
import { CircleDropInChatModal } from './CircleDropInChatModal';
import { CircleDropInShareModal } from './CircleDropInShareModal';
import { CircleDropInResponseModal } from './CircleDropInResponseModal';
import { CircleDropInPatientRequestModal } from './CircleDropInPatientRequestModal';
import { CircleDropInPatientRequestBanner } from './CircleDropInPatientRequestBanner';
import { useCircleDropIn } from '../hooks/useCircleDropIn';
import { useCirclePatientMemberLanguages } from '../hooks/useCirclePatientMemberLanguages';
import { useCircleRemoteSettings } from '../hooks/useCircleRemoteSettings';
import { CircleSelectedPatientProvider } from '../context/CircleSelectedPatientContext';
import { normalizeCircleUiLanguage } from '../lib/circleLanguages';
import type { CirclePostInboxView } from '../lib/circlePostInboxViews';
import type { CircleGalleryIntent } from '../lib/circleGalleryIntent';
import type { CircleScheduleViewIntent } from '../lib/circleSchedulePreferences';

function TabLoadingFallback() {
  return <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">Loading…</div>;
}

interface CircleMainShellProps {
  user: User;
  accountPhotoUrl?: string;
  onOpenProfile: () => void;
  patients: CirclePatientSummary[];
  db: Firestore;
  storage: FirebaseStorage;
  inviteError: string | null;
  onSignOut?: () => void;
  selectedPatientId: string | null;
  onSelectPatient: (patient: CirclePatientSummary) => void;
  startupPatientId?: string | null;
  onSetStartupPatient?: (patient: CirclePatientSummary) => void;
  onCancelPending?: (patient: CirclePatientSummary) => Promise<void>;
}

export function CircleMainShell({
  user,
  accountPhotoUrl,
  onOpenProfile,
  patients,
  db,
  storage,
  inviteError,
  selectedPatientId,
  onSelectPatient,
  startupPatientId = null,
  onSetStartupPatient,
  onCancelPending,
}: CircleMainShellProps) {
  const [activeTab, setActiveTab] = useState<CircleMainTab>('dashboard');
  const [initialAnalyticsMetricId, setInitialAnalyticsMetricId] =
    useState<AnalyticsMetricId | null>(null);
  const [initialMessagesFocus, setInitialMessagesFocus] =
    useState<CircleMessagesAnalyticsFocus | null>(null);
  const [initialAssessmentsOverview, setInitialAssessmentsOverview] = useState(false);
  const [initialPeriodOverviewDays, setInitialPeriodOverviewDays] = useState<7 | 30 | null>(null);
  const [initialAdminUsersTab, setInitialAdminUsersTab] = useState<'people' | 'access' | null>(
    null,
  );
  const { language, t } = useCircleI18nContext();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [visitCaptureOpen, setVisitCaptureOpen] = useState(false);
  const [visitCaptureEntryId, setVisitCaptureEntryId] = useState<string | null>(null);
  const [circleInboxIntent, setCircleInboxIntent] = useState<{
    thread: CircleMemberThreadKind;
    view: CirclePostInboxView;
  } | null>(null);
  const [messagesInboxIntent, setMessagesInboxIntent] = useState<
    'communication_log' | 'in_out' | null
  >(null);
  const [galleryIntent, setGalleryIntent] = useState<CircleGalleryIntent | null>(null);
  const [scheduleViewIntent, setScheduleViewIntent] = useState<CircleScheduleViewIntent | null>(
    null,
  );
  const [dropInConfirmOpen, setDropInConfirmOpen] = useState(false);
  const [dropInSentThisOpen, setDropInSentThisOpen] = useState(false);
  const replyDraftGuardRef = useRef<UnsavedReplyDraftGuard | null>(null);
  const analyticsOriginTabRef = useRef<CircleMainTab | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const compactChrome = activeTab !== 'dashboard';

  useEffect(() => {
    if (activeTab !== 'schedule') setScheduleViewIntent(null);
  }, [activeTab]);

  useLayoutEffect(() => {
    const el = mainRef.current;
    if (el) el.scrollTop = 0;
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => {
      if (el) el.scrollTop = 0;
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const guardedNavigate = useCallback(
    (proceed: () => void) => {
      if (activeTab === 'messages' && replyDraftGuardRef.current?.hasUnsavedDraft()) {
        replyDraftGuardRef.current.confirmNavigate(proceed);
        return;
      }
      proceed();
    },
    [activeTab],
  );

  const handleTabChange = useCallback(
    (tab: CircleMainTab) => {
      if (tab === 'messages' && activeTab === 'messages') {
        const guard = replyDraftGuardRef.current;
        if (guard?.isThreadOpen?.()) {
          guard.popToInbox?.();
        }
        return;
      }
      analyticsOriginTabRef.current = null;
      setInitialAssessmentsOverview(false);
      setInitialPeriodOverviewDays(null);
      setScheduleViewIntent(null);
      guardedNavigate(() => setActiveTab(tab));
    },
    [activeTab, guardedNavigate],
  );

  const handleGoToTab = handleTabChange;

  const handleOpenSchedule = useCallback(
    (view?: CircleScheduleViewIntent) => {
      analyticsOriginTabRef.current = null;
      setInitialAssessmentsOverview(false);
      setInitialPeriodOverviewDays(null);
      guardedNavigate(() => {
        setScheduleViewIntent(view ?? null);
        setActiveTab('schedule');
      });
    },
    [guardedNavigate],
  );

  const handleBackToDashboard = useCallback(() => {
    setScheduleViewIntent(null);
    guardedNavigate(() => setActiveTab('dashboard'));
  }, [guardedNavigate]);

  const handleOpenAnalyticsDetail = useCallback(
    (metricId: AnalyticsMetricId, messagesFocus?: CircleMessagesAnalyticsFocus) => {
      analyticsOriginTabRef.current = activeTab;
      setInitialAssessmentsOverview(false);
      setInitialPeriodOverviewDays(null);
      setInitialAnalyticsMetricId(metricId);
      setInitialMessagesFocus(
        metricId === 'speech-history' ? (messagesFocus ?? 'messaging') : null,
      );
      guardedNavigate(() => setActiveTab('analytics'));
    },
    [activeTab, guardedNavigate],
  );

  const handleOpenAssessmentsOverview = useCallback(() => {
    analyticsOriginTabRef.current = activeTab;
    setInitialAnalyticsMetricId(null);
    setInitialMessagesFocus(null);
    setInitialPeriodOverviewDays(null);
    setInitialAssessmentsOverview(true);
    guardedNavigate(() => setActiveTab('analytics'));
  }, [activeTab, guardedNavigate]);

  const handleOpenAnalyticsPeriodOverview = useCallback(
    (days: 7 | 30) => {
      analyticsOriginTabRef.current = activeTab;
      setInitialAnalyticsMetricId(null);
      setInitialMessagesFocus(null);
      setInitialAssessmentsOverview(false);
      setInitialPeriodOverviewDays(days);
      guardedNavigate(() => setActiveTab('analytics'));
    },
    [activeTab, guardedNavigate],
  );

  const handleAnalyticsInitialMetricConsumed = useCallback(() => {
    setInitialAnalyticsMetricId(null);
    setInitialMessagesFocus(null);
    setInitialAssessmentsOverview(false);
    setInitialPeriodOverviewDays(null);
  }, []);

  const handleAnalyticsDetailClosedToOrigin = useCallback(() => {
    const origin = analyticsOriginTabRef.current;
    analyticsOriginTabRef.current = null;
    if (origin && origin !== 'analytics') {
      guardedNavigate(() => setActiveTab(origin));
    }
  }, [guardedNavigate]);

  const handleOpenAdminAccess = useCallback(() => {
    setInitialAdminUsersTab('access');
    guardedNavigate(() => setActiveTab('admin'));
  }, [guardedNavigate]);

  const handleAdminInitialUsersTabConsumed = useCallback(() => {
    setInitialAdminUsersTab(null);
  }, []);

  const handleCircleInboxIntentConsumed = useCallback(() => {
    setCircleInboxIntent(null);
  }, []);

  const handleOpenMessagesInbox = useCallback(
    (view: 'communication_log' | 'in_out') => {
      setMessagesInboxIntent(view);
      handleTabChange('messages');
    },
    [handleTabChange],
  );

  const handleMessagesInboxIntentConsumed = useCallback(() => {
    setMessagesInboxIntent(null);
  }, []);

  const handleGalleryIntentConsumed = useCallback(() => {
    setGalleryIntent(null);
  }, []);

  const handleOpenGalleryReactions = useCallback(() => {
    setGalleryIntent({ type: 'open-album', albumKind: 'reactions' });
    guardedNavigate(() => setActiveTab('media'));
  }, [guardedNavigate]);

  const handleOpenGalleryMyAlbums = useCallback(() => {
    setGalleryIntent({ type: 'open-my-albums' });
    guardedNavigate(() => setActiveTab('media'));
  }, [guardedNavigate]);

  const selectedPatient = useMemo((): CirclePatientSummary | null => {
    if (patients.length === 0) return null;
    if (selectedPatientId) {
      const found = patients.find((p) => p.patientId === selectedPatientId);
      if (found) return found;
    }
    return patients[0];
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatient?.patientId || !user.uid) return;
    if (selectedPatient.isPendingProvision === true) return;
    void (async () => {
      try {
        await repairOrphanAcceptedInvitesForUser(db, user.uid);
        await repairInactiveAcceptedMemberDocsForUser(db, user.uid);
      } catch (err) {
        console.warn('[CircleMainShell] member repair skipped', err);
      }
    })();
  }, [db, selectedPatient?.isPendingProvision, selectedPatient?.patientId, user.uid]);

  const memberRole = selectedPatient ? normalizeMemberRole(selectedPatient.role) : 'friend';
  const showVisitCapture = !!selectedPatient && canStartVisitCapture(memberRole);
  const canReceiveRemoteCommandResponses =
    !!selectedPatient && canSendPatientRemoteCommands(selectedPatient.role);

  const handleVisitCapturePublished = useCallback(() => {
    setVisitCaptureEntryId(null);
    setVisitCaptureOpen(false);
    setCircleInboxIntent({
      thread: visitCapturePublishThreadKind(memberRole),
      view: 'visit_captures',
    });
    handleTabChange('circle');
  }, [handleTabChange, memberRole]);

  const handleOpenVisitCapture = useCallback((careCalendarEntryId?: string) => {
    setVisitCaptureEntryId(careCalendarEntryId?.trim() || null);
    setVisitCaptureOpen(true);
  }, []);

  const handleCloseVisitCapture = useCallback(() => {
    setVisitCaptureOpen(false);
    setVisitCaptureEntryId(null);
  }, []);

  const handleOpenCircleFolder = useCallback(
    (thread: CircleMemberThreadKind, folder: CirclePostInboxView) => {
      setCircleInboxIntent({ thread, view: folder });
      handleTabChange('circle');
    },
    [handleTabChange],
  );

  const remoteCommand = useCirclePatientRemoteCommand(
    db,
    selectedPatient?.patientId,
    user.uid,
    canReceiveRemoteCommandResponses,
  );

  const caregiverDisplayName =
    user.displayName?.trim() || user.email?.split('@')[0] || t('common.careTeam');

  const { contact: ownManagedContact } = useCircleOwnManagedContact(db, user, selectedPatient);
  const memberDisplayName = ownManagedContact?.name?.trim() || caregiverDisplayName;
  const memberFirstName =
    ownManagedContact?.firstName?.trim() ||
    circleDisplayFirstName(memberDisplayName);

  const patientPresence = usePatientOnlinePresence(db, selectedPatient?.patientId);

  const memberLanguages = useCirclePatientMemberLanguages(db, selectedPatient?.patientId, user.uid, {
    pendingProvision: selectedPatient?.isPendingProvision === true,
  });
  const remoteSettingsState = useCircleRemoteSettings(db, selectedPatient, user);
  const { settings: remoteSettings } = remoteSettingsState;
  const patientLanguage = normalizeCircleUiLanguage(remoteSettings?.primaryLanguage);
  // Match patient tablet: wait for settings, then follow featuresVisibility.dropIn.
  const patientDropInFeatureEnabled =
    remoteSettings != null && remoteSettings.featuresVisibility?.dropIn !== false;
  const canUseDropIn =
    !!selectedPatient &&
    canCircleMemberUseDropIn(
      patientDropInFeatureEnabled,
      parseCircleDropInAccessConfig(remoteSettings ?? {}),
      remoteSettings?.appMode,
      { uid: user.uid, role: memberRole },
    );
  const circleDropInEnabled = canUseDropIn;
  const canStartDropInRequest =
    canUseDropIn &&
    patientPresence.online &&
    !isPatientDoNotDisturbSection(patientPresence.activeSection);

  const circleDropIn = useCircleDropIn(
    db,
    selectedPatient?.patientId,
    user.uid,
    caregiverDisplayName,
    memberRole,
    selectedPatient?.displayName ?? 'Patient',
    circleDropInEnabled,
    patientPresence.online,
    language,
    t,
    memberLanguages.byUid,
    patientLanguage,
    canUseDropIn,
  );

  const openDropInConfirmModal = useCallback(() => {
    if (!canUseDropIn) return;
    setDropInSentThisOpen(false);
    setDropInConfirmOpen(true);
  }, [canUseDropIn]);

  const closeDropInConfirmModal = useCallback(() => {
    setDropInConfirmOpen(false);
    setDropInSentThisOpen(false);
  }, []);

  const handleDropInConfirmClose = useCallback(() => {
    if (circleDropIn.busy && !circleDropIn.awaitingPatientResponse) return;
    if (circleDropIn.awaitingPatientResponse) {
      void circleDropIn.cancelPendingDropIn().finally(closeDropInConfirmModal);
      return;
    }
    closeDropInConfirmModal();
  }, [
    circleDropIn.awaitingPatientResponse,
    circleDropIn.busy,
    circleDropIn.cancelPendingDropIn,
    closeDropInConfirmModal,
  ]);

  useEffect(() => {
    if (!dropInConfirmOpen || !dropInSentThisOpen || circleDropIn.awaitingPatientResponse) return;
    if (!circleDropIn.session || circleDropIn.session.requestedByUid !== user.uid) return;
    closeDropInConfirmModal();
  }, [
    circleDropIn.awaitingPatientResponse,
    circleDropIn.session,
    closeDropInConfirmModal,
    dropInConfirmOpen,
    dropInSentThisOpen,
    user.uid,
  ]);

  const remoteCommandAwaiting = useMemo(
    () => ({
      awaitingPatientResponse: remoteCommand.awaitingPatientResponse,
      responseSecondsRemaining: remoteCommand.responseSecondsRemaining,
      responseTimeoutSeconds: remoteCommand.responseTimeoutSeconds,
      busy: remoteCommand.busy,
      error: remoteCommand.error,
      sendRemoteCommand: remoteCommand.sendRemoteCommand,
      cancelPendingCommand: remoteCommand.cancelPendingCommand,
    }),
    [
      remoteCommand.awaitingPatientResponse,
      remoteCommand.busy,
      remoteCommand.cancelPendingCommand,
      remoteCommand.error,
      remoteCommand.responseSecondsRemaining,
      remoteCommand.responseTimeoutSeconds,
      remoteCommand.sendRemoteCommand,
    ],
  );

  const { hideOnlineStatusFromPatient } = useCircleOnlineVisibility(
    db,
    user.uid,
    selectedPatient?.patientId,
  );

  const navBuildOptions = useMemo(
    () => ({
      memberRole,
    }),
    [memberRole],
  );

  const primaryNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return localizeNavItems(
      primaryNavItemsForPatient(selectedPatient.capabilities, navBuildOptions),
      t,
    );
  }, [selectedPatient, navBuildOptions, t]);

  const moreNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return localizeNavItems(moreNavItemsForPatient(selectedPatient.capabilities, navBuildOptions), t);
  }, [selectedPatient, navBuildOptions, t]);

  const allNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return allNavItemsForPatient(selectedPatient.capabilities, navBuildOptions);
  }, [selectedPatient, navBuildOptions]);

  const threadState = useCirclePatientThreads(
    db,
    selectedPatient?.patientId ?? '',
    user,
    selectedPatient?.role ?? 'friend',
    remoteSettings,
  );

  const alertAttention = useCircleAlertAttentionState(
    threadState.messages,
    selectedPatient?.patientId ?? '',
    threadState.repliesByMessageId,
  );

  const { toast, showToast } = useCircleToast(4500);
  const toastedUrgentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    toastedUrgentIdsRef.current.clear();
  }, [selectedPatient?.patientId]);

  useEffect(() => {
    for (const item of alertAttention.urgentItems) {
      if (toastedUrgentIdsRef.current.has(item.id)) continue;
      toastedUrgentIdsRef.current.add(item.id);
      showToast(
        item.kind === 'alert'
          ? t('alertAttention.alertFromLovedOne')
          : t('alertAttention.needsAttention'),
        item.kind === 'alert' ? 'error' : 'info',
      );
    }
  }, [alertAttention.urgentItems, showToast, t]);

  const circleThreadUnread = useCircleMemberThreadUnread(
    db,
    selectedPatient?.patientId ?? '',
    user,
    selectedPatient?.role ?? '',
    selectedPatient,
  );

  const [scheduleScreenOpenCount, setScheduleScreenOpenCount] = useState<number | null>(null);

  useEffect(() => {
    setScheduleScreenOpenCount(null);
  }, [selectedPatient?.patientId]);

  const scheduleActionBadgeCount = useScheduleActionBadgeCount(
    db,
    selectedPatient?.patientId,
    user,
    selectedPatient,
  );
  const scheduleNavBadge =
    activeTab === 'schedule' && scheduleScreenOpenCount != null
      ? scheduleScreenOpenCount
      : scheduleActionBadgeCount;

  const galleryDashboard = useFamilyGalleryDashboard(
    db,
    selectedPatient?.patientId,
    user.uid,
    selectedPatient?.capabilities,
    DASHBOARD_STATS_DAYS,
  );

  useEffect(() => {
    if (allNavItems.length === 0) return;
    if (!allNavItems.some((item) => item.id === activeTab)) {
      setActiveTab(allNavItems[0].id);
    }
  }, [allNavItems, activeTab]);

  const navBadges = useMemo(() => {
    const messagesUnread = selectedPatient?.capabilities.messaging
      ? threadState.unreadCount
      : 0;
    const mediaUnseen = galleryDashboard.unseenMediaCount;
    const mediaInMore = moreNavItems.some((item) => item.id === 'media');

    return {
      messages: messagesUnread,
      circle: circleThreadUnread.unreadCount,
      schedule: scheduleNavBadge,
      media: mediaUnseen,
      more: 0,
      moreDot: mediaInMore && mediaUnseen > 0,
    };
  }, [
    circleThreadUnread.unreadCount,
    galleryDashboard.unseenMediaCount,
    moreNavItems,
    scheduleNavBadge,
    selectedPatient?.capabilities.messaging,
    threadState.unreadCount,
  ]);

  useEffect(() => {
    if (!user?.uid) return;
    return startCircleMemberLastOpenHeartbeat(db, user.uid);
  }, [db, user?.uid]);

  useEffect(() => {
    if (!selectedPatient?.patientId || !user?.uid || hideOnlineStatusFromPatient) return;
    return startCircleMemberPresenceHeartbeat(db, selectedPatient.patientId, user.uid);
  }, [db, hideOnlineStatusFromPatient, selectedPatient?.patientId, user?.uid]);

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
        <p className="text-sm text-slate-500">No patient selected.</p>
      </div>
    );
  }

  const handleSelectPatient = (patient: CirclePatientSummary) => {
    guardedNavigate(() => {
      setScheduleViewIntent(null);
      onSelectPatient(patient);
      setActiveTab('dashboard');
    });
  };

  return (
    <CirclePatientThreadsProvider value={threadState}>
    <CircleSelectedPatientProvider
      patientPresence={patientPresence}
      remoteSettings={remoteSettingsState}
      galleryDashboard={galleryDashboard}
    >
    <CircleChromeProvider compact={compactChrome} onBackToDashboard={handleBackToDashboard}>
      <div
        className={cn(
          'flex flex-col flex-1 min-h-0 overflow-hidden gap-2.5 [@media(max-height:740px)]:gap-2',
          compactChrome && 'gap-4 sm:gap-5 [@media(max-height:740px)]:gap-3',
        )}
      >
        <CircleAppHeader
          variant={compactChrome ? 'compact' : 'comfortable'}
          user={user}
          accountPhotoUrl={accountPhotoUrl}
          onOpenProfile={onOpenProfile}
          selectedPatient={selectedPatient}
          memberDisplayName={memberDisplayName}
          memberFirstName={memberFirstName}
          patientOnline={patientPresence.online}
          patientLastSeen={patientPresence.lastSeen}
          onOpenPatientSwitcher={
            patients.length > 1 ? () => setSwitcherOpen(true) : undefined
          }
        />

        {compactChrome ? (
          <CirclePatientSwitcher
            variant="modal-only"
            patients={patients}
            selected={selectedPatient}
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
            onSelect={handleSelectPatient}
            startupPatientId={startupPatientId}
            onSetStartupPatient={onSetStartupPatient}
            onCancelPending={onCancelPending}
            patientOnline={patientPresence.online}
            db={db}
          />
        ) : (
          <header className="mb-1 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 px-2 py-2 shadow-sm [@media(max-height:740px)]:mb-1 [@media(max-height:740px)]:py-1.5">
            <CirclePatientSwitcher
              variant="card"
              patients={patients}
              selected={selectedPatient}
              open={switcherOpen}
              onOpenChange={setSwitcherOpen}
              onSelect={handleSelectPatient}
              startupPatientId={startupPatientId}
              onSetStartupPatient={onSetStartupPatient}
              onCancelPending={onCancelPending}
              memberDisplayName={memberDisplayName}
              memberFirstName={memberFirstName}
              patientOnline={patientPresence.online}
              patientLastSeen={patientPresence.lastSeen}
              db={db}
            />
          </header>
        )}

        {inviteError && (
          <p className={cn('text-sm text-red-600 shrink-0', compactChrome ? 'mb-1' : 'mb-3')}>
            {inviteError}
          </p>
        )}

        <main
          ref={mainRef}
          className={cn(
            'flex-1 min-h-0',
            activeTab === 'messages' ||
              activeTab === 'media' ||
              activeTab === 'schedule' ||
              activeTab === 'diary' ||
              activeTab === 'circle' ||
              activeTab === 'analytics' ||
              activeTab === 'patient-profile' ||
              activeTab === 'remote-settings'
              ? 'flex flex-col overflow-hidden'
              : 'space-y-4 overflow-y-auto',
          )}
        >
          {activeTab === 'dashboard' && (
            <CircleDashboardScreen
              user={user}
              db={db}
              patient={selectedPatient}
              unreadCount={threadState.unreadCount}
              messageCount={threadState.messages.length}
              circleUnreadCount={circleThreadUnread.unreadCount}
              circleAnnouncementsUnreadCount={circleThreadUnread.announcementsUnreadCount}
              circleAnnouncementsOpenUnreadCount={circleThreadUnread.announcementsOpenUnreadCount}
              circleAnnouncementsRestrictedUnreadCount={
                circleThreadUnread.announcementsRestrictedUnreadCount
              }
              circleDiscussionsUnreadCount={circleThreadUnread.discussionsUnreadCount}
              circleDiscussionsOpenUnreadCount={circleThreadUnread.discussionsOpenUnreadCount}
              circleDiscussionsRestrictedUnreadCount={
                circleThreadUnread.discussionsRestrictedUnreadCount
              }
              circleDropInsUnreadCount={circleThreadUnread.dropInsUnreadCount}
              circleDropInsOpenUnreadCount={circleThreadUnread.dropInsOpenUnreadCount}
              circleDropInsRestrictedUnreadCount={circleThreadUnread.dropInsRestrictedUnreadCount}
              circleVisitCapturesUnreadCount={circleThreadUnread.visitCapturesUnreadCount}
              circleVisitCapturesOpenUnreadCount={circleThreadUnread.visitCapturesOpenUnreadCount}
              circleVisitCapturesRestrictedUnreadCount={
                circleThreadUnread.visitCapturesRestrictedUnreadCount
              }
              circlePostCount={circleThreadUnread.circlePostCount}
              urgentAlertAttention={alertAttention.urgentItems}
              subduedAlertAttention={alertAttention.subduedItems}
              onGoToTab={handleGoToTab}
              onOpenAdminAccess={handleOpenAdminAccess}
              onOpenCircleFolder={handleOpenCircleFolder}
              onOpenMessagesInbox={handleOpenMessagesInbox}
              onOpenAnalyticsDetail={handleOpenAnalyticsDetail}
              onOpenAssessmentsOverview={handleOpenAssessmentsOverview}
              onOpenAnalyticsPeriodOverview={handleOpenAnalyticsPeriodOverview}
              onOpenGalleryReactions={handleOpenGalleryReactions}
              onOpenGalleryMyAlbums={handleOpenGalleryMyAlbums}
              onOpenSchedule={handleOpenSchedule}
              onOpenVisitCapture={
                showVisitCapture ? () => handleOpenVisitCapture() : undefined
              }
              onRequestDropIn={canStartDropInRequest ? openDropInConfirmModal : undefined}
              dropInFeatureEnabled={patientDropInFeatureEnabled}
              onResumeDropIn={circleDropIn.resumeChat}
              dropInActive={!!circleDropIn.activeSession}
              dropInChatOpen={circleDropIn.chatOpen}
              remoteCommandAwaiting={remoteCommandAwaiting}
            />
          )}
          {activeTab === 'messages' && (
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <PatientMessagesScreen
                user={user}
                patient={selectedPatient}
                db={db}
                loading={threadState.loading}
                error={threadState.error}
                messages={threadState.messages}
                repliesByMessageId={threadState.repliesByMessageId}
                hiddenAtByMessageId={threadState.hiddenAtByMessageId}
                unreadCount={threadState.unreadCount}
                draftGuardRef={replyDraftGuardRef}
                messagesInboxIntent={messagesInboxIntent}
                onMessagesInboxIntentConsumed={handleMessagesInboxIntentConsumed}
              />
              </Suspense>
            </div>
          )}
          {activeTab === 'schedule' && selectedPatient && (
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <CircleScheduleScreen
                user={user}
                db={db}
                patient={selectedPatient}
                actionBadgeCount={scheduleActionBadgeCount}
                viewIntent={scheduleViewIntent}
                onOpenCountChange={setScheduleScreenOpenCount}
                onOpenAssessment={handleOpenAnalyticsDetail}
                onRecordVisit={
                  showVisitCapture
                    ? (entryId: string) => handleOpenVisitCapture(entryId)
                    : undefined
                }
                onManageClinicalReferences={
                  canViewRemoteSettingsTab(selectedPatient.capabilities)
                    ? () => handleGoToTab('patient-profile')
                    : undefined
                }
              />
            </div>
          )}
          {activeTab === 'media' && (
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <PatientGalleryScreen
                user={user}
                patient={selectedPatient}
                db={db}
                storage={storage}
                galleryIntent={galleryIntent}
                onGalleryIntentConsumed={handleGalleryIntentConsumed}
              />
              </Suspense>
            </div>
          )}
          {activeTab === 'circle' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CircleCircleScreen
                user={user}
                db={db}
                patient={selectedPatient}
                unreadCount={circleThreadUnread.unreadCount}
                openUnreadCount={circleThreadUnread.openUnreadCount}
                restrictedUnreadCount={circleThreadUnread.restrictedUnreadCount}
                canInitiateDropIn={canUseDropIn}
                patientDropInFeatureEnabled={patientDropInFeatureEnabled}
                patientOnline={patientPresence.online}
                patientDoNotDisturb={isPatientDoNotDisturbSection(patientPresence.activeSection)}
                onStartDropIn={canStartDropInRequest ? openDropInConfirmModal : undefined}
                onResumeDropIn={circleDropIn.resumeChat}
                dropInActive={!!circleDropIn.activeSession}
                dropInChatOpen={circleDropIn.chatOpen}
                onRecordVisit={
                  showVisitCapture
                    ? (entryId?: string) => handleOpenVisitCapture(entryId)
                    : undefined
                }
                onOpenSchedule={handleOpenSchedule}
                circleInboxIntent={circleInboxIntent}
                onCircleInboxIntentConsumed={handleCircleInboxIntentConsumed}
              />
            </div>
          )}
          {activeTab === 'patient-profile' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CirclePatientProfileScreen
                user={user}
                db={db}
                storage={storage}
                patient={selectedPatient}
                onOpenCircleHelp={() => handleOpenCircleFolder('open', 'care_transition')}
              />
            </div>
          )}
          {activeTab === 'admin' && (
            <CircleAdminScreen
              user={user}
              db={db}
              patient={selectedPatient}
              initialUsersTab={initialAdminUsersTab}
              onInitialUsersTabConsumed={handleAdminInitialUsersTabConsumed}
            />
          )}
          {activeTab === 'analytics' && (
            <div className="flex flex-col flex-1 min-h-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <CircleAnalyticsScreen
                patient={selectedPatient}
                initialMetricId={initialAnalyticsMetricId}
                initialMessagesFocus={initialMessagesFocus}
                initialAssessmentsOverview={initialAssessmentsOverview}
                initialPeriodOverviewDays={initialPeriodOverviewDays}
                onInitialMetricConsumed={handleAnalyticsInitialMetricConsumed}
                onCloseToOrigin={handleAnalyticsDetailClosedToOrigin}
              />
              </Suspense>
            </div>
          )}
          {activeTab === 'diary' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CircleDiaryScreen user={user} db={db} patient={selectedPatient} />
            </div>
          )}
          {activeTab === 'know' && <CircleKnowScreen />}
          {activeTab === 'medxforce-lab' && <CircleMedXForceLabScreen />}
          {activeTab === 'remote-settings' && (
            <div className="flex flex-col flex-1 min-h-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <CircleRemoteSettingsScreen db={db} user={user} patient={selectedPatient} />
              </Suspense>
            </div>
          )}
        </main>

        <CircleBottomNav
          primaryItems={primaryNavItems}
          moreItems={moreNavItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          badges={navBadges}
          messagesUrgency={alertAttention.navUrgencyKind}
          pulseNavForUrgency={
            alertAttention.hasUrgentPulse &&
            activeTab !== 'dashboard' &&
            selectedPatient?.capabilities.messaging === true
          }
          className={compactChrome ? 'mt-0.5' : undefined}
        />
        <CircleAppToast message={toast?.message ?? null} tone={toast?.tone} />

        {selectedPatient && showVisitCapture ? (
          <VisitCaptureFlow
            open={visitCaptureOpen}
            onClose={handleCloseVisitCapture}
            onPublished={handleVisitCapturePublished}
            patientId={selectedPatient.patientId}
            capturedBy={{
              uid: user.uid,
              name: memberDisplayName,
              role: memberRole,
              app: 'circle',
            }}
            careCalendarEntryId={visitCaptureEntryId}
          />
        ) : null}

        {selectedPatient ? (
          <CirclePatientCommandResponseModal
            open={remoteCommand.notice != null}
            status={remoteCommand.notice?.status ?? null}
            type={remoteCommand.notice?.type ?? null}
            patientName={selectedPatient.displayName}
            onClose={remoteCommand.dismissNotice}
          />
        ) : null}

        {selectedPatient ? (
          <>
            <CircleDropInConfirmModal
              open={dropInConfirmOpen}
              patientName={selectedPatient.displayName}
              onConfirm={() => {
                void circleDropIn.requestDropIn().then(() => setDropInSentThisOpen(true));
              }}
              onClose={handleDropInConfirmClose}
              sending={circleDropIn.busy && !circleDropIn.awaitingPatientResponse}
              awaiting={circleDropIn.awaitingPatientResponse}
              secondsRemaining={circleDropIn.responseSecondsRemaining}
              error={circleDropIn.error}
            />
            <CircleDropInChatModal
              open={circleDropIn.chatOpen}
              patientName={selectedPatient.displayName}
              caregiverName={caregiverDisplayName}
              messages={circleDropIn.sessionMessages}
              busy={circleDropIn.busy}
              viewerLanguage={language}
              patientLanguage={patientLanguage}
              onSend={circleDropIn.sendMessage}
              onEnd={circleDropIn.endConversation}
              onClose={circleDropIn.closeChat}
            />
            <CircleDropInShareModal
              open={circleDropIn.sharePrompt != null}
              patientName={selectedPatient.displayName}
              patientInitiated={
                circleDropIn.sharePrompt?.session.initiatedBy === 'patient'
              }
              shareDestination={circleDropIn.shareDestination}
              showCareTeamNotifyOption={circleDropIn.showCareTeamNotifyOption}
              onShare={(alsoNotifyCareTeam) =>
                void circleDropIn.shareToCareCoordination(alsoNotifyCareTeam)
              }
              onDismiss={circleDropIn.dismissSharePrompt}
              sharing={circleDropIn.busy}
              error={circleDropIn.error}
            />
            {circleDropIn.pendingPatientRequest ? (
              <CircleDropInPatientRequestBanner
                patientName={selectedPatient.displayName}
                onAccept={() => void circleDropIn.acceptPatientDropIn()}
                onDecline={() => void circleDropIn.declinePatientDropIn()}
                busy={circleDropIn.busy}
              />
            ) : null}
            <CircleDropInPatientRequestModal
              open={circleDropIn.pendingPatientRequest != null}
              patientName={selectedPatient.displayName}
              onAccept={() => void circleDropIn.acceptPatientDropIn()}
              onDecline={() => void circleDropIn.declinePatientDropIn()}
              busy={circleDropIn.busy}
              secondsRemaining={circleDropIn.patientRequestSecondsRemaining}
              error={circleDropIn.error}
            />
            <CircleDropInResponseModal
              open={circleDropIn.declineNotice != null}
              patientName={selectedPatient.displayName}
              onClose={circleDropIn.dismissDeclineNotice}
            />
          </>
        ) : null}
      </div>
    </CircleChromeProvider>
    </CircleSelectedPatientProvider>
    </CirclePatientThreadsProvider>
  );
}
