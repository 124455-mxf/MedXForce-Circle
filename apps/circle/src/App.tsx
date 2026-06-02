import { useEffect, useMemo, useState } from 'react';
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
  listCirclePatientsForUser,
  normalizeInviteEmail,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CircleMainShell } from './components/CircleMainShell';
import { CircleProfileDrawer } from './components/CircleProfileDrawer';
import { CircleStartupSequence } from './components/CircleStartupSequence';
import { useCircleStartupSequence } from './hooks/useCircleStartupSequence';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { consumeAuthRedirectOnce, firebase } from './lib/firebaseClient';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [patients, setPatients] = useState<CirclePatientSummary[]>([]);
  const [refreshingPatients, setRefreshingPatients] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const selectedPatientForSettings = useMemo(() => {
    if (patients.length === 0) return null;
    if (selectedPatientId) {
      const found = patients.find((p) => p.patientId === selectedPatientId);
      if (found) return found;
    }
    return patients[0];
  }, [patients, selectedPatientId]);

  const refreshPatients = async (currentUser: User) => {
    await acceptPendingCircleInvites(firebase.db, currentUser);
    const list = await listCirclePatientsForUser(firebase.db, currentUser.uid);
    setPatients(list);
    return list;
  };

  const handleRefreshPatients = async () => {
    if (!user) return;
    setRefreshingPatients(true);
    setAuthError(null);
    try {
      const accepted = await acceptPendingCircleInvites(firebase.db, user);
      const list = await listCirclePatientsForUser(firebase.db, user.uid);
      setPatients(list);
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
          setAuthError(
            `No invite found for ${email}. In the patient app, save Friends & Family contact with this exact email, click Done, then Refresh.`,
          );
        } else {
          setAuthError('Invite found but could not link your account. Check the browser console for details.');
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not refresh invites.');
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
        if (active) setAuthError(friendlyAuthError(err));
      });

    const unsubscribe = onAuthStateChanged(firebase.auth, async (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setAuthLoading(false);
      setGoogleSigningIn(false);
      if (nextUser) {
        try {
          await refreshPatients(nextUser);
        } catch (err) {
          console.error(err);
          setAuthError(err instanceof Error ? err.message : 'Could not load your circle patients.');
        }
      } else {
        setPatients([]);
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
      void refreshPatients(user).catch((err) => {
        console.warn('[CIRCLE] Could not refresh patients on focus:', err);
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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
          setAuthError(friendlyAuthError(createErr));
        }
        return;
      }
      setAuthError(friendlyAuthError(err));
    }
  };

  const handleCreateAccount = async () => {
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(firebase.auth, email.trim(), password);
    } catch (err) {
      setAuthError(friendlyAuthError(err));
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
          setAuthError(friendlyAuthError(redirectErr));
        }
        return;
      }
      setGoogleSigningIn(false);
      setAuthError(friendlyAuthError(err));
    }
  };

  const startup = useCircleStartupSequence(!authLoading);

  if (startup.visible) {
    return <CircleStartupSequence phase={startup.phase} exiting={startup.exiting} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
              <MedXForceBrandLogo />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">MedXForce Circle</h1>
              <p className="text-sm text-slate-500">Friends & family — share moments with your loved one</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (must match patient invite)"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
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
              {googleSigningIn ? 'Signing in…' : 'Continue with Google'}
            </button>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              or email & password
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200"
            >
              Create account
            </button>
            <p className="text-xs text-slate-500 text-center">
              MedXForce patient app uses Google — use Continue with Google if you already sign in there.
              The Google email must match the Friends &amp; Family invite exactly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const accountPhotoUrl = user.photoURL || undefined;

  return (
    <div
      className={
        patients.length > 0
          ? 'flex flex-col h-dvh max-h-dvh overflow-hidden box-border p-4 sm:p-8 max-w-2xl mx-auto'
          : 'min-h-screen p-4 sm:p-8 max-w-2xl mx-auto'
      }
    >
      <div
        className={`flex items-center gap-3 shrink-0 ${patients.length > 0 ? 'mb-4' : 'mb-6'}`}
      >
        <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
          <MedXForceBrandLogo />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-800">MedXForce Circle</h1>
          <p className="text-xs text-slate-500 truncate">Friends &amp; family</p>
        </div>
        {patients.length > 0 && (
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center gap-0.5 shrink-0"
            title="Your account"
          >
            <span className="w-11 h-11 rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center">
              {accountPhotoUrl ? (
                <img src={accountPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-blue-700">
                  {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">You</span>
          </button>
        )}
      </div>

      {patients.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 text-slate-700">
            <div className="flex items-center gap-2">
              <Users size={18} />
              <h2 className="font-bold">Your patients</h2>
            </div>
            <button
              type="button"
              onClick={handleRefreshPatients}
              disabled={refreshingPatients}
              className="text-sm font-semibold text-blue-600 disabled:opacity-50"
            >
              {refreshingPatients ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {authError && <p className="text-sm text-red-600">{authError}</p>}
          <p className="text-sm text-slate-500 leading-relaxed">
            No active invites yet. In the patient app, open Settings → Friends &amp; Family, confirm your email is saved, click Done, then tap Refresh here.
          </p>
          <button
            type="button"
            onClick={() => signOut(firebase.auth)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col flex-1 min-h-0">
            <CircleMainShell
              user={user}
              patients={patients}
              db={firebase.db}
              storage={firebase.storage}
              inviteError={authError}
              onSelectedPatientChange={setSelectedPatientId}
            />
          </div>
          <CircleProfileDrawer
            user={user}
            db={firebase.db}
            storage={firebase.storage}
            patient={selectedPatientForSettings}
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            onSignOut={() => signOut(firebase.auth)}
            onLeftCircle={async () => {
              if (!user) return;
              await refreshPatients(user);
            }}
          />
        </>
      )}
    </div>
  );
}

function friendlyAuthError(err: unknown): string {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong password — or this account uses Google sign-in. Try Continue with Google instead.';
    case 'auth/email-already-in-use':
      return 'This email already has an account (often via Google). Use Continue with Google, or reset password in Firebase Authentication.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account for this email yet. Use Create account instead.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed';
  }
}
