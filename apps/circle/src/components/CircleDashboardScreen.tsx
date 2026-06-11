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
  formatDashboardApplicationModeLine,
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
  formatAssistiveDeviceLabel,
  formatTreatmentPhaseLabel,
  getCircleProfileCompletenessLabel,
  getUserProfileRecencyUrgency,
} from '../lib/circleProfileDashboard';

import {
  formatPatientActiveSection,
  isPatientDoNotDisturbSection,
  formatPatientOnlineDurationLabel,
  usePatientOnlinePresence,
} from '../hooks/usePatientOnlinePresence';

import { useCircleT } from '../lib/circleI18nContext';
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

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return 'Not recorded yet';

  const d = new Date(ts);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

function formatLastLine(ts: number | null | undefined): string {
  return `Last: ${formatTimestamp(ts)}`;
}

function formatLastCommunicationInputMethod(
  method: 'keyboard' | 'touch' | null | undefined,
): string {
  if (method === 'keyboard') return 'Last: Keyboard';
  if (method === 'touch') return 'Last: Touch';
  return 'Last: Not recorded yet';
}

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
          <p className="font-bold text-slate-800 text-sm sm:text-base">Live</p>
          <div className="text-xs text-slate-600 mt-1 leading-snug flex-1 flex flex-col justify-end gap-0.5">
            <p>Online for {onlineDurationLabel}</p>
            <p className="line-clamp-2">Currently: {activeSectionLabel}</p>
          </div>
        </div>

        {showRemotePrompts ? (
          <div className="w-[11.5rem] sm:w-[13rem] shrink-0 flex flex-col border-l border-slate-200/90 pl-4 sm:pl-5 pb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Remote prompts
            </p>
            <div className="mt-3.5 flex flex-col gap-2 flex-1 justify-center min-h-0 pb-1.5">
              <button
                type="button"
                onClick={onPromptCheckIn}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <Calendar size={14} className="shrink-0" aria-hidden />
                Check-in
              </button>
              <button
                type="button"
                onClick={onPromptDoctorVisit}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <Stethoscope size={14} className="shrink-0" aria-hidden />
                Doctor visit
              </button>
              {onDropIn ? (
                <button
                  type="button"
                  onClick={onDropIn}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-50"
                >
                  <MessageCircle size={14} className="shrink-0" aria-hidden />
                  Drop in
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
          Resume drop-in
        </button>
      ) : null}
    </div>
  );
}

function RecordVisitCaptureWidget({ onRecordVisitCapture }: { onRecordVisitCapture: () => void }) {
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
        <p className="font-bold text-slate-800 text-sm sm:text-base leading-tight">Record visit</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2 sm:line-clamp-1">
          Capture audio and notes from a doctor visit on your device
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
    ? formatPatientOnlineDurationLabel(
        patientPresence.onlineSince || patientPresence.lastSeen,
      )
    : '';

  if (showEngagementStats) {
    lastSevenDayWidgets.push({
      key: 'alert-attention',
      title: t('dashboard.alertsAttention'),
      icon: Bell,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            row1: `${alertStats.alerts} alert${alertStats.alerts === 1 ? '' : 's'}`,
            row2: `${alertStats.attentions} attention`,
            row3: formatLastLine(alertAttentionSummary?.latestAt),
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
                    row1: `${checkInStats.completed} completed`,
                    row2: `${checkInStats.skipped} skipped`,
                    row3: formatLastLine(dailyCheckInLatestAt),
                  }
                : {
                    row1: `Skip rate: ${dailyDetail.skipRate}%`,
                    row2: `Last filled: ${formatTimestamp(dailyCheckIn?.latestAt)}`,
                    row3: formatLastLine(dailyCheckInLatestAt),
                  }
              : {
                  row1: dailyCheckIn?.summaryText || 'No check-ins yet',
                  row2: `Last ${DASHBOARD_STATS_DAYS} days`,
                  row3: formatLastLine(dailyCheckIn?.latestAt),
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
            row1: `${communicationStats.messaging} messaging`,
            row2:
              caps.messaging && messageCount > 0
                ? `${messageCount} thread${messageCount === 1 ? '' : 's'}`
                : `Last ${DASHBOARD_STATS_DAYS} days`,
            row3: caps.messaging ? `${unreadCount} unread` : undefined,
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
            row1: `${communicationStats.communication} communication`,
            row2: formatLastCommunicationInputMethod(
              speechDetail?.lastCommunicationInputMethod,
            ),
            row3: `${companionLast7} companion`,
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
              row1: `${vitalityGamesLast7} game${vitalityGamesLast7 === 1 ? '' : 's'} played`,
              row2: `${pictureCount} picture${pictureCount === 1 ? '' : 's'}`,
              row3: `${unseenCount} unseen`,
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
            row1: `${assessmentsLast7} finished`,
            row2: latestAssessment.title
              ? `Last: ${latestAssessment.title}`
              : 'No assessments yet',
            row3: formatLastLine(latestAssessment.latestAt),
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
              row1: 'No shared entries yet',
              row2: 'Add a recovery note for the circle',
            }
          : (() => {
              const latest = diaryPreview.latest;
              const latestAt = latest?.experienceAt ?? diaryDetail?.latestAt ?? null;
              const mood = latest?.mood ? diaryMoodLabel(latest.mood) : undefined;
              const authorLine = latest
                ? latest.authorUid === user.uid
                  ? 'Your latest entry'
                  : `From ${latest.authorName}`
                : undefined;

              return {
                row1:
                  diaryPreview.entriesLast7 > 0
                    ? `${diaryPreview.entriesLast7} entr${
                        diaryPreview.entriesLast7 === 1 ? 'y' : 'ies'
                      } this week`
                    : `${diaryPreview.sharedCount} entr${
                        diaryPreview.sharedCount === 1 ? 'y' : 'ies'
                      }`,
                row2: latest ? diaryEntryPreviewLine(latest) : 'Tap to read the journal',
                row3: latest?.isMilestone
                  ? `Milestone · ${formatLastLine(latestAt)}`
                  : mood
                    ? `${mood} · ${authorLine ?? formatLastLine(latestAt)}`
                    : authorLine ?? formatLastLine(latestAt),
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
    row1: `${circlePostCount} post${circlePostCount === 1 ? '' : 's'}`,
    row2:
      circleUnreadCount > 0
        ? `${circleUnreadCount} unread`
        : circlePostCount === 0
          ? 'No family posts yet'
          : 'All caught up',
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
              row1: 'Share a moment',
              row2: 'Upload a photo for the family',
            }
          : galleryDashboard.reactionsOnMyUploadsLast7 > 0
            ? {
                row1: `${galleryDashboard.reactionsOnMyUploadsLast7} reaction${
                  galleryDashboard.reactionsOnMyUploadsLast7 === 1 ? '' : 's'
                } this week`,
                row2:
                  galleryDashboard.patientReactionsOnMyUploads > 0
                    ? `${patientFirstName}: ${galleryDashboard.patientReactionsOnMyUploads} reaction${
                        galleryDashboard.patientReactionsOnMyUploads === 1 ? '' : 's'
                      }`
                    : `${galleryDashboard.myUploadCount} photo${
                        galleryDashboard.myUploadCount === 1 ? '' : 's'
                      } shared`,
                row3:
                  galleryDashboard.reactionsOnMyUploads >
                  galleryDashboard.reactionsOnMyUploadsLast7
                    ? `${galleryDashboard.reactionsOnMyUploads} total reactions`
                    : undefined,
                recencyTint: 'green' as const,
              }
            : galleryDashboard.reactionsOnMyUploads > 0
              ? {
                  row1: `${galleryDashboard.reactionsOnMyUploads} reaction${
                    galleryDashboard.reactionsOnMyUploads === 1 ? '' : 's'
                  } on your photos`,
                  row2: 'None in the last 7 days',
                  row3: `${galleryDashboard.myUploadCount} photo${
                    galleryDashboard.myUploadCount === 1 ? '' : 's'
                  } shared`,
                }
              : {
                  row1: `${galleryDashboard.myUploadCount} photo${
                    galleryDashboard.myUploadCount === 1 ? '' : 's'
                  } shared`,
                  row2: 'No reactions yet — tap to view',
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
                row1: `${galleryDashboard.reactionsLast7} reaction${
                  galleryDashboard.reactionsLast7 === 1 ? '' : 's'
                } this week`,
                row2: `${galleryDashboard.photoCount} photo${
                  galleryDashboard.photoCount === 1 ? '' : 's'
                } in the gallery`,
                row3:
                  unseenGalleryCount > 0
                    ? `${unseenGalleryCount} unseen by patient`
                    : galleryDashboard.totalReactions > galleryDashboard.reactionsLast7
                      ? `${galleryDashboard.totalReactions} total reactions`
                      : undefined,
                recencyTint: 'green' as const,
              }
            : galleryDashboard.totalReactions > 0
              ? {
                  row1: `${galleryDashboard.totalReactions} reaction${
                    galleryDashboard.totalReactions === 1 ? '' : 's'
                  } on family photos`,
                  row2: `${galleryDashboard.photoCount} photo${
                    galleryDashboard.photoCount === 1 ? '' : 's'
                  } shared`,
                  row3:
                    unseenGalleryCount > 0
                      ? `${unseenGalleryCount} unseen by patient`
                      : undefined,
                }
              : galleryDashboard.photoCount > 0
                ? {
                    row1: `${galleryDashboard.photoCount} photo${
                      galleryDashboard.photoCount === 1 ? '' : 's'
                    } shared`,
                    row2:
                      unseenGalleryCount > 0
                        ? `${unseenGalleryCount} unseen by patient`
                        : 'Be the first to react',
                  }
                : {
                    row1: 'No photos yet',
                    row2: 'Upload a memory for the family',
                  }),
        onClick: () => onGoToTab('media'),
      }
    : null;

  if (showRemoteSettings) {
    const checkInLabel =
      remoteSettings?.dailyCheckIn?.enabled !== false
        ? 'Daily check-in on'
        : 'Daily check-in off';

    patientAppWidgets.push({
      key: 'remote-settings',
      title: t('dashboard.remoteSettings'),
      icon: SlidersHorizontal,
      row1: formatDashboardApplicationModeLine(remoteSettings, remoteSettingsLoading),
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
          row1: getCircleProfileCompletenessLabel(profileSnapshot, false),
          row2: `Phase: ${formatTreatmentPhaseLabel(profileSnapshot?.clinical.treatmentPhase)}`,
          row3: `Device: ${formatAssistiveDeviceLabel(
            profileSnapshot?.lifestyle.assistiveDevices,
          )}`,
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
            <RecordVisitCaptureWidget onRecordVisitCapture={onOpenVisitCapture} />
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
                activeSectionLabel={formatPatientActiveSection(patientPresence.activeSection)}
                showRemotePrompts={showRemotePrompts}
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
            <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>Stay connected</h3>
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
