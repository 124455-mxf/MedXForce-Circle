import {
  ClipboardList,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  canSeeCircleRestrictedThread,
  type CircleMemberThreadKind,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import {
  CircleDashboardScheduleNudgeTiles,
} from './CircleDashboardScheduleNudgeTiles';
import type { CircleScheduleNudgeCounts } from '../lib/circleDashboardScheduleNudges';
import {
  dashboardSectionTitleClass,
  dashboardTileTitleClass,
} from '../lib/circleSectionStyles';

export type CircleInboxFolder = 'discussion' | 'announcements' | 'drop_ins' | 'visit_captures';

type AttentionTileSpec = {
  key: string;
  label: string;
  count: number;
  detail: string;
  icon: LucideIcon;
  onClick?: () => void;
};

function AttentionTile({ spec }: { spec: AttentionTileSpec }) {
  return (
    <button
      type="button"
      onClick={spec.onClick}
      disabled={!spec.onClick}
      className={cn(
        'w-full min-h-[7.5rem] flex flex-col items-start justify-between gap-2 p-3 sm:p-4 rounded-2xl border text-left transition-colors',
        'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70',
        !spec.onClick && 'cursor-default',
      )}
    >
      <div className="flex items-center gap-2 w-full min-w-0">
        <spec.icon size={16} className="shrink-0 text-indigo-600" aria-hidden />
        <span className={cn(dashboardTileTitleClass, 'truncate')}>
          {spec.label}
        </span>
      </div>
      <span className="font-bold tabular-nums leading-none text-4xl text-indigo-700">
        {formatCircleBadgeCount(spec.count)}
      </span>
      <span className="text-[11px] text-slate-500 leading-snug line-clamp-2">{spec.detail}</span>
    </button>
  );
}

function circleFolderThreadForRole(
  memberRole: string,
  openUnread: number,
  restrictedUnread: number,
  fallback: CircleMemberThreadKind = 'open',
): CircleMemberThreadKind {
  if (canSeeCircleRestrictedThread(memberRole) && restrictedUnread > 0) return 'restricted';
  if (openUnread > 0) return 'open';
  return canSeeCircleRestrictedThread(memberRole) ? fallback : 'open';
}

export function CircleDashboardAttentionTiles({
  memberRole,
  messageUnreadCount,
  icuDailySummaryUnreadCount = 0,
  showIcuDailyNotesTile = false,
  announcementsUnreadCount,
  announcementsOpenUnreadCount,
  announcementsRestrictedUnreadCount,
  discussionsUnreadCount,
  discussionsOpenUnreadCount,
  discussionsRestrictedUnreadCount,
  dropInsUnreadCount,
  visitCapturesUnreadCount,
  visitCapturesOpenUnreadCount,
  visitCapturesRestrictedUnreadCount,
  messagingEnabled,
  onOpenMessages,
  onOpenIcuDailyNotes,
  onOpenCircleFolder,
  scheduleNudgeCounts,
  scheduleEnabled = true,
  onOpenSchedule,
}: {
  memberRole: string;
  messageUnreadCount: number;
  /** Unread ICU daily summaries (subset of message unread). */
  icuDailySummaryUnreadCount?: number;
  /** When true, show a dedicated ICU notes tile and exclude those from Messages. */
  showIcuDailyNotesTile?: boolean;
  announcementsUnreadCount: number;
  announcementsOpenUnreadCount: number;
  announcementsRestrictedUnreadCount: number;
  discussionsUnreadCount: number;
  discussionsOpenUnreadCount: number;
  discussionsRestrictedUnreadCount: number;
  dropInsUnreadCount: number;
  visitCapturesUnreadCount: number;
  visitCapturesOpenUnreadCount: number;
  visitCapturesRestrictedUnreadCount: number;
  messagingEnabled: boolean;
  onOpenMessages?: () => void;
  onOpenIcuDailyNotes?: () => void;
  onOpenCircleFolder?: (thread: CircleMemberThreadKind, folder: CircleInboxFolder) => void;
  scheduleNudgeCounts?: CircleScheduleNudgeCounts | null;
  scheduleEnabled?: boolean;
  onOpenSchedule?: () => void;
}) {
  const t = useCircleT();
  const canSeeDropIns = canSeeCircleRestrictedThread(memberRole);

  const directMessageUnread = showIcuDailyNotesTile
    ? Math.max(0, messageUnreadCount - icuDailySummaryUnreadCount)
    : messageUnreadCount;

  const unreadTiles: AttentionTileSpec[] = [];

  if (showIcuDailyNotesTile && icuDailySummaryUnreadCount > 0) {
    unreadTiles.push({
      key: 'icu-daily-notes',
      label: t('dashboard.attentionIcuDailyNotes'),
      count: icuDailySummaryUnreadCount,
      detail: t('dashboard.attentionIcuDailyNotesWaiting'),
      icon: ClipboardList,
      onClick: onOpenIcuDailyNotes ?? onOpenMessages,
    });
  }

  if (messagingEnabled && directMessageUnread > 0) {
    unreadTiles.push({
      key: 'messages',
      label: t('dashboard.attentionMessages'),
      count: directMessageUnread,
      detail: t('dashboard.attentionMessagesWaiting'),
      icon: MessageSquare,
      onClick: onOpenMessages,
    });
  }

  if (discussionsUnreadCount > 0) {
    unreadTiles.push({
      key: 'discussions',
      label: t('dashboard.attentionDiscussions'),
      count: discussionsUnreadCount,
      detail: t('dashboard.attentionInCircle'),
      icon: Users,
      onClick: onOpenCircleFolder
        ? () =>
            onOpenCircleFolder(
              circleFolderThreadForRole(
                memberRole,
                discussionsOpenUnreadCount,
                discussionsRestrictedUnreadCount,
              ),
              'discussion',
            )
        : undefined,
    });
  }

  if (announcementsUnreadCount > 0) {
    unreadTiles.push({
      key: 'announcements',
      label: t('dashboard.attentionAnnouncements'),
      count: announcementsUnreadCount,
      detail: t('dashboard.attentionInCircle'),
      icon: Megaphone,
      onClick: onOpenCircleFolder
        ? () =>
            onOpenCircleFolder(
              circleFolderThreadForRole(
                memberRole,
                announcementsOpenUnreadCount,
                announcementsRestrictedUnreadCount,
              ),
              'announcements',
            )
        : undefined,
    });
  }

  if (canSeeDropIns && dropInsUnreadCount > 0) {
    unreadTiles.push({
      key: 'drop-ins',
      label: t('dashboard.attentionDropIns'),
      count: dropInsUnreadCount,
      detail: t('dashboard.attentionInCircle'),
      icon: MessageCircle,
      onClick: onOpenCircleFolder
        ? () =>
            onOpenCircleFolder(
              circleFolderThreadForRole(
                memberRole,
                0,
                dropInsUnreadCount,
                'restricted',
              ),
              'drop_ins',
            )
        : undefined,
    });
  }

  if (visitCapturesUnreadCount > 0) {
    unreadTiles.push({
      key: 'visit-captures',
      label: t('dashboard.attentionVisitCaptures'),
      count: visitCapturesUnreadCount,
      detail: t('dashboard.attentionVisitCapturesUnread'),
      icon: Stethoscope,
      onClick: onOpenCircleFolder
        ? () =>
            onOpenCircleFolder(
              circleFolderThreadForRole(
                memberRole,
                visitCapturesOpenUnreadCount,
                visitCapturesRestrictedUnreadCount,
                'restricted',
              ),
              'visit_captures',
            )
        : undefined,
    });
  }

  const totalUnread =
    (showIcuDailyNotesTile ? icuDailySummaryUnreadCount : 0) +
    (messagingEnabled ? directMessageUnread : 0) +
    discussionsUnreadCount +
    announcementsUnreadCount +
    (canSeeDropIns ? dropInsUnreadCount : 0) +
    visitCapturesUnreadCount;

  const showScheduleNudgeSection =
    scheduleNudgeCounts != null
    && (
      scheduleNudgeCounts.dueAssessments > 0
      || scheduleNudgeCounts.upcomingAssessments > 0
      || scheduleNudgeCounts.appointmentsToday > 0
      || scheduleNudgeCounts.upcomingAppointments > 0
      || scheduleNudgeCounts.imminentAppointments > 0
    );

  if (unreadTiles.length === 0 && !showScheduleNudgeSection) return null;

  return (
    <div className="space-y-4">
      {unreadTiles.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h3 className={dashboardSectionTitleClass}>
              {t('dashboard.sectionNeedsAttention')}
            </h3>
            <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white tabular-nums">
              {t('dashboard.attentionTotalUnread', { count: formatCircleBadgeCount(totalUnread) })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {unreadTiles.map((tile) => (
              <AttentionTile key={tile.key} spec={tile} />
            ))}
          </div>
        </section>
      ) : null}

      {showScheduleNudgeSection && scheduleNudgeCounts ? (
        <section className="space-y-2">
          <h3 className={dashboardSectionTitleClass}>
            {t('dashboard.sectionPatientActivity')}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <CircleDashboardScheduleNudgeTiles
              counts={scheduleNudgeCounts}
              scheduleEnabled={scheduleEnabled}
              onOpenSchedule={onOpenSchedule}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
