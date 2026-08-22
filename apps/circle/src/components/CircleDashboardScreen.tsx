import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  Bot,
  BookOpen,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CircleDot,
  ClipboardList,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Keyboard,
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
  ANALYTICS_METRIC_DEFINITIONS,
  canInviteMembers,
  canReadAnalyticsAudience,
  canSeeCareTeamDashboardReminders,
  canSeePatientScheduleNudgeTiles,
  canShowIcuCommunicationLogInbox,
  canViewPatientProfileTab,
  canViewRemoteSettingsTab,
  canManageCareTransitionPack,
  canSendPatientRemoteCommands,
  circleDisplayFirstName,
  isCareTransitionPackDraft,
  isHospitalFeatureEnabledInRemoteSettings,
  isPatientInsightsPreviewRemindersEnabled,
  isRemoteSettingsCustomized,
  normalizeMemberRole,
  shouldHideDeclinedAppointmentForContact,
  SCHEDULE_IMMINENT_BANNER_REFRESH_MS,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type CircleMemberThreadKind,
  type PatientRemoteCommandType,
  type RemoteAppMode,
} from '@medxforce/shared';

import type { CircleMainTab } from './CircleBottomNav';

import { CircleProfileChangeBanner } from './CircleProfileChangeBanner';
import { CircleCareTransitionReadinessBanner } from './CircleCareTransitionReadinessBanner';
import { CircleHomePollBanner } from './CircleHomePollBanner';
import { CircleHomeTasksBanner } from './CircleHomeTasksBanner';
import { CircleCareTransitionReadinessPanel } from './CircleCareTransitionReadinessPanel';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';
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
import { CirclePatientCommandConfirmModal } from './CirclePatientCommandConfirmModal';

import { CircleAlertAttentionBanner } from './CircleAlertAttentionBanner';

import type { CircleAlertAttentionItem } from '../hooks/useCircleAlertAttentionState';

import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';
import { useCircleTeamCoverage } from '../hooks/useCircleTeamCoverage';
import { CircleTeamCoverageProvider } from '../context/CircleTeamCoverageContext';

import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';

import { useCircleDashboardLayout } from '../hooks/useCircleDashboardLayout';
import { useCareTransitionReadiness } from '../hooks/useCareTransitionReadiness';
import { CARE_TRANSITION_HOME_BANNER_MAX_AGE_MS } from '../lib/careTransitionBannerDismiss';
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
import { useDiaryDashboardPreview } from '../hooks/useDiaryDashboardPreview';
import { useMemberDiaryActivity } from '../hooks/useMemberDiaryActivity';
import { usePatientFirstEngagementAt } from '../hooks/usePatientFirstEngagementAt';
import type { CirclePatientRemoteCommandAwaiting } from '../hooks/useCirclePatientRemoteCommand';
import { useCirclePatientThreadsContext } from '../context/CirclePatientThreadsContext';
import { useCareCalendarEntries, buildCareCalendarEntriesSubscription } from '../hooks/useCareCalendarEntries';
import { useCircleMemberInviteContext } from '../hooks/useCircleMemberInviteContext';
import { buildCircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import {
  computeCircleScheduleNudgeCounts,
  buildPreviewScheduleNudgeCounts,
  type CircleScheduleNudgeCounts,
} from '../lib/circleDashboardScheduleNudges';
import type { CircleScheduleViewIntent } from '../lib/circleSchedulePreferences';

import {
  isCircleProfileDataComplete,
  isCoreCircleProfileComplete,
  getMissingCoreCircleProfileFields,
  getUserProfileRecencyUrgency,
} from '../lib/circleProfileDashboard';

import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { isPatientDoNotDisturbSection } from '../hooks/usePatientOnlinePresence';
import { countUnreadIcuDailySummaries, isIcuDailySummary } from '../lib/circleCommunicationLog';
import {
  CIRCLE_MSG_READ_CHANGED,
  isCommunicationLogSummaryUnread,
} from '../lib/circleMessageRead';
import {
  circlePatientFirstName,
  dashboardPlural,
  formatLiveTileApplicationModeLineT,
  formatLiveTileLanguageLineT,
  formatLiveTilePhaseLineT,
  formatDashboardLastLine,
  formatDashboardTimestamp,
  formatMissingCoreProfileFieldsT,
  formatPatientActiveSectionT,
  formatPatientOnlineDurationLabelT,
  profileCompletenessLabelT,
  treatmentPhaseLabelT,
} from '../lib/dashboardI18n';
import {
  remoteAppModeCurrentBadgeClass,
  treatmentPhaseBadgeClass,
} from '../lib/appModeUi';
import {
  DASHBOARD_RECENCY_TINT_CLASSES,
  DASHBOARD_STATS_DAYS,
  activityDaysFromAssessmentSummaries,
  activityDaysFromTimeline,
  type DashboardActivityDay,
  getAlertAttentionRecencyUrgency,
  getDailyCheckInRecencyUrgency,
  getDiaryRecencyUrgency,
  DASHBOARD_STATS_DAYS_30,
  sumAlertAttentionLast7,
  sumAlertAttentionLastN,
  getLatestAssessment,
  assessmentMetricIdsTakenLast7,
  sumAssessmentsLast7,
  sumAssessmentsLastN,
  sumCompanionLast7ExcludingDetected,
  sumCompanionLastNExcludingDetected,
  resolveDailyCheckInLast7Stats,
  sumDailyCheckInLastN,
  sumMessagesLast7,
  sumMessagesLastN,
  sumVitalityGamesLast7,
  sumVitalityGamesLastN,
  type AlertAttentionRecencyUrgency,
} from '../lib/circleDashboardStats';

import { cn } from '../lib/utils';
import {
  dashboardSectionTitleClass,
  dashboardTileTitleClass,
} from '../lib/circleSectionStyles';
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
  onOpenAdminAccess?: () => void;
  onOpenCircleFolder?: (thread: CircleMemberThreadKind, folder: CircleInboxFolder) => void;
  /** Open Messages on a specific inbox folder (e.g. ICU communication log). */
  onOpenMessagesInbox?: (view: 'communication_log' | 'in_out') => void;
  onOpenAnalyticsDetail: (
    metricId: AnalyticsMetricId,
    messagesFocus?: 'messaging' | 'communication',
  ) => void;
  /** Open Analytics on the assessments overview (no charts). */
  onOpenAssessmentsOverview: () => void;
  /** Open Analytics on the last-7 / last-30 overview. */
  onOpenAnalyticsPeriodOverview: (days: 7 | 30) => void;
  /** Open Media gallery on the Reactions album. */
  onOpenGalleryReactions?: () => void;
  /** Open Media gallery on the Shared → My albums filter. */
  onOpenGalleryMyAlbums?: () => void;
  onOpenSchedule?: (view?: CircleScheduleViewIntent) => void;
  onOpenVisitCapture?: () => void;
  onRequestDropIn?: () => void;
  onResumeDropIn?: () => void;
  dropInActive?: boolean;
  dropInChatOpen?: boolean;
  /** When false, Drop-in is shown disabled with a Remote Settings hint. */
  dropInFeatureEnabled?: boolean;
  remoteCommandAwaiting: CirclePatientRemoteCommandAwaiting;
}

const DASHBOARD_WIDGET_BASE_CLASS =
  'w-full h-full p-3.5 sm:p-4 rounded-2xl border text-left transition-colors flex flex-col shadow-sm';

const DASHBOARD_WIDGET_CELL_CLASS = 'h-[10rem] sm:h-[10.5rem]';
const DASHBOARD_LAST7_WIDGET_CELL_CLASS = 'min-h-[12rem] sm:min-h-[12.5rem] h-full';
const DASHBOARD_SECTION_TITLE_CLASS = dashboardSectionTitleClass;

type DashboardWidgetIconTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

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
  /** Optional mode-colored card chrome (e.g. ICU / Hospital / Daily Life). */
  accentClass?: string;
  /** Large primary number/status for Last 7 days readability. */
  heroValue?: ReactNode;
  /** Word heroes (mode / completeness) stay readable at Large text size. */
  heroVariant?: 'metric' | 'label';
  heroMuted?: boolean;
  iconTone?: DashboardWidgetIconTone;
  activityDays?: DashboardActivityDay[];
  /** Full-width tiles can put the week bar beside the hero instead of under it. */
  activityDaysPlacement?: 'bottom' | 'end';
};

const WIDGET_ICON_TONE_CLASSES: Record<DashboardWidgetIconTone, string> = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
};

function galleryPhotoReactionHero(photos: number, reactions: number): ReactNode {
  return (
    <span className="inline-flex items-baseline gap-0.5 min-w-0">
      <span>{photos}</span>
      <span className="text-[1.35rem] sm:text-xl font-semibold tracking-tight text-slate-500 leading-none">
        /{reactions}
      </span>
    </span>
  );
}

function iconToneFromRecency(
  tint: AlertAttentionRecencyUrgency | undefined,
): DashboardWidgetIconTone {
  if (tint === 'green') return 'emerald';
  if (tint === 'orange') return 'amber';
  if (tint === 'red') return 'rose';
  return 'blue';
}

function closestScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

function WeekActivityDots({
  days,
  placement = 'bottom',
}: {
  days: DashboardActivityDay[];
  placement?: 'bottom' | 'end';
}) {
  const t = useCircleT();
  const rootRef = useRef<HTMLDivElement>(null);
  const [grown, setGrown] = useState(false);
  const maxValue = Math.max(1, ...days.map((day) => day.value));

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setGrown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setGrown(true);
      },
      {
        root: closestScrollParent(el),
        threshold: 0.2,
        rootMargin: '40px 0px',
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={placement === 'end' ? 'w-full min-w-0' : 'mt-auto pt-2.5'}
      aria-label={t('dashboard.weekActivityAria')}
    >
      <div className={cn('flex items-end gap-1', placement === 'end' ? 'h-8' : 'h-7')}>
        {days.map((day, index) => {
          // Empty days stay a short stub; active days scale by count vs week max.
          const heightPct =
            day.value <= 0 ? 22 : Math.max(36, Math.round((day.value / maxValue) * 100));
          return (
            <span
              key={day.dateKey}
              title={`${day.dateKey}: ${day.value}`}
              className={cn(
                'flex-1 rounded-sm min-h-0 box-border transition-[height] duration-700 ease-out',
                day.isToday
                  ? 'bg-sky-300'
                  : day.isActive
                    ? 'bg-white border border-slate-300'
                    : 'bg-slate-500/70',
              )}
              style={{
                height: grown ? `${heightPct}%` : '0%',
                transitionDelay: grown
                  ? `${250 + (days.length - 1 - index) * 55}ms`
                  : '0ms',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function DashboardWidgetRow({
  row,
  index,
  heroLayout,
}: {
  row: ReactNode;
  index: number;
  heroLayout: boolean;
}) {
  if (typeof row === 'string') {
    return (
      <p
        className={cn(
          'leading-snug line-clamp-2',
          heroLayout
            ? index === 0
              ? 'text-sm text-slate-700 font-medium'
              : 'text-[13px] text-slate-600'
            : undefined,
        )}
      >
        {row}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'min-w-0 leading-snug',
        heroLayout && (index === 0 ? 'text-sm' : 'text-[13px]'),
      )}
    >
      {row}
    </div>
  );
}

function DashboardWidget({ spec }: { spec: DashboardWidgetSpec }) {
  const Icon = spec.icon;
  const rows = [spec.row1, spec.row2, spec.row3].filter(
    (row): row is ReactNode => row != null && row !== '',
  );
  const hasHero = spec.heroValue != null && spec.heroValue !== '';
  const iconTone = spec.iconTone ?? iconToneFromRecency(spec.recencyTint);

  return (
    <button
      type="button"
      onClick={spec.onClick}
      className={cn(
        DASHBOARD_WIDGET_BASE_CLASS,
        spec.accentClass ?? DASHBOARD_RECENCY_TINT_CLASSES[spec.recencyTint ?? 'neutral'],
      )}
    >
      <div className="flex items-center gap-2.5 mb-2 min-w-0">
        <span
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            WIDGET_ICON_TONE_CLASSES[iconTone],
          )}
        >
          <Icon size={18} aria-hidden />
        </span>
        <p className={dashboardTileTitleClass}>
          {spec.title}
        </p>
      </div>

      {hasHero ? (
        spec.span === 'full' &&
        spec.activityDaysPlacement === 'end' &&
        spec.activityDays &&
        spec.activityDays.length > 0 ? (
          <div className="flex items-center justify-between gap-4 min-w-0">
            <p
              className={cn(
                'font-bold tracking-tight leading-none text-3xl sm:text-[2rem] shrink-0',
                spec.heroMuted ? 'text-slate-400' : 'text-slate-900',
              )}
            >
              {spec.heroValue}
            </p>
            <div className="w-[58%] max-w-[18rem] min-w-0">
              <WeekActivityDots days={spec.activityDays} placement="end" />
            </div>
          </div>
        ) : spec.span === 'full' && spec.heroVariant === 'label' ? (
          <div className="flex items-center justify-between gap-3 min-w-0">
            <p
              className={cn(
                'font-bold tracking-tight min-w-0',
                typeof spec.heroValue === 'number'
                  ? 'leading-none text-3xl sm:text-[2rem] shrink-0'
                  : 'text-lg leading-tight',
                spec.heroMuted ? 'text-slate-400' : 'text-slate-900',
              )}
            >
              {spec.heroValue}
            </p>
            <div className="shrink-0 max-w-[55%] text-right">
              {rows.map((row, index) => (
                <DashboardWidgetRow key={index} row={row} index={index} heroLayout />
              ))}
            </div>
          </div>
        ) : (
        <>
          <p
            className={cn(
              'font-bold tracking-tight',
              spec.heroVariant === 'label'
                ? 'text-lg leading-tight line-clamp-2'
                : 'leading-none text-3xl sm:text-[2rem]',
              spec.heroMuted ? 'text-slate-400' : 'text-slate-900',
            )}
          >
            {spec.heroValue}
          </p>
          <div className="mt-2 space-y-0.5 min-w-0">
            {rows.map((row, index) => (
              <DashboardWidgetRow key={index} row={row} index={index} heroLayout />
            ))}
          </div>
          {spec.activityDays && spec.activityDays.length > 0 ? (
            <WeekActivityDots days={spec.activityDays} />
          ) : (
            <div className="flex-1" />
          )}
        </>
        )
      ) : (
        <div className="text-sm text-slate-600 mt-0.5 leading-snug flex-1 flex flex-col justify-end gap-0.5 min-w-0">
          {rows.map((row, index) => (
            <DashboardWidgetRow key={index} row={row} index={index} heroLayout={false} />
          ))}
        </div>
      )}
    </button>
  );
}

function liveRemotePromptsCollapsedStorageKey(memberUid: string, patientId: string): string {
  return `circle:liveRemotePromptsCollapsed:${memberUid}:${patientId}`;
}

function readLiveRemotePromptsCollapsed(memberUid: string, patientId: string): boolean {
  try {
    const raw = localStorage.getItem(liveRemotePromptsCollapsedStorageKey(memberUid, patientId));
    // Default collapsed so presence stays primary until the member opens prompts.
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function writeLiveRemotePromptsCollapsed(
  memberUid: string,
  patientId: string,
  collapsed: boolean,
): void {
  try {
    localStorage.setItem(
      liveRemotePromptsCollapsedStorageKey(memberUid, patientId),
      collapsed ? '1' : '0',
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function LivePresenceDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2.5 w-2.5 shrink-0', className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

function LiveRemotePromptChip({
  label,
  icon: Icon,
  onClick,
  tone = 'default',
  disabled = false,
  disabledHint,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  tone?: 'default' | 'dropIn';
  disabled?: boolean;
  disabledHint?: string;
}) {
  const toneClass =
    tone === 'dropIn'
      ? 'border-indigo-100 text-indigo-800 hover:bg-indigo-50/80 hover:border-indigo-200'
      : 'border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300';

  if (disabled) {
    return (
      <div
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed select-none"
        aria-disabled="true"
        title={disabledHint}
      >
        <Icon size={14} className="shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full border bg-white px-3 py-2 text-xs font-semibold transition-colors',
        toneClass,
      )}
    >
      <Icon size={14} className="shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}

function LivePatientWidget({
  onlineDurationLabel,
  activeSectionLabel,
  patientName,
  patientId,
  memberUid,
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
  dropInFeatureEnabled = true,
  t,
}: {
  onlineDurationLabel: string;
  activeSectionLabel: string;
  patientName: string;
  patientId: string;
  memberUid: string;
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
  dropInFeatureEnabled?: boolean;
  t: ReturnType<typeof useCircleT>;
}) {
  const showResumeDropIn = dropInActive && !dropInChatOpen && !!onResumeDropIn;
  const [promptsCollapsed, setPromptsCollapsed] = useState(() =>
    readLiveRemotePromptsCollapsed(memberUid, patientId),
  );

  useEffect(() => {
    setPromptsCollapsed(readLiveRemotePromptsCollapsed(memberUid, patientId));
  }, [memberUid, patientId]);

  // Keep prompts open while a drop-in can be resumed so the action isn't buried.
  const promptsExpanded = showResumeDropIn || !promptsCollapsed;

  const togglePromptsCollapsed = () => {
    if (showResumeDropIn) return;
    setPromptsCollapsed((current) => {
      const next = !current;
      writeLiveRemotePromptsCollapsed(memberUid, patientId, next);
      return next;
    });
  };

  const metaLine = patientContextLines?.filter(Boolean).join(' · ') ?? '';
  const liveTitle = (
    <p className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
      <span>{t('dashboard.live')}</span>
      <span className="font-semibold text-slate-400"> – </span>
      <span className="text-slate-800">{patientName}</span>
      <span className="font-semibold text-slate-400"> – </span>
      <span className="font-medium text-slate-500">
        {t('dashboard.onlineFor', { duration: onlineDurationLabel })}
      </span>
    </p>
  );

  if (compact) {
    return (
      <div
        className={cn(
          'w-full rounded-2xl border border-slate-100 bg-white text-left',
          'flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4',
        )}
      >
        <LivePresenceDot className="mt-1.5" />
        <div className="min-w-0 flex-1">
          {liveTitle}
          <p className="mt-1 text-xs text-slate-500 leading-snug">
            {t('dashboard.currently', { section: activeSectionLabel })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-3">
          <LivePresenceDot className="mt-1.5" />
          <div className="min-w-0 flex-1">
            {liveTitle}
            <p className="mt-1 text-xs text-slate-600 leading-snug line-clamp-2">
              {t('dashboard.currently', { section: activeSectionLabel })}
            </p>
            {metaLine ? (
              <p className="mt-1 text-[11px] text-slate-400 leading-snug line-clamp-2">
                {metaLine}
              </p>
            ) : null}
          </div>
        </div>

        {showRemotePrompts ? (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={togglePromptsCollapsed}
              disabled={showResumeDropIn}
              aria-expanded={promptsExpanded}
              aria-label={
                promptsExpanded
                  ? t('dashboard.remotePromptsCollapseAria')
                  : t('dashboard.remotePromptsExpandAria')
              }
              className={cn(
                'w-full flex items-center justify-between gap-2 px-0.5 rounded-lg text-left',
                showResumeDropIn
                  ? 'cursor-default'
                  : 'hover:bg-slate-50/80 -mx-1 px-1.5 py-0.5',
              )}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t('dashboard.remotePrompts')}
              </p>
              <ChevronDown
                size={16}
                className={cn(
                  'shrink-0 text-slate-400 transition-transform',
                  !promptsExpanded && '-rotate-90',
                  showResumeDropIn && 'opacity-40',
                )}
                aria-hidden
              />
            </button>
            {promptsExpanded ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <LiveRemotePromptChip
                  label={t('dashboard.checkIn')}
                  icon={Calendar}
                  onClick={onPromptCheckIn}
                />
                <LiveRemotePromptChip
                  label={t('dashboard.quickAnswers')}
                  icon={ClipboardList}
                  onClick={onPromptQuickAnswers}
                />
                {onDropIn ? (
                  <LiveRemotePromptChip
                    label={t('dashboard.dropIn')}
                    icon={MessageCircle}
                    tone="dropIn"
                    onClick={onDropIn}
                  />
                ) : dropInFeatureEnabled === false ? (
                  <LiveRemotePromptChip
                    label={t('dashboard.dropIn')}
                    icon={MessageCircle}
                    disabled
                    disabledHint={t('dashboard.dropInDisabledHint')}
                  />
                ) : null}
                <LiveRemotePromptChip
                  label={t('dashboard.doctorVisit')}
                  icon={Stethoscope}
                  onClick={onPromptDoctorVisit}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showResumeDropIn ? (
        <button
          type="button"
          onClick={onResumeDropIn}
          className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 whitespace-nowrap"
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
        'w-full p-3 sm:px-4 sm:py-3.5 rounded-2xl border text-left transition-colors',
        'flex items-center gap-3 sm:gap-4 min-h-[4.5rem] sm:min-h-[5rem]',
        'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30',
      )}
    >
      <CircleDot size={20} className="text-blue-600 shrink-0" aria-hidden />
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

function widgetSpansFullRow(
  widgets: Array<{ span?: 'full' }>,
  index: number,
): boolean {
  const widget = widgets[index];
  if (!widget) return false;
  if (widget.span === 'full') return true;

  let nextCol = 0;
  for (let i = 0; i < index; i += 1) {
    if (widgets[i]?.span === 'full') nextCol = 0;
    else nextCol = nextCol === 0 ? 1 : 0;
  }
  if (nextCol === 1) return false;
  const next = widgets[index + 1];
  return !next || next.span === 'full';
}

const STRETCHED_WEEK_BAR_WIDGET_KEYS = new Set(['alert-attention', 'assessments']);

function withStretchedWeekBarLayout(
  spec: DashboardWidgetSpec,
  stretched: boolean,
): DashboardWidgetSpec {
  if (!stretched || !STRETCHED_WEEK_BAR_WIDGET_KEYS.has(spec.key)) return spec;
  return {
    ...spec,
    span: 'full',
    activityDaysPlacement: spec.activityDays && spec.activityDays.length > 0 ? 'end' : spec.activityDaysPlacement,
    row1: '',
    row2: '',
    row3: undefined,
  };
}

function renderLastSevenDayWidgets(widgets: DashboardWidgetSpec[]) {
  return widgets.map((widget, index) => {
    const stretched = widgetSpansFullRow(widgets, index);
    return (
      <div
        key={widget.key}
        className={stretched ? 'col-span-2' : DASHBOARD_LAST7_WIDGET_CELL_CLASS}
      >
        <DashboardWidget spec={withStretchedWeekBarLayout(widget, stretched)} />
      </div>
    );
  });
}

function LastSevenDayWidgetGrid({
  before,
  after = [],
  middle,
}: {
  before: DashboardWidgetSpec[];
  after?: DashboardWidgetSpec[];
  middle?: ReactNode;
}) {
  if (before.length === 0 && after.length === 0 && !middle) return null;
  return (
    <div className="grid grid-cols-2 gap-3 items-stretch">
      {renderLastSevenDayWidgets(before)}
      {middle ? <div className="col-span-2">{middle}</div> : null}
      {renderLastSevenDayWidgets(after)}
    </div>
  );
}

function DashboardSection({
  title,
  widgets,
  dense = false,
}: {
  title: string;
  widgets: DashboardWidgetSpec[];
  /** Taller cells for Last 7 days hero + week dots. */
  dense?: boolean;
}) {
  if (widgets.length === 0) return null;

  const cellClass = dense ? DASHBOARD_LAST7_WIDGET_CELL_CLASS : DASHBOARD_WIDGET_CELL_CLASS;

  return (
    <section className="space-y-2">
      <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{title}</h3>
      <div className="grid grid-cols-2 gap-3 items-stretch">
        {widgets.map((widget, index) => (
          <div
            key={widget.key}
            className={widgetSpansFullRow(widgets, index) ? 'col-span-2' : cellClass}
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
  onOpenAdminAccess,
  onOpenCircleFolder,
  onOpenMessagesInbox,
  onOpenAnalyticsDetail,
  onOpenAssessmentsOverview,
  onOpenAnalyticsPeriodOverview,
  onOpenGalleryReactions,
  onOpenGalleryMyAlbums,
  onOpenSchedule,
  onOpenVisitCapture,
  onRequestDropIn,
  onResumeDropIn,
  dropInActive,
  dropInChatOpen,
  dropInFeatureEnabled = true,
  remoteCommandAwaiting,
}: CircleDashboardScreenProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const patientPresence = useCirclePatientPresenceFromShell();
  const {
    settings: remoteSettings,
    fromFirestore: remoteSettingsFromFirestore,
    loading: remoteSettingsLoading,
    persist: persistRemoteSettings,
  } = useCircleRemoteSettingsFromShell();
  const remoteFeatureFlagsReady = !remoteSettingsLoading && remoteSettingsFromFirestore;
  /** Last-7-day / activity tiles: hide when the Patient App feature is off (Customize may stay on). */
  const patientMessagingFeatureEnabled =
    remoteFeatureFlagsReady &&
    isHospitalFeatureEnabledInRemoteSettings(remoteSettings, 'hospitalFeatureMessaging');
  const patientCommunicationFeatureEnabled =
    remoteFeatureFlagsReady && remoteSettings?.featuresVisibility?.communication === true;
  const patientCompanionFeatureEnabled =
    remoteFeatureFlagsReady && remoteSettings?.featuresVisibility?.aiCompanion === true;
  const patientVitalityFeatureEnabled =
    remoteFeatureFlagsReady &&
    isHospitalFeatureEnabledInRemoteSettings(remoteSettings, 'hospitalFeatureVitality');
  const patientAssessmentsFeatureEnabled =
    remoteFeatureFlagsReady &&
    isHospitalFeatureEnabledInRemoteSettings(remoteSettings, 'hospitalFeatureAssessments');
  const caps = patient.capabilities;
  const memberRole = normalizeMemberRole(patient.role);
  const { isWidgetVisible } = useCircleDashboardLayout(
    db,
    patient.patientId,
    user.uid,
    memberRole,
  );
  const {
    state: careTransitionState,
    loading: careTransitionLoading,
  } = useCareTransitionReadiness(db, patient.patientId, user.uid, memberRole, t);
  const [careTransitionOpen, setCareTransitionOpen] = useState(false);
  const [careTransitionReviewOpen, setCareTransitionReviewOpen] = useState(false);
  useEffect(() => {
    if (!careTransitionOpen || !careTransitionState) return;
    if (!careTransitionState.activePackId) {
      setCareTransitionOpen(false);
      return;
    }
    if (
      isCareTransitionPackDraft(careTransitionState) &&
      canManageCareTransitionPack(memberRole)
    ) {
      setCareTransitionOpen(false);
      setCareTransitionReviewOpen(true);
    }
  }, [careTransitionOpen, careTransitionState, memberRole]);
  const showEngagementStats = caps.viewEngagementTrends !== false;
  const showRemoteSettings = canViewRemoteSettingsTab(caps);
  const showLiveTile = memberRole !== 'friend';
  const showGetToKnow = isWidgetVisible('patient-insights');
  const showCircleMap = isWidgetVisible('circle-map');
  const showCircleCompact = isWidgetVisible('circle-compact');
  const canOpenPatientProfile = canViewPatientProfileTab(caps);
  const canManageTeam = canInviteMembers(caps);

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
  const [messageReadTick, setMessageReadTick] = useState(0);
  useEffect(() => {
    const onReadChanged = () => setMessageReadTick((n) => n + 1);
    window.addEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
    return () => window.removeEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
  }, []);
  const icuSummaryCount = useMemo(
    () => threadRawMessages.filter((msg) => isIcuDailySummary(msg)).length,
    [threadRawMessages],
  );
  const showCommunicationLogInbox = useMemo(
    () =>
      canShowIcuCommunicationLogInbox(memberRole, remoteSettings, icuSummaryCount),
    [icuSummaryCount, memberRole, remoteSettings],
  );
  const icuDailySummaryUnreadCount = useMemo(() => {
    void messageReadTick;
    return countUnreadIcuDailySummaries(
      threadRawMessages,
      patient.patientId,
      showCommunicationLogInbox,
      (msg) => isCommunicationLogSummaryUnread(msg, patient.patientId, msg.id),
    );
  }, [messageReadTick, patient.patientId, showCommunicationLogInbox, threadRawMessages]);
  const showIcuDailyNotesTile =
    showCommunicationLogInbox && icuDailySummaryUnreadCount > 0;
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
  const showScheduleNudgeTiles = canSeePatientScheduleNudgeTiles(memberRole);
  const { inviteContext, memberContactId, inviteContextReady } = useCircleMemberInviteContext(
    db,
    user,
    patient,
  );
  const calendarSubscription = useMemo(
    () =>
      buildCareCalendarEntriesSubscription(patient, user.uid, inviteContext, {
        inviteContextReady,
      }),
    [inviteContext, inviteContextReady, patient, user.uid],
  );
  const { entries: careCalendarEntries } = useCareCalendarEntries(
    db,
    showScheduleNudgeTiles ? patient.patientId : undefined,
    calendarSubscription,
  );
  const visibleCareCalendarEntries = useMemo(
    () =>
      careCalendarEntries.filter(
        (entry) =>
          !shouldHideDeclinedAppointmentForContact(
            entry.attendees,
            memberContactId,
            inviteContext,
          ),
      ),
    [careCalendarEntries, inviteContext, memberContactId],
  );
  const assessmentScheduleContext = useMemo(
    () =>
      buildCircleAssessmentScheduleContext({
        byMetricId,
        treatmentPhase: profileSnapshot?.clinical?.treatmentPhase,
        appMode: remoteSettings?.appMode,
        scheduleEnabled: remoteSettings?.featuresVisibility?.schedule,
        remoteAssessmentSchedule: remoteSettings?.assessmentSchedule,
      }),
    [
      byMetricId,
      profileSnapshot?.clinical?.treatmentPhase,
      remoteSettings?.appMode,
      remoteSettings?.assessmentSchedule,
      remoteSettings?.featuresVisibility?.schedule,
    ],
  );
  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);
  const previewOfflineAlert = previewReminders ? buildPreviewPatientOfflineAlert() : null;
  const showPatientLocale = isWidgetVisible('patient-locale') || previewReminders;
  const liveTileVisible =
    patientPresence.online && showLiveTile && !previewOfflineAlert;
  /** With Get to know on, tuck locale under Live and drop the section title. */
  const showPatientLocaleUnderLive = showGetToKnow && showPatientLocale && liveTileVisible;

  const [scheduleNudgeNow, setScheduleNudgeNow] = useState(() => new Date());
  useEffect(() => {
    if (!showScheduleNudgeTiles) return;
    const id = window.setInterval(
      () => setScheduleNudgeNow(new Date()),
      SCHEDULE_IMMINENT_BANNER_REFRESH_MS,
    );
    return () => window.clearInterval(id);
  }, [showScheduleNudgeTiles]);

  const scheduleNudgeCounts = useMemo(() => {
    if (!showScheduleNudgeTiles) return null;
    const live = computeCircleScheduleNudgeCounts({
      assessmentSchedule: assessmentScheduleContext,
      careEntries: visibleCareCalendarEntries,
      scheduleEnabled: remoteSettings?.featuresVisibility?.schedule !== false,
      memberRole,
      now: scheduleNudgeNow,
    });
    const gated: CircleScheduleNudgeCounts = patientAssessmentsFeatureEnabled
      ? live
      : { ...live, dueAssessments: 0, upcomingAssessments: 0 };
    return previewReminders ? buildPreviewScheduleNudgeCounts(gated) : gated;
  }, [
    assessmentScheduleContext,
    memberRole,
    patientAssessmentsFeatureEnabled,
    previewReminders,
    remoteSettings?.featuresVisibility?.schedule,
    scheduleNudgeNow,
    showScheduleNudgeTiles,
    visibleCareCalendarEntries,
  ]);
  const scheduleEnabledForNudges =
    remoteSettings?.featuresVisibility?.schedule !== false;

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
  const vitalityGamesLast7 = vitalityDetail
    ? sumVitalityGamesLast7(vitalityDetail.timeline)
    : vitalitySummary?.countInWindow || 0;

  const alertStats = sumAlertAttentionLast7(alertDetail?.timeline);
  const communicationStats = sumMessagesLast7(speechDetail?.timeline);
  const companionLast7 = sumCompanionLast7ExcludingDetected(companionDetail?.timeline);
  const checkInStats = resolveDailyCheckInLast7Stats(dailyDetail);
  const dailyCheckInEnabled =
    remoteFeatureFlagsReady &&
    remoteSettings?.dailyCheckIn?.enabled === true &&
    dailyCheckIn?.summaryText !== 'Daily check-in off';
  const showCheckInWellnessRing =
    dailyCheckInEnabled &&
    showEngagementStats &&
    isWidgetVisible('check-in-wellness-ring');
  const dailyCheckInLatestAt =
    dailyDetail?.latestCompletedAt ?? dailyCheckIn?.latestAt ?? null;
  const dailyCheckInRecencyTint = analyticsLoading
    ? 'neutral'
    : getDailyCheckInRecencyUrgency({
        completedInWindow: checkInStats.completed,
        skippedInWindow: checkInStats.skipped,
        latestCompletedAt: dailyCheckInLatestAt,
        hasHistory: !!(dailyDetail || dailyCheckIn?.latestAt),
      });
  const assessmentsLast7 = sumAssessmentsLast7(byMetricId);
  const latestAssessment = getLatestAssessment(byMetricId);

  const lastSevenDayWidgets: DashboardWidgetSpec[] = [];
  const youWidgets: DashboardWidgetSpec[] = [];
  const patientAppWidgets: DashboardWidgetSpec[] = [];

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

  if (showEngagementStats) {
    const checkIn30 = sumDailyCheckInLastN(dailyDetail?.timeline, DASHBOARD_STATS_DAYS_30);
    const messages30 = sumMessagesLastN(speechDetail?.timeline, DASHBOARD_STATS_DAYS_30);
    const companion30 = sumCompanionLastNExcludingDetected(
      companionDetail?.timeline,
      DASHBOARD_STATS_DAYS_30,
    );
    const vitality30 = sumVitalityGamesLastN(vitalityDetail?.timeline, DASHBOARD_STATS_DAYS_30);
    const alerts30 = sumAlertAttentionLastN(alertDetail?.timeline, DASHBOARD_STATS_DAYS_30);
    const assessments30 = sumAssessmentsLastN(byMetricId, DASHBOARD_STATS_DAYS_30);
    const last7Total =
      alertStats.total +
      (dailyCheckInEnabled ? checkInStats.completed : 0) +
      (patientMessagingFeatureEnabled ? communicationStats.messaging : 0) +
      (patientCommunicationFeatureEnabled ? communicationStats.communication : 0) +
      (patientCompanionFeatureEnabled ? companionLast7 : 0) +
      (patientVitalityFeatureEnabled ? vitalityGamesLast7 : 0) +
      assessmentsLast7;
    const last30Total =
      alerts30.total +
      (dailyCheckInEnabled ? checkIn30.completed : 0) +
      (patientMessagingFeatureEnabled ? messages30.messaging : 0) +
      (patientCommunicationFeatureEnabled ? messages30.communication : 0) +
      (patientCompanionFeatureEnabled ? companion30 : 0) +
      (patientVitalityFeatureEnabled ? vitality30 : 0) +
      assessments30;

    const canReadAssessments =
      !!patient.capabilities &&
      canReadAnalyticsAudience('care', patient.role, patient.capabilities);

    const openAssessmentsLast7 = () => {
      const takenIds = assessmentMetricIdsTakenLast7(byMetricId).filter((metricId) => {
        const definition = ANALYTICS_METRIC_DEFINITIONS[metricId];
        if (!definition?.isReleased) return false;
        if (!patient.capabilities) return false;
        return canReadAnalyticsAudience(
          definition.audience,
          patient.role,
          patient.capabilities,
        );
      });
      if (takenIds.length === 1) {
        onOpenAnalyticsDetail(takenIds[0]!);
        return;
      }
      onOpenAssessmentsOverview();
    };

    if (canReadAssessments) {
      lastSevenDayWidgets.push({
        key: 'assessments-compact',
        title: t('dashboard.assessment'),
        icon: ClipboardList,
        span: 'full',
        heroVariant: 'label',
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : {
              heroValue: assessmentsLast7,
              heroMuted: assessmentsLast7 === 0,
              iconTone: 'sky' as const,
              row1:
                assessmentsLast7 === 0
                  ? t('dashboard.noAssessmentsWeek')
                  : dashboardPlural(t, 'assessmentWindow', assessmentsLast7),
              row2: '',
            }),
        onClick: openAssessmentsLast7,
      });
    }

    lastSevenDayWidgets.push({
      key: 'alert-attention',
      title: t('dashboard.alertsAttention'),
      icon: Bell,
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : (() => {
            const recencyTint = getAlertAttentionRecencyUrgency(alertAttentionSummary?.latestAt);
            const quiet = alertStats.alerts === 0;
            return {
              heroValue: alertStats.alerts,
              heroMuted: quiet,
              iconTone: iconToneFromRecency(recencyTint),
              row1: quiet
                ? t('dashboard.quietAlertsWeek')
                : dashboardPlural(t, 'alert', alertStats.alerts),
              row2:
                alertStats.attentions > 0
                  ? dashboardPlural(t, 'attentionsThisWeek', alertStats.attentions)
                  : t('dashboard.noAttentionsThisWeek'),
              recencyTint,
              activityDays: activityDaysFromTimeline(alertDetail?.timeline, (point) => {
                return point.alert + point.attention;
              }),
            };
          })()),
      onClick: () => onOpenAnalyticsDetail('alert-attention'),
    });

    if (dailyCheckInEnabled) {
      lastSevenDayWidgets.push({
        key: 'daily-check-in',
        title: t('dashboard.dailyCheckIn'),
        icon: Calendar,
        span: 'full',
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : (() => {
              const recencyTint = getDailyCheckInRecencyUrgency({
                completedInWindow: checkInStats.completed,
                skippedInWindow: checkInStats.skipped,
                latestCompletedAt: dailyCheckInLatestAt,
                hasHistory: !!(dailyDetail || dailyCheckIn?.latestAt),
              });
              const quiet = checkInStats.completed === 0;
              return {
                heroValue: checkInStats.completed,
                heroMuted: quiet,
                iconTone: iconToneFromRecency(recencyTint),
                row1: '',
                row2: '',
                recencyTint,
                activityDaysPlacement: 'end' as const,
                activityDays: dailyDetail
                  ? activityDaysFromTimeline(dailyDetail.timeline, (point) => point.completed)
                  : undefined,
              };
            })()),
        onClick: () => onOpenAnalyticsDetail('daily-check-in'),
      });
    }

    lastSevenDayWidgets.push({
      key: 'last-7-days-overview',
      title: t('dashboard.last7DaysOverview'),
      icon: CalendarDays,
      span: 'full',
      heroVariant: 'label',
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            heroValue: last7Total,
            heroMuted: last7Total === 0,
            iconTone: 'blue' as const,
            row1:
              last7Total === 0
                ? t('dashboard.analyticsQuietWindow')
                : dashboardPlural(t, 'analyticsEventsWindow', last7Total),
            row2: '',
          }),
      onClick: () => onOpenAnalyticsPeriodOverview(7),
    });

    lastSevenDayWidgets.push({
      key: 'last-30-days-overview',
      title: t('dashboard.last30DaysOverview'),
      icon: CalendarRange,
      span: 'full',
      heroVariant: 'label',
      ...(analyticsLoading
        ? loadingRows(t('common.loading'))
        : {
            heroValue: last30Total,
            heroMuted: last30Total === 0,
            iconTone: 'sky' as const,
            row1:
              last30Total === 0
                ? t('dashboard.analyticsQuietWindow')
                : dashboardPlural(t, 'analyticsEventsWindow', last30Total),
            row2: '',
          }),
      onClick: () => onOpenAnalyticsPeriodOverview(30),
    });

    if (patientMessagingFeatureEnabled) {
      lastSevenDayWidgets.push({
        key: 'messages',
        title: t('dashboard.messages'),
        icon: MessageSquare,
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : (() => {
              const quiet = communicationStats.messaging === 0;
              return {
                heroValue: communicationStats.messaging,
                heroMuted: quiet,
                iconTone: quiet ? 'sky' : 'blue',
                row1: quiet
                  ? t('dashboard.noNewMessagesWeek')
                  : dashboardPlural(t, 'messagesThisWeek', communicationStats.messaging),
                row2: caps.messaging
                  ? t('common.unread', { count: formatCircleBadgeCount(unreadCount) })
                  : '',
                activityDays: activityDaysFromTimeline(speechDetail?.timeline, (point) => {
                  return point.messaging;
                }),
              };
            })()),
        onClick: () => onOpenAnalyticsDetail('speech-history', 'messaging'),
      });
    }

    if (patientCommunicationFeatureEnabled) {
      lastSevenDayWidgets.push({
        key: 'communication',
        title: t('dashboard.communication'),
        icon: Keyboard,
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : (() => {
              const quiet = communicationStats.communication === 0;
              return {
                heroValue: communicationStats.communication,
                heroMuted: quiet,
                iconTone: 'violet',
                row1: quiet
                  ? t('dashboard.noCommunicationWeek')
                  : dashboardPlural(t, 'communicationThisWeek', communicationStats.communication),
                activityDays: activityDaysFromTimeline(speechDetail?.timeline, (point) => {
                  return point.communication;
                }),
              };
            })()),
        onClick: () => onOpenAnalyticsDetail('speech-history', 'communication'),
      });
    }

    if (patientCompanionFeatureEnabled) {
      lastSevenDayWidgets.push({
        key: 'companion',
        title: t('dashboard.companionTitle'),
        icon: Bot,
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : (() => {
              const quiet = companionLast7 === 0;
              return {
                heroValue: companionLast7,
                heroMuted: quiet,
                iconTone: quiet ? 'sky' : 'violet',
                row1: quiet
                  ? t('dashboard.noCompanionChats')
                  : dashboardPlural(t, 'companion', companionLast7),
                activityDays: activityDaysFromTimeline(companionDetail?.timeline, (point) => {
                  return Math.max(0, point.conversations + point.interactions - point.detected);
                }),
              };
            })()),
        onClick: () => onOpenAnalyticsDetail('ai-conversation'),
      });
    }

    if (patientVitalityFeatureEnabled) {
      lastSevenDayWidgets.push({
        key: 'vitality',
        title: t('dashboard.vitality'),
        icon: Sparkles,
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : (() => {
              const quiet = vitalityGamesLast7 === 0;
              return {
                heroValue: vitalityGamesLast7,
                heroMuted: quiet,
                iconTone: 'amber',
                row1: quiet
                  ? t('dashboard.noMindGamesWeek')
                  : dashboardPlural(t, 'gamesPlayed', vitalityGamesLast7),
                activityDays: activityDaysFromTimeline(vitalityDetail?.timeline, (point) => {
                  return point.games;
                }),
              };
            })()),
        onClick: () => onOpenAnalyticsDetail('vitality-game'),
      });
    }

    // Circle can schedule assessments even when the patient Assessments tab is off.
    if (canReadAssessments) {
      lastSevenDayWidgets.push({
        key: 'assessments',
        title: t('dashboard.assessments'),
        icon: ClipboardList,
        ...(analyticsLoading
          ? loadingRows(t('common.loading'))
          : (() => {
              const quiet = assessmentsLast7 === 0;
              return {
                heroValue: assessmentsLast7,
                heroMuted: quiet,
                iconTone: 'sky',
                row1: quiet
                  ? t('dashboard.noAssessmentsWeek')
                  : dashboardPlural(t, 'assessmentsFinishedWeek', assessmentsLast7),
                row2: latestAssessment.title
                  ? t('dashboard.lastAssessment', { title: latestAssessment.title })
                  : t('dashboard.noAssessmentsYet'),
                activityDays: activityDaysFromAssessmentSummaries(byMetricId),
              };
            })()),
        onClick: openAssessmentsLast7,
      });
    }
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
              heroValue: 0,
              heroMuted: true,
              iconTone: 'violet' as const,
              row1: t('dashboard.noSharedEntries'),
              row2: t('dashboard.addRecoveryNote'),
            }
          : (() => {
              const latest = diaryPreview.latest;
              const latestAt = latest?.experienceAt ?? diaryDetail?.latestAt ?? null;
              const weekCount = diaryPreview.entriesLast7;
              const hero = weekCount > 0 ? weekCount : diaryPreview.sharedCount;
              const recencyTint = getDiaryRecencyUrgency(latestAt);

              return {
                heroValue: hero,
                heroMuted: false,
                iconTone: iconToneFromRecency(recencyTint),
                row1:
                  weekCount > 0
                    ? dashboardPlural(t, 'entriesThisWeek', weekCount)
                    : dashboardPlural(t, 'entry', diaryPreview.sharedCount),
                row2: lastLine(latestAt),
                recencyTint,
              };
            })()),
      onClick: () => onGoToTab('diary'),
    });
  }

  youWidgets.push({
    key: 'circle',
    title: t('dashboard.circleMessages'),
    icon: Users,
    ...(circleUnreadCount > 0
      ? {
          // Hero = unread only (lifetime post totals are not a glance metric).
          heroValue: formatCircleBadgeCount(circleUnreadCount),
          heroMuted: false,
          iconTone: 'rose' as const,
          row1: t('common.unread', { count: formatCircleBadgeCount(circleUnreadCount) }),
          row2: t(`dashboard.post_${circlePostCount === 1 ? 'one' : 'other'}`, {
            count: formatCircleBadgeCount(circlePostCount),
          }),
        }
      : circlePostCount === 0
        ? {
            heroValue: 0,
            heroMuted: true,
            iconTone: 'sky' as const,
            row1: t('dashboard.noFamilyPostsYet'),
            row2: t('dashboard.allCaughtUp'),
          }
        : {
            heroValue: 0,
            heroMuted: true,
            iconTone: 'sky' as const,
            row1: t('dashboard.allCaughtUp'),
            row2: t(`dashboard.post_${circlePostCount === 1 ? 'one' : 'other'}`, {
              count: formatCircleBadgeCount(circlePostCount),
            }),
          }),
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
              heroValue: 0,
              heroMuted: true,
              iconTone: 'amber' as const,
              row1: t('dashboard.shareMoment'),
              row2: t('dashboard.uploadPhotoForFamily'),
            }
          : galleryDashboard.reactionsOnMyUploadsLast7 > 0
            ? {
                heroValue: galleryDashboard.reactionsOnMyUploadsLast7,
                heroMuted: false,
                iconTone: 'emerald' as const,
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
                  heroValue: galleryDashboard.reactionsOnMyUploads,
                  heroMuted: false,
                  iconTone: 'amber' as const,
                  row1: dashboardPlural(t, 'reactionsOnYourPhotos', galleryDashboard.reactionsOnMyUploads),
                  row2: t('dashboard.noneLast7Days'),
                  row3: dashboardPlural(t, 'sharedPhotos', galleryDashboard.myUploadCount),
                }
              : {
                  heroValue: galleryDashboard.myUploadCount,
                  heroMuted: false,
                  iconTone: 'amber' as const,
                  row1: dashboardPlural(t, 'sharedPhotos', galleryDashboard.myUploadCount),
                  row2: t('dashboard.noReactionsYetTap'),
                }),
      onClick: () => (onOpenGalleryMyAlbums ? onOpenGalleryMyAlbums() : onGoToTab('media')),
    });
  }

  const familyGalleryWidget: DashboardWidgetSpec | null =
    canSeeGallery && isWidgetVisible('media-gallery')
    ? {
        key: 'media-gallery',
        title: t('dashboard.mediaGallery'),
        icon: Heart,
        ...(galleryDashboard.loading
          ? loadingRows(t('common.loading'))
          : galleryDashboard.photoCount > 0
            ? {
                heroValue: galleryPhotoReactionHero(
                  galleryDashboard.photoCount,
                  galleryDashboard.reactionsLast7,
                ),
                heroMuted: false,
                iconTone: 'rose' as const,
                row1: (
                  <span className="text-[13px] font-medium text-slate-600">
                    {dashboardPlural(t, 'photos', galleryDashboard.photoCount)}
                  </span>
                ),
                row2: dashboardPlural(t, 'reactionsThisWeek', galleryDashboard.reactionsLast7),
                recencyTint:
                  galleryDashboard.reactionsLast7 > 0 ? ('green' as const) : undefined,
              }
            : {
                heroValue: 0,
                heroMuted: true,
                iconTone: 'rose' as const,
                row1: t('dashboard.noPhotosYet'),
                row2: t('dashboard.uploadMemory'),
              }),
        onClick: () => (onOpenGalleryReactions ? onOpenGalleryReactions() : onGoToTab('media')),
      }
    : null;

  if (showRemoteSettings) {
    const appMode = remoteSettings?.appMode as RemoteAppMode | undefined;
    const remoteCustomized =
      !!remoteSettings && !remoteSettingsLoading && isRemoteSettingsCustomized(remoteSettings);
    const modeLabel = appMode
      ? t(`dashboard.appModes.${appMode}`)
      : t('dashboard.appModes.custom');

    patientAppWidgets.push({
      key: 'remote-settings',
      title: t('dashboard.remoteSettings'),
      icon: SlidersHorizontal,
      span: 'full',
      heroValue: remoteSettingsLoading ? '…' : modeLabel,
      heroVariant: 'label',
      heroMuted: remoteSettingsLoading || !appMode,
      row1: remoteSettingsLoading ? (
        t('dashboard.modeLoading')
      ) : appMode ? (
        <span className="flex flex-nowrap items-center justify-end gap-2">
          <span
            className={cn(
              'px-2 py-1 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap',
              remoteAppModeCurrentBadgeClass(appMode),
            )}
          >
            {t(`dashboard.appModes.${appMode}`)}
          </span>
          {remoteCustomized ? (
            <span className="px-2 py-1 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap text-amber-800 bg-amber-50 border border-amber-100">
              {t('dashboard.modeCustomBadge')}
            </span>
          ) : null}
        </span>
      ) : (
        t('dashboard.modeCustom')
      ),
      recencyTint: 'green',
      iconTone:
        appMode === 'intensive_care'
          ? 'rose'
          : appMode === 'hospital'
            ? 'amber'
            : appMode === 'user'
              ? 'emerald'
              : 'blue',
      onClick: () => onGoToTab('remote-settings'),
    });
  }

  const missingCoreFields = getMissingCoreCircleProfileFields(profileSnapshot);
  const missingCoreLabel = formatMissingCoreProfileFieldsT(t, missingCoreFields);
  const coreComplete =
    profileSnapshot != null && isCoreCircleProfileComplete(profileSnapshot);

  const dataComplete =
    profileSnapshot != null && isCircleProfileDataComplete(profileSnapshot);

  if (canOpenPatientProfile) {
    patientAppWidgets.push({
      key: 'user-profile',
      title: t('dashboard.userProfile'),
      icon: UserRound,
      span: 'full',
      ...(profileLoading
        ? loadingRows(t('common.loading'))
        : {
            heroValue: profileCompletenessLabelT(t, profileSnapshot, false, dataComplete),
            heroVariant: 'label',
            heroMuted: !dataComplete,
            row1: !coreComplete && missingCoreLabel
              ? t('dashboard.coreProfileMissing', { fields: missingCoreLabel })
              : (
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-slate-500">{t('dashboard.phasePrefix')}</span>
                    {profileSnapshot?.clinical.treatmentPhase ? (
                      <span
                        className={cn(
                          'shrink-0 px-2 py-1 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wide',
                          treatmentPhaseBadgeClass(profileSnapshot.clinical.treatmentPhase),
                        )}
                      >
                        {treatmentPhaseLabelT(t, profileSnapshot.clinical.treatmentPhase)}
                      </span>
                    ) : (
                      <span className="truncate text-slate-500">{t('dashboard.notSet')}</span>
                    )}
                  </span>
                ),
            recencyTint: getUserProfileRecencyUrgency(profileSnapshot),
          }),
      onClick: () => onGoToTab('patient-profile'),
    });
  }

  const visibleLastSevenDayWidgets = lastSevenDayWidgets.filter((widget) =>
    isWidgetVisible(widget.key),
  );
  const last7AlertIndex = visibleLastSevenDayWidgets.findIndex(
    (widget) => widget.key === 'alert-attention',
  );
  const last7WidgetsBeforeCheckIn =
    last7AlertIndex === -1
      ? []
      : visibleLastSevenDayWidgets.slice(0, last7AlertIndex + 1);
  const last7WidgetsAfterCheckIn =
    last7AlertIndex === -1
      ? visibleLastSevenDayWidgets
      : visibleLastSevenDayWidgets.slice(last7AlertIndex + 1);
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

      {onOpenVisitCapture ? (
        <RecordVisitCaptureWidget onRecordVisitCapture={onOpenVisitCapture} t={t} />
      ) : null}

      <CircleProfileChangeBanner user={user} db={db} patient={patient} />

      <CircleCareTransitionReadinessBanner
        patient={patient}
        readerUid={user.uid}
        state={careTransitionState}
        loading={careTransitionLoading}
        maxAgeMs={CARE_TRANSITION_HOME_BANNER_MAX_AGE_MS}
        enabled={memberRole !== 'friend'}
        onOpen={() => {
          if (
            careTransitionState &&
            isCareTransitionPackDraft(careTransitionState) &&
            canManageCareTransitionPack(memberRole)
          ) {
            setCareTransitionReviewOpen(true);
            return;
          }
          setCareTransitionOpen(true);
        }}
      />

      <CircleHomeTasksBanner user={user} db={db} patient={patient} />

      <CircleHomePollBanner user={user} db={db} patient={patient} />

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
        {patientPresence.online && showLiveTile && !previewOfflineAlert ? (
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                'col-span-2',
                dropInActive && !dropInChatOpen && onResumeDropIn ? 'mb-6' : null,
              )}
            >
              <LivePatientWidget
                onlineDurationLabel={liveOnlineDurationLabel}
                activeSectionLabel={formatPatientActiveSectionT(t, patientPresence.activeSection)}
                patientName={circlePatientFirstName(profileSnapshot, patient.displayName)}
                patientId={patient.patientId}
                memberUid={user.uid}
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
                dropInFeatureEnabled={dropInFeatureEnabled}
                onResumeDropIn={onResumeDropIn}
                dropInActive={dropInActive}
                dropInChatOpen={dropInChatOpen}
              />
            </div>
          </div>
        ) : null}

        {showPatientLocaleUnderLive ? (
          <CircleDashboardPatientLocaleWidget
            db={db}
            patientId={patient.patientId}
            snapshot={profileSnapshot}
            hideTitle
          />
        ) : null}

        {showGetToKnow && liveTileVisible ? (
          <CirclePatientInsightsSection
            patient={patient}
            snapshot={profileSnapshot}
            loading={profileLoading}
            onOpenProfile={canOpenPatientProfile ? () => onGoToTab('patient-profile') : undefined}
          />
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
          icuDailySummaryUnreadCount={icuDailySummaryUnreadCount}
          showIcuDailyNotesTile={showIcuDailyNotesTile}
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
          messagingEnabled={caps.messaging === true}
          onOpenMessages={() =>
            onOpenMessagesInbox ? onOpenMessagesInbox('in_out') : onGoToTab('messages')
          }
          onOpenIcuDailyNotes={() =>
            onOpenMessagesInbox
              ? onOpenMessagesInbox('communication_log')
              : onGoToTab('messages')
          }
          onOpenCircleFolder={onOpenCircleFolder}
          scheduleNudgeCounts={showScheduleNudgeTiles ? scheduleNudgeCounts : null}
          scheduleEnabled={scheduleEnabledForNudges}
          onOpenSchedule={(view) => {
            if (onOpenSchedule) {
              onOpenSchedule(view);
              return;
            }
            onGoToTab('schedule');
          }}
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
          canOpenPatientProfile={canOpenPatientProfile}
          remoteSettings={remoteSettings ?? null}
          remoteSettingsReady={!remoteSettingsLoading && remoteSettingsFromFirestore}
          canOpenRemoteSettings={patient.capabilities.remoteSettings === true}
          onPersistRemoteSettings={persistRemoteSettings}
          onGoToTab={onGoToTab}
          onOpenAdminAccess={onOpenAdminAccess}
        />

        {showPatientLocale && !showPatientLocaleUnderLive ? (
          <CircleDashboardPatientLocaleWidget
            db={db}
            patientId={patient.patientId}
            snapshot={profileSnapshot}
          />
        ) : null}

        {showGetToKnow && !liveTileVisible ? (
          <CirclePatientInsightsSection
            patient={patient}
            snapshot={profileSnapshot}
            loading={profileLoading}
            onOpenProfile={canOpenPatientProfile ? () => onGoToTab('patient-profile') : undefined}
          />
        ) : null}

        {showCircleMap || showCircleCompact ? (
          <section className="space-y-2">
            {!(showPatientLocale && !showPatientLocaleUnderLive) ? (
              <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>
                {t('dashboard.sectionPatientOverview')}
              </h3>
            ) : null}
            <CircleDashboardCircleMapSection
              db={db}
              patientId={patient.patientId}
              memberRole={memberRole}
              patientDisplayName={patient.displayName}
              patientPhotoUrl={
                profileSnapshot?.identity.profilePicture?.trim() || patient.photoUrl?.trim()
              }
              patientNickName={profileSnapshot?.identity.nickName?.trim()}
              galleryPhotos={galleryDashboard.engagementPhotos}
              showVisual={showCircleMap}
              showCompact={showCircleCompact}
              onManageContacts={canManageTeam ? () => onGoToTab('admin') : undefined}
            />
          </section>
        ) : null}

        {visibleLastSevenDayWidgets.length > 0 || showCheckInWellnessRing ? (
          <section className="space-y-2">
            <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{t('dashboard.sectionLast7Days')}</h3>
            <LastSevenDayWidgetGrid
              before={
                showCheckInWellnessRing
                  ? last7WidgetsBeforeCheckIn
                  : visibleLastSevenDayWidgets
              }
              after={showCheckInWellnessRing ? last7WidgetsAfterCheckIn : []}
              middle={
                showCheckInWellnessRing ? (
                  <CircleDashboardCheckInWellnessSection
                    memberRole={memberRole}
                    answerTrend={dailyDetail?.answerTrend}
                    enabled={showCheckInWellnessRing}
                    recencyTint={dailyCheckInRecencyTint}
                    wide
                    onOpenDetails={() => onOpenAnalyticsDetail('daily-check-in')}
                  />
                ) : null
              }
            />
          </section>
        ) : null}

        {visiblePatientAppWidgets.length > 0 ? (
          <section className="space-y-2">
            <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{t('dashboard.sectionPatientApp')}</h3>
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {visiblePatientAppWidgets.map((widget, index) => (
                <div
                  key={widget.key}
                  className={cn(
                    widgetSpansFullRow(visiblePatientAppWidgets, index)
                      ? 'col-span-2'
                      : DASHBOARD_WIDGET_CELL_CLASS,
                  )}
                >
                  <DashboardWidget spec={widget} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {familyGalleryWidget ? (
          <section className="space-y-2">
            <h3 className={DASHBOARD_SECTION_TITLE_CLASS}>{t('dashboard.sectionStayConnected')}</h3>
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <div className={DASHBOARD_LAST7_WIDGET_CELL_CLASS}>
                <DashboardWidget spec={familyGalleryWidget} />
              </div>
              <div className={DASHBOARD_LAST7_WIDGET_CELL_CLASS}>
                <CircleGalleryRotatingPreviewWidget
                  photos={galleryDashboard.previewPhotos}
                  loading={galleryDashboard.loading}
                  onOpenGallery={() => onGoToTab('media')}
                />
              </div>
            </div>
          </section>
        ) : null}

        {visibleYouWidgets.length > 0 ? (
          <DashboardSection title={t('dashboard.sectionYou')} widgets={visibleYouWidgets} dense />
        ) : null}
      </div>

      {careTransitionReviewOpen ? (
        <CircleCareTransitionReadinessPanel
          user={user}
          db={db}
          patient={patient}
          composerOnly
          packStarterOpen={careTransitionReviewOpen}
          onPackStarterOpenChange={setCareTransitionReviewOpen}
        />
      ) : null}

      <CircleMessageExpandOverlay
        open={careTransitionOpen}
        title={t('careTransition.title')}
        subtitle={t('careTransition.subtitle', {
          name: circleDisplayFirstName(patient.displayName, patient.firstName),
        })}
        onClose={() => setCareTransitionOpen(false)}
        t={t}
      >
        <CircleCareTransitionReadinessPanel
          user={user}
          db={db}
          patient={patient}
          hideHeader
          showCircleHelp={false}
        />
      </CircleMessageExpandOverlay>
    </div>
    </CircleTeamCoverageProvider>
  );
}
