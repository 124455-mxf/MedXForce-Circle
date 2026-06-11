import { AlertCircle, Bell, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { CircleAlertAttentionItem } from '../hooks/useCircleAlertAttentionState';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { formatDashboardTimestamp } from '../lib/dashboardI18n';
import { alertAttentionMessagePreview, type CircleAlertAttentionKind } from '../lib/circleAlertAttentionUrgency';

interface CircleAlertAttentionBannerProps {
  urgentItems: CircleAlertAttentionItem[];
  subduedItems: CircleAlertAttentionItem[];
  onOpenMessages: () => void;
}

function bannerStyles(kind: CircleAlertAttentionKind, urgent: boolean) {
  if (kind === 'alert') {
    return urgent
      ? {
          wrap: 'border-red-200 bg-red-50/90 circle-urgency-banner-alert',
          icon: 'border-red-100 text-red-600 bg-white',
          title: 'text-red-800',
        }
      : {
          wrap: 'border-red-100 bg-red-50/70',
          icon: 'border-red-100 text-red-600 bg-white',
          title: 'text-red-800',
        };
  }
  return urgent
    ? {
        wrap: 'border-blue-200 bg-blue-50/90 circle-urgency-banner-attention',
        icon: 'border-blue-100 text-blue-600 bg-white',
        title: 'text-blue-800',
      }
    : {
        wrap: 'border-blue-100 bg-blue-50/70',
        icon: 'border-blue-100 text-blue-600 bg-white',
        title: 'text-blue-800',
      };
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
  const styles = bannerStyles(item.kind, urgent);
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
        'w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors hover:brightness-[0.98]',
        styles.wrap,
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
          styles.icon,
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-xs font-bold uppercase tracking-wide', styles.title)}>
            {urgent ? bannerTitle : kindLabel}
          </p>
          {item.createdAt > 0 && (
            <span className="text-[10px] text-slate-400 shrink-0 tabular-nums whitespace-nowrap">
              {formatDashboardTimestamp(t, language, item.createdAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-700 mt-1 leading-relaxed">
          {alertAttentionMessagePreview(item) || t('alertAttention.openMessages')}
        </p>
      </div>
      <ChevronRight size={16} className="text-slate-400 shrink-0 mt-1" aria-hidden />
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
