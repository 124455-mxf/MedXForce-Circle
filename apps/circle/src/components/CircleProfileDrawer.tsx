import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Bell,
  Camera,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Globe,
  HeartHandshake,
  LayoutGrid,
  Loader2,
  LogOut,
  Image as ImageIcon,
  Trash2,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { CircleSettingsMessagingPanel } from './CircleSettingsMessagingPanel';
import { CircleSettingsMediaPanel } from './CircleSettingsMediaPanel';
import { CircleSettingsLocalePanel } from './CircleSettingsLocalePanel';
import { CircleSettingsOnlineStatusPanel } from './CircleSettingsOnlineStatusPanel';
import { CircleSettingsSchedulePanel } from './CircleSettingsSchedulePanel';
import { CircleSettingsCareRelationshipPanel } from './CircleSettingsCareRelationshipPanel';
import { CircleSettingsUserManagementPanel } from './CircleSettingsUserManagementPanel';
import { CircleSettingsNotificationPreferencesPanel } from './CircleSettingsNotificationPreferencesPanel';
import { CircleSettingsMyContactPanel } from './CircleSettingsMyContactPanel';
import { CircleDashboardCustomizePanel } from './CircleDashboardCustomizePanel';
import { CircleDiscardChangesModal } from './CircleDiscardChangesModal';
import { CircleProfilePhotoCropModal } from './CircleProfilePhotoCropModal';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { dataUrlToBlob } from '../lib/imageCrop';
import {
  getCircleUserProfile,
  saveCircleUserProfile,
  isAcceptedProfilePhotoFile,
  normalizeProfilePhotoFile,
  type CirclePatientSummary,
  type CircleUserProfile,
  canInviteMembers,
  PRIVACY_POLICY_URL,
  type PatientProvisionRecord,
} from '@medxforce/shared';
import {
  cancelScheduledAccountDeletion,
  scheduleAccountDeletion,
} from '../services/deleteSignedInAccount';
import { CirclePatientSwitchList } from './CirclePatientSwitchList';
import { CircleAddPatientPanel } from './CircleAddPatientPanel';
import { cn } from '../lib/utils';
import { usePatientOnlinePresence } from '../hooks/usePatientOnlinePresence';
import { useCircleOwnManagedContact } from '../hooks/useCircleOwnManagedContact';
import { translateCircleMemberAccessLabel } from '../lib/adminScreenI18n';
import { memberRoleBadgeClass } from '../lib/circleContactDisplay';
import { CircleContactMemberOverviewStrip } from './CircleContactMemberOverviewStrip';
import { PatientOnlineIndicator } from './PatientOnlineIndicator';
import { useCircleT } from '../lib/circleI18nContext';

interface CircleProfileDrawerProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  patients: CirclePatientSummary[];
  patient: CirclePatientSummary | null;
  open: boolean;
  onClose: () => void;
  onSelectPatient: (patient: CirclePatientSummary) => void;
  startupPatientId?: string | null;
  onSetStartupPatient?: (patient: CirclePatientSummary) => void;
  onSignOut: () => void;
  onLeftCircle: () => void | Promise<void>;
  onProvisionCreated?: (provision: PatientProvisionRecord) => void;
  onCancelPending?: (patient: CirclePatientSummary) => Promise<void>;
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
  startupPatientId = null,
  onSetStartupPatient,
  onSignOut,
  onLeftCircle,
  onProvisionCreated,
  onCancelPending,
}: CircleProfileDrawerProps) {
  const t = useCircleT();
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
    | 'localeDisplay'
    | 'onlineStatus'
    | 'schedule'
    | 'careRelationship'
    | 'userManagement'
    | 'notifications'
    | 'myContact'
    | 'customizeDashboard'
    | 'switchPatient'
    | 'addPatient'
  >('account');
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteContributions, setDeleteContributions] = useState(false);
  const [confirmDeleteShared, setConfirmDeleteShared] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

  const proxyCanManageUsers = canInviteMembers(patient?.capabilities);
  const { online: patientOnline } = usePatientOnlinePresence(db, patient?.patientId);
  const { contact: ownContact, loading: ownContactLoading } = useCircleOwnManagedContact(
    db,
    user,
    patient,
  );
  const canSwitchPatient = patients.length >= 1;

  useEffect(() => {
    if (!open) {
      setDrawerView('account');
      setMyContactDirty(false);
      setDiscardPrompt(null);
      setDeleteArmed(false);
      setDeleteContributions(false);
      setConfirmDeleteShared(false);
      setDeleteAccountError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !user.uid) {
      setProfile(null);
      return;
    }
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
  const [myContactDirty, setMyContactDirty] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState<'close' | 'back' | null>(null);

  const displayName =
    profileDisplayName?.trim() ||
    profile?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    t('drawer.defaultMemberName');
  const photoUrl = profile?.photoUrl || user.photoURL || '';
  const connectedPatientNames = patients
    .filter((item) => !item.isPendingProvision)
    .map((item) => item.displayName.trim())
    .filter(Boolean);
  const connectedPatientList =
    connectedPatientNames.length > 1
      ? new Intl.ListFormat(undefined, { type: 'conjunction', style: 'long' }).format(
          connectedPatientNames,
        )
      : '';
  const scheduledEraseAt = profile?.accountDeletion?.eraseAt;
  const scheduledDeletionDate = scheduledEraseAt
    ? new Date(scheduledEraseAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handlePhotoChange = async (file: File) => {
    if (!isAcceptedProfilePhotoFile(file)) {
      setError(t('drawer.chooseImageError'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('drawer.imageSizeError'));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const normalized = await normalizeProfilePhotoFile(file);
      setFileToCrop(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('drawer.uploadFailed'));
    } finally {
      setUploading(false);
    }
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
      setError(err instanceof Error ? err.message : t('drawer.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const cancelCrop = () => {
    setFileToCrop(null);
  };

  const navigateBack = () => {
    if (
      drawerView === 'messaging' ||
      drawerView === 'media' ||
      drawerView === 'localeDisplay' ||
      drawerView === 'onlineStatus' ||
      drawerView === 'schedule' ||
      drawerView === 'careRelationship' ||
      drawerView === 'userManagement' ||
      drawerView === 'switchPatient' ||
      drawerView === 'addPatient'
    ) {
      setDrawerView('settings');
      return;
    }
    setDrawerView('account');
  };

  const requestCloseDrawer = () => {
    if (drawerView === 'myContact' && myContactDirty) {
      setDiscardPrompt('close');
      return;
    }
    onClose();
  };

  const requestNavigateBack = () => {
    if (drawerView === 'myContact' && myContactDirty) {
      setDiscardPrompt('back');
      return;
    }
    navigateBack();
  };

  const confirmDiscardChanges = () => {
    const action = discardPrompt;
    setDiscardPrompt(null);
    setMyContactDirty(false);
    if (action === 'close') {
      onClose();
      return;
    }
    navigateBack();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="flex-1 bg-slate-900/40"
        aria-label={t('common.closeMenu')}
        onClick={requestCloseDrawer}
      />
      <aside className="w-full max-w-sm min-w-0 overflow-x-hidden bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-2">
          {drawerView !== 'account' ? (
            <button
              type="button"
              onClick={requestNavigateBack}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
              aria-label={t('common.back')}
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
          <h2 className="font-bold text-slate-800 flex-1 text-center truncate">
            {drawerView === 'account' && t('drawer.accountTitle')}
            {drawerView === 'settings' && t('drawer.settings')}
            {drawerView === 'messaging' && t('drawer.messaging')}
            {drawerView === 'media' && t('drawer.media')}
            {drawerView === 'localeDisplay' && t('drawer.localeDisplay')}
            {drawerView === 'onlineStatus' && t('drawer.onlineStatus')}
            {drawerView === 'schedule' && t('drawer.schedule')}
            {drawerView === 'careRelationship' && t('drawer.careRelationship')}
            {drawerView === 'userManagement' && t('drawer.userManagement')}
            {drawerView === 'notifications' && t('drawer.notifications')}
            {drawerView === 'myContact' && t('drawer.myContact')}
            {drawerView === 'customizeDashboard' && t('drawer.customizeDashboard')}
            {drawerView === 'switchPatient' && t('drawer.switchPatient')}
            {drawerView === 'addPatient' && t('provision.addPatientTitle')}
          </h2>
          <button
            type="button"
            onClick={requestCloseDrawer}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {drawerView === 'settings' && (
          <div className="flex-1 overflow-y-auto p-2">
            {onProvisionCreated && (
              <button
                type="button"
                onClick={() => setDrawerView('addPatient')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50 mb-1"
              >
                <UserPlus size={20} className="text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{t('provision.addPatient')}</p>
                  <p className="text-xs text-slate-400">{t('provision.addPatientHint')}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </button>
            )}
            {canSwitchPatient && (
              <button
                type="button"
                onClick={() => setDrawerView('switchPatient')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
              >
                <HeartHandshake size={20} className="text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{t('drawer.switchPatient')}</p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                    <span>{patient?.displayName ?? t('common.choosePatient')}</span>
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
                <p className="font-semibold text-slate-800 text-sm">{t('drawer.careRelationship')}</p>
                <p className="text-xs text-slate-400 truncate">
                  {patient
                    ? t('drawer.careRelationshipHintNamed', { name: patient.displayName })
                    : t('drawer.careRelationshipHint')}
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
                  <p className="font-semibold text-slate-800 text-sm">{t('drawer.userManagement')}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {t('drawer.userManagementHint', {
                      name: patient?.displayName ?? t('common.patient'),
                    })}
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
                <p className="font-semibold text-slate-800 text-sm">{t('drawer.messaging')}</p>
                <p className="text-xs text-slate-400">{t('drawer.messagingHint')}</p>
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
                <p className="font-semibold text-slate-800 text-sm">{t('drawer.media')}</p>
                <p className="text-xs text-slate-400">{t('drawer.mediaHint')}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerView('localeDisplay')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
            >
              <Globe size={20} className="text-sky-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{t('drawer.localeDisplay')}</p>
                <p className="text-xs text-slate-400">{t('drawer.localeDisplayHint')}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerView('onlineStatus')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
            >
              <Radio size={20} className="text-emerald-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{t('drawer.onlineStatus')}</p>
                <p className="text-xs text-slate-400">{t('drawer.onlineStatusHint')}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerView('schedule')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
            >
              <Calendar size={20} className="text-violet-600" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{t('drawer.schedule')}</p>
                <p className="text-xs text-slate-400">{t('drawer.scheduleHint')}</p>
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

        {drawerView === 'localeDisplay' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsLocalePanel
              user={user}
              db={db}
              patientId={patient?.patientId}
            />
          </div>
        )}

        {drawerView === 'onlineStatus' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsOnlineStatusPanel user={user} db={db} patient={patient} />
          </div>
        )}

        {drawerView === 'schedule' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsSchedulePanel />
          </div>
        )}

        {drawerView === 'switchPatient' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="text-sm text-slate-500 px-2 pb-1 leading-relaxed">
              {t('drawer.switchPatientHint')}
            </p>
            {patients.length > 1 && onSetStartupPatient ? (
              <p className="text-xs text-slate-500 px-2 pb-1 leading-relaxed">
                {t('drawer.setStartupPatientHint')}
              </p>
            ) : null}
            <CirclePatientSwitchList
              patients={patients}
              selectedPatientId={patient?.patientId ?? ''}
              startupPatientId={startupPatientId}
              onSelect={(row) => {
                onSelectPatient(row);
                setDrawerView('settings');
              }}
              onSetStartupPatient={onSetStartupPatient}
              onCancelPending={onCancelPending}
            />
            {onProvisionCreated && (
              <div className="pt-2 px-2">
                <CircleAddPatientPanel
                  user={user}
                  db={db}
                  compact
                  onCreated={(provision) => {
                    onProvisionCreated(provision);
                    setDrawerView('settings');
                  }}
                />
              </div>
            )}
          </div>
        )}

        {drawerView === 'addPatient' && onProvisionCreated && (
          <div className="flex-1 overflow-y-auto p-3">
            <CircleAddPatientPanel
              user={user}
              db={db}
              onCreated={(provision) => {
                onProvisionCreated(provision);
                onClose();
              }}
            />
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

        {drawerView === 'customizeDashboard' && (
          <div className="flex-1 overflow-y-auto">
            <CircleDashboardCustomizePanel user={user} db={db} patient={patient} />
          </div>
        )}

        {drawerView === 'myContact' && (
          <div className="flex-1 overflow-y-auto">
            <CircleSettingsMyContactPanel
              user={user}
              db={db}
              patient={patient}
              patients={patients}
              onDirtyChange={setMyContactDirty}
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
              accept="image/*,.heic,.heif"
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
                {uploading ? t('drawer.uploadingPhoto') : t('drawer.changePhoto')}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            {t('drawer.photoHint')}
          </p>
          {patient && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {t('drawer.accountOverview')}
              </p>
              {ownContactLoading && !ownContact ? (
                <p className="text-xs text-slate-400">{t('common.loading')}</p>
              ) : ownContact ? (
                <CircleContactMemberOverviewStrip
                  contact={ownContact}
                  accessLabel={translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier)}
                  accessBadgeClass={memberRoleBadgeClass(patient.role, patient.proxyTier)}
                />
              ) : (
                <span
                  className={cn(
                    'inline-flex shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
                    memberRoleBadgeClass(patient.role, patient.proxyTier),
                  )}
                >
                  {translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => setDrawerView('myContact')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <UserIcon size={20} className="text-violet-600" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{t('drawer.myContact')}</p>
              <p className="text-xs text-slate-400">{t('drawer.myContactHint')}</p>
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
              <p className="font-semibold text-slate-800 text-sm">{t('drawer.notifications')}</p>
              <p className="text-xs text-slate-400">{t('drawer.notificationsHint')}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          <button
            type="button"
            onClick={() => setDrawerView('customizeDashboard')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <LayoutGrid size={20} className="text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{t('drawer.customizeDashboard')}</p>
              <p className="text-xs text-slate-400">{t('drawer.customizeDashboardHint')}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </button>
          <button
            type="button"
            onClick={() => setDrawerView('settings')}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <Settings size={20} className="text-slate-500" />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{t('drawer.settings')}</p>
              <p className="text-xs text-slate-400">
                {proxyCanManageUsers
                  ? t('drawer.openSettingsHintWithUserMgmt')
                  : t('drawer.openSettingsHint')}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-slate-50"
          >
            <Shield size={20} className="text-slate-500" />
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{t('drawer.privacyPolicy')}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </a>
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
            {t('drawer.signOut')}
          </button>
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
            {scheduledDeletionDate ? (
              <>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('drawer.scheduledDeletion', { date: scheduledDeletionDate })}
                </p>
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={() => {
                    setDeletingAccount(true);
                    setDeleteAccountError('');
                    void cancelScheduledAccountDeletion()
                      .then(() => {
                        setProfile((prev) =>
                          prev ? { ...prev, accountDeletion: undefined } : prev,
                        );
                      })
                      .catch(() => {
                        setDeleteAccountError(t('drawer.deleteAccountFailed'));
                      })
                      .finally(() => setDeletingAccount(false));
                  }}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  {deletingAccount ? t('drawer.deleteAccountWorking') : t('drawer.cancelScheduledDeletion')}
                </button>
                {deleteAccountError ? (
                  <p className="text-xs text-red-600">{deleteAccountError}</p>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteAccountError('');
                    setDeleteContributions(false);
                    setConfirmDeleteShared(false);
                    setDeleteArmed(true);
                  }}
                  className="w-full py-2.5 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-100"
                >
                  {t('drawer.deleteAccount')}
                </button>
                <p className="text-xs text-slate-500 leading-relaxed">{t('drawer.deleteAccountDesc')}</p>
              </>
            )}
          </div>
        </div>
        </>
        )}
      </aside>

      {deleteArmed && !confirmDeleteShared ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              {deletingAccount ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{t('drawer.deleteAccountConfirm')}</h3>
              {connectedPatientList ? (
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t('drawer.deleteAccountManyPatientsLead')}{' '}
                  <span className="font-bold text-slate-800">{connectedPatientList}</span>
                  {t('drawer.deleteAccountManyPatientsTail')}
                </p>
              ) : null}
              <p className="text-slate-500 text-sm leading-relaxed">{t('drawer.deleteAccountByline')}</p>
              <fieldset className="text-left space-y-3 pt-1">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="delete-account-shared"
                    className="mt-1"
                    checked={!deleteContributions}
                    onChange={() => setDeleteContributions(false)}
                  />
                  <span>
                    <span className="font-semibold text-slate-800">{t('drawer.keepShared')}</span>
                    <span className="block text-slate-500 mt-0.5">{t('drawer.keepSharedHint')}</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="delete-account-shared"
                    className="mt-1"
                    checked={deleteContributions}
                    onChange={() => setDeleteContributions(true)}
                  />
                  <span>
                    <span className="font-semibold text-slate-800">{t('drawer.deleteShared')}</span>
                    <span className="block text-slate-500 mt-0.5">{t('drawer.deleteSharedHint')}</span>
                  </span>
                </label>
              </fieldset>
              {deleteAccountError ? (
                <p className="text-sm text-red-600">{deleteAccountError}</p>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  setDeleteArmed(false);
                  setDeleteContributions(false);
                  setDeleteAccountError('');
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
              >
                {t('drawer.deleteAccountCancel')}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  if (deleteContributions) {
                    setDeleteAccountError('');
                    setConfirmDeleteShared(true);
                    return;
                  }
                  setDeletingAccount(true);
                  setDeleteAccountError('');
                  void scheduleAccountDeletion(false)
                    .then(({ eraseAt }) => {
                      setProfile((prev) =>
                        prev
                          ? { ...prev, accountDeletion: { eraseAt, deleteContributions: false } }
                          : {
                              uid: user.uid,
                              accountDeletion: { eraseAt, deleteContributions: false },
                              updatedAt: Date.now(),
                            },
                      );
                      setDeleteArmed(false);
                      setDeleteContributions(false);
                      onClose();
                    })
                    .catch(() => {
                      setDeleteAccountError(t('drawer.deleteAccountFailed'));
                    })
                    .finally(() => setDeletingAccount(false));
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold inline-flex items-center justify-center gap-2 disabled:cursor-wait"
              >
                {deletingAccount ? <Loader2 size={16} className="animate-spin shrink-0" /> : null}
                {deletingAccount ? t('drawer.deleteAccountWorking') : t('drawer.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteArmed && confirmDeleteShared ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              {deletingAccount ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{t('drawer.deleteSharedTitle')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{t('drawer.deleteSharedBody')}</p>
              {deleteAccountError ? (
                <p className="text-sm text-red-600">{deleteAccountError}</p>
              ) : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  setConfirmDeleteShared(false);
                  setDeleteAccountError('');
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  setDeletingAccount(true);
                  setDeleteAccountError('');
                  void scheduleAccountDeletion(true)
                    .then(({ eraseAt }) => {
                      setProfile((prev) =>
                        prev
                          ? { ...prev, accountDeletion: { eraseAt, deleteContributions: true } }
                          : {
                              uid: user.uid,
                              accountDeletion: { eraseAt, deleteContributions: true },
                              updatedAt: Date.now(),
                            },
                      );
                      setDeleteArmed(false);
                      setConfirmDeleteShared(false);
                      setDeleteContributions(false);
                    })
                    .catch(() => {
                      setDeleteAccountError(t('drawer.deleteAccountFailed'));
                    })
                    .finally(() => setDeletingAccount(false));
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold inline-flex items-center justify-center gap-2 disabled:cursor-wait"
              >
                {deletingAccount ? <Loader2 size={16} className="animate-spin shrink-0" /> : null}
                {deletingAccount ? t('drawer.deleteAccountWorking') : t('drawer.deleteSharedConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {fileToCrop && (
        <CircleProfilePhotoCropModal
          file={fileToCrop}
          onCancel={cancelCrop}
          onApply={uploadCroppedPhoto}
        />
      )}

        <CircleDiscardChangesModal
        open={discardPrompt !== null}
        title={t('drawer.discardTitle')}
        message={t('drawer.discardMessage')}
        onDiscard={confirmDiscardChanges}
        onKeepEditing={() => setDiscardPrompt(null)}
      />
    </div>
  );
}
