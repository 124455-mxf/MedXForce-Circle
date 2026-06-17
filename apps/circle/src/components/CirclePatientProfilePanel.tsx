import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { Camera, ClipboardList, Loader2, UserRound } from 'lucide-react';
import {
  displayProfileName,
  EMPTY_CIRCLE_PROFILE_SNAPSHOT,
  isAcceptedProfilePhotoFile,
  normalizeProfilePhotoFile,
  parseCircleProfileMeta,
  parseCircleProfileSnapshot,
  updateCirclePatientProfileFromProxy,
  type CirclePatientProfileSnapshot,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CirclePatientProfileEditorModal } from './CirclePatientProfileEditorModal';
import { CirclePatientProfileReview } from './CirclePatientProfileReview';
import { CircleProfilePhotoCropModal } from './CircleProfilePhotoCropModal';
import { dataUrlToBlob } from '../lib/imageCrop';
import { isFirestoreQuotaError, pauseFirestoreBackgroundWrites } from '../lib/firestoreQuota';
import { useCircleT } from '../lib/circleI18nContext';

type EditableSection =
  | 'identity'
  | 'extended'
  | 'engagement'
  | 'lifestyle'
  | 'functional'
  | 'clinical';

interface CirclePatientProfilePanelProps {
  user: User;
  db: Firestore;
  storage: FirebaseStorage;
  patient: CirclePatientSummary;
  /** Admin embed: hide section icon/title (shown on collapsible summary instead). */
  compact?: boolean;
}

function buildInitialProfileSnapshot(patient: CirclePatientSummary): CirclePatientProfileSnapshot {
  const parts = patient.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    ...EMPTY_CIRCLE_PROFILE_SNAPSHOT,
    identity: {
      ...EMPTY_CIRCLE_PROFILE_SNAPSHOT.identity,
      firstName,
      lastName,
    },
  };
}

export function CirclePatientProfilePanel({
  user,
  db,
  storage,
  patient,
  compact = false,
}: CirclePatientProfilePanelProps) {
  const t = useCircleT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<CirclePatientProfileSnapshot | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<CirclePatientProfileSnapshot | null>(null);
  const [metaSummary, setMetaSummary] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    claimedLoginEmail?: string;
    claimedAt?: number;
    createdByProvisionId?: string;
    provisioningPath?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<EditableSection | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  const canEdit = !!patient.capabilities.remoteSettings;
  const showClinical = !!patient.capabilities.viewClinicalData;
  const workingSnapshot = snapshot ?? draftSnapshot;

  useEffect(() => {
    if (loading) return;
    if (snapshot) {
      setDraftSnapshot(null);
      return;
    }
    if (!canEdit) return;
    setDraftSnapshot((current) => current ?? buildInitialProfileSnapshot(patient));
  }, [canEdit, loading, patient, snapshot]);

  useEffect(() => {
    setLoading(true);
    return onSnapshot(
      doc(db, 'patients', patient.patientId),
      (snap) => {
        if (!snap.exists()) {
          setSnapshot(null);
          setMetaSummary(null);
          setAccountInfo(null);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setSnapshot(parseCircleProfileSnapshot(data.profileSnapshot));
        setMetaSummary(parseCircleProfileMeta(data.profileMeta)?.summary || null);
        setAccountInfo({
          claimedLoginEmail:
            typeof data.claimedLoginEmail === 'string' ? data.claimedLoginEmail : undefined,
          claimedAt: typeof data.claimedAt === 'number' ? data.claimedAt : undefined,
          createdByProvisionId:
            typeof data.createdByProvisionId === 'string' ? data.createdByProvisionId : undefined,
          provisioningPath:
            typeof data.provisioningPath === 'string' ? data.provisioningPath : undefined,
        });
        setLoading(false);
      },
      (err) => {
        console.warn('[CirclePatientProfilePanel]', err);
        setError(t('admin.profile.loadError'));
        setLoading(false);
      },
    );
  }, [db, patient.patientId, t]);

  const handleSaveSection = useCallback(
    async (next: CirclePatientProfileSnapshot) => {
      setSaving(true);
      setError(null);
      try {
        await updateCirclePatientProfileFromProxy(
          db,
          patient.patientId,
          next,
          user.uid,
          patient.displayName,
        );
        setDraftSnapshot(null);
        setEditSection(null);
      } catch (err) {
        console.warn('[CirclePatientProfilePanel] save', err);
        if (isFirestoreQuotaError(err)) {
          pauseFirestoreBackgroundWrites(String(err));
          setError(t('admin.profile.quotaError'));
        } else {
          setError(t('admin.profile.saveError'));
        }
      } finally {
        setSaving(false);
      }
    },
    [db, patient.displayName, patient.patientId, t, user.uid],
  );

  const handleEditSection = (sectionId: string) => {
    if (!canEdit || !workingSnapshot) return;
    if (sectionId === 'clinical' && !showClinical) return;
    if (
      sectionId === 'identity' ||
      sectionId === 'extended' ||
      sectionId === 'engagement' ||
      sectionId === 'lifestyle' ||
      sectionId === 'functional' ||
      sectionId === 'clinical'
    ) {
      setEditSection(sectionId);
    }
  };

  const handlePhotoChange = async (file: File) => {
    if (!canEdit || !workingSnapshot) return;
    if (!isAcceptedProfilePhotoFile(file)) {
      setError(t('admin.profile.imageTypeError'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('admin.profile.imageSizeError'));
      return;
    }
    setError(null);
    setUploadingPhoto(true);
    try {
      const normalized = await normalizeProfilePhotoFile(file);
      setFileToCrop(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.profile.photoUploadError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadCroppedPhoto = async (croppedDataUrl: string) => {
    if (!workingSnapshot) {
      throw new Error(t('admin.profile.profileNotLoaded'));
    }
    setUploadingPhoto(true);
    setError(null);
    try {
      const blob = await dataUrlToBlob(croppedDataUrl);
      // Proxy uploads use circle_profiles/{uid}/… — already allowed by Storage rules.
      const path = `circle_profiles/${user.uid}/patient_${patient.patientId}_avatar.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      const next: CirclePatientProfileSnapshot = {
        ...workingSnapshot,
        identity: { ...workingSnapshot.identity, profilePicture: url },
      };
      await updateCirclePatientProfileFromProxy(
        db,
        patient.patientId,
        next,
        user.uid,
        patient.displayName,
      );
      setDraftSnapshot(null);
      setFileToCrop(null);
    } catch (err) {
      console.warn('[CirclePatientProfilePanel] photo', err);
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : '';
      const message =
        code === 'storage/unauthorized'
          ? t('admin.profile.storageUnauthorized')
          : code === 'permission-denied'
            ? t('admin.profile.firestoreUnauthorized')
            : err instanceof Error && err.message
              ? err.message
              : t('admin.profile.photoUploadError');
      setError(message);
      throw new Error(message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const photoUrl =
    workingSnapshot?.identity.profilePicture?.trim() || patient.photoUrl?.trim() || '';

  const formatClaimedAt = (timestamp?: number) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return null;
    }
  };

  return (
    <div className={compact ? 'p-4 space-y-4' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <UserRound size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-800">{t('admin.profile.title')}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t('admin.profile.hint')}</p>
          </div>
        </div>
      )}

      {compact && (
        <p className="text-xs text-slate-500 leading-relaxed">{t('admin.profile.hint')}</p>
      )}

      {!patient.isPendingProvision && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
            {t('admin.profile.accountTitle')}
          </p>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-600 shrink-0">{t('admin.profile.accountLoginEmail')}</span>
              <span className="font-semibold text-slate-900 text-right break-all">
                {accountInfo?.claimedLoginEmail || t('admin.profile.emptyValue')}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600 shrink-0">{t('admin.profile.accountUid')}</span>
              <span className="font-mono text-xs text-slate-800 text-right break-all">
                {patient.patientId}
              </span>
            </div>
            {accountInfo?.claimedAt ? (
              <div className="flex justify-between gap-3">
                <span className="text-slate-600 shrink-0">{t('admin.profile.accountClaimedAt')}</span>
                <span className="font-medium text-slate-800 text-right">
                  {formatClaimedAt(accountInfo.claimedAt)}
                </span>
              </div>
            ) : null}
            {accountInfo?.createdByProvisionId ? (
              <div className="flex justify-between gap-3">
                <span className="text-slate-600 shrink-0">{t('admin.profile.accountProvisionId')}</span>
                <span className="font-mono text-xs text-slate-800 text-right break-all">
                  {accountInfo.createdByProvisionId}
                </span>
              </div>
            ) : accountInfo?.provisioningPath === 'proxy_led' ? (
              <p className="text-xs text-slate-600 leading-relaxed">{t('admin.profile.accountSelfSetup')}</p>
            ) : null}
          </div>
        </div>
      )}

      {patient.isPendingProvision && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-sm text-amber-900 leading-relaxed">{t('admin.profile.accountPendingSetup')}</p>
          {patient.intendedEmail ? (
            <p className="text-xs text-amber-800 mt-2 break-all">
              {t('provision.intendedEmailLabel')}: {patient.intendedEmail}
            </p>
          ) : null}
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !workingSnapshot ? (
        <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('admin.profile.noProfileSynced', { save: t('admin.profile.saveWord') })}
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                  <UserRound size={28} />
                </div>
              )}
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingPhoto || saving}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md disabled:opacity-50"
                    aria-label={t('admin.profile.changePhotoAria')}
                  >
                    {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
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
                </>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-lg font-bold text-slate-800">
                {displayProfileName(workingSnapshot, patient.displayName)}
              </p>
              {workingSnapshot.identity.email && (
                <p className="text-sm text-slate-500 truncate">{workingSnapshot.identity.email}</p>
              )}
              {metaSummary && <p className="text-xs text-slate-500">{metaSummary}</p>}
            </div>
          </div>

          <CirclePatientProfileReview
            snapshot={workingSnapshot}
            showClinical={showClinical}
            canEdit={canEdit}
            onEditSection={handleEditSection}
          />

          {canEdit && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 leading-relaxed">
              {t('admin.profile.editableNote', {
                clinical: showClinical ? t('admin.profile.editableClinicalSuffix') : '',
              })}
            </p>
          )}

          {!canEdit && (
            <p className="text-xs text-slate-400 flex items-center gap-2 px-1">
              <ClipboardList size={14} />
              {t('admin.profile.readOnlyLimited')}
            </p>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {workingSnapshot && editSection && (
        <CirclePatientProfileEditorModal
          open
          section={editSection}
          snapshot={workingSnapshot}
          patientDisplayName={displayProfileName(workingSnapshot, patient.displayName)}
          saving={saving}
          onClose={() => setEditSection(null)}
          onSave={handleSaveSection}
        />
      )}

      {fileToCrop && (
        <CircleProfilePhotoCropModal
          file={fileToCrop}
          onCancel={() => setFileToCrop(null)}
          onApply={(croppedDataUrl) => uploadCroppedPhoto(croppedDataUrl)}
        />
      )}
    </div>
  );
}
