import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  User as UserIcon,
  X,
} from 'lucide-react';
import { CircleSettingsMessagingPanel } from './CircleSettingsMessagingPanel';
import { CircleSettingsMediaPanel } from './CircleSettingsMediaPanel';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import {
  getCircleUserProfile,
  saveCircleUserProfile,
  type CircleUserProfile,
} from '@medxforce/shared';

interface CircleProfileDrawerProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export function CircleProfileDrawer({
  user,
  db,
  storage,
  open,
  onClose,
  onSignOut,
}: CircleProfileDrawerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<CircleUserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerView, setDrawerView] = useState<
    'account' | 'settings' | 'messaging' | 'media'
  >('account');

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

  const displayName =
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
    setUploading(true);
    setError(null);
    try {
      const path = `circle_profiles/${user.uid}/avatar`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
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
                  drawerView === 'messaging' || drawerView === 'media' ? 'settings' : 'account',
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

        {drawerView === 'messaging' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsMessagingPanel />
          </div>
        )}

        {drawerView === 'media' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsMediaPanel />
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
                if (file) void handlePhotoChange(file);
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
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50 opacity-60"
            disabled
          >
            <Bell size={20} className="text-slate-500" />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">Notifications</p>
              <p className="text-xs text-slate-400">Coming soon</p>
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
              <p className="text-xs text-slate-400">Messaging, media, and more</p>
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
    </div>
  );
}
