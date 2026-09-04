import { useState } from 'react';
import { Clock, Gauge, Sparkles, Target, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, VitalityGameTimelinePoint } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import {
  analyticsDifficultyLabel,
  analyticsTrendImprovingDeclining,
  analyticsWindowDaysLabel,
} from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  CircleAnalyticsStatCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CircleVitalityGameAnalyticsDetailProps = {
  gamesPlayed?: number;
  avgAccuracy?: number;
  totalTimeLabel?: string;
  trend?: AnalyticsTrendDirection;
  level?: string;
  timeline?: VitalityGameTimelinePoint[];
  windowLabel?: string;
};

function accuracyTrendCopy(
  trend: AnalyticsTrendDirection,
  t: ReturnType<typeof useCircleT>,
  windowLabel: string,
): { label: string; hint: string; colorClass: string } {
  if (trend === 'up') {
    return {
      label: analyticsTrendImprovingDeclining(t, trend),
      hint: t('analytics.vitalityGame.improvingHint', { window: windowLabel }),
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: analyticsTrendImprovingDeclining(t, trend),
      hint: t('analytics.vitalityGame.decliningHint', { window: windowLabel }),
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: analyticsTrendImprovingDeclining(t, trend),
    hint: t('analytics.vitalityGame.aboutSameHint', { window: windowLabel }),
    colorClass: 'text-slate-600 bg-slate-100',
  };
}

export function CircleVitalityGameAnalyticsDetail({
  gamesPlayed = 0,
  avgAccuracy = 0,
  totalTimeLabel = '0M 0S',
  trend = 'stable',
  level = 'N/A',
  timeline,
  windowLabel,
}: CircleVitalityGameAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const rangeLabel = windowLabel ?? analyticsWindowDaysLabel(t, 30);
  const copy = accuracyTrendCopy(trend, t, rangeLabel);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const gamesLabel = t('analytics.vitalityGame.gamesPlayed');
  const accuracyLabel = t('analytics.vitalityGame.avgAccuracy');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {rangeLabel}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-[13px] text-slate-500 leading-snug">{t('analytics.vitalityGame.includesSpeechGames')}</p>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{t('analytics.trend')}</p>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[13px] font-bold', copy.colorClass)}>
              <TrendIcon size={12} />
              {copy.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">{copy.hint}</p>
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
          icon={Sparkles}
          title={gamesLabel}
          value={gamesPlayed}
          hint={t('analytics.vitalityGame.gamesHint', { window: rangeLabel })}
          color="#a855f7"
          iconWrapClass="text-purple-600"
          cardClass="border-purple-200 bg-purple-50/50"
          titleClass="text-purple-700"
          valueClass="text-purple-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'games')}
        />
        <CircleAnalyticsSeriesCard
          icon={Target}
          title={accuracyLabel}
          value={`${avgAccuracy}%`}
          hint={t('analytics.vitalityGame.accuracyHint', { window: rangeLabel })}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'accuracy')}
          yDomain={[0, 100]}
          yTicks={[0, 50, 100]}
          allowDecimals
        />

        <div className="grid grid-cols-2 gap-3">
          <CircleAnalyticsStatCard
            icon={Clock}
            title={t('analytics.vitalityGame.totalTime')}
            value={totalTimeLabel}
            hint={t('analytics.vitalityGame.timeHint', { window: rangeLabel })}
            iconWrapClass="text-slate-600"
            cardClass="border-slate-200 bg-slate-50/70"
            titleClass="text-slate-600"
            valueClass="text-slate-800"
          />
          <CircleAnalyticsStatCard
            icon={Gauge}
            title={t('analytics.vitalityGame.difficulty')}
            value={analyticsDifficultyLabel(t, level)}
            iconWrapClass="text-amber-600"
            cardClass="border-amber-200 bg-amber-50/50"
            titleClass="text-amber-700"
            valueClass="text-amber-700"
          />
        </div>
      </div>
    </div>
  );
}
