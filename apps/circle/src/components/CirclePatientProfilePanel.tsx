import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { Camera, ChevronDown, ClipboardList, Loader2, UserRound } from 'lucide-react';
import {
  displayProfileName,
  EMPTY_CIRCLE_PROFILE_SNAPSHOT,
  canManageClinicalReferences,
  isAcceptedProfilePhotoFile,
  normalizeProfilePhotoFile,
  parseCircleProfileMeta,
  parseCircleProfileSnapshot,
  updateCirclePatientProfileFromProxy,
  recordCareDiaryMilestones,
  suggestedPackForPhaseTransition,
  canManageCareTransitionPack,
  careTransitionRegionFromCountry,
  canonicalizeProfileCountry,
  normalizeMemberRole,
  readCareTransitionReadinessState,
  writeCareTransitionReadinessState,
  ensureCareTransitionAnnouncementPosted,
  type CirclePatientProfileSnapshot,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CirclePatientProfileEditorModal } from './CirclePatientProfileEditorModal';
import { CirclePatientProfileReview } from './CirclePatientProfileReview';
import { CircleClinicalReferencesSection } from './CircleClinicalReferencesSection';
import { CircleCareTransitionReadinessPanel } from './CircleCareTransitionReadinessPanel';
import { CircleProfilePhotoCropModal } from './CircleProfilePhotoCropModal';
import { dataUrlToBlob } from '../lib/imageCrop';
import { isFirestoreQuotaError, pauseFirestoreBackgroundWrites } from '../lib/firestoreQuota';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { treatmentPhaseLabelT } from '../lib/dashboardI18n';
import {
  treatmentPhaseBadgeClass,
  treatmentPhaseCardClass,
} from '../lib/appModeUi';

function accountInfoCollapsedStorageKey(patientId: string): string {
  return `circle:patientAccountCollapsed:${patientId}`;
}

function readAccountInfoCollapsed(patientId: string): boolean {
  try {
    const raw = localStorage.getItem(accountInfoCollapsedStorageKey(patientId));
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function AccountInfoField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 space-y-1">
      <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wide leading-snug">
        {label}
      </span>
      <span
        className={cn(
          'block break-all leading-snug',
          mono ? 'font-mono text-xs text-slate-800' : 'text-sm font-semibold text-slate-900',
        )}
      >
        {value}
      </span>
    </div>
  );
}

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
  /** Work-tab embed: chrome/header provided by CirclePatientProfileScreen. */
  embedded?: boolean;
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
  embedded = false,
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
  const [accountCollapsed, setAccountCollapsed] = useState(() =>
    readAccountInfoCollapsed(patient.patientId),
  );

  const canEdit = !!patient.capabilities.remoteSettings;
  const showClinical = !!patient.capabilities.viewClinicalData;
  const showClinicalReferences = canManageClinicalReferences(patient.capabilities);
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
    // Clear immediately on patient switch so a save/photo cannot write the previous
    // patient's snapshot into the newly selected patientId.
    let cancelled = false;
    setLoading(true);
    setSnapshot(null);
    setDraftSnapshot(null);
    setMetaSummary(null);
    setAccountInfo(null);
    setEditSection(null);
    setFileToCrop(null);
    setError(null);
    setSaving(false);
    setUploadingPhoto(false);
    const subscribedPatientId = patient.patientId;
    const unsub = onSnapshot(
      doc(db, 'patients', subscribedPatientId),
      (snap) => {
        if (cancelled) return;
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
        if (cancelled) return;
        console.warn('[CirclePatientProfilePanel]', err);
        setError(t('admin.profile.loadError'));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [db, patient.patientId, t]);

  const handleSaveSection = useCallback(
    async (
      next: CirclePatientProfileSnapshot,
      options?: { applyRecommendedTabletLayout?: boolean; startCareTransitionPack?: boolean },
    ) => {
      const targetPatientId = patient.patientId;
      setSaving(true);
      setError(null);
      const previousPhase = workingSnapshot?.clinical?.treatmentPhase?.trim() || '';
      const nextPhase = next.clinical.treatmentPhase?.trim() || '';
      const normalizedNext: CirclePatientProfileSnapshot = {
        ...next,
        identity: {
          ...next.identity,
          country: canonicalizeProfileCountry(next.identity.country),
        },
      };
      try {
        if (targetPatientId !== patient.patientId) {
          throw new Error('Patient switched during profile save');
        }
        await updateCirclePatientProfileFromProxy(
          db,
          targetPatientId,
          normalizedNext,
          user.uid,
          patient.displayName,
          user.displayName || undefined,
          options,
        );
        void recordCareDiaryMilestones(db, {
          patientId: targetPatientId,
          authorUid: user.uid,
          language: normalizedNext.identity.language || workingSnapshot?.identity.language,
          treatmentPhase: { from: previousPhase, to: nextPhase },
        }).catch((err) => console.warn('[careDiaryMilestone]', err));

        if (
          previousPhase !== nextPhase &&
          options?.startCareTransitionPack !== false &&
          canManageCareTransitionPack(normalizeMemberRole(patient.role))
        ) {
          const packId = suggestedPackForPhaseTransition(previousPhase, nextPhase);
          if (packId) {
            void readCareTransitionReadinessState(db, targetPatientId)
              .then(async (current) => {
                if (targetPatientId !== patient.patientId) return;
                const written = await writeCareTransitionReadinessState(
                  db,
                  targetPatientId,
                  {
                    ...current,
                    activePackId: packId,
                    doneIds: [],
                    dismissedIds: [],
                    packActivatedAt: Date.now(),
                    announcedPackId: null,
                    announcementPostId: null,
                  },
                  user.uid,
                );
                await ensureCareTransitionAnnouncementPosted(db, {
                  patientId: targetPatientId,
                  packId,
                  state: written,
                  authorUid: user.uid,
                  authorName: user.displayName || 'Care team',
                  authorRole: normalizeMemberRole(patient.role),
                });
              })
              .catch((err) => console.warn('[careTransitionReadiness]', err));
          }
        }

        // Keep care-transition region aligned with profile country unless manually overridden.
        const previousCountry = workingSnapshot?.identity?.country ?? '';
        const nextCountry = normalizedNext.identity.country ?? '';
        if (
          previousCountry !== nextCountry &&
          canManageCareTransitionPack(normalizeMemberRole(patient.role))
        ) {
          void readCareTransitionReadinessState(db, targetPatientId)
            .then(async (current) => {
              if (targetPatientId !== patient.patientId) return;
              if (current.regionManual) return;
              const region = careTransitionRegionFromCountry(nextCountry);
              if (region === current.region) return;
              await writeCareTransitionReadinessState(
                db,
                targetPatientId,
                { ...current, region, regionManual: false },
                user.uid,
              );
            })
            .catch((err) => console.warn('[careTransitionReadiness] region sync', err));
        }

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
    [db, patient.displayName, patient.patientId, patient.role, t, user.uid, workingSnapshot],
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
    const targetPatientId = patient.patientId;
    setUploadingPhoto(true);
    setError(null);
    try {
      const blob = await dataUrlToBlob(croppedDataUrl);
      // Proxy uploads use circle_profiles/{uid}/… — already allowed by Storage rules.
      const path = `circle_profiles/${user.uid}/patient_${targetPatientId}_avatar.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      if (targetPatientId !== patient.patientId) {
        throw new Error('Patient switched during photo upload');
      }
      const url = await getDownloadURL(storageRef);
      const next: CirclePatientProfileSnapshot = {
        ...workingSnapshot,
        identity: { ...workingSnapshot.identity, profilePicture: url },
      };
      await updateCirclePatientProfileFromProxy(
        db,
        targetPatientId,
        next,
        user.uid,
        patient.displayName,
        user.displayName || undefined,
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
      {!compact && !embedded && (
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setAccountCollapsed((collapsed) => {
                const next = !collapsed;
                try {
                  localStorage.setItem(accountInfoCollapsedStorageKey(patient.patientId), next ? '1' : '0');
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
            className="w-full flex items-center justify-between gap-2 px-0.5 text-left"
            aria-expanded={!accountCollapsed}
            aria-label={
              accountCollapsed
                ? t('admin.profile.accountShowAria')
                : t('admin.profile.accountHideAria')
            }
          >
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t('admin.profile.accountTitle')}
            </h4>
            <ChevronDown
              size={16}
              className={cn(
                'shrink-0 text-slate-400 transition-transform',
                accountCollapsed && '-rotate-90',
              )}
              aria-hidden
            />
          </button>
          {!accountCollapsed ? (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-3 space-y-2">
              <AccountInfoField
                label={t('admin.profile.accountLoginEmail')}
                value={accountInfo?.claimedLoginEmail || t('admin.profile.emptyValue')}
              />
              <AccountInfoField
                label={t('admin.profile.accountUid')}
                value={patient.patientId}
                mono
              />
              {accountInfo?.claimedAt ? (
                <AccountInfoField
                  label={t('admin.profile.accountClaimedAt')}
                  value={formatClaimedAt(accountInfo.claimedAt) || t('admin.profile.emptyValue')}
                />
              ) : null}
              {accountInfo?.createdByProvisionId ? (
                <AccountInfoField
                  label={t('admin.profile.accountProvisionId')}
                  value={accountInfo.createdByProvisionId}
                  mono
                />
              ) : accountInfo?.provisioningPath === 'proxy_led' ? (
                <p className="text-xs text-slate-500 leading-relaxed px-1 pt-1">
                  {t('admin.profile.accountSelfSetup')}
                </p>
              ) : null}
            </div>
          ) : null}
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
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-100 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                  <UserRound size={28} />
                </div>
              )}
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingPhoto || saving}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 disabled:opacity-50 hover:bg-blue-700"
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
              {showClinical && workingSnapshot.clinical.treatmentPhase ? (
                <button
                  type="button"
                  onClick={() => (canEdit ? handleEditSection('clinical') : undefined)}
                  disabled={!canEdit}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-left transition-colors',
                    treatmentPhaseCardClass(workingSnapshot.clinical.treatmentPhase, true),
                    canEdit ? 'hover:opacity-95 cursor-pointer' : 'cursor-default',
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t('admin.profile.fieldTreatmentPhase')}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      treatmentPhaseBadgeClass(workingSnapshot.clinical.treatmentPhase),
                    )}
                  >
                    {treatmentPhaseLabelT(t, workingSnapshot.clinical.treatmentPhase)}
                  </span>
                </button>
              ) : null}
              {workingSnapshot.identity.email &&
              workingSnapshot.identity.email.trim().toLowerCase() !==
                (accountInfo?.claimedLoginEmail?.trim().toLowerCase() ?? '') ? (
                <p className="text-sm text-slate-500 break-all">{workingSnapshot.identity.email}</p>
              ) : null}
              {metaSummary && <p className="text-xs text-slate-500">{metaSummary}</p>}
            </div>
          </div>

          <CirclePatientProfileReview
            snapshot={workingSnapshot}
            showClinical={showClinical}
            showReferences={showClinicalReferences}
            canEdit={canEdit}
            onEditSection={handleEditSection}
            referencesContent={
              showClinicalReferences ? (
                <CircleClinicalReferencesSection
                  db={db}
                  patientId={patient.patientId}
                  user={user}
                  memberRole={patient.role}
                  memberDisplayName={
                    user.displayName || displayProfileName(workingSnapshot, patient.displayName)
                  }
                />
              ) : undefined
            }
          />

          {canEdit && (
            <p className="text-xs text-slate-500 bg-blue-50/60 border border-blue-100 rounded-2xl px-3 py-2 leading-relaxed">
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

          <CircleCareTransitionReadinessPanel
            user={user}
            db={db}
            patient={patient}
            compact
            collapsible
          />
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
