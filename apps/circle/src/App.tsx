import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { LogOut, Users } from 'lucide-react';
import { MedXForceBrandLogo } from './components/MedXForceBrandLogo';
import {
  acceptPendingCircleInvites,
  ensureMemberCapabilitiesForUser,
  repairInactiveAcceptedMemberDocsForUser,
  repairOrphanAcceptedInvitesForUser,
  reconcileAcceptedMemberRolesForUser,
  isFirestoreQuotaError,
  listCirclePatientsAndProvisionsForUser,
  pendingProvisionToCircleSummary,
  cancelPendingPatientProvisionForProxy,
  normalizeInviteEmail,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CircleMainShell } from './components/CircleMainShell';
import { CircleAddPatientPanel } from './components/CircleAddPatientPanel';
import { CirclePendingProvisionPanel } from './components/CirclePendingProvisionPanel';
import { CircleSettingsUserManagementPanel } from './components/CircleSettingsUserManagementPanel';
import { CircleAppHeader } from './components/CircleAppHeader';
import { CircleProfileDrawer } from './components/CircleProfileDrawer';
import { CirclePatientsAttentionProvider } from './context/CirclePatientsAttentionContext';
import { CircleStartupSequence } from './components/CircleStartupSequence';
import { useCircleStartupSequence } from './hooks/useCircleStartupSequence';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { consumeAuthRedirectOnce, firebase } from './lib/firebaseClient';
import { CIRCLE_BUILD_ID } from './lib/circleBuildId';
import { sendWelcomeEmailsForAcceptedInvites } from './services/circleWelcomeEmailApi';
import { useCircleI18n } from './hooks/useCircleI18n';
import { CircleI18nProvider } from './lib/circleI18nContext';
import { CirclePatientSwitcher } from './components/CirclePatientSwitcher';
import {
  firstActivePatient,
  hasActivePatientBesides,
  pickPreferredPatientId,
  pickStartupPatientId,
} from './lib/circlePatientSelection';
import { useCircleAccountPhoto } from './hooks/useCircleAccountPhoto';
import { clearCircleActiveSessionStorage } from './lib/circleSessionStorage';
import {
  readStartupPatientId,
  writeStartupPatientId,
} from './lib/circleStartupPatient';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [patients, setPatients] = useState<CirclePatientSummary[]>([]);
  const [patientsHydrating, setPatientsHydrating] = useState(false);
  const [refreshingPatients, setRefreshingPatients] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingSwitcherOpen, setPendingSwitcherOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [startupPatientId, setStartupPatientId] = useState<string | null>(null);
  const { language, t, setLanguage } = useCircleI18n(firebase.db, user);

  const selectedPatientForSettings = useMemo(() => {
    if (patients.length === 0) return null;
    if (selectedPatientId) {
      const found = patients.find((p) => p.patientId === selectedPatientId);
      if (found) return found;
    }
    return patients[0];
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!user?.uid) {
      setStartupPatientId(null);
      return;
    }
    setStartupPatientId(readStartupPatientId(user.uid));
  }, [user?.uid]);

  useEffect(() => {
    if (patients.length === 0) {
      setSelectedPatientId(null);
      return;
    }
    if (!selectedPatientId || !patients.some((p) => p.patientId === selectedPatientId)) {
      setSelectedPatientId(pickStartupPatientId(patients, user?.uid));
    }
  }, [patients, selectedPatientId, user?.uid]);

  const handleSetStartupPatient = (patient: CirclePatientSummary) => {
    if (!user?.uid) return;
    writeStartupPatientId(user.uid, patient.patientId);
    setStartupPatientId(patient.patientId);
  };

  const handleDismissPendingSetup = () => {
    const next = firstActivePatient(patients);
    if (next) setSelectedPatientId(next.patientId);
  };

  const handleSelectPatient = (patient: CirclePatientSummary) => {
    setSelectedPatientId(patient.patientId);
    setPendingSwitcherOpen(false);
  };

  const handleCancelPendingProvision = useCallback(
    async (patient: CirclePatientSummary) => {
      if (!user || patient.isPendingProvision !== true) return;

      await cancelPendingPatientProvisionForProxy(firebase.db, user.uid, patient.patientId);

      const remaining = patients.filter((p) => p.patientId !== patient.patientId);
      setPatients(remaining);
      setPendingSwitcherOpen(false);

      if (selectedPatientId === patient.patientId) {
        setSelectedPatientId(pickStartupPatientId(remaining, user.uid));
      }

      if (startupPatientId === patient.patientId) {
        const nextStartup = pickPreferredPatientId(remaining);
        if (nextStartup) {
          writeStartupPatientId(user.uid, nextStartup);
          setStartupPatientId(nextStartup);
        } else {
          setStartupPatientId(null);
        }
      }
    },
    [patients, selectedPatientId, startupPatientId, user],
  );

  const refreshPatients = async (currentUser: User) => {
    const accepted = await acceptPendingCircleInvites(firebase.db, currentUser);
    await repairOrphanAcceptedInvitesForUser(firebase.db, currentUser.uid);
    await repairInactiveAcceptedMemberDocsForUser(firebase.db, currentUser.uid);
    await reconcileAcceptedMemberRolesForUser(firebase.db, currentUser.uid);
    await ensureMemberCapabilitiesForUser(firebase.db, currentUser.uid);
    const list = await listCirclePatientsAndProvisionsForUser(firebase.db, currentUser.uid);
    setPatients(list);
    void sendWelcomeEmailsForAcceptedInvites(currentUser, accepted, list).catch((err) => {
      console.warn('[Circle] Welcome email dispatch failed:', err);
    });
    return { list, accepted };
  };

  const handleRefreshPatients = async () => {
    if (!user) return;
    setRefreshingPatients(true);
    setAuthError(null);
    try {
      const { list, accepted } = await refreshPatients(user);
      if (list.length === 0 && accepted.length === 0 && user.email) {
        const email = normalizeInviteEmail(user.email);
        const pendingSnap = await getDocs(
          query(
            collection(firebase.db, 'circle_invites'),
            where('invitedEmail', '==', email),
            where('status', '==', 'pending'),
          ),
        );
        if (pendingSnap.empty) {
          setAuthError(t('auth.noInviteForEmail', { email }));
        } else {
          setAuthError(t('auth.inviteLinkFailed'));
        }
      }
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        setAuthError(t('auth.firestoreQuota'));
      } else {
        setAuthError(err instanceof Error ? err.message : t('auth.refreshFailed'));
      }
    } finally {
      setRefreshingPatients(false);
    }
  };

  useEffect(() => {
    let active = true;

    void consumeAuthRedirectOnce(firebase.auth)
      .then((result) => {
        if (!active) return;
        if (result?.user && window.location.hash.includes('apiKey=')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      })
      .catch((err) => {
        console.error('getRedirectResult:', err);
        if (active) setAuthError(friendlyAuthError(err, t));
      });

    const unsubscribe = onAuthStateChanged(firebase.auth, async (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setAuthLoading(false);
      setGoogleSigningIn(false);
      if (nextUser) {
        setPatientsHydrating(true);
        try {
          await refreshPatients(nextUser);
        } catch (err) {
          console.error(err);
          if (isFirestoreQuotaError(err)) {
            setAuthError(
              'Firestore daily write limit reached. Messages and sync may not work until the quota resets (midnight Pacific).',
            );
          } else {
            setAuthError(err instanceof Error ? err.message : 'Could not load your circle patients.');
          }
        } finally {
          setPatientsHydrating(false);
        }
      } else {
        setPatients([]);
        setPatientsHydrating(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void listCirclePatientsAndProvisionsForUser(firebase.db, user.uid)
        .then(setPatients)
        .catch((err) => {
          console.warn('[CIRCLE] Could not refresh patients on focus:', err);
        });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    let debounce = 0;
    const scheduleRefresh = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        void refreshPatients(user);
      }, 500);
    };

    const unsubProvisions = onSnapshot(
      query(
        collection(firebase.db, 'patient_provisions'),
        where('createdByUid', '==', user.uid),
      ),
      scheduleRefresh,
      (err) => console.warn('[Circle] provision listener:', err),
    );
    const unsubInvites = onSnapshot(
      query(
        collection(firebase.db, 'circle_invites'),
        where('acceptedByUid', '==', user.uid),
      ),
      scheduleRefresh,
      (err) => console.warn('[Circle] invite listener:', err),
    );

    return () => {
      unsubProvisions();
      unsubInvites();
      window.clearTimeout(debounce);
    };
  }, [user]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(firebase.auth, email.trim(), password);
        } catch (createErr) {
          setAuthError(friendlyAuthError(createErr, t));
        }
        return;
      }
      setAuthError(friendlyAuthError(err, t));
    }
  };

  const handleCreateAccount = async () => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(firebase.auth, email.trim(), password);
    } catch (err) {
      setAuthError(friendlyAuthError(err, t));
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(firebase.auth, provider);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user'
      ) {
        try {
          await signInWithRedirect(firebase.auth, provider);
          return;
        } catch (redirectErr) {
          setGoogleSigningIn(false);
          setAuthError(friendlyAuthError(redirectErr, t));
        }
        return;
      }
      setGoogleSigningIn(false);
      setAuthError(friendlyAuthError(err, t));
    }
  };

  const appReady = !authLoading && (!user || !patientsHydrating);
  const startup = useCircleStartupSequence(appReady);
  const accountPhotoUrl = useCircleAccountPhoto(firebase.db, user);

  const handleSignOut = async () => {
    clearCircleActiveSessionStorage();
    await signOut(firebase.auth);
  };

  const appBody = startup.visible ? (
    <CircleStartupSequence
      phase={startup.phase}
      exiting={startup.exiting}
      tagline={t('brand.startupTagline')}
    />
  ) : !user ? (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
            <MedXForceBrandLogo />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('auth.title')}</h1>
            <p className="text-sm text-slate-500">{t('auth.subtitle')}</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
          />
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSigningIn}
            className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="text-lg leading-none">G</span>
            {googleSigningIn ? t('auth.signingIn') : t('auth.continueGoogle')}
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            {t('auth.orEmailPassword')}
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700"
          >
            {t('auth.signIn')}
          </button>
          <button
            type="button"
            onClick={handleCreateAccount}
            className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200"
          >
            {t('auth.createAccount')}
          </button>
          <p className="text-xs text-slate-500 text-center">{t('auth.googleHint')}</p>
          <p className="text-[10px] text-slate-400 text-center font-mono" title="Hosted app version">
            build {CIRCLE_BUILD_ID}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col h-dvh max-h-dvh overflow-hidden box-border max-w-2xl mx-auto w-full pt-4 px-3 pb-2.5 sm:pt-5 sm:px-4 sm:pb-3 [@media(max-height:740px)]:pt-3.5 [@media(max-height:740px)]:px-2.5 [@media(max-height:740px)]:pb-2">
      {patients.length === 0 ? (
        <>
          <div className="flex items-center gap-3 shrink-0 mb-6">
            <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
              <MedXForceBrandLogo />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-800">{t('auth.title')}</h1>
              <p className="text-xs text-slate-500 truncate">{t('common.friendsFamily')}</p>
            </div>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 text-slate-700">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <h2 className="font-bold">{t('patients.yourPatients')}</h2>
              </div>
              <button
                type="button"
                onClick={handleRefreshPatients}
                disabled={refreshingPatients}
                className="text-sm font-semibold text-blue-600 disabled:opacity-50"
              >
                {refreshingPatients ? t('common.refreshing') : t('common.refresh')}
              </button>
            </div>
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <p className="text-sm text-slate-500 leading-relaxed">{t('patients.noInvitesYet')}</p>
            <CircleAddPatientPanel
              user={user}
              db={firebase.db}
              onCreated={(provision) => {
                setPatients((prev) => [
                  ...prev,
                  pendingProvisionToCircleSummary(provision),
                ]);
                setSelectedPatientId(provision.provisionId);
                setAuthError(null);
              }}
            />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600"
            >
              <LogOut size={16} />
              {t('common.signOut')}
            </button>
          </div>
        </>
      ) : selectedPatientForSettings?.isPendingProvision ? (
        <>
          <CirclePatientsAttentionProvider
            db={firebase.db}
            user={user}
            patients={patients}
            selectedPatientId={selectedPatientId}
          >
            <CircleAppHeader
              variant="compact"
              user={user}
              accountPhotoUrl={accountPhotoUrl}
              onOpenProfile={() => setProfileOpen(true)}
              selectedPatient={selectedPatientForSettings}
              memberDisplayName={user.displayName || user.email || t('dashboard.sectionYou')}
              onOpenPatientSwitcher={
                patients.length > 1 ? () => setPendingSwitcherOpen(true) : undefined
              }
            />
            <CirclePatientSwitcher
              variant="modal-only"
              patients={patients}
              selected={selectedPatientForSettings}
              open={pendingSwitcherOpen}
              onOpenChange={setPendingSwitcherOpen}
              onSelect={handleSelectPatient}
              startupPatientId={startupPatientId}
              onSetStartupPatient={patients.length > 1 ? handleSetStartupPatient : undefined}
              onCancelPending={handleCancelPendingProvision}
              memberDisplayName={user.displayName || user.email || t('dashboard.sectionYou')}
              db={firebase.db}
            />
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-4 pb-2">
              <CirclePendingProvisionPanel
                patient={selectedPatientForSettings}
                user={user}
                canDismiss={hasActivePatientBesides(
                  patients,
                  selectedPatientForSettings.patientId,
                )}
                onDismiss={handleDismissPendingSetup}
                onCancelPending={handleCancelPendingProvision}
              />
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <CircleSettingsUserManagementPanel
                  user={user}
                  db={firebase.db}
                  patient={selectedPatientForSettings}
                />
              </div>
            </div>
            <CircleProfileDrawer
              user={user}
              db={firebase.db}
              storage={firebase.storage}
              patients={patients}
              patient={selectedPatientForSettings}
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              onSelectPatient={handleSelectPatient}
              startupPatientId={startupPatientId}
              onSetStartupPatient={patients.length > 1 ? handleSetStartupPatient : undefined}
              onSignOut={() => void handleSignOut()}
              onLeftCircle={async () => {
                if (!user) return;
                await refreshPatients(user);
              }}
              onProvisionCreated={(provision) => {
                setPatients((prev) => [...prev, pendingProvisionToCircleSummary(provision)]);
                setSelectedPatientId(provision.provisionId);
              }}
              onCancelPending={handleCancelPendingProvision}
            />
          </CirclePatientsAttentionProvider>
        </>
      ) : (
        <>
          <CirclePatientsAttentionProvider
            db={firebase.db}
            user={user}
            patients={patients}
            selectedPatientId={selectedPatientId}
          >
            <div className="flex flex-col flex-1 min-h-0">
              <CircleMainShell
                user={user}
                accountPhotoUrl={accountPhotoUrl}
                onOpenProfile={() => setProfileOpen(true)}
                patients={patients}
                db={firebase.db}
                storage={firebase.storage}
                inviteError={authError}
                selectedPatientId={selectedPatientId}
                onSelectPatient={handleSelectPatient}
                startupPatientId={startupPatientId}
                onSetStartupPatient={patients.length > 1 ? handleSetStartupPatient : undefined}
                onCancelPending={handleCancelPendingProvision}
              />
            </div>
            <CircleProfileDrawer
              user={user}
              db={firebase.db}
              storage={firebase.storage}
              patients={patients}
              patient={selectedPatientForSettings}
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              onSelectPatient={handleSelectPatient}
              startupPatientId={startupPatientId}
              onSetStartupPatient={patients.length > 1 ? handleSetStartupPatient : undefined}
              onSignOut={() => void handleSignOut()}
              onLeftCircle={async () => {
                if (!user) return;
                await refreshPatients(user);
              }}
              onProvisionCreated={(provision) => {
                setPatients((prev) => [...prev, pendingProvisionToCircleSummary(provision)]);
                setSelectedPatientId(provision.provisionId);
              }}
              onCancelPending={handleCancelPendingProvision}
            />
          </CirclePatientsAttentionProvider>
        </>
      )}
    </div>
  );

  return (
    <CircleI18nProvider language={language} t={t} setLanguage={setLanguage}>
      {appBody}
    </CircleI18nProvider>
  );
}

function friendlyAuthError(
  err: unknown,
  t: ReturnType<typeof import('./translations').createCircleTranslator>,
): string {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('auth.wrongPassword');
    case 'auth/email-already-in-use':
      return t('auth.emailInUse');
    case 'auth/weak-password':
      return t('auth.weakPassword');
    case 'auth/invalid-email':
      return t('auth.invalidEmail');
    case 'auth/user-not-found':
      return t('auth.userNotFound');
    default:
      return err instanceof Error ? err.message : t('auth.authFailed');
  }
}
