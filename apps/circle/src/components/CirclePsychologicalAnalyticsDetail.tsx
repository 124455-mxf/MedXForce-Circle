import { useState } from 'react';
import { Battery, Flame, Moon, Smile, Zap, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, PsychologicalScoreTrend, PsychologicalTimelinePoint } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsTrendImprovingDeclining, analyticsWindowDaysLabel } from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CirclePsychologicalAnalyticsDetailProps = {
  count?: number;
  trend?: AnalyticsTrendDirection;
  mood?: PsychologicalScoreTrend;
  anxiety?: PsychologicalScoreTrend;
  sleep?: PsychologicalScoreTrend;
  stress?: PsychologicalScoreTrend;
  energy?: PsychologicalScoreTrend;
  timeline?: PsychologicalTimelinePoint[];
  windowLabel?: string;
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

function scoreValue(data: PsychologicalScoreTrend | undefined): string {
  if (!data) return '—';
  return `${data.current}/10`;
}

export function CirclePsychologicalAnalyticsDetail({
  trend = 'stable',
  mood,
  anxiety,
  sleep,
  stress,
  energy,
  timeline,
  windowLabel,
}: CirclePsychologicalAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const moodLabel = t('analytics.psychological.mood');
  const anxietyLabel = t('analytics.psychological.anxiety');
  const sleepLabel = t('analytics.psychological.sleep');
  const stressLabel = t('analytics.psychological.stress');
  const energyLabel = t('analytics.psychological.energy');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-pink-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {windowLabel ?? analyticsWindowDaysLabel(t, 30)}
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
          icon={Smile}
          title={moodLabel}
          value={scoreValue(mood)}
          hint={t('analytics.psychological.moodHint')}
          color="#db2777"
          iconWrapClass="text-pink-600"
          cardClass="border-pink-200 bg-pink-50/50"
          titleClass="text-pink-700"
          valueClass="text-pink-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'mood')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Zap}
          title={anxietyLabel}
          value={scoreValue(anxiety)}
          hint={t('analytics.psychological.anxietyHint')}
          color="#dc2626"
          iconWrapClass="text-red-600"
          cardClass="border-red-200 bg-red-50/50"
          titleClass="text-red-700"
          valueClass="text-red-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'anxiety')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Moon}
          title={sleepLabel}
          value={scoreValue(sleep)}
          hint={t('analytics.psychological.sleepHint')}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'sleep')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Flame}
          title={stressLabel}
          value={scoreValue(stress)}
          hint={t('analytics.psychological.stressHint')}
          color="#d97706"
          iconWrapClass="text-amber-600"
          cardClass="border-amber-200 bg-amber-50/50"
          titleClass="text-amber-700"
          valueClass="text-amber-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'stress')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Battery}
          title={energyLabel}
          value={scoreValue(energy)}
          hint={t('analytics.psychological.energyHint')}
          color="#059669"
          iconWrapClass="text-emerald-600"
          cardClass="border-emerald-200 bg-emerald-50/50"
          titleClass="text-emerald-700"
          valueClass="text-emerald-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'energy')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
      </div>
    </div>
  );
}
