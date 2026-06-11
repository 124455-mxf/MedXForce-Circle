import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { AnalyticsMetricId, CirclePatientSummary } from '@medxforce/shared';
import {
  canSendPatientRemoteCommands,
  canStartVisitCapture,
  normalizeMemberRole,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleChromeProvider } from '../lib/circleChromeContext';

import { CircleAdminScreen } from './CircleAdminScreen';
import { CircleAnalyticsScreen } from './CircleAnalyticsScreen';
import { CircleAppHeader } from './CircleAppHeader';
import {
  CircleBottomNav,
  allNavItemsForPatient,
  moreNavItemsForPatient,
  localizeNavItems,
  primaryNavItemsForPatient,
  type CircleMainTab,
} from './CircleBottomNav';
import { useCircleT } from '../lib/circleI18nContext';
import { CircleCircleScreen } from './CircleCircleScreen';
import { CircleDashboardScreen } from './CircleDashboardScreen';
import { CircleDiaryScreen } from './CircleDiaryScreen';
import { CircleKnowScreen } from './CircleKnowScreen';
import { CircleRemoteSettingsScreen } from './CircleRemoteSettingsScreen';
import { CirclePatientSwitcher } from './CirclePatientSwitcher';
import { PatientGalleryScreen } from './PatientGalleryScreen';
import { PatientMessagesScreen } from './PatientMessagesScreen';
import { useCircleOnlineVisibility } from '../hooks/useCircleOnlineVisibility';
import { startCircleMemberPresenceHeartbeat } from '../services/circleMemberPresenceService';
import { useCircleAlertAttentionState } from '../hooks/useCircleAlertAttentionState';
import { useCircleGalleryMediaCounts } from '../hooks/useCircleGalleryMediaCounts';
import { useCircleMemberThreadUnread } from '../hooks/useCircleMemberThreadUnread';
import { useCirclePatientThreads } from '../hooks/useCirclePatientThreads';
import { useCircleToast } from '../hooks/useCircleToast';
import {
  isPatientDoNotDisturbSection,
  usePatientOnlinePresence,
} from '../hooks/usePatientOnlinePresence';
import type { UnsavedReplyDraftGuard } from '../lib/unsavedReplyDraft';
import { CircleAppToast } from './CircleAppToast';
import { VisitCaptureFlow } from './VisitCaptureFlow';
import { useCirclePatientRemoteCommandResponse } from '../hooks/useCirclePatientRemoteCommandResponse';
import { CirclePatientCommandResponseModal } from './CirclePatientCommandResponseModal';
import { CircleDropInConfirmModal } from './CircleDropInConfirmModal';
import { CircleDropInChatModal } from './CircleDropInChatModal';
import { CircleDropInShareModal } from './CircleDropInShareModal';
import { CircleDropInResponseModal } from './CircleDropInResponseModal';
import { useCircleDropIn } from '../hooks/useCircleDropIn';
import { useCircleDropInResponseNotice } from '../hooks/useCircleDropInResponseNotice';

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
}: CircleMainShellProps) {
  const [activeTab, setActiveTab] = useState<CircleMainTab>('dashboard');
  const [initialAnalyticsMetricId, setInitialAnalyticsMetricId] =
    useState<AnalyticsMetricId | null>(null);
  const t = useCircleT();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [visitCaptureOpen, setVisitCaptureOpen] = useState(false);
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

  const selectedPatient = useMemo((): CirclePatientSummary | null => {
    if (patients.length === 0) return null;
    if (selectedPatientId) {
      const found = patients.find((p) => p.patientId === selectedPatientId);
      if (found) return found;
    }
    return patients[0];
  }, [patients, selectedPatientId]);

  const memberRole = selectedPatient ? normalizeMemberRole(selectedPatient.role) : 'friend';
  const showVisitCapture = !!selectedPatient && canStartVisitCapture(memberRole);
  const canReceiveRemoteCommandResponses =
    !!selectedPatient && canSendPatientRemoteCommands(selectedPatient.role);

  const { notice: remoteCommandResponseNotice, dismissNotice: dismissRemoteCommandResponse } =
    useCirclePatientRemoteCommandResponse(
      db,
      selectedPatient?.patientId,
      user.uid,
      canReceiveRemoteCommandResponses,
    );

  const caregiverDisplayName =
    user.displayName?.trim() || user.email?.split('@')[0] || t('common.careTeam');

  const patientPresence = usePatientOnlinePresence(db, selectedPatient?.patientId);

  const circleDropIn = useCircleDropIn(
    db,
    selectedPatient?.patientId,
    user.uid,
    caregiverDisplayName,
    memberRole,
    selectedPatient?.displayName ?? 'Patient',
    canReceiveRemoteCommandResponses,
    patientPresence.online,
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

  const { notice: dropInDeclineNotice, dismissNotice: dismissDropInDeclineNotice } =
    useCircleDropInResponseNotice(
      db,
      selectedPatient?.patientId,
      user.uid,
      canReceiveRemoteCommandResponses,
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

  const galleryCounts = useCircleGalleryMediaCounts(
    db,
    selectedPatient?.patientId,
    user.uid,
    selectedPatient?.capabilities,
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
            patientOnline={patientPresence.online}
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
              patientOnline={patientPresence.online}
              patientLastSeen={patientPresence.lastSeen}
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
              circlePostCount={circleThreadUnread.circlePostCount}
              totalMediaCount={galleryCounts.totalCount}
              myMediaUploadCount={galleryCounts.myUploadCount}
              mediaCountsLoading={galleryCounts.loading}
              urgentAlertAttention={alertAttention.urgentItems}
              subduedAlertAttention={alertAttention.subduedItems}
              onGoToTab={handleTabChange}
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
            />
          )}
          {activeTab === 'messages' && (
            <div className="flex flex-col flex-1 min-h-0">
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
            </div>
          )}
          {activeTab === 'media' && (
            <div className="flex flex-col flex-1 min-h-0">
              <PatientGalleryScreen
                user={user}
                patient={selectedPatient}
                db={db}
                storage={storage}
              />
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
              />
            </div>
          )}
          {activeTab === 'admin' && (
            <CircleAdminScreen user={user} db={db} storage={storage} patient={selectedPatient} />
          )}
          {activeTab === 'analytics' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CircleAnalyticsScreen
                patient={selectedPatient}
                initialMetricId={initialAnalyticsMetricId}
                onInitialMetricConsumed={handleAnalyticsInitialMetricConsumed}
              />
            </div>
          )}
          {activeTab === 'diary' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CircleDiaryScreen user={user} db={db} patient={selectedPatient} />
            </div>
          )}
          {activeTab === 'know' && <CircleKnowScreen />}
          {activeTab === 'remote-settings' && (
            <div className="flex flex-col flex-1 min-h-0">
              <CircleRemoteSettingsScreen db={db} user={user} patient={selectedPatient} />
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
            open={remoteCommandResponseNotice != null}
            status={remoteCommandResponseNotice?.status ?? null}
            type={remoteCommandResponseNotice?.type ?? null}
            patientName={selectedPatient.displayName}
            onClose={dismissRemoteCommandResponse}
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
              onSend={circleDropIn.sendMessage}
              onEnd={circleDropIn.endConversation}
              onClose={circleDropIn.closeChat}
            />
            <CircleDropInShareModal
              open={circleDropIn.sharePrompt != null}
              patientName={selectedPatient.displayName}
              onShare={() => void circleDropIn.shareToCareCoordination()}
              onDismiss={circleDropIn.dismissSharePrompt}
              sharing={circleDropIn.busy}
              error={circleDropIn.error}
            />
            <CircleDropInResponseModal
              open={dropInDeclineNotice != null}
              patientName={selectedPatient.displayName}
              onClose={dismissDropInDeclineNotice}
            />
          </>
        ) : null}
      </div>
    </CircleChromeProvider>
  );
}
