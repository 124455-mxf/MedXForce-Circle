import { useMemo } from 'react';
import { Cake, Camera, ClipboardList, Flag, PartyPopper, PenLine, UserRound, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  ASSESSMENT_AFTER_FIRST_COMMUNICATION_MS,
  hasAssessmentInWindow,
  isPatientInsightsPreviewRemindersEnabled,
  shouldShowAssessmentAfterFirstCommReminder,
  shouldShowDiaryEntryReminder,
  shouldShowGalleryUploadReminder,
  shouldShowProfileIncompleteReminder,
  shouldShowTeamCoverageReminder,
  type CircleParticipationReminderKind,
  type CirclePatientProfileSnapshot,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
} from '@medxforce/shared';
import { isCoreCircleProfileComplete } from '../lib/circleProfileDashboard';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import {
  localizeBirthdayReminder,
  localizeOnsetMilestone,
  localizeParticipationDiaryReminder,
  localizeParticipationGalleryReminder,
  localizePreviewBirthdayReminder,
  localizePreviewOnsetMilestoneFiveYear,
  localizePreviewOnsetMilestoneOneYear,
  localizePreviewParticipationDiaryReminder,
  localizePreviewParticipationGalleryReminder,
  localizePreviewCareAssessmentReminder,
  localizePreviewCareProfileReminder,
  localizePreviewTeamCoverageReminder,
  localizeCareAssessmentReminder,
  localizeCareProfileReminder,
  localizeTeamCoverageReminder,
  patientFriendlyDisplayName,
} from '../lib/dashboardI18n';
import { cn } from '../lib/utils';
import type { CircleMainTab } from './CircleBottomNav';
import { useCircleParticipationReminderSnoozes } from '../hooks/useCircleParticipationReminderSnoozes';
import { useCircleTeamCoverage } from '../hooks/useCircleTeamCoverage';

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
};

function CelebrationCard({
  tone,
  icon: Icon,
  headline,
  body,
  isPreview = false,
  dismissKind,
  onDismiss,
  onOpen,
  t,
}: Omit<CelebrationTile, 'key'> & {
  t: ReturnType<typeof useCircleT>;
  onDismiss?: (kind: CircleParticipationReminderKind) => void;
}) {
  const interactive = !!onOpen;

  return (
    <div
      className={cn(
        'w-full h-full text-left p-3 sm:p-4 rounded-2xl border shadow-sm transition-colors relative',
        tone === 'birthday'
          ? 'bg-gradient-to-r from-violet-50 via-pink-50 to-amber-50 border-violet-200'
          : tone === 'milestone'
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200'
            : tone === 'care'
              ? 'bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-sky-200'
              : 'bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-amber-200',
        interactive && 'cursor-pointer hover:brightness-[0.98] active:scale-[0.99]',
      )}
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
            dismissKind === 'teamCoverage' || dismissKind === 'profileIncomplete'
              ? 'dashboard.reminders.dismissCareReminder'
              : 'dashboard.reminders.dismissReminder',
          )}
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(dismissKind);
          }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-white flex items-center justify-center shadow-sm"
        >
          <X size={14} />
        </button>
      ) : null}
      <button
        type="button"
        disabled={!interactive}
        onClick={(event) => {
          event.stopPropagation();
          onOpen?.();
        }}
        className={cn('flex h-full w-full flex-col gap-2.5 text-left', !interactive && 'cursor-default')}
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
        <div
          className={cn(
            'min-w-0 flex-1 flex flex-col gap-1.5',
            (isPreview || dismissKind) && 'pr-8',
          )}
        >
          <p className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2">
            {headline}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-3">
            {body}
          </p>
        </div>
      </button>
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
  onGoToTab,
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
  onGoToTab: (tab: CircleMainTab) => void;
}) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);
  const { snoozes, loading: snoozeLoading, dismissReminder } = useCircleParticipationReminderSnoozes(
    db,
    patient.patientId,
    user.uid,
  );
  const { analysis: teamCoverage, loading: teamCoverageLoading } = useCircleTeamCoverage(
    db,
    patient.patientId,
    patient.isPendingProvision === true,
  );
  const canManageTeam = patient.capabilities.inviteMembers === true;

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

  const tiles: CelebrationTile[] = [];
  if (birthday) {
    tiles.push({
      key: 'birthday',
      tone: 'birthday',
      icon: birthday.daysUntil >= 0 && birthday.daysUntil <= 1 ? PartyPopper : Cake,
      headline: birthday.headline,
      body: birthday.body,
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

  if (onsetMilestone) {
    tiles.push({
      key: 'onset',
      tone: 'milestone',
      icon: Flag,
      headline: onsetMilestone.headline,
      body: onsetMilestone.body,
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
    const copy = localizeCareProfileReminder(t, friendlyName, canOpenPatientProfile);
    tiles.push({
      key: 'profile-incomplete',
      tone: 'care',
      icon: UserRound,
      headline: copy.headline,
      body: copy.body,
      dismissKind: 'profileIncomplete',
      onOpen: canOpenPatientProfile ? () => onGoToTab('admin') : undefined,
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
      onOpen: canOpenPatientProfile ? () => onGoToTab('admin') : undefined,
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
          <div key={tile.key} className="h-[10rem] sm:h-[10.5rem]">
            <CelebrationCard
              tone={tile.tone}
              icon={tile.icon}
              headline={tile.headline}
              body={tile.body}
              isPreview={tile.isPreview}
              dismissKind={tile.dismissKind}
              onOpen={tile.onOpen}
              t={t}
              onDismiss={(kind) => void dismissReminder(kind)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
