import { useState } from 'react';
import { Bot, MessageCircle, RefreshCw, Sparkles, AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, CompanionTimelinePoint, TopCountItem } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsTrendHigherLowerStable, analyticsWindowDaysLabel } from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  CircleAnalyticsStatCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CircleCompanionAnalyticsDetailProps = {
  total?: number;
  conversations?: number;
  interactions?: number;
  newCount?: number;
  resumed?: number;
  detected?: number;
  avgInteractions?: string;
  trend?: AnalyticsTrendDirection;
  topTopics?: TopCountItem[];
  timeline?: CompanionTimelinePoint[];
  windowLabel?: string;
};

function TrendSummary({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up' ? 'text-blue-600 bg-blue-50' : trend === 'down' ? 'text-slate-500 bg-slate-100' : 'text-slate-400 bg-slate-100';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase', colorClass)}>
      <Icon size={12} />
      {analyticsTrendHigherLowerStable(t, trend)}
    </span>
  );
}

function TopTopicsList({
  items,
  t,
}: {
  items: TopCountItem[] | undefined;
  t: ReturnType<typeof useCircleT>;
}) {
  const safeItems = items ?? [];
  if (safeItems.length === 0) {
    return <p className="text-[13px] text-slate-400 italic py-2">{t('analytics.noTopicsInPeriod')}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {safeItems.map((item, idx) => (
        <li key={idx} className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-slate-700 truncate flex-1">{item.label}</span>
          <span className="text-[13px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CircleCompanionAnalyticsDetail({
  total = 0,
  conversations = 0,
  interactions = 0,
  newCount = 0,
  resumed = 0,
  detected = 0,
  avgInteractions = '0',
  trend = 'stable',
  topTopics,
  timeline,
  windowLabel,
}: CircleCompanionAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const rangeLabel = windowLabel ?? analyticsWindowDaysLabel(t, 30);
  const conversationsLabel = t('analytics.companion.conversations');
  const interactionsLabel = t('analytics.companion.interactions');
  const detectedLabel = t('analytics.companion.detected');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-blue-50/60">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {rangeLabel}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[12px] font-bold text-blue-500 uppercase">{t('analytics.metrics.companion')}</p>
          <p className="text-3xl font-black text-blue-600 leading-none mt-1 tabular-nums">{total}</p>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">{t('analytics.companion.totalHint', { window: rangeLabel })}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.trend')}</span>
          <TrendSummary trend={trend} t={t} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</span>
          <CircleAnalyticsChartTypeToggle
            chartType={chartType}
            onChange={setChartType}
            lineAriaLabel={t('analytics.lineChart')}
            barAriaLabel={t('analytics.barChart')}
          />
        </div>

        <CircleAnalyticsSeriesCard
          icon={MessageCircle}
          title={conversationsLabel}
          value={conversations}
          hint={t('analytics.companion.conversationsHint', { window: rangeLabel })}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'conversations')}
        />
        <CircleAnalyticsSeriesCard
          icon={Sparkles}
          title={interactionsLabel}
          value={interactions}
          hint={t('analytics.companion.interactionsHint', { window: rangeLabel })}
          color="#059669"
          iconWrapClass="text-emerald-600"
          cardClass="border-emerald-200 bg-emerald-50/50"
          titleClass="text-emerald-700"
          valueClass="text-emerald-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'interactions')}
        />
        <CircleAnalyticsSeriesCard
          icon={AlertTriangle}
          title={detectedLabel}
          value={detected}
          hint={t('analytics.companion.detectedHint')}
          color="#f43f5e"
          iconWrapClass="text-rose-600"
          cardClass="border-rose-200 bg-rose-50/50"
          titleClass="text-rose-700"
          valueClass="text-rose-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'detected')}
        />

        <div className="grid grid-cols-2 gap-3">
          <CircleAnalyticsStatCard
            icon={Bot}
            title={t('analytics.companion.new')}
            value={newCount}
            hint={t('analytics.companion.newHint', { window: rangeLabel })}
            iconWrapClass="text-sky-600"
            cardClass="border-sky-200 bg-sky-50/50"
            titleClass="text-sky-700"
            valueClass="text-sky-700"
          />
          <CircleAnalyticsStatCard
            icon={RefreshCw}
            title={t('analytics.companion.resume')}
            value={resumed}
            hint={t('analytics.companion.resumeHint', { window: rangeLabel })}
            iconWrapClass="text-indigo-600"
            cardClass="border-indigo-200 bg-indigo-50/50"
            titleClass="text-indigo-700"
            valueClass="text-indigo-700"
          />
        </div>

        <CircleAnalyticsStatCard
          icon={Sparkles}
          title={t('analytics.companion.avgInt')}
          value={avgInteractions}
          hint={t('analytics.companion.avgIntHint')}
          iconWrapClass="text-emerald-600"
          cardClass="border-emerald-200 bg-emerald-50/40"
          titleClass="text-emerald-700"
          valueClass="text-emerald-700"
        />

        <div className="pt-1 border-t border-slate-50 space-y-2">
          <p className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.companion.topTopics')}</p>
          <TopTopicsList items={topTopics} t={t} />
        </div>
      </div>
    </div>
  );
}
