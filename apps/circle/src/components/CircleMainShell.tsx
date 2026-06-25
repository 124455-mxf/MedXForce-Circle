import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { AnalyticsMetricId, CircleMemberThreadKind, CirclePatientSummary } from '@medxforce/shared';
import {
  canSendPatientRemoteCommands,
  canStartVisitCapture,
  normalizeMemberRole,
  repairInactiveAcceptedMemberDocsForUser,
  repairOrphanAcceptedInvitesForUser,
  visitCapturePublishThreadKind,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleChromeProvider } from '../lib/circleChromeContext';

import { CircleAdminScreen } from './CircleAdminScreen';
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
import { startCircleMemberPresenceHeartbeat } from '../services/circleMemberPresenceService';
import { useCircleAlertAttentionState } from '../hooks/useCircleAlertAttentionState';
import { useFamilyGalleryDashboard } from '../hooks/useFamilyGalleryDashboard';
import { DASHBOARD_STATS_DAYS } from '../lib/circleDashboardStats';
import { useCircleMemberThreadUnread } from '../hooks/useCircleMemberThreadUnread';
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
  const { language, t } = useCircleI18nContext();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [visitCaptureOpen, setVisitCaptureOpen] = useState(false);
  const [circleInboxIntent, setCircleInboxIntent] = useState<{
    thread: CircleMemberThreadKind;
    view: CirclePostInboxView;
  } | null>(null);
  const [dropInConfirmOpen, setDropInConfirmOpen] = useState(false);
  const [dropInSentThisOpen, setDropInSentThisOpen] = useState(false);
  const replyDraftGuardRef = useRef<UnsavedReplyDraftGuard | null>(null);

  const compactChrome = activeTab !== 'dashboard';

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
      guardedNavigate(() => setActiveTab(tab));
    },
    [activeTab, guardedNavigate],
  );

  const handleGoToTab = handleTabChange;

  const handleBackToDashboard = useCallback(() => {
    guardedNavigate(() => setActiveTab('dashboard'));
  }, [guardedNavigate]);

  const handleOpenAnalyticsDetail = useCallback(
    (metricId: AnalyticsMetricId) => {
      setInitialAnalyticsMetricId(metricId);
      guardedNavigate(() => setActiveTab('analytics'));
    },
    [guardedNavigate],
  );

  const handleAnalyticsInitialMetricConsumed = useCallback(() => {
    setInitialAnalyticsMetricId(null);
  }, []);

  const handleCircleInboxIntentConsumed = useCallback(() => {
    setCircleInboxIntent(null);
  }, []);

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
    void (async () => {
      await repairOrphanAcceptedInvitesForUser(db, user.uid);
      await repairInactiveAcceptedMemberDocsForUser(db, user.uid);
    })();
  }, [db, selectedPatient?.patientId, user.uid]);

  const memberRole = selectedPatient ? normalizeMemberRole(selectedPatient.role) : 'friend';
  const showVisitCapture = !!selectedPatient && canStartVisitCapture(memberRole);
  const canReceiveRemoteCommandResponses =
    !!selectedPatient && canSendPatientRemoteCommands(selectedPatient.role);
  const circleDropInEnabled = !!selectedPatient?.capabilities.remoteSettings;

  const handleVisitCapturePublished = useCallback(() => {
    setVisitCaptureOpen(false);
    setCircleInboxIntent({
      thread: visitCapturePublishThreadKind(memberRole),
      view: 'visit_captures',
    });
    handleTabChange('circle');
  }, [handleTabChange, memberRole]);

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

  const patientPresence = usePatientOnlinePresence(db, selectedPatient?.patientId);

  const memberLanguages = useCirclePatientMemberLanguages(db, selectedPatient?.patientId, user.uid);
  const remoteSettingsState = useCircleRemoteSettings(db, selectedPatient, user);
  const { settings: remoteSettings } = remoteSettingsState;
  const patientLanguage = normalizeCircleUiLanguage(remoteSettings?.primaryLanguage);

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
    canReceiveRemoteCommandResponses,
  );

  const openDropInConfirmModal = useCallback(() => {
    setDropInSentThisOpen(false);
    setDropInConfirmOpen(true);
  }, []);

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

  const primaryNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return localizeNavItems(primaryNavItemsForPatient(selectedPatient.capabilities), t);
  }, [selectedPatient, t]);

  const moreNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return localizeNavItems(moreNavItemsForPatient(selectedPatient.capabilities), t);
  }, [selectedPatient, t]);

  const allNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return allNavItemsForPatient(selectedPatient.capabilities);
  }, [selectedPatient]);

  const threadState = useCirclePatientThreads(
    db,
    selectedPatient?.patientId ?? '',
    user,
    selectedPatient?.role ?? 'friend',
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
  );

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

    return {
      messages: messagesUnread,
      circle: circleThreadUnread.unreadCount,
      more: 0,
    };
  }, [
    circleThreadUnread.unreadCount,
    selectedPatient?.capabilities.messaging,
    threadState.unreadCount,
  ]);

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
          className={cn(
            'flex-1 min-h-0',
            activeTab === 'messages' ||
              activeTab === 'media' ||
              activeTab === 'diary' ||
              activeTab === 'circle' ||
              activeTab === 'analytics' ||
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
              circleVisitCapturesUnreadCount={circleThreadUnread.visitCapturesUnreadCount}
              circleVisitCapturesOpenUnreadCount={circleThreadUnread.visitCapturesOpenUnreadCount}
              circleVisitCapturesRestrictedUnreadCount={
                circleThreadUnread.visitCapturesRestrictedUnreadCount
              }
              circlePostCount={circleThreadUnread.circlePostCount}
              urgentAlertAttention={alertAttention.urgentItems}
              subduedAlertAttention={alertAttention.subduedItems}
              onGoToTab={handleGoToTab}
              onOpenCircleFolder={handleOpenCircleFolder}
              onOpenAnalyticsDetail={handleOpenAnalyticsDetail}
              onOpenVisitCapture={
                showVisitCapture ? () => setVisitCaptureOpen(true) : undefined
              }
              onRequestDropIn={
                canReceiveRemoteCommandResponses &&
                patientPresence.online &&
                !isPatientDoNotDisturbSection(patientPresence.activeSection)
                  ? openDropInConfirmModal
                  : undefined
              }
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
              />
              </Suspense>
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
                canInitiateDropIn={canReceiveRemoteCommandResponses}
                patientOnline={patientPresence.online}
                patientDoNotDisturb={isPatientDoNotDisturbSection(patientPresence.activeSection)}
                onStartDropIn={openDropInConfirmModal}
                onResumeDropIn={circleDropIn.resumeChat}
                dropInActive={!!circleDropIn.activeSession}
                dropInChatOpen={circleDropIn.chatOpen}
                onRecordVisit={showVisitCapture ? () => setVisitCaptureOpen(true) : undefined}
                circleInboxIntent={circleInboxIntent}
                onCircleInboxIntentConsumed={handleCircleInboxIntentConsumed}
              />
            </div>
          )}
          {activeTab === 'admin' && (
            <CircleAdminScreen user={user} db={db} storage={storage} patient={selectedPatient} />
          )}
          {activeTab === 'analytics' && (
            <div className="flex flex-col flex-1 min-h-0">
              <Suspense fallback={<TabLoadingFallback />}>
                <CircleAnalyticsScreen
                patient={selectedPatient}
                initialMetricId={initialAnalyticsMetricId}
                onInitialMetricConsumed={handleAnalyticsInitialMetricConsumed}
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
            onClose={() => setVisitCaptureOpen(false)}
            onPublished={handleVisitCapturePublished}
            patientId={selectedPatient.patientId}
            capturedBy={{
              uid: user.uid,
              name: user.displayName || user.email || 'Circle member',
              role: memberRole,
              app: 'circle',
            }}
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
