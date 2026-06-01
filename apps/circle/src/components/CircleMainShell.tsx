import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { CirclePatientSummary } from '@medxforce/shared';
import { cn } from '../lib/utils';

import { CircleAnalyticsScreen } from './CircleAnalyticsScreen';
import {
  CircleBottomNav,
  navItemsForPatient,
  type CircleMainTab,
} from './CircleBottomNav';
import { CircleDashboardScreen } from './CircleDashboardScreen';
import { CirclePatientSwitcher } from './CirclePatientSwitcher';
import { PatientGalleryScreen } from './PatientGalleryScreen';
import { PatientMessagesScreen } from './PatientMessagesScreen';
import { useCircleGalleryMediaCounts } from '../hooks/useCircleGalleryMediaCounts';
import { useCirclePatientThreads } from '../hooks/useCirclePatientThreads';
import type { UnsavedReplyDraftGuard } from '../lib/unsavedReplyDraft';

interface CircleMainShellProps {
  user: User;
  patients: CirclePatientSummary[];
  db: Firestore;
  storage: FirebaseStorage;
  inviteError: string | null;
  onSignOut?: () => void;
}

export function CircleMainShell({
  user,
  patients,
  db,
  storage,
  inviteError,
}: CircleMainShellProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    () => patients[0]?.patientId ?? null,
  );
  const [activeTab, setActiveTab] = useState<CircleMainTab>('dashboard');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const replyDraftGuardRef = useRef<UnsavedReplyDraftGuard | null>(null);

  const guardedNavigate = useCallback((proceed: () => void) => {
    if (activeTab === 'messages' && replyDraftGuardRef.current?.hasUnsavedDraft()) {
      replyDraftGuardRef.current.confirmNavigate(proceed);
      return;
    }
    proceed();
  }, [activeTab]);

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

  const navItems = useMemo(() => {
    if (!selectedPatient) return [];
    return navItemsForPatient(selectedPatient.capabilities);
  }, [selectedPatient]);

  const threadState = useCirclePatientThreads(
    db,
    selectedPatient?.patientId ?? '',
    user,
  );

  const galleryCounts = useCircleGalleryMediaCounts(
    db,
    selectedPatient?.patientId,
    user.uid,
    selectedPatient?.capabilities,
  );

  useEffect(() => {
    if (navItems.length === 0) return;
    if (!navItems.some((item) => item.id === activeTab)) {
      setActiveTab(navItems[0].id);
    }
  }, [navItems, activeTab]);

  useEffect(() => {
    if (!selectedPatient?.patientId || !user?.uid) return;

    let active = true;
    const beat = () => {
      if (!active) return;
      const now = Date.now();
      void setDoc(
        doc(db, 'patients', selectedPatient.patientId, 'presence', user.uid),
        { uid: user.uid, lastSeen: now, status: 'online' },
        { merge: true },
      ).catch(() => {});
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-2">
      <header className="mb-3 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 px-2 py-2 shadow-sm">
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
          activeTab === 'messages' || activeTab === 'media'
            ? 'flex flex-col overflow-hidden'
            : 'space-y-4 overflow-y-auto',
        )}
      >
        {activeTab === 'dashboard' && (
          <CircleDashboardScreen
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
        {activeTab === 'analytics' && <CircleAnalyticsScreen patient={selectedPatient} />}
      </main>

      <CircleBottomNav items={navItems} activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
