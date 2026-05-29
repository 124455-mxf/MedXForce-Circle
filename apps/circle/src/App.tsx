import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { HeartHandshake, LogOut, Upload, Users } from 'lucide-react';
import {
  acceptPendingCircleInvites,
  cn,
  listCirclePatientsForUser,
  type CircleMemberRole,
  type CirclePatientSummary,
  uploadCircleGalleryMedia,
} from '@medxforce/shared';
import { firebase } from './lib/firebaseClient';

type View = 'patients' | 'upload';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [patients, setPatients] = useState<CirclePatientSummary[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<CirclePatientSummary | null>(null);
  const [view, setView] = useState<View>('patients');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const refreshPatients = async (currentUser: User) => {
    await acceptPendingCircleInvites(firebase.db, currentUser);
    const list = await listCirclePatientsForUser(firebase.db, currentUser.uid);
    setPatients(list);
  };

  useEffect(() => {
    return onAuthStateChanged(firebase.auth, async (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (nextUser) {
        try {
          await refreshPatients(nextUser);
        } catch (err) {
          console.error(err);
        }
      } else {
        setPatients([]);
      }
    });
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
    } catch {
      try {
        await createUserWithEmailAndPassword(firebase.auth, email.trim(), password);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Sign in failed');
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!user || !selectedPatient?.canUpload) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const role = selectedPatient.role as CircleMemberRole;
      await uploadCircleGalleryMedia({
        db: firebase.db,
        storage: firebase.storage,
        patientId: selectedPatient.patientId,
        uploadedByUid: user.uid,
        uploadedByRole: role,
        senderName: user.displayName || user.email || 'Family Member',
        file,
        caption,
      });
      setUploadMessage('Shared successfully — it will appear in the patient Soul gallery.');
      setCaption('');
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <HeartHandshake size={22} />
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
              onClick={handleSignIn}
              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <HeartHandshake size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">MedXForce Circle</h1>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut(firebase.auth)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-blue-600 rounded-xl"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      {view === 'patients' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Users size={18} />
            <h2 className="font-bold">Your patients</h2>
          </div>
          {patients.length === 0 ? (
            <p className="text-sm text-slate-500 leading-relaxed">
              No active invites yet. Ask the patient to add your email under Settings → Friends & Family, then sign in again.
            </p>
          ) : (
            <ul className="space-y-3">
              {patients.map((patient) => (
                <li key={patient.patientId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setView('upload');
                      setUploadMessage(null);
                    }}
                    className={cn(
                      'w-full text-left p-4 rounded-2xl border transition-colors',
                      'border-slate-100 hover:border-blue-200 hover:bg-blue-50/50',
                    )}
                  >
                    <p className="font-bold text-slate-800">{patient.displayName}</p>
                    <p className="text-xs text-slate-500 capitalize">{patient.role}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === 'upload' && selectedPatient && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-5">
          <button
            type="button"
            onClick={() => setView('patients')}
            className="text-sm font-semibold text-blue-600"
          >
            ← Back to patients
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Share with {selectedPatient.displayName}</h2>
            <p className="text-sm text-slate-500">Photos and videos appear in Soul → Media Gallery on the patient app.</p>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none"
          />
          <label
            className={cn(
              'flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30',
              (!selectedPatient.canUpload || uploading) && 'opacity-50 pointer-events-none',
            )}
          >
            <Upload size={28} className="text-blue-600" />
            <span className="font-semibold text-slate-700">
              {uploading ? 'Uploading…' : 'Choose photo or video'}
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={uploading || !selectedPatient.canUpload}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
          </label>
          {uploadMessage && (
            <p className={cn('text-sm', uploadMessage.includes('failed') ? 'text-red-600' : 'text-emerald-700')}>
              {uploadMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
