import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  canSeeCareTeamDashboardReminders,
  canViewRemoteSettingsTab,
  canSendPatientRemoteCommands,
  diaryMoodLabel,
  isPatientInsightsPreviewRemindersEnabled,
  normalizeMemberRole,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type CircleMemberThreadKind,
  type PatientRemoteCommandType,
} from '@medxforce/shared';

import type { CircleMainTab } from './CircleBottomNav';

import { CircleProfileChangeBanner } from './CircleProfileChangeBanner';
import { CircleDashboardWelcomeSection } from './CircleDashboardWelcomeSection';
import { CirclePatientInsightsSection } from './CirclePatientInsightsSection';
import { CircleDashboardCelebrationSection } from './CircleDashboardCelebrationSection';
import { CircleDashboardAttentionTiles } from './CircleDashboardAttentionTiles';
import { CircleDashboardPatientOfflineTile } from './CircleDashboardPatientOfflineTile';
import type { CircleInboxFolder } from './CircleDashboardAttentionTiles';
import { CircleDashboardPatientLocaleWidget } from './CircleDashboardPatientLocaleWidget';
import { CircleGalleryRotatingPreviewWidget } from './CircleGalleryRotatingPreviewWidget';
import { CircleDashboardCircleMapSection } from './CircleDashboardCircleMapSection';
import { CircleDashboardCheckInWellnessSection } from './CircleDashboardCheckInWellnessSection';
import { CircleDashboardAssessmentScheduleSection } from './CircleDashboardAssessmentScheduleSection';

import { CirclePatientCommandConfirmModal } from './CirclePatientCommandConfirmModal';

import { CircleAlertAttentionBanner } from './CircleAlertAttentionBanner';

import type { CircleAlertAttentionItem } from '../hooks/useCircleAlertAttentionState';

import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';
import { useCircleTeamCoverage } from '../hooks/useCircleTeamCoverage';
import { CircleTeamCoverageProvider } from '../context/CircleTeamCoverageContext';

import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';

import { useCircleDashboardLayout } from '../hooks/useCircleDashboardLayout';
import {
  useCircleGalleryDashboardFromShell,
  useCirclePatientPresenceFromShell,
  useCircleRemoteSettingsFromShell,
} from '../context/CircleSelectedPatientContext';
import {
  buildPreviewPatientOfflineAlert,
  canSeePatientOfflineAlert,
  getPatientOfflineAlertDays,
} from '../lib/patientPresenceAlert';
import {
  diaryEntryPreviewLine,
  useDiaryDashboardPreview,
} from '../hooks/useDiaryDashboardPreview';
import { useMemberDiaryActivity } from '../hooks/useMemberDiaryActivity';
import { usePatientFirstEngagementAt } from '../hooks/usePatientFirstEngagementAt';
import type { CirclePatientRemoteCommandAwaiting } from '../hooks/useCirclePatientRemoteCommand';
import { useCirclePatientThreadsContext } from '../context/CirclePatientThreadsContext';

import {
  isCircleProfileDataComplete,
  getUserProfileRecencyUrgency,
} from '../lib/circleProfileDashboard';

import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { isPatientDoNotDisturbSection } from '../hooks/usePatientOnlinePresence';
import { analyticsSummaryFooterText } from '../lib/circleAnalyticsI18n';
import {
  assistiveDevicesLabelT,
  circlePatientFirstName,
  dashboardPlural,
  formatDashboardApplicationModeLineT,
  formatDashboardPatientDashboardViewLineT,
  formatLiveTileApplicationModeLineT,
  formatLiveTileLanguageLineT,
  formatLiveTilePhaseLineT,
  formatDashboardLastLine,
  formatDashboardTimestamp,
  formatPatientActiveSectionT,
  formatPatientOnlineDurationLabelT,
  profileCompletenessLabelT,
  treatmentPhaseLabelT,
} from '../lib/dashboardI18n';
import {
  DASHBOARD_RECENCY_TINT_CLASSES,
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
import { formatCircleBadgeCount } from './CircleCountBadge';

interface CircleDashboardScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  unreadCount: number;
  messageCount: number;
  circleUnreadCount: number;
  circleAnnouncementsUnreadCount: number;
  circleAnnouncementsOpenUnreadCount: number;
  circleAnnouncementsRestrictedUnreadCount: number;
  circleDiscussionsUnreadCount: number;
  circleDiscussionsOpenUnreadCount: number;
  circleDiscussionsRestrictedUnreadCount: number;
  circleDropInsUnreadCount: number;
  circleVisitCapturesUnreadCount: number;
  circleVisitCapturesOpenUnreadCount: number;
  circleVisitCapturesRestrictedUnreadCount: number;
  circlePostCount: number;
  urgentAlertAttention: CircleAlertAttentionItem[];
  subduedAlertAttention: CircleAlertAttentionItem[];
  onGoToTab: (tab: CircleMainTab) => void;
  onOpenCircleFolder?: (thread: CircleMemberThreadKind, folder: CircleInboxFolder) => void;
  onOpenRichMediaReactions?: () => void;
  onOpenAnalyticsDetail: (metricId: AnalyticsMetricId) => void;
  onOpenVisitCapture?: () => void;
  onRequestDropIn?: () => void;
  onResumeDropIn?: () => void;
  dropInActive?: boolean;
  dropInChatOpen?: boolean;
  remoteCommandAwaiting: CirclePatientRemoteCommandAwaiting;
}

const DASHBOARD_WIDGET_BASE_CLASS =
  'w-full h-full p-4 sm:p-5 rounded-2xl border text-left transition-colors flex flex-col';

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
        DASHBOARD_RECENCY_TINT_CLASSES[spec.recencyTint ?? 'neutral'],
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
  patientContextLines,
  showRemotePrompts,
  compact = false,
  onPromptCheckIn,
  onPromptDoctorVisit,
  onPromptQuickAnswers,
  onDropIn,
  onResumeDropIn,
  dropInActive = false,
  dropInChatOpen = false,
  t,
}: {
  onlineDurationLabel: string;
  activeSectionLabel: string;
  patientContextLines?: string[];
  showRemotePrompts: boolean;
  compact?: boolean;
  onPromptCheckIn: () => void;
  onPromptDoctorVisit: () => void;
  onPromptQuickAnswers: () => void;
  onDropIn?: () => void;
  onResumeDropIn?: () => void;
  dropInActive?: boolean;
  dropInChatOpen?: boolean;
  t: ReturnType<typeof useCircleT>;
}) {
  const showResumeDropIn = dropInActive && !dropInChatOpen && !!onResumeDropIn;

  if (compact) {
    return (
      <div
        className={cn(
          'w-full rounded-2xl border text-left transition-colors',
          'flex flex-row items-center gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3.5',
          'border-emerald-200 bg-emerald-50/40',
        )}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="font-bold text-slate-800 text-sm">{t('dashboard.live')}</p>
        </div>
        <div className="flex-1 min-w-0 text-right text-xs text-slate-600 leading-snug">
          <p className="truncate">{t('dashboard.onlineFor', { duration: onlineDurationLabel })}</p>
          <p className="truncate">{t('dashboard.currently', { section: activeSectionLabel })}</p>
        </div>
      </div>
    );
  }

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
          <Radio size={20} className="mb-1 shrink-0 text-emerald-600" />
          <p className="font-bold text-slate-800 text-sm sm:text-base">{t('dashboard.live')}</p>
          <div className="text-xs text-slate-600 mt-3 leading-snug flex flex-col gap-1">
            <p>{t('dashboard.onlineFor', { duration: onlineDurationLabel })}</p>
            <p className="line-clamp-2">{t('dashboard.currently', { section: activeSectionLabel })}</p>
            {patientContextLines?.map((line, index) => (
              <p key={`live-context-${index}`} className="line-clamp-1">
                {line}
              </p>
            ))}
          </div>
        </div>

        {showRemotePrompts ? (
          <div className="w-[11.5rem] sm:w-[13rem] shrink-0 flex flex-col border-l border-slate-200/90 pl-4 sm:pl-5 pb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('dashboard.remotePrompts')}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 flex-1 justify-center min-h-0 pb-1">
              <button
                type="button"
                onClick={onPromptCheckIn}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <Calendar size={14} className="shrink-0" aria-hidden />
                {t('dashboard.checkIn')}
              </button>
              <button
                type="button"
                onClick={onPromptQuickAnswers}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <ClipboardList size={14} className="shrink-0" aria-hidden />
                {t('dashboard.quickAnswers')}
              </button>
              {onDropIn ? (
                <button
                  type="button"
                  onClick={onDropIn}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-50"
                >
                  <MessageCircle size={14} className="shrink-0" aria-hidden />
                  {t('dashboard.dropIn')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onPromptDoctorVisit}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-800 text-xs font-bold hover:bg-blue-50"
              >
                <Stethoscope size={14} className="shrink-0" aria-hidden />
                {t('dashboard.doctorVisit')}
              </button>
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
  circleAnnouncementsUnreadCount,
  circleAnnouncementsOpenUnreadCount,
  circleAnnouncementsRestrictedUnreadCount,
  circleDiscussionsUnreadCount,
  circleDiscussionsOpenUnreadCount,
  circleDiscussionsRestrictedUnreadCount,
  circleDropInsUnreadCount,
  circleVisitCapturesUnreadCount,
  circleVisitCapturesOpenUnreadCount,
  circleVisitCapturesRestrictedUnreadCount,
  circlePostCount,
  urgentAlertAttention,
  subduedAlertAttention,
  onGoToTab,
  onOpenCircleFolder,
  onOpenRichMediaReactions,
  onOpenAnalyticsDetail,
  onOpenVisitCapture,
  onRequestDropIn,
  onResumeDropIn,
  dropInActive,
  dropInChatOpen,
  remoteCommandAwaiting,
}: CircleDashboardScreenProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const patientPresence = useCirclePatientPresenceFromShell();
  const {
    settings: remoteSettings,
    fromFirestore: remoteSettingsFromFirestore,
    loading: remoteSettingsLoading,
  } = useCircleRemoteSettingsFromShell();
  const caps = patient.capabilities;
  const memberRole = normalizeMemberRole(patient.role);
  const { isWidgetVisible } = useCircleDashboardLayout(
    db,
    patient.patientId,
    user.uid,
    memberRole,
  );
  const showEngagementStats = caps.viewEngagementTrends !== false;
  const showRemoteSettings = canViewRemoteSettingsTab(caps);
  const showLiveTile = memberRole !== 'friend';
  const showCircleMap = memberRole !== 'friend' && isWidgetVisible('circle-map');
  const canOpenFullProfile = memberRole === 'proxy';

  const teamCoverageState = useCircleTeamCoverage(
    db,
    patient.patientId,
    patient.isPendingProvision === true,
  );
  const galleryDashboard = useCircleGalleryDashboardFromShell();
  const {
    rawMessages: threadRawMessages,
    repliesByMessageId: threadRepliesByMessageId,
    loading: threadsLoading,
  } = useCirclePatientThreadsContext();
  const { firstEngagementAt, loading: firstEngagementLoading } = usePatientFirstEngagementAt(
    threadRawMessages,
    threadRepliesByMessageId,
    patient.patientId,
    threadsLoading,
  );

  const showRemotePrompts =
    canSendPatientRemoteCommands(patient.role) &&
    showRemoteSettings &&
    patientPresence.online &&
    !isPatientDoNotDisturbSection(patientPresence.activeSection);

  const [confirmCommandType, setConfirmCommandType] =
    useState<PatientRemoteCommandType | null>(null);
  const [sentCommandThisOpen, setSentCommandThisOpen] = useState(false);
  const [, setLiveTick] = useState(0);

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

  const { snapshot: profileSnapshot, loading: profileLoading } = useCirclePatientProfileSnapshot(
    db,
    patient.patientId,
  );

  const diaryPreview = useDiaryDashboardPreview(db, patient.patientId, user, DASHBOARD_STATS_DAYS);
  const memberDiaryActivity = useMemberDiaryActivity(db, patient.patientId, user.uid);

  const galleryReminderEnabled =
    isWidgetVisible('reminder-gallery-upload') && caps.richMediaUpload === true;
  const diaryReminderEnabled = isWidgetVisible('reminder-diary-entry');
  const careRemindersEnabled = canSeeCareTeamDashboardReminders(memberRole);

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
  const dailyCheckInEnabled =
    !remoteSettingsLoading &&
    remoteSettingsFromFirestore &&
    remoteSettings?.dailyCheckIn?.enabled === true &&
    dailyCheckIn?.summaryText !== 'Daily check-in off';
  const showCheckInWellnessRing =
    memberRole !== 'friend' &&
    showEngagementStats &&
    isWidgetVisible('check-in-wellness-ring');
  const showAssessmentScheduleCalendar =
    memberRole !== 'friend' &&
    showEngagementStats &&
    isWidgetVisible('assessment-schedule-calendar') &&
    remoteSettings?.featuresVisibility?.healthAssessments !== false;
  const dailyCheckInsCompletedForDisplay = dailyCheckInEnabled
    ? checkInStats.completed
    : 0;
  const dailyCheckInLatestAt =
    dailyDetail?.latestCompletedAt ?? dailyCheckIn?.latestAt ?? null;
  const dailyCheckInRecencyTint = getDailyCheckInRecencyUrgency({
    completedInWindow: dailyCheckInsCompletedForDisplay,
    skippedInWindow: dailyCheckInEnabled ? checkInStats.skipped : 0,
    latestCompletedAt: dailyCheckInEnabled ? dailyCheckInLatestAt : null,
    hasHistory: dailyCheckInEnabled && !!(dailyDetail || dailyCheckIn?.latestAt),
  });
  const vitalityGamesLast7 = sumVitalityGamesLast7(vitalityDetail?.timeline);
  const assessmentsLast7 = sumAssessmentsLast7(byMetricId);
  const latestAssessment = getLatestAssessment(byMetricId);

  const lastSevenDayWidgets: DashboardWidgetSpec[] = [];
  const youWidgets: DashboardWidgetSpec[] = [];
  const patientAppWidgets: DashboardWidgetSpec[] = [];

  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);
  const previewOfflineAlert = previewReminders ? buildPreviewPatientOfflineAlert() : null;

  const patientOfflineAlertDays =
    previewOfflineAlert?.daysAway ??
    getPatientOfflineAlertDays(patientPresence.lastSeen, patientPresence.online);
  const patientOfflineLastSeen =
    previewOfflineAlert?.lastSeen ?? patientPresence.lastSeen;
  const showPatientOfflineAlert = previewOfflineAlert
    ? true
    : canSeePatientOfflineAlert(memberRole) && patientOfflineAlertDays != null;

  const liveOnlineDurationLabel = patientPresence.online
    ? formatPatientOnlineDurationLabelT(
        t,
        patientPresence.onlineSince || patientPresence.lastSeen,
      )
    : '';

  const livePatientContextLines =
    memberRole !== 'family'
      ? [
          formatLiveTileLanguageLineT(
            t,
            remoteSettings,
            profileSnapshot?.identity.language,
            remoteSettingsLoading || profileLoading,
          ),
          formatLiveTileApplicationModeLineT(t, remoteSettings, remoteSettingsLoading),
          formatLiveTilePhaseLineT(
            t,
            profileSnapshot?.clinical.treatmentPhase,
            profileLoading,
          ),
        ]
      : undefined;

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

    if (dailyCheckInEnabled) {
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
                    row1: dailyCheckIn
                      ? analyticsSummaryFooterText(t, dailyCheckIn, language)
                      : t('dashboard.noCheckInsYet'),
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
    }

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
            row3: caps.messaging
              ? t('common.unread', { count: formatCircleBadgeCount(unreadCount) })
              : undefined,
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
        ? t('common.unread', { count: formatCircleBadgeCount(circleUnreadCount) })
        : circlePostCount === 0
          ? t('dashboard.noFamilyPostsYet')
          : t('dashboard.allCaughtUp'),
    onClick: () => onGoToTab('circle'),
  });

  const canSeeGallery =
    caps.viewCircleMedia !== false || caps.richMediaUpload !== false;
  if (canSeeGallery) {
    const patientFirstName = circlePatientFirstName(profileSnapshot, patient.displayName);

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

  const richMediaReactionsFromPatient = galleryDashboard.patientReactionsTotal > 0;
  const richMediaReactionsCount =
    canSeeGallery && !galleryDashboard.loading
      ? richMediaReactionsFromPatient
        ? galleryDashboard.patientReactionsTotal
        : galleryDashboard.totalReactions
      : 0;
  const richMediaReactionsRecencyTint: AlertAttentionRecencyUrgency =
    galleryDashboard.patientReactionsLast7 > 0 || galleryDashboard.reactionsLast7 > 0
      ? 'green'
      : 'neutral';

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
      row2: formatDashboardPatientDashboardViewLineT(t, remoteSettings, remoteSettingsLoading),
      row3: remoteSettingsLoading ? '' : checkInLabel,
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

  const visibleLastSevenDayWidgets = lastSevenDayWidgets.filter((widget) =>
    isWidgetVisible(widget.key),
  );
  const visibleYouWidgets = youWidgets.filter((widget) => isWidgetVisible(widget.key));
  const visiblePatientAppWidgets = patientAppWidgets.filter((widget) =>
    isWidgetVisible(widget.key),
  );

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
    <CircleTeamCoverageProvider value={teamCoverageState}>
    <div className="space-y-4">
      <CircleAlertAttentionBanner
        urgentItems={urgentAlertAttention}
        subduedItems={subduedAlertAttention}
        onOpenMessages={() => onGoToTab('messages')}
      />

      <CircleProfileChangeBanner user={user} db={db} patient={patient} />

      <CircleDashboardWelcomeSection user={user} db={db} patient={patient} />

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

        {patientPresence.online && showLiveTile && !previewOfflineAlert ? (
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                'col-span-2',
                memberRole === 'family' ? null : 'h-[15.5rem] sm:h-[16rem]',
                dropInActive && !dropInChatOpen && onResumeDropIn ? 'mb-6' : null,
              )}
            >
              <LivePatientWidget
                onlineDurationLabel={liveOnlineDurationLabel}
                activeSectionLabel={formatPatientActiveSectionT(t, patientPresence.activeSection)}
                patientContextLines={livePatientContextLines}
                showRemotePrompts={showRemotePrompts}
                compact={memberRole === 'family'}
                t={t}
                onPromptCheckIn={() => {
                  setSentCommandThisOpen(false);
                  setConfirmCommandType('open_daily_check_in');
                }}
                onPromptDoctorVisit={() => {
                  setSentCommandThisOpen(false);
                  setConfirmCommandType('open_doctor_visit');
                }}
                onPromptQuickAnswers={() => {
                  setSentCommandThisOpen(false);
                  setConfirmCommandType('open_quick_answers');
                }}
                onDropIn={showRemotePrompts ? onRequestDropIn : undefined}
                onResumeDropIn={onResumeDropIn}
                dropInActive={dropInActive}
                dropInChatOpen={dropInChatOpen}
              />
            </div>
          </div>
        ) : null}

        {showPatientOfflineAlert && patientOfflineAlertDays != null ? (
          <CircleDashboardPatientOfflineTile
            daysAway={patientOfflineAlertDays}
            lastSeen={patientOfflineLastSeen}
            isPreview={previewOfflineAlert != null}
          />
        ) : null}

        <CircleDashboardAttentionTiles
          memberRole={memberRole}
          messageUnreadCount={unreadCount}
          announcementsUnreadCount={circleAnnouncementsUnreadCount}
          announcementsOpenUnreadCount={circleAnnouncementsOpenUnreadCount}
          announcementsRestrictedUnreadCount={circleAnnouncementsRestrictedUnreadCount}
          discussionsUnreadCount={circleDiscussionsUnreadCount}
          discussionsOpenUnreadCount={circleDiscussionsOpenUnreadCount}
          discussionsRestrictedUnreadCount={circleDiscussionsRestrictedUnreadCount}
          dropInsUnreadCount={circleDropInsUnreadCount}
          visitCapturesUnreadCount={circleVisitCapturesUnreadCount}
          visitCapturesOpenUnreadCount={circleVisitCapturesOpenUnreadCount}
          visitCapturesRestrictedUnreadCount={circleVisitCapturesRestrictedUnreadCount}
          dailyCheckInsCompletedCount={dailyCheckInsCompletedForDisplay}
          dailyCheckInsRecencyTint={dailyCheckInRecencyTint}
          richMediaReactionsCount={richMediaReactionsCount}
          richMediaReactionsFromPatient={richMediaReactionsFromPatient}
          richMediaReactionsRecencyTint={richMediaReactionsRecencyTint}
          messagingEnabled={caps.messaging === true}
          onOpenMessages={() => onGoToTab('messages')}
          onOpenCircleFolder={onOpenCircleFolder}
          onOpenCheckIns={() => onOpenAnalyticsDetail('daily-check-in')}
          onOpenRichMediaReactions={
            onOpenRichMediaReactions ?? (() => onGoToTab('media'))
          }
        />

        <CircleDashboardCelebrationSection
          db={db}
          user={user}
          patient={patient}
          snapshot={profileSnapshot}
          galleryReminderEnabled={galleryReminderEnabled}
          diaryReminderEnabled={diaryReminderEnabled}
          latestMyUploadAt={galleryDashboard.latestMyUploadAt}
          latestMyDiaryAt={memberDiaryActivity.latestMyDiaryAt}
          participationLoading={galleryDashboard.loading || memberDiaryActivity.loading}
          careRemindersEnabled={careRemindersEnabled}
          firstEngagementAt={firstEngagementAt}
          firstEngagementLoading={firstEngagementLoading}
          analyticsByMetricId={byMetricId}
          analyticsLoading={analyticsLoading}
          canOpenPatientProfile={canOpenFullProfile}
          onGoToTab={onGoToTab}
        />

        {isWidgetVisible('patient-locale') || previewReminders ? (
          <CircleDashboardPatientLocaleWidget
            db={db}
            patientId={patient.patientId}
            snapshot={profileSnapshot}
          />
        ) : null}

        {isWidgetVisible('patient-insights') ? (
          <CirclePatientInsightsSection
            patient={patient}
            snapshot={profileSnapshot}
            loading={profileLoading}
            onOpenProfile={canOpenFullProfile ? () => onGoToTab('admin') : undefined}
          />
        ) : null}

        {familyGalleryWidget || showCircleMap || showCheckInWellnessRing || showAssessmentScheduleCalendar ? (
          <section className="space-y-2">
            <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{t('dashboard.sectionStayConnected')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {familyGalleryWidget ? (
                <>
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
                </>
              ) : null}
              {showCircleMap ? (
                <CircleDashboardCircleMapSection
                  db={db}
                  patientId={patient.patientId}
                  memberRole={memberRole}
                  patientDisplayName={patient.displayName}
                  patientPhotoUrl={
                    profileSnapshot?.identity.profilePicture?.trim() || patient.photoUrl?.trim()
                  }
                  patientNickName={profileSnapshot?.identity.nickName?.trim()}
                  galleryPhotos={galleryDashboard.previewPhotos}
                  enabled={showCircleMap}
                  onManageContacts={
                    memberRole === 'proxy' ? () => onGoToTab('admin') : undefined
                  }
                />
              ) : null}
              {showCheckInWellnessRing ? (
                <CircleDashboardCheckInWellnessSection
                  memberRole={memberRole}
                  answerTrend={dailyDetail?.answerTrend}
                  enabled={showCheckInWellnessRing}
                  onOpenDetails={() => onOpenAnalyticsDetail('daily-check-in')}
                />
              ) : null}
              {showAssessmentScheduleCalendar ? (
                <CircleDashboardAssessmentScheduleSection
                  db={db}
                  patientId={patient.patientId}
                  authorName={user.displayName || user.email || 'Circle'}
                  memberRole={memberRole}
                  byMetricId={byMetricId}
                  treatmentPhase={profileSnapshot?.clinical?.treatmentPhase}
                  appMode={remoteSettings?.appMode}
                  healthAssessmentsEnabled={remoteSettings?.featuresVisibility?.healthAssessments}
                  remoteAssessmentSchedule={remoteSettings?.assessmentSchedule}
                  enabled={showAssessmentScheduleCalendar}
                  t={t}
                  onOpenAssessment={onOpenAnalyticsDetail}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {visibleLastSevenDayWidgets.length > 0 ? (
          <DashboardSection
            title={t('dashboard.sectionLast7Days')}
            widgets={visibleLastSevenDayWidgets}
          />
        ) : null}

        {visibleYouWidgets.length > 0 ? (
          <DashboardSection title={t('dashboard.sectionYou')} widgets={visibleYouWidgets} />
        ) : null}

        {visiblePatientAppWidgets.length > 0 ? (
          <DashboardSection
            title={t('dashboard.sectionPatientApp')}
            widgets={visiblePatientAppWidgets}
          />
        ) : null}
      </div>
    </div>
    </CircleTeamCoverageProvider>
  );
}
