import {
  Calendar,
  Heart,
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
import {
  DASHBOARD_RECENCY_TINT_CLASSES,
  type AlertAttentionRecencyUrgency,
} from '../lib/circleDashboardStats';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';

export type CircleInboxFolder = 'discussion' | 'announcements' | 'drop_ins' | 'visit_captures';

type AttentionTileSpec = {
  key: string;
  label: string;
  count: number;
  detail: string;
  icon: LucideIcon;
  onClick?: () => void;
};

function AttentionTile({
  spec,
  variant = 'unread',
  recencyTint = 'neutral',
}: {
  spec: AttentionTileSpec;
  variant?: 'unread' | 'recency';
  recencyTint?: AlertAttentionRecencyUrgency;
}) {
  return (
    <button
      type="button"
      onClick={spec.onClick}
      disabled={!spec.onClick}
      className={cn(
        'w-full min-h-[7.5rem] flex flex-col items-start justify-between gap-2 p-3 sm:p-4 rounded-2xl border text-left transition-colors',
        variant === 'recency'
          ? DASHBOARD_RECENCY_TINT_CLASSES[recencyTint]
          : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70',
        !spec.onClick && 'cursor-default',
      )}
    >
      <div className="flex items-center gap-2 w-full min-w-0">
        <spec.icon
          size={16}
          className={cn(
            'shrink-0',
            variant === 'recency' ? 'text-blue-600' : 'text-indigo-600',
          )}
          aria-hidden
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
          {spec.label}
        </span>
      </div>
      <span
        className={cn(
          'font-bold tabular-nums leading-none text-4xl',
          variant === 'recency' ? 'text-slate-800' : 'text-indigo-700',
        )}
      >
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
  dailyCheckInsCompletedCount,
  dailyCheckInsRecencyTint = 'neutral',
  richMediaReactionsCount = 0,
  richMediaReactionsFromPatient = false,
  richMediaReactionsRecencyTint = 'neutral',
  messagingEnabled,
  onOpenMessages,
  onOpenCircleFolder,
  onOpenCheckIns,
  onOpenRichMediaReactions,
}: {
  memberRole: string;
  messageUnreadCount: number;
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
  dailyCheckInsCompletedCount: number;
  dailyCheckInsRecencyTint?: AlertAttentionRecencyUrgency;
  richMediaReactionsCount?: number;
  richMediaReactionsFromPatient?: boolean;
  richMediaReactionsRecencyTint?: AlertAttentionRecencyUrgency;
  messagingEnabled: boolean;
  onOpenMessages?: () => void;
  onOpenCircleFolder?: (thread: CircleMemberThreadKind, folder: CircleInboxFolder) => void;
  onOpenCheckIns?: () => void;
  onOpenRichMediaReactions?: () => void;
}) {
  const t = useCircleT();
  const canSeeDropIns = canSeeCircleRestrictedThread(memberRole);

  const unreadTiles: AttentionTileSpec[] = [];

  if (messagingEnabled && messageUnreadCount > 0) {
    unreadTiles.push({
      key: 'messages',
      label: t('dashboard.attentionMessages'),
      count: messageUnreadCount,
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
      detail: t('dashboard.attentionCareCoordination'),
      icon: MessageCircle,
      onClick: onOpenCircleFolder
        ? () => onOpenCircleFolder('restricted', 'drop_ins')
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
    (messagingEnabled ? messageUnreadCount : 0) +
    discussionsUnreadCount +
    announcementsUnreadCount +
    (canSeeDropIns ? dropInsUnreadCount : 0) +
    visitCapturesUnreadCount;

  const showPatientActivitySection =
    dailyCheckInsCompletedCount > 0 || richMediaReactionsCount > 0;

  if (unreadTiles.length === 0 && !showPatientActivitySection) return null;

  return (
    <div className="space-y-4">
      {unreadTiles.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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

      {showPatientActivitySection ? (
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
            {t('dashboard.sectionPatientActivity')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {dailyCheckInsCompletedCount > 0 ? (
              <AttentionTile
                spec={{
                  key: 'daily-check-ins',
                  label: t('dashboard.attentionCheckIns'),
                  count: dailyCheckInsCompletedCount,
                  detail: t('dashboard.attentionCheckInsCompleted'),
                  icon: Calendar,
                  onClick: onOpenCheckIns,
                }}
                variant="recency"
                recencyTint={dailyCheckInsRecencyTint}
              />
            ) : null}
            {richMediaReactionsCount > 0 ? (
              <AttentionTile
                spec={{
                  key: 'rich-media-reactions',
                  label: t('dashboard.attentionRichMediaReactions'),
                  count: richMediaReactionsCount,
                  detail: richMediaReactionsFromPatient
                    ? t('dashboard.attentionReactionsFromPatient')
                    : t('dashboard.attentionReactionsTotal'),
                  icon: Heart,
                  onClick: onOpenRichMediaReactions,
                }}
                variant="recency"
                recencyTint={richMediaReactionsRecencyTint}
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
