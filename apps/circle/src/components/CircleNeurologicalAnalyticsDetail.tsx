import { useState } from 'react';
import { Brain, Languages, Sparkles, Target, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  DomainScoreTrend,
  NeurologicalLatestSnapshot,
  NeurologicalTimelinePoint,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import {
  analyticsNeurologicalOutcomeLabel,
  analyticsTrendImprovingDeclining,
  analyticsWindowDaysLabel,
} from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CircleNeurologicalAnalyticsDetailProps = {
  count?: number;
  average?: number;
  trend?: AnalyticsTrendDirection;
  overall?: DomainScoreTrend;
  executive?: DomainScoreTrend;
  language?: DomainScoreTrend;
  attention?: DomainScoreTrend;
  timeline?: NeurologicalTimelinePoint[];
  latestSnapshot?: NeurologicalLatestSnapshot;
};

const SCORE_DOMAIN: [number, number] = [0, 10];
const SCORE_TICKS = [0, 5, 10];

function TrendSummary({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : trend === 'down'
        ? 'text-amber-600 bg-amber-50'
        : 'text-slate-400 bg-slate-100';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase', colorClass)}>
      <Icon size={12} />
      {analyticsTrendImprovingDeclining(t, trend)}
    </span>
  );
}

function resultClass(value: boolean | null): string {
  if (value === true) return 'bg-emerald-50 text-emerald-700';
  if (value === false) return 'bg-red-50 text-red-700';
  return 'bg-slate-100 text-slate-500';
}

export function CircleNeurologicalAnalyticsDetail({
  overall,
  executive,
  language,
  attention,
  timeline,
  latestSnapshot,
  trend = 'stable',
}: CircleNeurologicalAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const overallLabel = t('analytics.neurological.overallCognitive');
  const executiveLabel = t('analytics.neurological.executive');
  const languageLabel = t('analytics.neurological.language');
  const attentionLabel = t('analytics.neurological.attention');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {analyticsWindowDaysLabel(t, 30)}
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
          icon={Brain}
          title={overallLabel}
          value={overall?.current ?? '—'}
          hint={t('analytics.neurological.overallHint')}
          color="#7c3aed"
          iconWrapClass="text-violet-600"
          cardClass="border-violet-200 bg-violet-50/50"
          titleClass="text-violet-700"
          valueClass="text-violet-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'overall')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Sparkles}
          title={executiveLabel}
          value={executive?.current ?? '—'}
          hint={t('analytics.neurological.executiveHint')}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'executive')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Languages}
          title={languageLabel}
          value={language?.current ?? '—'}
          hint={t('analytics.neurological.languageHint')}
          color="#059669"
          iconWrapClass="text-emerald-600"
          cardClass="border-emerald-200 bg-emerald-50/50"
          titleClass="text-emerald-700"
          valueClass="text-emerald-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'language')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Target}
          title={attentionLabel}
          value={attention?.current ?? '—'}
          hint={t('analytics.neurological.attentionHint')}
          color="#d97706"
          iconWrapClass="text-amber-600"
          cardClass="border-amber-200 bg-amber-50/50"
          titleClass="text-amber-700"
          valueClass="text-amber-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'attention')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />

        {latestSnapshot && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              {t('analytics.neurological.latestSnapshot')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{t('analytics.neurological.naming')}</span>
                <span className={cn('px-2 py-0.5 rounded-md font-bold uppercase text-[12px]', resultClass(latestSnapshot.namingSuccess))}>
                  {analyticsNeurologicalOutcomeLabel(t, latestSnapshot.namingSuccess)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{t('analytics.neurological.comprehension')}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md font-bold uppercase text-[12px]',
                    resultClass(latestSnapshot.comprehensionSuccess),
                  )}
                >
                  {analyticsNeurologicalOutcomeLabel(t, latestSnapshot.comprehensionSuccess)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{t('analytics.neurological.sequence')}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md font-bold uppercase text-[12px]',
                    resultClass(latestSnapshot.sequenceSuccess),
                  )}
                >
                  {analyticsNeurologicalOutcomeLabel(t, latestSnapshot.sequenceSuccess)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{t('analytics.neurological.fluency')}</span>
                <span className="font-black text-slate-700 tabular-nums">{latestSnapshot.fluencyCount}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{t('analytics.neurological.trailErrors')}</span>
                <span className="font-black text-slate-700 tabular-nums">{latestSnapshot.trailErrors}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{t('analytics.neurological.trailTime')}</span>
                <span className="font-black text-slate-700 tabular-nums">{latestSnapshot.trailLatency}s</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
