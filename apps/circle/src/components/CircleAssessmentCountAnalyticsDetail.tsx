import { useState } from 'react';
import { Activity, Gauge, HeartPulse, Move, Scale, Thermometer, Zap, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, AssessmentCountTimelinePoint } from '@medxforce/shared';
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

type CircleAssessmentCountAnalyticsDetailProps = {
  metricId?: string;
  count?: number;
  average?: number | null;
  trend?: AnalyticsTrendDirection;
  timeline?: AssessmentCountTimelinePoint[];
  windowLabel?: string;
};

const PHYSICAL_THEMES: Record<
  string,
  {
    color: string;
    icon: typeof HeartPulse;
    iconWrapClass: string;
    cardClass: string;
    titleClass: string;
    valueClass: string;
    headerClass: string;
  }
> = {
  impact: {
    color: '#2563eb',
    icon: Activity,
    iconWrapClass: 'text-blue-600',
    cardClass: 'border-blue-200 bg-blue-50/50',
    titleClass: 'text-blue-700',
    valueClass: 'text-blue-700',
    headerClass: 'bg-blue-50/60',
  },
  pain: {
    color: '#e11d48',
    icon: HeartPulse,
    iconWrapClass: 'text-rose-600',
    cardClass: 'border-rose-200 bg-rose-50/50',
    titleClass: 'text-rose-700',
    valueClass: 'text-rose-700',
    headerClass: 'bg-rose-50/60',
  },
  'strength-reflex': {
    color: '#4f46e5',
    icon: Scale,
    iconWrapClass: 'text-indigo-600',
    cardClass: 'border-indigo-200 bg-indigo-50/50',
    titleClass: 'text-indigo-700',
    valueClass: 'text-indigo-700',
    headerClass: 'bg-indigo-50/60',
  },
  mobility: {
    color: '#059669',
    icon: Move,
    iconWrapClass: 'text-emerald-600',
    cardClass: 'border-emerald-200 bg-emerald-50/50',
    titleClass: 'text-emerald-700',
    valueClass: 'text-emerald-700',
    headerClass: 'bg-emerald-50/60',
  },
  numbness: {
    color: '#7c3aed',
    icon: Zap,
    iconWrapClass: 'text-violet-600',
    cardClass: 'border-violet-200 bg-violet-50/50',
    titleClass: 'text-violet-700',
    valueClass: 'text-violet-700',
    headerClass: 'bg-violet-50/60',
  },
  temperature: {
    color: '#0891b2',
    icon: Thermometer,
    iconWrapClass: 'text-cyan-600',
    cardClass: 'border-cyan-200 bg-cyan-50/50',
    titleClass: 'text-cyan-700',
    valueClass: 'text-cyan-700',
    headerClass: 'bg-cyan-50/60',
  },
};

const DEFAULT_THEME = PHYSICAL_THEMES.impact;

function TrendSummary({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up' ? 'text-red-600 bg-red-50' : trend === 'down' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase', colorClass)}>
      <Icon size={12} />
      {analyticsTrendHigherLowerStable(t, trend)}
    </span>
  );
}

export function CircleAssessmentCountAnalyticsDetail({
  metricId,
  count = 0,
  average,
  trend = 'stable',
  timeline,
  windowLabel,
}: CircleAssessmentCountAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const theme = (metricId && PHYSICAL_THEMES[metricId]) || DEFAULT_THEME;
  const rangeLabel = windowLabel ?? analyticsWindowDaysLabel(t, 30);
  const entriesLabel = t('analytics.entriesInWindow');
  const averageLabel = t('analytics.average');
  const chartData = seriesFromKeyedTimeline(timeline, 'count');
  const averageHint =
    metricId === 'pain'
      ? t('analytics.assessmentCount.painAverageHint', { window: rangeLabel })
      : t('analytics.assessmentCount.averageHint', { window: rangeLabel });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={cn('px-3 py-2 border-b border-slate-100', theme.headerClass)}>
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {rangeLabel}
        </p>
      </div>
      <div className="p-4 space-y-4">
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
          icon={theme.icon}
          title={entriesLabel}
          value={count}
          hint={t('analytics.assessmentCount.entriesHint', { window: rangeLabel })}
          color={theme.color}
          iconWrapClass={theme.iconWrapClass}
          cardClass={theme.cardClass}
          titleClass={theme.titleClass}
          valueClass={theme.valueClass}
          chartType={chartType}
          chartData={chartData}
        />

        <CircleAnalyticsStatCard
          icon={Gauge}
          title={averageLabel}
          value={average != null && Number.isFinite(average) ? average : '—'}
          hint={averageHint}
          iconWrapClass="text-slate-600"
          cardClass="border-slate-200 bg-slate-50/70"
          titleClass="text-slate-600"
          valueClass="text-slate-800"
        />
      </div>
    </div>
  );
}
