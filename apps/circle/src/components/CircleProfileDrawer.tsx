import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  LogOut,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { CircleSettingsMessagingPanel } from './CircleSettingsMessagingPanel';
import { CircleSettingsMediaPanel } from './CircleSettingsMediaPanel';
import { CircleSettingsCareRelationshipPanel } from './CircleSettingsCareRelationshipPanel';
import { CircleSettingsUserManagementPanel } from './CircleSettingsUserManagementPanel';
import { CircleSettingsNotificationPreferencesPanel } from './CircleSettingsNotificationPreferencesPanel';
import { CircleSettingsMyContactPanel } from './CircleSettingsMyContactPanel';
import { CircleProfilePhotoCropModal } from './CircleProfilePhotoCropModal';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { dataUrlToBlob } from '../lib/imageCrop';
import {
  circleMemberAccessLabel,
  getCircleUserProfile,
  saveCircleUserProfile,
  type CirclePatientSummary,
  type CircleUserProfile,
  canInviteMembers,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { usePatientOnlinePresence } from '../hooks/usePatientOnlinePresence';
import { PatientOnlineIndicator } from './PatientOnlineIndicator';

interface CircleProfileDrawerProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  patients: CirclePatientSummary[];
  patient: CirclePatientSummary | null;
  open: boolean;
  onClose: () => void;
  onSelectPatient: (patient: CirclePatientSummary) => void;
  onSignOut: () => void;
  onLeftCircle: () => void | Promise<void>;
}

export function CircleProfileDrawer({
  user,
  db,
  storage,
  patients,
  patient,
  open,
  onClose,
  onSelectPatient,
  onSignOut,
  onLeftCircle,
}: CircleProfileDrawerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CircleUserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [drawerView, setDrawerView] = useState<
    | 'account'
    | 'settings'
    | 'messaging'
    | 'media'
    | 'careRelationship'
    | 'userManagement'
    | 'notifications'
    | 'myContact'
    | 'switchPatient'
  >('account');

  const proxyCanManageUsers = canInviteMembers(patient?.capabilities);
  const { online: patientOnline } = usePatientOnlinePresence(db, patient?.patientId);
  const canSwitchPatient = patients.length > 1;

  useEffect(() => {
    if (!open) setDrawerView('account');
  }, [open]);

  useEffect(() => {
    if (!open || !user.uid) return;
    let active = true;
    void getCircleUserProfile(db, user.uid)
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [open, user.uid, db]);

  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

  const displayName =
    profileDisplayName?.trim() ||
    profile?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'Circle member';
  const photoUrl = profile?.photoUrl || user.photoURL || '';

  const handlePhotoChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10 MB.');
      return;
    }
    setError(null);
    setFileToCrop(file);
  };

  const uploadCroppedPhoto = async (croppedDataUrl: string) => {
    setUploading(true);
    setError(null);
    try {
      const blob = await dataUrlToBlob(croppedDataUrl);
      const path = `circle_profiles/${user.uid}/avatar`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await saveCircleUserProfile(db, user.uid, {
        photoUrl: url,
        displayName,
        email: user.email || undefined,
      });
      await updateProfile(user, { photoURL: url });
      setProfile({
        uid: user.uid,
        displayName,
        photoUrl: url,
        email: user.email || undefined,
        updatedAt: Date.now(),
      });
      setFileToCrop(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const cancelCrop = () => {
    setFileToCrop(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="flex-1 bg-slate-900/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className="w-full max-w-sm bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-2">
          {drawerView !== 'account' ? (
            <button
              type="button"
              onClick={() =>
                setDrawerView(
                  drawerView === 'messaging' ||
                    drawerView === 'media' ||
                    drawerView === 'careRelationship' ||
                    drawerView === 'userManagement' ||
                    drawerView === 'myContact' ||
                    drawerView === 'switchPatient'
                    ? 'settings'
                    : 'account',
                )
              }
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
          <h2 className="font-bold text-slate-800 flex-1 text-center truncate">
            {drawerView === 'account' && 'Your Circle account'}
            {drawerView === 'settings' && 'Settings'}
            {drawerView === 'messaging' && 'Messaging'}
            {drawerView === 'media' && 'Media'}
            {drawerView === 'careRelationship' && 'Care relationship'}
            {drawerView === 'userManagement' && 'User management'}
            {drawerView === 'notifications' && 'Notifications'}
            {drawerView === 'myContact' && 'My contact details'}
            {drawerView === 'switchPatient' && 'Switch patient'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {drawerView === 'settings' && (
          <div className="flex-1 overflow-y-auto p-2">
            {canSwitchPatient && (
              <button
                type="button"
                onClick={() => setDrawerView('switchPatient')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
              >
                <HeartHandshake size={20} className="text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">Switch patient</p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                    <span>{patient?.displayName ?? 'Choose patient'}</span>
                    <PatientOnlineIndicator online={patientOnline} />
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawerView('careRelationship')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
            >
              <HeartHandshake size={20} className="text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Care relationship</p>
                <p className="text-xs text-slate-400 truncate">
                  {patient
                    ? `Your role for ${patient.displayName}`
                    : 'Role and access for your loved one'}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
            {proxyCanManageUsers && (
              <button
                type="button"
                onClick={() => setDrawerView('userManagement')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
              >
                <Users size={20} className="text-violet-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">User management</p>
                  <p className="text-xs text-slate-400 truncate">
                    Circle access for {patient?.displayName ?? 'your loved one'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawerView('messaging')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
            >
              <MessageSquare size={20} className="text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Messaging</p>
                <p className="text-xs text-slate-400">Reply sort order and more</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerView('media')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
            >
              <ImageIcon size={20} className="text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">Media</p>
                <p className="text-xs text-slate-400">Thumbnail size in gallery</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
          </div>
        )}

        {drawerView === 'messaging' && patient && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsMessagingPanel user={user} db={db} patient={patient} />
          </div>
        )}

        {drawerView === 'media' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsMediaPanel />
          </div>
        )}

        {drawerView === 'switchPatient' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="text-sm text-slate-500 px-2 pb-1 leading-relaxed">
              Choose who you are supporting in MedXForce Circle.
            </p>
            <ul className="space-y-1">
              {patients.map((row) => {
                const isActive = row.patientId === patient?.patientId;
                return (
                  <li key={row.patientId}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPatient(row);
                        setDrawerView('settings');
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-colors',
                        isActive
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent',
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {row.photoUrl ? (
                          <img src={row.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <HeartHandshake size={18} className="text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{row.displayName}</p>
                        <p className="text-xs text-slate-500">
                          {circleMemberAccessLabel(row.role, row.proxyTier)}
                        </p>
                      </div>
                      {isActive && <Check size={20} className="text-blue-600 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {drawerView === 'careRelationship' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsCareRelationshipPanel
              user={user}
              db={db}
              patient={patient}
              onLeftCircle={async () => {
                await onLeftCircle();
                onClose();
              }}
            />
          </div>
        )}

        {drawerView === 'userManagement' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsUserManagementPanel user={user} db={db} patient={patient} />
          </div>
        )}

        {drawerView === 'notifications' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsNotificationPreferencesPanel user={user} db={db} patient={patient} />
          </div>
        )}

        {drawerView === 'myContact' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsMyContactPanel
              user={user}
              db={db}
              patient={patient}
              onProfileSaved={(nextName) => {
                setProfileDisplayName(nextName);
                setProfile((prev) =>
                  prev
                    ? { ...prev, displayName: nextName, updatedAt: Date.now() }
                    : {
                        uid: user.uid,
                        displayName: nextName,
                        email: user.email || undefined,
                        updatedAt: Date.now(),
                      },
                );
              }}
            />
          </div>
        )}

        {drawerView === 'account' && (
        <>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-16 h-16 rounded-full bg-blue-100 border-2 border-white shadow-md overflow-hidden shrink-0 group"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-600">
                  <UserIcon size={28} />
                </div>
              )}
              <span className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={20} className="text-white" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoChange(file);
                e.target.value = '';
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800 truncate">{displayName}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {uploading ? 'Uploading…' : 'Change profile photo'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Your photo can appear to your loved one in the patient app as you connect and message.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => setDrawerView('myContact')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <UserIcon size={20} className="text-violet-600" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">My contact details</p>
              <p className="text-xs text-slate-400">Name, relationship, and language</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => setDrawerView('notifications')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <Bell size={20} className="text-slate-500" />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">Notifications</p>
              <p className="text-xs text-slate-400">Alert, attention, and message preferences</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          <button
            type="button"
            onClick={() => setDrawerView('settings')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <Settings size={20} className="text-slate-500" />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">Settings</p>
              <p className="text-xs text-slate-400">Messaging, media, care relationship{proxyCanManageUsers ? ', user management' : ''}, and more</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
        </>
        )}
      </aside>

      {fileToCrop && (
        <CircleProfilePhotoCropModal
          file={fileToCrop}
          onCancel={cancelCrop}
          onApply={uploadCroppedPhoto}
        />
      )}
    </div>
  );
}
