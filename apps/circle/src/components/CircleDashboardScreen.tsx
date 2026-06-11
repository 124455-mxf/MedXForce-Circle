import { useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { User } from 'firebase/auth';

import type { Firestore } from 'firebase/firestore';

import {
  canViewRemoteSettingsTab,
  canSendPatientRemoteCommands,
  diaryMoodLabel,
  normalizeMemberRole,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type PatientRemoteCommandType,
} from '@medxforce/shared';

import type { CircleMainTab } from './CircleBottomNav';

import { CircleProfileChangeBanner } from './CircleProfileChangeBanner';
import { CirclePatientInsightsSection } from './CirclePatientInsightsSection';
import { CircleGalleryRotatingPreviewWidget } from './CircleGalleryRotatingPreviewWidget';

import { CirclePatientCommandConfirmModal } from './CirclePatientCommandConfirmModal';

import { CircleAlertAttentionBanner } from './CircleAlertAttentionBanner';

import type { CircleAlertAttentionItem } from '../hooks/useCircleAlertAttentionState';

import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';

import { useCircleRemoteSettings } from '../hooks/useCircleRemoteSettings';

import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';

import { useFamilyGalleryDashboard } from '../hooks/useFamilyGalleryDashboard';
import {
  diaryEntryPreviewLine,
  useDiaryDashboardPreview,
} from '../hooks/useDiaryDashboardPreview';
import { useCirclePatientRemoteCommandAwaiting } from '../hooks/useCirclePatientRemoteCommandAwaiting';

import {
  isCircleProfileDataComplete,
  getUserProfileRecencyUrgency,
} from '../lib/circleProfileDashboard';

import {
  isPatientDoNotDisturbSection,
  usePatientOnlinePresence,
} from '../hooks/usePatientOnlinePresence';

import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import {
  assistiveDevicesLabelT,
  dashboardPlural,
  formatDashboardApplicationModeLineT,
  formatDashboardLastLine,
  formatDashboardTimestamp,
  formatPatientActiveSectionT,
  formatPatientOnlineDurationLabelT,
  profileCompletenessLabelT,
  treatmentPhaseLabelT,
} from '../lib/dashboardI18n';
import {
  DASHBOARD_STATS_DAYS,
  getAlertAttentionRecencyUrgency,
  getDailyCheckInRecencyUrgency,
  getDiaryRecencyUrgency,
  sumAlertAttentionLast7,
  getLatestAssessment,
  sumAssessmentsLast7,
  sumCompanionLast7ExcludingDetected,
  resolveDailyCheckInLast7Stats,
  sumMessagesLast7,
  sumVitalityGamesLast7,
  type AlertAttentionRecencyUrgency,
} from '../lib/circleDashboardStats';

import { cn } from '../lib/utils';

interface CircleDashboardScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  unreadCount: number;
  messageCount: number;
  circleUnreadCount: number;
  circlePostCount: number;
  totalMediaCount: number;
  myMediaUploadCount: number;
  mediaCountsLoading?: boolean;
  urgentAlertAttention: CircleAlertAttentionItem[];
  subduedAlertAttention: CircleAlertAttentionItem[];
  onGoToTab: (tab: CircleMainTab) => void;
  onOpenAnalyticsDetail: (metricId: AnalyticsMetricId) => void;
  onOpenVisitCapture?: () => void;
  onRequestDropIn?: () => void;
  onResumeDropIn?: () => void;
  dropInActive?: boolean;
  dropInChatOpen?: boolean;
}

const DASHBOARD_WIDGET_BASE_CLASS =
  'w-full h-full p-4 sm:p-5 rounded-2xl border text-left transition-colors flex flex-col';

const DASHBOARD_WIDGET_RECENCY_TINT: Record<
  AlertAttentionRecencyUrgency,
  string
> = {
  neutral: 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30',
  green: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50/70',
  orange: 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50/70',
  red: 'border-red-200 bg-red-50/50 hover:border-red-300 hover:bg-red-50/70',
};
const DASHBOARD_WIDGET_CELL_CLASS = 'h-[10rem] sm:h-[10.5rem]';
const DASHBOARD_SECTION_TITLE_CLASS =
  'text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5';

type DashboardWidgetSpec = {
  key: string;
  title: string;
  icon: LucideIcon;
  row1: ReactNode;
  row2: ReactNode;
  row3?: ReactNode;
  onClick: () => void;
  span?: 'full';
  recencyTint?: AlertAttentionRecencyUrgency;
};

function DashboardWidget({ spec }: { spec: DashboardWidgetSpec }) {
  const Icon = spec.icon;
  const rows = [spec.row1, spec.row2, spec.row3].filter(
    (row): row is ReactNode => row != null && row !== '',
  );

  return (
    <button
      type="button"
      onClick={spec.onClick}
      className={cn(
        DASHBOARD_WIDGET_BASE_CLASS,
        DASHBOARD_WIDGET_RECENCY_TINT[spec.recencyTint ?? 'neutral'],
      )}
    >
      <Icon size={20} className="text-blue-600 mb-2" />
      <p className="font-bold text-slate-800 text-sm sm:text-base">{spec.title}</p>
      <div className="text-xs text-slate-500 mt-1 leading-snug flex-1 flex flex-col justify-end gap-0.5">
        {rows.map((row, index) => (
          <p key={index} className="line-clamp-1">
            {row}
          </p>
        ))}
      </div>
    </button>
  );
}

function LivePatientWidget({
  onlineDurationLabel,
  activeSectionLabel,
  showRemotePrompts,
  onPromptCheckIn,
  onPromptDoctorVisit,
  onDropIn,
  onResumeDropIn,
  dropInActive = false,
  dropInChatOpen = false,
  t,
}: {
  onlineDurationLabel: string;
  activeSectionLabel: string;
  showRemotePrompts: boolean;
  onPromptCheckIn: () => void;
  onPromptDoctorVisit: () => void;
  onDropIn?: () => void;
  onResumeDropIn?: () => void;
  dropInActive?: boolean;
  dropInChatOpen?: boolean;
  t: ReturnType<typeof useCircleT>;
}) {
  const showResumeDropIn = dropInActive && !dropInChatOpen && !!onResumeDropIn;

  return (
    <div className="relative h-full w-full">
      <div
        className={cn(
          DASHBOARD_WIDGET_BASE_CLASS,
          'flex-row items-stretch gap-4 sm:gap-5',
          'border-emerald-200 bg-emerald-50/40',
        )}
      >
        <div className="flex-1 min-w-0 flex flex-col">
          <Radio size={20} className="mb-2 shrink-0 text-emerald-600" />
          <p className="font-bold text-slate-800 text-sm sm:text-base">{t('dashboard.live')}</p>
          <div className="text-xs text-slate-600 mt-1 leading-snug flex-1 flex flex-col justify-end gap-0.5">
            <p>{t('dashboard.onlineFor', { duration: onlineDurationLabel })}</p>
            <p className="line-clamp-2">{t('dashboard.currently', { section: activeSectionLabel })}</p>
          </div>
        </div>

        {showRemotePrompts ? (
          <div className="w-[11.5rem] sm:w-[13rem] shrink-0 flex flex-col border-l border-slate-200/90 pl-4 sm:pl-5 pb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.remotePrompts')}
            </p>
            <div className="mt-3.5 flex flex-col gap-2 flex-1 justify-center min-h-0 pb-1.5">
              <button
                type="button"
                onClick={onPromptCheckIn}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <Calendar size={14} className="shrink-0" aria-hidden />
                {t('dashboard.checkIn')}
              </button>
              <button
                type="button"
                onClick={onPromptDoctorVisit}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <Stethoscope size={14} className="shrink-0" aria-hidden />
                {t('dashboard.doctorVisit')}
              </button>
              {onDropIn ? (
                <button
                  type="button"
                  onClick={onDropIn}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-50"
                >
                  <MessageCircle size={14} className="shrink-0" aria-hidden />
                  {t('dashboard.dropIn')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {showResumeDropIn ? (
        <button
          type="button"
          onClick={onResumeDropIn}
          className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 whitespace-nowrap"
        >
          <MessageCircle size={14} className="shrink-0" aria-hidden />
          {t('dashboard.resumeDropIn')}
        </button>
      ) : null}
    </div>
  );
}

function RecordVisitCaptureWidget({
  onRecordVisitCapture,
  t,
}: {
  onRecordVisitCapture: () => void;
  t: ReturnType<typeof useCircleT>;
}) {
  return (
    <button
      type="button"
      onClick={onRecordVisitCapture}
      className={cn(
        'col-span-2 w-full p-3 sm:px-4 sm:py-3.5 rounded-2xl border text-left transition-colors',
        'flex items-center gap-3 sm:gap-4 min-h-[4.5rem] sm:min-h-[5rem]',
        'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30',
      )}
    >
      <Stethoscope size={20} className="text-blue-600 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
          {t('dashboard.recordVisit')}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2 sm:line-clamp-1">
          {t('dashboard.recordVisitDesc')}
        </p>
      </div>
    </button>
  );
}

function DashboardSection({
  title,
  widgets,
}: {
  title: string;
  widgets: DashboardWidgetSpec[];
}) {
  if (widgets.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {widgets.map((widget) => (
          <div
            key={widget.key}
            className={widget.span === 'full' ? 'col-span-2' : DASHBOARD_WIDGET_CELL_CLASS}
          >
            <DashboardWidget spec={widget} />
          </div>
        ))}
      </div>
    </section>
  );
}

function loadingRows(label: string): Pick<DashboardWidgetSpec, 'row1' | 'row2'> {
  return { row1: label, row2: '' };
}

export function CircleDashboardScreen({
  user,
  db,
  patient,
  unreadCount,
  messageCount,
  circleUnreadCount,
  circlePostCount,
  urgentAlertAttention,
  subduedAlertAttention,
  onGoToTab,
  onOpenAnalyticsDetail,
  onOpenVisitCapture,
  onRequestDropIn,
  onResumeDropIn,
  dropInActive,
  dropInChatOpen,
}: CircleDashboardScreenProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const caps = patient.capabilities;
  const memberRole = normalizeMemberRole(patient.role);
  const showEngagementStats = caps.viewEngagementTrends !== false;
  const showRemoteSettings = canViewRemoteSettingsTab(caps);
  const showLiveTile = memberRole !== 'friend';
  const canOpenFullProfile = memberRole === 'proxy';

  const patientPresence = usePatientOnlinePresence(db, patient.patientId);
  const showRemotePrompts =
    canSendPatientRemoteCommands(patient.role) &&
    showRemoteSettings &&
    patientPresence.online &&
    !isPatientDoNotDisturbSection(patientPresence.activeSection);

  const [confirmCommandType, setConfirmCommandType] =
    useState<PatientRemoteCommandType | null>(null);
  const [sentCommandThisOpen, setSentCommandThisOpen] = useState(false);
  const [, setLiveTick] = useState(0);

  const remoteCommandAwaiting = useCirclePatientRemoteCommandAwaiting(
    db,
    patient.patientId,
    user.uid,
    showRemotePrompts,
  );

  useEffect(() => {
    if (!sentCommandThisOpen || remoteCommandAwaiting.awaitingPatientResponse) return;
    setConfirmCommandType(null);
    setSentCommandThisOpen(false);
  }, [remoteCommandAwaiting.awaitingPatientResponse, sentCommandThisOpen]);

  useEffect(() => {
    if (!patientPresence.online) return;
    const interval = window.setInterval(() => setLiveTick((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [patientPresence.online]);

  const { byMetricId, loading: analyticsLoading } = useCircleAnalyticsSummaries(db, patient);

  const { settings: remoteSettings, loading: remoteSettingsLoading } = useCircleRemoteSettings(
    db,
    showRemoteSettings ? patient : null,
    user,
  );

  const { snapshot: profileSnapshot, loading: profileLoading } = useCirclePatientProfileSnapshot(
    db,
    patient.patientId,
  );

  const galleryDashboard = useFamilyGalleryDashboard(
    db,
    patient.patientId,
    user.uid,
    caps,
    DASHBOARD_STATS_DAYS,
  );

  const diaryPreview = useDiaryDashboardPreview(db, patient.patientId, user, DASHBOARD_STATS_DAYS);

  const dailyCheckIn = byMetricId.get('daily-check-in');
  const dailyDetail =
    dailyCheckIn?.detail?.kind === 'daily_check_in' ? dailyCheckIn.detail : null;

  const alertAttentionSummary = byMetricId.get('alert-attention');
  const alertDetail =
    alertAttentionSummary?.detail?.kind === 'alert_attention'
      ? alertAttentionSummary.detail
      : null;

  const speechSummary = byMetricId.get('speech-history');
  const speechDetail =
    speechSummary?.detail?.kind === 'messages' ? speechSummary.detail : null;

  const companionSummary = byMetricId.get('ai-conversation');
  const companionDetail =
    companionSummary?.detail?.kind === 'companion' ? companionSummary.detail : null;

  const diarySummary = byMetricId.get('diary');
  const diaryDetail = diarySummary?.detail?.kind === 'diary' ? diarySummary.detail : null;

  const vitalitySummary = byMetricId.get('vitality-game');
  const vitalityDetail =
    vitalitySummary?.detail?.kind === 'vitality_game' ? vitalitySummary.detail : null;

  const soulSummary = byMetricId.get('soul-vitality');
  const soulDetail =
    soulSummary?.detail?.kind === 'soul_gallery' ? soulSummary.detail : null;

  const alertStats = sumAlertAttentionLast7(alertDetail?.timeline);
  const communicationStats = sumMessagesLast7(speechDetail?.timeline);
  const companionLast7 = sumCompanionLast7ExcludingDetected(companionDetail?.timeline);
  const checkInStats = resolveDailyCheckInLast7Stats(dailyDetail);
  const vitalityGamesLast7 = sumVitalityGamesLast7(vitalityDetail?.timeline);
  const assessmentsLast7 = sumAssessmentsLast7(byMetricId);
  const latestAssessment = getLatestAssessment(byMetricId);

  const lastSevenDayWidgets: DashboardWidgetSpec[] = [];
  const youWidgets: DashboardWidgetSpec[] = [];
  const patientAppWidgets: DashboardWidgetSpec[] = [];

  const liveOnlineDurationLabel = patientPresence.online
    ? formatPatientOnlineDurationLabelT(
        t,
        patientPresence.onlineSince || patientPresence.lastSeen,
      )
    : '';

  const lastLine = (ts: number | null | undefined) =>
    formatDashboardLastLine(t, language, ts);

  const formatCommunicationInputMethod = (
    method: 'keyboard' | 'touch' | null | undefined,
  ): string => {
    if (method === 'keyboard') return t('dashboard.lastKeyboard');
    if (method === 'touch') return t('dashboard.lastTouch');
    return lastLine(null);
  };

  if (showEngagementStats) {
    lastSevenDayWidgets.push({
      key: 'alert-attention',
      title: t('dashboard.alertsAttention'),
      icon: Bell,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            row1: dashboardPlural(t, 'alert', alertStats.alerts),
            row2: dashboardPlural(t, 'attention', alertStats.attentions),
            row3: lastLine(alertAttentionSummary?.latestAt),
            recencyTint: getAlertAttentionRecencyUrgency(alertAttentionSummary?.latestAt),
          }),
      onClick: () => onOpenAnalyticsDetail('alert-attention'),
    });

    const dailyCheckInLatestAt =
      dailyDetail?.latestCompletedAt ?? dailyCheckIn?.latestAt ?? null;

    lastSevenDayWidgets.push({
      key: 'daily-check-in',
      title: t('dashboard.dailyCheckIn'),
      icon: Calendar,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            ...(dailyDetail
              ? checkInStats.total > 0
                ? {
                    row1: dashboardPlural(t, 'completed', checkInStats.completed),
                    row2: dashboardPlural(t, 'skipped', checkInStats.skipped),
                    row3: lastLine(dailyCheckInLatestAt),
                  }
                : {
                    row1: t('dashboard.skipRate', { rate: dailyDetail.skipRate }),
                    row2: t('dashboard.lastFilled', {
                      when: formatDashboardTimestamp(t, language, dailyCheckIn?.latestAt),
                    }),
                    row3: lastLine(dailyCheckInLatestAt),
                  }
              : {
                  row1: dailyCheckIn?.summaryText || t('dashboard.noCheckInsYet'),
                  row2: t('common.last7Days'),
                  row3: lastLine(dailyCheckIn?.latestAt),
                }),
            recencyTint: getDailyCheckInRecencyUrgency({
              completedInWindow: checkInStats.completed,
              skippedInWindow: checkInStats.skipped,
              latestCompletedAt: dailyCheckInLatestAt,
              hasHistory: !!(dailyDetail || dailyCheckIn?.latestAt),
            }),
          }),
      onClick: () => onOpenAnalyticsDetail('daily-check-in'),
    });

    lastSevenDayWidgets.push({
      key: 'messages',
      title: t('dashboard.messages'),
      icon: MessageSquare,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            row1: dashboardPlural(t, 'messaging', communicationStats.messaging),
            row2:
              caps.messaging && messageCount > 0
                ? dashboardPlural(t, 'thread', messageCount)
                : t('common.last7Days'),
            row3: caps.messaging ? t('common.unread', { count: unreadCount }) : undefined,
          }),
      onClick: () => onGoToTab(caps.messaging ? 'messages' : 'analytics'),
    });

    lastSevenDayWidgets.push({
      key: 'communication',
      title: t('dashboard.communication'),
      icon: MessageSquare,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            row1: dashboardPlural(t, 'communicationStat', communicationStats.communication),
            row2: formatCommunicationInputMethod(speechDetail?.lastCommunicationInputMethod),
            row3: dashboardPlural(t, 'companion', companionLast7),
          }),
      onClick: () => onGoToTab('analytics'),
    });

    lastSevenDayWidgets.push({
      key: 'vitality',
      title: t('dashboard.vitality'),
      icon: Sparkles,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : (() => {
            const pictureCount =
              soulDetail?.totalPhotoCount ?? soulDetail?.photoCount ?? 0;
            const unseenCount =
              soulDetail?.unseenMediaCount ?? soulDetail?.unseenPhotoCount ?? 0;
            return {
              row1: dashboardPlural(t, 'gamesPlayed', vitalityGamesLast7),
              row2: dashboardPlural(t, 'picture', pictureCount),
              row3: dashboardPlural(t, 'unseen', unseenCount),
            };
          })()),
      onClick: () => onGoToTab('analytics'),
    });

    lastSevenDayWidgets.push({
      key: 'assessments',
      title: t('dashboard.assessments'),
      icon: ClipboardList,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            row1: t('dashboard.finished', { count: assessmentsLast7 }),
            row2: latestAssessment.title
              ? t('dashboard.lastAssessment', { title: latestAssessment.title })
              : t('dashboard.noAssessmentsYet'),
            row3: lastLine(latestAssessment.latestAt),
          }),
      onClick: () => onGoToTab('analytics'),
    });
  }

  if (showEngagementStats) {
    youWidgets.push({
      key: 'diary',
      title: t('dashboard.diary'),
      icon: BookOpen,
      ...(diaryPreview.loading || analyticsLoading
        ? loadingRows(t('common.loading'))
        : diaryPreview.sharedCount === 0
          ? {
              row1: t('dashboard.noSharedEntries'),
              row2: t('dashboard.addRecoveryNote'),
            }
          : (() => {
              const latest = diaryPreview.latest;
              const latestAt = latest?.experienceAt ?? diaryDetail?.latestAt ?? null;
              const mood = latest?.mood ? diaryMoodLabel(latest.mood) : undefined;
              const authorLine = latest
                ? latest.authorUid === user.uid
                  ? t('dashboard.yourLatestEntry')
                  : t('dashboard.fromSender', { name: latest.authorName })
                : undefined;

              return {
                row1:
                  diaryPreview.entriesLast7 > 0
                    ? dashboardPlural(t, 'entriesThisWeek', diaryPreview.entriesLast7)
                    : dashboardPlural(t, 'entry', diaryPreview.sharedCount),
                row2: latest ? diaryEntryPreviewLine(latest) : t('dashboard.tapToReadJournal'),
                row3: latest?.isMilestone
                  ? `${t('dashboard.milestone')} · ${lastLine(latestAt)}`
                  : mood
                    ? `${mood} · ${authorLine ?? lastLine(latestAt)}`
                    : authorLine ?? lastLine(latestAt),
                recencyTint: getDiaryRecencyUrgency(latestAt),
              };
            })()),
      onClick: () => onGoToTab('diary'),
    });
  }

  youWidgets.push({
    key: 'circle',
    title: t('dashboard.circleMessages'),
    icon: Users,
    row1: dashboardPlural(t, 'post', circlePostCount),
    row2:
      circleUnreadCount > 0
        ? t('common.unread', { count: circleUnreadCount })
        : circlePostCount === 0
          ? t('dashboard.noFamilyPostsYet')
          : t('dashboard.allCaughtUp'),
    onClick: () => onGoToTab('circle'),
  });

  const canSeeGallery =
    caps.viewCircleMedia !== false || caps.richMediaUpload !== false;
  if (canSeeGallery) {
    const patientFirstName =
      profileSnapshot?.identity.firstName?.trim() ||
      patient.displayName.trim().split(/\s+/)[0] ||
      'Patient';

    youWidgets.push({
      key: 'gallery-engagement',
      title: t('dashboard.yourPhotos'),
      icon: ImageIcon,
      ...(galleryDashboard.loading
        ? loadingRows(t('common.loading'))
        : galleryDashboard.myUploadCount === 0
          ? {
              row1: t('dashboard.shareMoment'),
              row2: t('dashboard.uploadPhotoForFamily'),
            }
          : galleryDashboard.reactionsOnMyUploadsLast7 > 0
            ? {
                row1: dashboardPlural(
                  t,
                  'reactionsThisWeek',
                  galleryDashboard.reactionsOnMyUploadsLast7,
                ),
                row2:
                  galleryDashboard.patientReactionsOnMyUploads > 0
                    ? dashboardPlural(t, 'patientReactions', galleryDashboard.patientReactionsOnMyUploads, {
                        name: patientFirstName,
                      })
                    : dashboardPlural(t, 'sharedPhotos', galleryDashboard.myUploadCount),
                row3:
                  galleryDashboard.reactionsOnMyUploads >
                  galleryDashboard.reactionsOnMyUploadsLast7
                    ? dashboardPlural(t, 'totalReactions', galleryDashboard.reactionsOnMyUploads)
                    : undefined,
                recencyTint: 'green' as const,
              }
            : galleryDashboard.reactionsOnMyUploads > 0
              ? {
                  row1: dashboardPlural(t, 'reactionsOnYourPhotos', galleryDashboard.reactionsOnMyUploads),
                  row2: t('dashboard.noneLast7Days'),
                  row3: dashboardPlural(t, 'sharedPhotos', galleryDashboard.myUploadCount),
                }
              : {
                  row1: dashboardPlural(t, 'sharedPhotos', galleryDashboard.myUploadCount),
                  row2: t('dashboard.noReactionsYetTap'),
                }),
      onClick: () => onGoToTab('media'),
    });
  }

  const unseenGalleryCount =
    soulDetail?.unseenMediaCount ?? soulDetail?.unseenPhotoCount ?? 0;

  const familyGalleryWidget: DashboardWidgetSpec | null = canSeeGallery
    ? {
        key: 'family-gallery',
        title: t('dashboard.mediaGallery'),
        icon: Heart,
        ...(galleryDashboard.loading
          ? loadingRows(t('common.loading'))
          : galleryDashboard.reactionsLast7 > 0
            ? {
                row1: dashboardPlural(t, 'reactionsThisWeek', galleryDashboard.reactionsLast7),
                row2: dashboardPlural(t, 'photosInGallery', galleryDashboard.photoCount),
                row3:
                  unseenGalleryCount > 0
                    ? dashboardPlural(t, 'unseenByPatient', unseenGalleryCount)
                    : galleryDashboard.totalReactions > galleryDashboard.reactionsLast7
                      ? dashboardPlural(t, 'totalReactions', galleryDashboard.totalReactions)
                      : undefined,
                recencyTint: 'green' as const,
              }
            : galleryDashboard.totalReactions > 0
              ? {
                  row1: dashboardPlural(t, 'reactionsOnFamilyPhotos', galleryDashboard.totalReactions),
                  row2: dashboardPlural(t, 'sharedPhotos', galleryDashboard.photoCount),
                  row3:
                    unseenGalleryCount > 0
                      ? dashboardPlural(t, 'unseenByPatient', unseenGalleryCount)
                      : undefined,
                }
              : galleryDashboard.photoCount > 0
                ? {
                    row1: dashboardPlural(t, 'sharedPhotos', galleryDashboard.photoCount),
                    row2:
                      unseenGalleryCount > 0
                        ? dashboardPlural(t, 'unseenByPatient', unseenGalleryCount)
                        : t('dashboard.beFirstToReact'),
                  }
                : {
                    row1: t('dashboard.noPhotosYet'),
                    row2: t('dashboard.uploadMemory'),
                  }),
        onClick: () => onGoToTab('media'),
      }
    : null;

  if (showRemoteSettings) {
    const checkInLabel =
      remoteSettings?.dailyCheckIn?.enabled !== false
        ? t('dashboard.dailyCheckInOn')
        : t('dashboard.dailyCheckInOff');

    patientAppWidgets.push({
      key: 'remote-settings',
      title: t('dashboard.remoteSettings'),
      icon: SlidersHorizontal,
      row1: formatDashboardApplicationModeLineT(t, remoteSettings, remoteSettingsLoading),
      row2: remoteSettingsLoading ? '' : checkInLabel,
      onClick: () => onGoToTab('remote-settings'),
    });
  }

  patientAppWidgets.push({
    key: 'user-profile',
    title: t('dashboard.userProfile'),
    icon: UserRound,
    ...(profileLoading
      ? loadingRows(t('common.loading'))
      : {
          row1: profileCompletenessLabelT(
            t,
            profileSnapshot,
            false,
            profileSnapshot ? isCircleProfileDataComplete(profileSnapshot) : false,
          ),
          row2: t('dashboard.phase', {
            phase: treatmentPhaseLabelT(t, profileSnapshot?.clinical.treatmentPhase),
          }),
          row3: t('dashboard.device', {
            device: assistiveDevicesLabelT(t, profileSnapshot?.lifestyle.assistiveDevices),
          }),
          recencyTint: getUserProfileRecencyUrgency(profileSnapshot),
        }),
    onClick: () => onGoToTab('admin'),
  });

  const handleConfirmRemoteCommand = async () => {
    if (!confirmCommandType || !canSendPatientRemoteCommands(patient.role)) return;
    try {
      await remoteCommandAwaiting.sendRemoteCommand({
        type: confirmCommandType,
        requestedByName: user.displayName || user.email || 'Care team',
        requestedByRole: normalizeMemberRole(patient.role),
      });
      setSentCommandThisOpen(true);
    } catch {
      /* error surfaced on modal */
    }
  };

  const handleCloseRemoteCommandModal = () => {
    if (remoteCommandAwaiting.busy && !remoteCommandAwaiting.awaitingPatientResponse) return;
    if (remoteCommandAwaiting.awaitingPatientResponse) {
      void remoteCommandAwaiting.cancelPendingCommand().finally(() => {
        setConfirmCommandType(null);
        setSentCommandThisOpen(false);
      });
      return;
    }
    setConfirmCommandType(null);
    setSentCommandThisOpen(false);
  };

  return (
    <div className="space-y-4">
      <CircleAlertAttentionBanner
        urgentItems={urgentAlertAttention}
        subduedItems={subduedAlertAttention}
        onOpenMessages={() => onGoToTab('messages')}
      />

      <CircleProfileChangeBanner user={user} db={db} patient={patient} />

      <CirclePatientCommandConfirmModal
        open={confirmCommandType != null}
        type={confirmCommandType}
        patientName={patient.displayName}
        onConfirm={() => void handleConfirmRemoteCommand()}
        onClose={handleCloseRemoteCommandModal}
        sending={remoteCommandAwaiting.busy && !remoteCommandAwaiting.awaitingPatientResponse}
        awaiting={remoteCommandAwaiting.awaitingPatientResponse}
        secondsRemaining={remoteCommandAwaiting.responseSecondsRemaining}
        error={remoteCommandAwaiting.error}
      />

      <div className="space-y-5">
        {onOpenVisitCapture ? (
          <div className="grid grid-cols-2 gap-3">
            <RecordVisitCaptureWidget onRecordVisitCapture={onOpenVisitCapture} t={t} />
          </div>
        ) : null}

        {patientPresence.online && showLiveTile ? (
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                'col-span-2 h-[10.75rem] sm:h-[11.25rem]',
                dropInActive && !dropInChatOpen && onResumeDropIn ? 'mb-6' : null,
              )}
            >
              <LivePatientWidget
                onlineDurationLabel={liveOnlineDurationLabel}
                activeSectionLabel={formatPatientActiveSectionT(t, patientPresence.activeSection)}
                showRemotePrompts={showRemotePrompts}
                t={t}
                onPromptCheckIn={() => {
                  setSentCommandThisOpen(false);
                  setConfirmCommandType('open_daily_check_in');
                }}
                onPromptDoctorVisit={() => {
                  setSentCommandThisOpen(false);
                  setConfirmCommandType('open_doctor_visit');
                }}
                onDropIn={showRemotePrompts ? onRequestDropIn : undefined}
                onResumeDropIn={onResumeDropIn}
                dropInActive={dropInActive}
                dropInChatOpen={dropInChatOpen}
              />
            </div>
          </div>
        ) : null}

        <CirclePatientInsightsSection
          patient={patient}
          snapshot={profileSnapshot}
          loading={profileLoading}
          onOpenProfile={canOpenFullProfile ? () => onGoToTab('admin') : undefined}
        />

        {familyGalleryWidget ? (
          <section className="space-y-2">
            <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{t('dashboard.sectionStayConnected')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className={DASHBOARD_WIDGET_CELL_CLASS}>
                <DashboardWidget spec={familyGalleryWidget} />
              </div>
              <div className={DASHBOARD_WIDGET_CELL_CLASS}>
                <CircleGalleryRotatingPreviewWidget
                  photos={galleryDashboard.previewPhotos}
                  loading={galleryDashboard.loading}
                  onOpenGallery={() => onGoToTab('media')}
                />
              </div>
            </div>
          </section>
        ) : null}

        {lastSevenDayWidgets.length > 0 ? (
          <DashboardSection title={t('dashboard.sectionLast7Days')} widgets={lastSevenDayWidgets} />
        ) : null}

        {youWidgets.length > 0 ? (
          <DashboardSection title={t('dashboard.sectionYou')} widgets={youWidgets} />
        ) : null}

        {patientAppWidgets.length > 0 ? (
          <DashboardSection title={t('dashboard.sectionPatientApp')} widgets={patientAppWidgets} />
        ) : null}
      </div>
    </div>
  );
}
