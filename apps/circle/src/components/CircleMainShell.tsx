import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { CirclePatientSummary } from '@medxforce/shared';
import { cn } from '../lib/utils';

import { CircleAdminScreen } from './CircleAdminScreen';
import { CircleAnalyticsScreen } from './CircleAnalyticsScreen';
import {
  CircleBottomNav,
  allNavItemsForPatient,
  moreNavItemsForPatient,
  primaryNavItemsForPatient,
  type CircleMainTab,
} from './CircleBottomNav';
import { CircleCircleScreen } from './CircleCircleScreen';
import { CircleDashboardScreen } from './CircleDashboardScreen';
import { CircleDiaryScreen } from './CircleDiaryScreen';
import { CircleKnowScreen } from './CircleKnowScreen';
import { CirclePatientSwitcher } from './CirclePatientSwitcher';
import { PatientGalleryScreen } from './PatientGalleryScreen';
import { PatientMessagesScreen } from './PatientMessagesScreen';
import {
  isFirestoreBackgroundWritePaused,
  isFirestoreQuotaError,
  pauseFirestoreBackgroundWrites,
} from '../lib/firestoreQuota';
import { useCircleGalleryMediaCounts } from '../hooks/useCircleGalleryMediaCounts';
import { useCircleMemberThreadUnread } from '../hooks/useCircleMemberThreadUnread';
import { useCirclePatientThreads } from '../hooks/useCirclePatientThreads';
import type { UnsavedReplyDraftGuard } from '../lib/unsavedReplyDraft';

interface CircleMainShellProps {
  user: User;
  patients: CirclePatientSummary[];
  db: Firestore;
  storage: FirebaseStorage;
  inviteError: string | null;
  onSignOut?: () => void;
  onSelectedPatientChange?: (patientId: string | null) => void;
}

export function CircleMainShell({
  user,
  patients,
  db,
  storage,
  inviteError,
  onSelectedPatientChange,
}: CircleMainShellProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    () => patients[0]?.patientId ?? null,
  );
  const [activeTab, setActiveTab] = useState<CircleMainTab>('dashboard');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const replyDraftGuardRef = useRef<UnsavedReplyDraftGuard | null>(null);

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
      guardedNavigate(() => setActiveTab(tab));
    },
    [guardedNavigate],
  );

  const selectedPatient = useMemo((): CirclePatientSummary | null => {
    if (patients.length === 0) return null;
    if (selectedPatientId) {
      const found = patients.find((p) => p.patientId === selectedPatientId);
      if (found) return found;
    }
    return patients[0];
  }, [patients, selectedPatientId]);

  useEffect(() => {
    onSelectedPatientChange?.(selectedPatient?.patientId ?? null);
  }, [selectedPatient?.patientId, onSelectedPatientChange]);

  const primaryNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return primaryNavItemsForPatient(selectedPatient.capabilities);
  }, [selectedPatient]);

  const moreNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return moreNavItemsForPatient(selectedPatient.capabilities);
  }, [selectedPatient]);

  const allNavItems = useMemo(() => {
    if (!selectedPatient) return [];
    return allNavItemsForPatient(selectedPatient.capabilities);
  }, [selectedPatient]);

  const threadState = useCirclePatientThreads(
    db,
    selectedPatient?.patientId ?? '',
    user,
  );

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

  const moreActive = moreNavItems.some((item) => item.id === activeTab);

  const navBadges = useMemo(() => {
    const messagesUnread =
      activeTab === 'messages' || !selectedPatient?.capabilities.messaging
        ? 0
        : threadState.unreadCount;
    const circleUnread = activeTab === 'circle' ? 0 : circleThreadUnread.unreadCount;
    const moreCount = moreActive || moreNavItems.length === 0 ? 0 : moreNavItems.length;

    return {
      messages: messagesUnread,
      circle: circleUnread,
      more: moreCount,
    };
  }, [
    activeTab,
    circleThreadUnread.unreadCount,
    moreActive,
    moreNavItems.length,
    selectedPatient?.capabilities.messaging,
    threadState.unreadCount,
  ]);

  useEffect(() => {
    if (!selectedPatient?.patientId || !user?.uid) return;

    let active = true;
    const beat = () => {
      if (!active || isFirestoreBackgroundWritePaused()) return;
      const now = Date.now();
      void setDoc(
        doc(db, 'patients', selectedPatient.patientId, 'presence', user.uid),
        { uid: user.uid, lastSeen: now, status: 'online' },
        { merge: true },
      ).catch((err) => {
        if (isFirestoreQuotaError(err)) pauseFirestoreBackgroundWrites(String(err));
      });
    };

    beat();
    const interval = window.setInterval(beat, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [db, selectedPatient?.patientId, user.uid]);

  if (!selectedPatient) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
        <p className="text-sm text-slate-500">No patient selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-1.5 [@media(max-height:740px)]:gap-1">
      <header className="mb-3 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 px-2 py-2 shadow-sm [@media(max-height:740px)]:mb-1.5 [@media(max-height:740px)]:py-1.5">
        <CirclePatientSwitcher
          patients={patients}
          selected={selectedPatient}
          open={switcherOpen}
          onOpenChange={setSwitcherOpen}
          onSelect={(p) => {
            guardedNavigate(() => {
              setSelectedPatientId(p.patientId);
              setActiveTab('dashboard');
            });
          }}
        />
      </header>

      {inviteError && <p className="text-sm text-red-600 mb-3 shrink-0">{inviteError}</p>}

      <main
        className={cn(
          'flex-1 min-h-0',
          activeTab === 'messages' || activeTab === 'media' || activeTab === 'diary' || activeTab === 'circle'
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
            totalMediaCount={galleryCounts.totalCount}
            myMediaUploadCount={galleryCounts.myUploadCount}
            mediaCountsLoading={galleryCounts.loading}
            onGoToTab={handleTabChange}
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
            <CircleCircleScreen user={user} db={db} patient={selectedPatient} />
          </div>
        )}
        {activeTab === 'admin' && (
          <CircleAdminScreen user={user} db={db} patient={selectedPatient} />
        )}
        {activeTab === 'analytics' && <CircleAnalyticsScreen patient={selectedPatient} />}
        {activeTab === 'diary' && (
          <div className="flex flex-col flex-1 min-h-0">
            <CircleDiaryScreen user={user} db={db} patient={selectedPatient} />
          </div>
        )}
        {activeTab === 'know' && <CircleKnowScreen patient={selectedPatient} />}
      </main>

      <CircleBottomNav
        primaryItems={primaryNavItems}
        moreItems={moreNavItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badges={navBadges}
      />
    </div>
  );
}
