import { AlertCircle, Bell, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { CircleAlertAttentionItem } from '../hooks/useCircleAlertAttentionState';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { formatDashboardTimestamp } from '../lib/dashboardI18n';
import { alertAttentionMessagePreview } from '../lib/circleAlertAttentionUrgency';
import {
  circleUrgencyBannerIconClass,
  circleUrgencyBannerTitleClass,
  circleUrgencyBannerWrapClass,
} from '../lib/circleUrgencyStyles';

interface CircleAlertAttentionBannerProps {
  urgentItems: CircleAlertAttentionItem[];
  subduedItems: CircleAlertAttentionItem[];
  onOpenMessages: () => void;
}

function BannerRow({
  item,
  urgent,
  onOpenMessages,
}: {
  item: CircleAlertAttentionItem;
  urgent: boolean;
  onOpenMessages: () => void;
}) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const Icon = item.kind === 'alert' ? AlertCircle : Bell;
  const kindLabel =
    item.kind === 'alert' ? t('alertAttention.alert') : t('alertAttention.attention');
  const bannerTitle =
    item.kind === 'alert'
      ? t('alertAttention.alertFromLovedOne')
      : t('alertAttention.needsAttention');

  return (
    <button
      type="button"
      onClick={onOpenMessages}
      className={cn(
        'w-full flex items-start gap-3 p-4 pl-5 rounded-2xl text-left transition-all duration-200',
        circleUrgencyBannerWrapClass(item.kind, urgent),
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm',
          circleUrgencyBannerIconClass(item.kind),
        )}
      >
        <Icon size={18} strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              circleUrgencyBannerTitleClass(item.kind),
            )}
          >
            {urgent ? bannerTitle : kindLabel}
          </p>
          {item.createdAt > 0 && (
            <span className="text-[10px] text-slate-400 shrink-0 tabular-nums whitespace-nowrap">
              {formatDashboardTimestamp(t, language, item.createdAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          {alertAttentionMessagePreview(item) || t('alertAttention.openMessages')}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" aria-hidden />
    </button>
  );
}

export function CircleAlertAttentionBanner({
  urgentItems,
  subduedItems,
  onOpenMessages,
}: CircleAlertAttentionBannerProps) {
  if (urgentItems.length === 0 && subduedItems.length === 0) return null;

  return (
    <div className="space-y-2">
      {urgentItems.map((item) => (
        <BannerRow key={item.id} item={item} urgent onOpenMessages={onOpenMessages} />
      ))}
      {subduedItems.map((item) => (
        <BannerRow key={item.id} item={item} urgent={false} onOpenMessages={onOpenMessages} />
      ))}
    </div>
  );
}
