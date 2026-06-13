import { Calendar, Megaphone, MessageCircle, MessageSquare, Stethoscope } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  canSeeCircleRestrictedThread,
  type CircleMemberThreadKind,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';

export type CircleInboxFolder = 'discussion' | 'announcements' | 'drop_ins' | 'visit_captures';

type AttentionTileSpec = {
  key: string;
  label: string;
  count: number;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
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
        spec.accent
          ? 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50',
        !spec.onClick && 'cursor-default',
      )}
    >
      <div className="flex items-center gap-2 w-full min-w-0">
        <spec.icon size={16} className="shrink-0 text-indigo-600" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
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

function visitCapturesThreadForRole(
  memberRole: string,
  restrictedUnread: number,
  openUnread: number,
): CircleMemberThreadKind {
  if (canSeeCircleRestrictedThread(memberRole) && restrictedUnread > 0) return 'restricted';
  if (openUnread > 0) return 'open';
  return canSeeCircleRestrictedThread(memberRole) ? 'restricted' : 'open';
}

export function CircleDashboardAttentionTiles({
  memberRole,
  messageUnreadCount,
  announcementsUnreadCount,
  dropInsUnreadCount,
  visitCapturesUnreadCount,
  visitCapturesOpenUnreadCount,
  visitCapturesRestrictedUnreadCount,
  dailyCheckInsCompletedCount,
  messagingEnabled,
  onOpenMessages,
  onOpenCircleFolder,
  onOpenCheckIns,
}: {
  memberRole: string;
  messageUnreadCount: number;
  announcementsUnreadCount: number;
  dropInsUnreadCount: number;
  visitCapturesUnreadCount: number;
  visitCapturesOpenUnreadCount: number;
  visitCapturesRestrictedUnreadCount: number;
  dailyCheckInsCompletedCount: number;
  messagingEnabled: boolean;
  onOpenMessages?: () => void;
  onOpenCircleFolder?: (thread: CircleMemberThreadKind, folder: CircleInboxFolder) => void;
  onOpenCheckIns?: () => void;
}) {
  const t = useCircleT();
  const canSeeDropIns = canSeeCircleRestrictedThread(memberRole);

  const candidateTiles: AttentionTileSpec[] = [];

  if (messagingEnabled && messageUnreadCount > 0) {
    candidateTiles.push({
      key: 'messages',
      label: t('dashboard.attentionMessages'),
      count: messageUnreadCount,
      detail: t('dashboard.attentionMessagesWaiting'),
      icon: MessageSquare,
      accent: true,
      onClick: onOpenMessages,
    });
  }

  if (announcementsUnreadCount > 0) {
    candidateTiles.push({
      key: 'announcements',
      label: t('dashboard.attentionAnnouncements'),
      count: announcementsUnreadCount,
      detail: t('dashboard.attentionInCircle'),
      icon: Megaphone,
      accent: true,
      onClick: onOpenCircleFolder
        ? () => onOpenCircleFolder('open', 'announcements')
        : undefined,
    });
  }

  if (canSeeDropIns && dropInsUnreadCount > 0) {
    candidateTiles.push({
      key: 'drop-ins',
      label: t('dashboard.attentionDropIns'),
      count: dropInsUnreadCount,
      detail: t('dashboard.attentionCareCoordination'),
      icon: MessageCircle,
      accent: true,
      onClick: onOpenCircleFolder
        ? () => onOpenCircleFolder('restricted', 'drop_ins')
        : undefined,
    });
  }

  if (dailyCheckInsCompletedCount > 0) {
    candidateTiles.push({
      key: 'check-ins',
      label: t('dashboard.attentionCheckIns'),
      count: dailyCheckInsCompletedCount,
      detail: t('dashboard.attentionCheckInsCompleted'),
      icon: Calendar,
      accent: true,
      onClick: onOpenCheckIns,
    });
  }

  if (visitCapturesUnreadCount > 0) {
    candidateTiles.push({
      key: 'visit-captures',
      label: t('dashboard.attentionVisitCaptures'),
      count: visitCapturesUnreadCount,
      detail: t('dashboard.attentionVisitCapturesUnread'),
      icon: Stethoscope,
      accent: true,
      onClick: onOpenCircleFolder
        ? () =>
            onOpenCircleFolder(
              visitCapturesThreadForRole(
                memberRole,
                visitCapturesRestrictedUnreadCount,
                visitCapturesOpenUnreadCount,
              ),
              'visit_captures',
            )
        : undefined,
    });
  }

  if (candidateTiles.length === 0) return null;

  const totalUnread =
    candidateTiles.reduce((sum, tile) => sum + tile.count, 0);

  return (
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
        {candidateTiles.map((tile) => (
          <AttentionTile key={tile.key} spec={tile} />
        ))}
      </div>
    </section>
  );
}
