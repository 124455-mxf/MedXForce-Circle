import { useMemo, useState } from 'react';
import {
  Activity,
  Cake,
  Camera,
  ClipboardCheck,
  ClipboardList,
  Flag,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Music,
  PartyPopper,
  PenLine,
  UserRound,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  ASSESSMENT_AFTER_FIRST_COMMUNICATION_MS,
  HOSPITAL_FEATURE_REMINDER_KINDS,
  ICU_PROGRESSION_REMINDER_KINDS,
  formatStalePendingInviteNames,
  hasAssessmentInWindow,
  hospitalFeatureRemotePath,
  isHospitalFeatureReminderKind,
  isIcuProgressionReminderKind,
  isParticipationReminderSnoozed,
  isPatientInsightsPreviewRemindersEnabled,
  listHospitalFeatureRemindersToShow,
  listIcuProgressionRemindersToShow,
  listStalePendingInvites,
  setRemoteAppMode,
  setRemoteIntensiveCareExperience,
  setRemoteSettingValue,
  shouldShowAssessmentAfterFirstCommReminder,
  shouldShowDiaryEntryReminder,
  shouldShowGalleryUploadReminder,
  shouldShowPendingInviteReminder,
  shouldShowProfileIncompleteReminder,
  shouldShowTeamCoverageReminder,
  type CircleParticipationReminderKind,
  type CirclePatientProfileSnapshot,
  type CirclePatientSummary,
  type HospitalFeatureReminderKind,
  type IcuProgressionReminderKind,
  type PatientAnalyticsSummary,
  type PatientRemoteSettingsDoc,
} from '@medxforce/shared';
import { isCoreCircleProfileComplete, getMissingCoreCircleProfileFields } from '../lib/circleProfileDashboard';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import {
  localizeBirthdayReminder,
  localizeOnsetMilestone,
  localizeParticipationDiaryReminder,
  localizeParticipationGalleryReminder,
  localizePendingInviteReminder,
  localizePreviewBirthdayReminder,
  localizePreviewOnsetMilestoneFiveYear,
  localizePreviewOnsetMilestoneOneYear,
  localizePreviewParticipationDiaryReminder,
  localizePreviewParticipationGalleryReminder,
  localizePreviewCareAssessmentReminder,
  localizePreviewCareProfileReminder,
  localizePreviewPendingInviteReminder,
  localizePreviewTeamCoverageReminder,
  localizeCareAssessmentReminder,
  localizeCareProfileReminder,
  localizeHospitalFeatureReminder,
  localizePreviewHospitalFeatureReminder,
  localizeIcuProgressionReminder,
  localizePreviewIcuProgressionReminder,
  localizeTeamCoverageReminder,
  formatMissingCoreProfileFieldsT,
  patientFriendlyDisplayName,
} from '../lib/dashboardI18n';
import { cn } from '../lib/utils';
import type { CircleMainTab } from './CircleBottomNav';
import { useCircleParticipationReminderSnoozes } from '../hooks/useCircleParticipationReminderSnoozes';
import { useCircleTeamCoverageFromDashboard } from '../context/CircleTeamCoverageContext';

type CelebrationTileTone = 'birthday' | 'milestone' | 'participation' | 'care';

type CelebrationTile = {
  key: string;
  tone: CelebrationTileTone;
  icon: LucideIcon;
  headline: string;
  body: string;
  isPreview?: boolean;
  dismissKind?: CircleParticipationReminderKind;
  onOpen?: () => void;
  /** In-place enable action (Hospital / ICU progression nudges). */
  actionLabel?: string;
  onAction?: () => void;
  actionUpdating?: boolean;
  actionDisabled?: boolean;
};

function hospitalFeatureIcon(kind: HospitalFeatureReminderKind): LucideIcon {
  if (kind === 'hospitalFeatureMessaging') return MessageSquare;
  if (kind === 'hospitalFeatureDashboard') return LayoutDashboard;
  if (kind === 'hospitalFeatureVitality') return Activity;
  return ClipboardCheck;
}

function hospitalFeatureTurnOnLabelKey(kind: HospitalFeatureReminderKind): string {
  if (kind === 'hospitalFeatureMessaging') return 'dashboard.reminders.hospitalFeatureTurnOnMessaging';
  if (kind === 'hospitalFeatureDashboard') return 'dashboard.reminders.hospitalFeatureTurnOnDashboard';
  if (kind === 'hospitalFeatureVitality') return 'dashboard.reminders.hospitalFeatureTurnOnVitality';
  return 'dashboard.reminders.hospitalFeatureTurnOnAssessments';
}

function icuProgressionIcon(kind: IcuProgressionReminderKind): LucideIcon {
  if (kind === 'modeStepUpStandard' || kind === 'modeStepUpHospital') return Flag;
  if (kind === 'icuSoulMusic') return Music;
  return Camera;
}

function icuProgressionTurnOnLabelKey(kind: IcuProgressionReminderKind): string {
  if (kind === 'modeStepUpStandard') return 'dashboard.reminders.modeStepUpTurnOnStandard';
  if (kind === 'modeStepUpHospital') return 'dashboard.reminders.modeStepUpTurnOnHospital';
  if (kind === 'icuSoulMusic') return 'dashboard.reminders.icuSoulTurnOnMusic';
  return 'dashboard.reminders.icuSoulTurnOnMediaLibrary';
}

function isCareStyleDismissKind(kind: CircleParticipationReminderKind): boolean {
  return (
    kind === 'teamCoverage' ||
    kind === 'pendingInvites' ||
    kind === 'profileIncomplete' ||
    isHospitalFeatureReminderKind(kind) ||
    isIcuProgressionReminderKind(kind)
  );
}

function CelebrationCard({
  tone,
  icon: Icon,
  headline,
  body,
  isPreview = false,
  dismissKind,
  onDismiss,
  onOpen,
  actionLabel,
  onAction,
  actionUpdating = false,
  actionDisabled = false,
  t,
}: Omit<CelebrationTile, 'key'> & {
  t: ReturnType<typeof useCircleT>;
  onDismiss?: (kind: CircleParticipationReminderKind) => void;
}) {
  const hasAction = !!actionLabel;
  const interactive = !!onOpen && !hasAction;

  return (
    <div
      className={cn(
        'w-full h-full text-left p-3 sm:p-4 rounded-2xl border shadow-sm transition-colors relative flex flex-col gap-2.5',
        tone === 'birthday'
          ? 'bg-gradient-to-r from-violet-50 via-pink-50 to-amber-50 border-violet-200'
          : tone === 'milestone'
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200'
            : tone === 'care'
              ? 'bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-sky-200'
              : 'bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-amber-200',
        interactive && 'cursor-pointer hover:brightness-[0.98] active:scale-[0.99]',
      )}
      onClick={
        interactive
          ? () => {
              onOpen?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {isPreview ? (
        <span className="absolute top-3 right-3 inline-flex rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {t('dashboard.preview')}
        </span>
      ) : null}
      {dismissKind && onDismiss && !isPreview ? (
        <button
          type="button"
          aria-label={t(
            isCareStyleDismissKind(dismissKind)
              ? 'dashboard.reminders.dismissCareReminder'
              : dismissKind === 'birthday' || dismissKind === 'onsetMilestone'
                ? 'dashboard.reminders.dismissCelebrationReminder'
                : 'dashboard.reminders.dismissReminder',
          )}
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(dismissKind);
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white flex items-center justify-center shadow-sm z-10"
        >
          <X size={14} />
        </button>
      ) : null}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2.5 text-left',
          (isPreview || dismissKind) && 'pr-8',
        )}
      >
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            tone === 'birthday'
              ? 'bg-violet-100 text-violet-700'
              : tone === 'milestone'
                ? 'bg-emerald-100 text-emerald-700'
                : tone === 'care'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-amber-100 text-amber-700',
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <p className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2">
            {headline}
          </p>
          <p
            className={cn(
              'text-[11px] sm:text-xs text-slate-600 leading-relaxed',
              hasAction ? 'line-clamp-2' : 'line-clamp-3',
            )}
          >
            {body}
          </p>
        </div>
      </div>
      {hasAction ? (
        <button
          type="button"
          disabled={actionDisabled || actionUpdating || !onAction}
          onClick={(event) => {
            event.stopPropagation();
            onAction?.();
          }}
          className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] sm:text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 shrink-0"
        >
          {actionUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
          {actionUpdating ? t('dashboard.reminders.hospitalFeatureUpdating') : actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function CircleDashboardCelebrationSection({
  db,
  user,
  patient,
  snapshot,
  galleryReminderEnabled,
  diaryReminderEnabled,
  latestMyUploadAt,
  latestMyDiaryAt,
  participationLoading,
  careRemindersEnabled,
  firstEngagementAt,
  firstEngagementLoading,
  analyticsByMetricId,
  analyticsLoading,
  canOpenPatientProfile,
  remoteSettings,
  remoteSettingsReady,
  canOpenRemoteSettings,
  onPersistRemoteSettings,
  onGoToTab,
  onOpenAdminAccess,
}: {
  db: Firestore;
  user: User;
  patient: CirclePatientSummary;
  snapshot: CirclePatientProfileSnapshot | null;
  galleryReminderEnabled: boolean;
  diaryReminderEnabled: boolean;
  latestMyUploadAt: number | null;
  latestMyDiaryAt: number | null;
  participationLoading: boolean;
  careRemindersEnabled: boolean;
  firstEngagementAt: number | null;
  firstEngagementLoading: boolean;
  analyticsByMetricId: Map<string, PatientAnalyticsSummary>;
  analyticsLoading: boolean;
  canOpenPatientProfile: boolean;
  remoteSettings: PatientRemoteSettingsDoc | null;
  remoteSettingsReady: boolean;
  canOpenRemoteSettings: boolean;
  onPersistRemoteSettings: (next: PatientRemoteSettingsDoc) => void;
  onGoToTab: (tab: CircleMainTab) => void;
  /** Opens Admin → Circle access (pending invites). */
  onOpenAdminAccess?: () => void;
}) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);
  const { snoozes, loading: snoozeLoading, dismissReminder } = useCircleParticipationReminderSnoozes(
    db,
    patient.patientId,
    user.uid,
  );
  const {
    analysis: teamCoverage,
    invites,
    loading: teamCoverageLoading,
  } = useCircleTeamCoverageFromDashboard();
  const canManageTeam = patient.capabilities.inviteMembers === true;
  const [enablingKind, setEnablingKind] = useState<
    HospitalFeatureReminderKind | IcuProgressionReminderKind | null
  >(null);

  const friendlyName = patientFriendlyDisplayName(snapshot, patient.displayName);
  const birthday = localizeBirthdayReminder(t, language, snapshot, patient.displayName);
  const onsetMilestone = localizeOnsetMilestone(t, snapshot);
  const previewBirthday = previewReminders ? localizePreviewBirthdayReminder(t, friendlyName) : null;
  const previewOnsetFiveYear = previewReminders ? localizePreviewOnsetMilestoneFiveYear(t) : null;
  const previewOnsetOneYear = previewReminders ? localizePreviewOnsetMilestoneOneYear(t) : null;

  const showGalleryReminder =
    !participationLoading &&
    !snoozeLoading &&
    shouldShowGalleryUploadReminder({
      enabled: galleryReminderEnabled,
      latestMyUploadAt,
      snoozes,
    });
  const showDiaryReminder =
    !participationLoading &&
    !snoozeLoading &&
    shouldShowDiaryEntryReminder({
      enabled: diaryReminderEnabled,
      latestMyDiaryAt,
      snoozes,
    });

  const galleryCopy =
    latestMyUploadAt == null || latestMyUploadAt <= 0
      ? localizeParticipationGalleryReminder(t, 'never')
      : localizeParticipationGalleryReminder(t, 'stale');
  const diaryCopy =
    latestMyDiaryAt == null || latestMyDiaryAt <= 0
      ? localizeParticipationDiaryReminder(t, 'never')
      : localizeParticipationDiaryReminder(t, 'stale');

  const profileMeetsMinimum =
    snapshot != null && isCoreCircleProfileComplete(snapshot);
  const assessmentWindowEnd =
    firstEngagementAt != null ? firstEngagementAt + ASSESSMENT_AFTER_FIRST_COMMUNICATION_MS : null;
  const hasAssessmentInInitialWindow =
    firstEngagementAt != null &&
    assessmentWindowEnd != null &&
    hasAssessmentInWindow(analyticsByMetricId, firstEngagementAt, assessmentWindowEnd);

  const showAssessmentReminder =
    careRemindersEnabled &&
    !firstEngagementLoading &&
    !analyticsLoading &&
    !snoozeLoading &&
    shouldShowAssessmentAfterFirstCommReminder({
      enabled: true,
      firstEngagementAt,
      hasAssessmentInInitialWindow,
      snoozedUntil: snoozes.assessmentAfterFirstComm,
    });
  const showProfileReminder =
    careRemindersEnabled &&
    !snoozeLoading &&
    shouldShowProfileIncompleteReminder({
      enabled: true,
      profileComplete: profileMeetsMinimum,
      snoozedUntil: snoozes.profileIncomplete,
    });
  const showTeamCoverageReminder =
    careRemindersEnabled &&
    !teamCoverageLoading &&
    !snoozeLoading &&
    shouldShowTeamCoverageReminder({
      enabled: true,
      gaps: teamCoverage.gaps,
      loading: teamCoverageLoading,
      snoozedUntil: snoozes.teamCoverage,
    });

  const stalePendingInvites = useMemo(
    () => (teamCoverageLoading ? [] : listStalePendingInvites(invites)),
    [invites, teamCoverageLoading],
  );
  const openAdminAccess = () => {
    if (onOpenAdminAccess) onOpenAdminAccess();
    else onGoToTab('admin');
  };
  const showPendingInviteReminder = shouldShowPendingInviteReminder({
    enabled: canManageTeam,
    staleInvites: stalePendingInvites,
    loading: teamCoverageLoading || snoozeLoading,
    snoozes,
  });

  const hospitalFeatureKinds = listHospitalFeatureRemindersToShow({
    enabled: careRemindersEnabled,
    settings: remoteSettings,
    settingsReady: remoteSettingsReady,
    firstEngagementAt,
    firstEngagementLoading,
    snoozes,
    snoozeLoading,
  });

  const icuProgressionKinds = listIcuProgressionRemindersToShow({
    enabled: careRemindersEnabled,
    settings: remoteSettings,
    settingsReady: remoteSettingsReady,
    firstEngagementAt,
    firstEngagementLoading,
    snoozes,
    snoozeLoading,
  });

  const enableHospitalFeature = (kind: HospitalFeatureReminderKind) => {
    if (!remoteSettings || !canOpenRemoteSettings || enablingKind) return;
    setEnablingKind(kind);
    try {
      const path = hospitalFeatureRemotePath(kind);
      let next = setRemoteSettingValue(remoteSettings, path, true);
      // Match Remote Settings Vitality master toggle: unlock Mind/Soul pillars too.
      if (kind === 'hospitalFeatureVitality') {
        next = setRemoteSettingValue(next, 'featuresVisibility.activity.mind', true);
        next = setRemoteSettingValue(next, 'featuresVisibility.activity.soul', true);
      }
      onPersistRemoteSettings({
        ...next,
        patientId: patient.patientId,
      });
      void dismissReminder(kind).catch((err) => {
        console.warn('[Circle] Reminder dismiss after enable failed:', err);
      });
    } finally {
      window.setTimeout(() => setEnablingKind(null), 600);
    }
  };

  const enableIcuProgression = (kind: IcuProgressionReminderKind) => {
    if (!remoteSettings || !canOpenRemoteSettings || enablingKind) return;
    setEnablingKind(kind);
    try {
      let next: PatientRemoteSettingsDoc = remoteSettings;
      if (kind === 'modeStepUpStandard') {
        next = setRemoteIntensiveCareExperience(remoteSettings, 'standard');
      } else if (kind === 'modeStepUpHospital') {
        next = setRemoteAppMode(remoteSettings, 'hospital');
      } else if (kind === 'icuSoulMusic') {
        next = setRemoteSettingValue(
          remoteSettings,
          'featuresVisibility.intensiveCareSoulMusic',
          true,
        );
        next = setRemoteSettingValue(next, 'featuresVisibility.activity.enabled', true);
        next = setRemoteSettingValue(next, 'featuresVisibility.activity.soul', true);
      } else {
        next = setRemoteSettingValue(
          remoteSettings,
          'featuresVisibility.intensiveCareSoulMediaLibrary',
          true,
        );
        next = setRemoteSettingValue(next, 'featuresVisibility.activity.enabled', true);
        next = setRemoteSettingValue(next, 'featuresVisibility.activity.soul', true);
      }
      onPersistRemoteSettings({
        ...next,
        patientId: patient.patientId,
      });
      void dismissReminder(kind).catch((err) => {
        console.warn('[Circle] Reminder dismiss after enable failed:', err);
      });
    } finally {
      window.setTimeout(() => setEnablingKind(null), 600);
    }
  };

  const tiles: CelebrationTile[] = [];
  if (birthday && !isParticipationReminderSnoozed('birthday', snoozes)) {
    tiles.push({
      key: 'birthday',
      tone: 'birthday',
      icon: birthday.daysUntil >= 0 && birthday.daysUntil <= 1 ? PartyPopper : Cake,
      headline: birthday.headline,
      body: birthday.body,
      dismissKind: 'birthday',
    });
  } else if (previewBirthday) {
    tiles.push({
      key: 'preview-birthday',
      tone: 'birthday',
      icon: Cake,
      headline: previewBirthday.headline,
      body: previewBirthday.body,
      isPreview: true,
    });
  }

  if (onsetMilestone && !isParticipationReminderSnoozed('onsetMilestone', snoozes)) {
    tiles.push({
      key: 'onset',
      tone: 'milestone',
      icon: Flag,
      headline: onsetMilestone.headline,
      body: onsetMilestone.body,
      dismissKind: 'onsetMilestone',
    });
  } else {
    if (previewOnsetFiveYear) {
      tiles.push({
        key: 'preview-onset-5',
        tone: 'milestone',
        icon: Flag,
        headline: previewOnsetFiveYear.headline,
        body: previewOnsetFiveYear.body,
        isPreview: true,
      });
    }
    if (previewOnsetOneYear) {
      tiles.push({
        key: 'preview-onset-1',
        tone: 'milestone',
        icon: Flag,
        headline: previewOnsetOneYear.headline,
        body: previewOnsetOneYear.body,
        isPreview: true,
      });
    }
  }

  if (showGalleryReminder) {
    tiles.push({
      key: 'gallery-upload',
      tone: 'participation',
      icon: Camera,
      headline: galleryCopy.headline,
      body: galleryCopy.body,
      dismissKind: 'galleryUpload',
      onOpen: () => onGoToTab('media'),
    });
  } else if (previewReminders) {
    const preview = localizePreviewParticipationGalleryReminder(t);
    tiles.push({
      key: 'preview-gallery-upload',
      tone: 'participation',
      icon: Camera,
      headline: preview.headline,
      body: preview.body,
      isPreview: true,
      onOpen: () => onGoToTab('media'),
    });
  }

  if (showDiaryReminder) {
    tiles.push({
      key: 'diary-entry',
      tone: 'participation',
      icon: PenLine,
      headline: diaryCopy.headline,
      body: diaryCopy.body,
      dismissKind: 'diaryEntry',
      onOpen: () => onGoToTab('diary'),
    });
  } else if (previewReminders) {
    const preview = localizePreviewParticipationDiaryReminder(t);
    tiles.push({
      key: 'preview-diary-entry',
      tone: 'participation',
      icon: PenLine,
      headline: preview.headline,
      body: preview.body,
      isPreview: true,
      onOpen: () => onGoToTab('diary'),
    });
  }

  if (showAssessmentReminder) {
    const copy = localizeCareAssessmentReminder(t);
    tiles.push({
      key: 'assessment-after-first-comm',
      tone: 'care',
      icon: ClipboardList,
      headline: copy.headline,
      body: copy.body,
      dismissKind: 'assessmentAfterFirstComm',
      onOpen: () => onGoToTab('analytics'),
    });
  } else if (previewReminders && careRemindersEnabled) {
    const preview = localizePreviewCareAssessmentReminder(t);
    tiles.push({
      key: 'preview-assessment-after-first-comm',
      tone: 'care',
      icon: ClipboardList,
      headline: preview.headline,
      body: preview.body,
      isPreview: true,
      onOpen: () => onGoToTab('analytics'),
    });
  }

  if (showProfileReminder) {
    const missingFieldsLabel = formatMissingCoreProfileFieldsT(
      t,
      getMissingCoreCircleProfileFields(snapshot),
    );
    const copy = localizeCareProfileReminder(
      t,
      friendlyName,
      canOpenPatientProfile,
      missingFieldsLabel,
    );
    tiles.push({
      key: 'profile-incomplete',
      tone: 'care',
      icon: UserRound,
      headline: copy.headline,
      body: copy.body,
      dismissKind: 'profileIncomplete',
      onOpen: canOpenPatientProfile ? () => onGoToTab('patient-profile') : undefined,
    });
  } else if (previewReminders && careRemindersEnabled) {
    const preview = localizePreviewCareProfileReminder(t, friendlyName);
    tiles.push({
      key: 'preview-profile-incomplete',
      tone: 'care',
      icon: UserRound,
      headline: preview.headline,
      body: preview.body,
      isPreview: true,
      onOpen: canOpenPatientProfile ? () => onGoToTab('patient-profile') : undefined,
    });
  }

  if (showTeamCoverageReminder) {
    const copy = localizeTeamCoverageReminder(t, teamCoverage.gaps, canManageTeam);
    tiles.push({
      key: 'team-coverage',
      tone: 'care',
      icon: Users,
      headline: copy.headline,
      body: copy.body,
      dismissKind: 'teamCoverage',
      onOpen: canManageTeam ? () => onGoToTab('admin') : undefined,
    });
  } else if (previewReminders && careRemindersEnabled) {
    const preview = localizePreviewTeamCoverageReminder(t);
    tiles.push({
      key: 'preview-team-coverage',
      tone: 'care',
      icon: Users,
      headline: preview.headline,
      body: preview.body,
      isPreview: true,
      onOpen: canManageTeam ? () => onGoToTab('admin') : undefined,
    });
  }

  if (showPendingInviteReminder) {
    const names = formatStalePendingInviteNames(stalePendingInvites, (count) =>
      count === 1
        ? t('dashboard.insightList.andOneMore')
        : t('dashboard.insightList.andMore', { count }),
    );
    const copy = localizePendingInviteReminder(t, stalePendingInvites.length, names);
    tiles.push({
      key: 'pending-invites',
      tone: 'care',
      icon: UserPlus,
      headline: copy.headline,
      body: copy.body,
      dismissKind: 'pendingInvites',
      onOpen: openAdminAccess,
    });
  } else if (previewReminders && canManageTeam) {
    const preview = localizePreviewPendingInviteReminder(t);
    tiles.push({
      key: 'preview-pending-invites',
      tone: 'care',
      icon: UserPlus,
      headline: preview.headline,
      body: preview.body,
      isPreview: true,
      onOpen: openAdminAccess,
    });
  }

  if (hospitalFeatureKinds.length > 0) {
    for (const kind of hospitalFeatureKinds) {
      const copy = localizeHospitalFeatureReminder(t, kind);
      tiles.push({
        key: kind,
        tone: 'care',
        icon: hospitalFeatureIcon(kind),
        headline: copy.headline,
        body: copy.body,
        dismissKind: kind,
        actionLabel: t(hospitalFeatureTurnOnLabelKey(kind)),
        onAction: canOpenRemoteSettings ? () => enableHospitalFeature(kind) : undefined,
        actionUpdating: enablingKind === kind,
        actionDisabled: !canOpenRemoteSettings || !remoteSettings,
      });
    }
  } else if (previewReminders && careRemindersEnabled) {
    for (const kind of HOSPITAL_FEATURE_REMINDER_KINDS) {
      const preview = localizePreviewHospitalFeatureReminder(t, kind);
      tiles.push({
        key: `preview-${kind}`,
        tone: 'care',
        icon: hospitalFeatureIcon(kind),
        headline: preview.headline,
        body: preview.body,
        isPreview: true,
        actionLabel: t(hospitalFeatureTurnOnLabelKey(kind)),
        actionDisabled: true,
      });
    }
  }

  if (icuProgressionKinds.length > 0) {
    for (const kind of icuProgressionKinds) {
      const copy = localizeIcuProgressionReminder(t, kind);
      tiles.push({
        key: kind,
        tone: 'care',
        icon: icuProgressionIcon(kind),
        headline: copy.headline,
        body: copy.body,
        dismissKind: kind,
        actionLabel: t(icuProgressionTurnOnLabelKey(kind)),
        onAction: canOpenRemoteSettings ? () => enableIcuProgression(kind) : undefined,
        actionUpdating: enablingKind === kind,
        actionDisabled: !canOpenRemoteSettings || !remoteSettings,
      });
    }
  } else if (previewReminders && careRemindersEnabled) {
    for (const kind of ICU_PROGRESSION_REMINDER_KINDS) {
      const preview = localizePreviewIcuProgressionReminder(t, kind);
      tiles.push({
        key: `preview-${kind}`,
        tone: 'care',
        icon: icuProgressionIcon(kind),
        headline: preview.headline,
        body: preview.body,
        isPreview: true,
        actionLabel: t(icuProgressionTurnOnLabelKey(kind)),
        actionDisabled: true,
      });
    }
  }

  if (tiles.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
        {t('dashboard.sectionReminders')}
      </h3>
      {previewReminders ? (
        <p className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 leading-relaxed">
          {t('dashboard.previewRemindersHint')}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={cn(
              tile.actionLabel ? 'h-[12rem] sm:h-[12.5rem]' : 'h-[10rem] sm:h-[10.5rem]',
            )}
          >
            <CelebrationCard
              tone={tile.tone}
              icon={tile.icon}
              headline={tile.headline}
              body={tile.body}
              isPreview={tile.isPreview}
              dismissKind={tile.dismissKind}
              onOpen={tile.onOpen}
              actionLabel={tile.actionLabel}
              onAction={tile.onAction}
              actionUpdating={tile.actionUpdating}
              actionDisabled={tile.actionDisabled}
              t={t}
              onDismiss={(kind) => {
                void dismissReminder(kind).catch((err) => {
                  console.warn('[Circle] Reminder dismiss failed:', err);
                });
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
