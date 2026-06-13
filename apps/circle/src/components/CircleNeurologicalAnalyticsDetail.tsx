import {

  CartesianGrid,

  Line,

  LineChart,

  ResponsiveContainer,

  Tooltip,

  YAxis,

} from 'recharts';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import type {

  AnalyticsTrendDirection,

  DomainScoreTrend,

  NeurologicalLatestSnapshot,

  NeurologicalTimelinePoint,

} from '@medxforce/shared';

import {

  CIRCLE_ANALYTICS_CHART_HEIGHT,

  circleAnalyticsChartMargin,

  circleAnalyticsPlotInsetLeft,

  circleAnalyticsPlotInsetRight,

  circleAnalyticsSparseLineProps,

  circleAnalyticsTooltipLabelFormatter,

  prepareSparseTimelineChartData,

} from '../lib/circleAnalyticsChart';

import { useCircleT } from '../lib/circleI18nContext';

import {

  analyticsNeurologicalOutcomeLabel,

  analyticsTrendImprovingDeclining,

  analyticsWindowDaysLabel,

} from '../lib/circleAnalyticsI18n';

import { cn } from '../lib/utils';

import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';

import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';



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



function TrendBadge({

  trend,

  t,

  higherIsBetter = true,

}: {

  trend: AnalyticsTrendDirection;

  t: ReturnType<typeof useCircleT>;

  higherIsBetter?: boolean;

}) {

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const colorClass =

    trend === 'stable'

      ? 'text-slate-300'

      : (trend === 'up') === higherIsBetter

        ? 'text-emerald-500'

        : 'text-red-500';

  return (

    <span className={cn('inline-flex items-center gap-1', colorClass)}>

      <Icon size={14} />

      <span className="text-[11px] font-bold text-slate-600">

        {analyticsTrendImprovingDeclining(t, trend, higherIsBetter)}

      </span>

    </span>

  );

}



function DomainCard({

  label,

  data,

  t,

}: {

  label: string;

  data: DomainScoreTrend;

  t: ReturnType<typeof useCircleT>;

}) {

  return (

    <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-2">

      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>

      <div className="flex items-end justify-between gap-2">

        <p className="text-xl font-black text-slate-800 tabular-nums">{data.current}</p>

        <TrendBadge trend={data.trend} t={t} />

      </div>

      <p className="text-[10px] text-slate-400 font-semibold tabular-nums">

        {data.change > 0 ? `+${data.change}` : data.change}

      </p>

    </div>

  );

}



function resultClass(value: boolean | null): string {

  if (value === true) return 'bg-emerald-50 text-emerald-700';

  if (value === false) return 'bg-red-50 text-red-700';

  return 'bg-slate-100 text-slate-500';

}



export function CircleNeurologicalAnalyticsDetail({

  count = 0,

  average = 0,

  trend = 'stable',

  overall,

  executive,

  language,

  attention,

  timeline,

  latestSnapshot,

}: CircleNeurologicalAnalyticsDetailProps) {

  const t = useCircleT();

  const overallLabel = t('analytics.neurological.overall');

  const executiveLabel = t('analytics.neurological.executive');

  const languageLabel = t('analytics.neurological.language');

  const attentionLabel = t('analytics.neurological.attention');

  const legend = [

    { color: '#7c3aed', label: overallLabel },

    { color: '#2563eb', label: executiveLabel },

    { color: '#059669', label: languageLabel },

    { color: '#d97706', label: attentionLabel },

  ] as const;

  const chartData = prepareSparseTimelineChartData(

    Array.isArray(timeline) ? timeline : undefined,

  );

  const hasChart = chartData.length > 0;

  const chartMargin = circleAnalyticsChartMargin({ right: 8, left: -18 });



  return (

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50">

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">

          {analyticsWindowDaysLabel(t, 30)}

        </p>

      </div>

      <div className="p-4 space-y-4">

        <div className="grid grid-cols-3 gap-3">

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.vision.assessments')}

            </p>

            <p className="text-2xl font-black text-purple-600 tabular-nums leading-none">{count}</p>

          </div>

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.neurological.overallCognitive')}

            </p>

            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">{average}</p>

          </div>

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.trend')}

            </p>

            <div className="pt-1">

              <TrendBadge trend={trend} t={t} />

            </div>

          </div>

        </div>



        {overall && executive && language && attention && (

          <div className="grid grid-cols-2 gap-2">

            <DomainCard label={t('analytics.neurological.overallCognitive')} data={overall} t={t} />

            <DomainCard label={executiveLabel} data={executive} t={t} />

            <DomainCard label={languageLabel} data={language} t={t} />

            <DomainCard label={attentionLabel} data={attention} t={t} />

          </div>

        )}



        {latestSnapshot && (

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.neurological.latestSnapshot')}

            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">

              <div className="flex items-center justify-between gap-2">

                <span className="font-semibold text-slate-600">Naming</span>

                <span

                  className={cn(

                    'px-2 py-0.5 rounded-md font-bold uppercase text-[10px]',

                    resultClass(latestSnapshot.namingSuccess),

                  )}

                >

                  {analyticsNeurologicalOutcomeLabel(t, latestSnapshot.namingSuccess)}

                </span>

              </div>

              <div className="flex items-center justify-between gap-2">

                <span className="font-semibold text-slate-600">Comprehension</span>

                <span

                  className={cn(

                    'px-2 py-0.5 rounded-md font-bold uppercase text-[10px]',

                    resultClass(latestSnapshot.comprehensionSuccess),

                  )}

                >

                  {analyticsNeurologicalOutcomeLabel(t, latestSnapshot.comprehensionSuccess)}

                </span>

              </div>

              <div className="flex items-center justify-between gap-2">

                <span className="font-semibold text-slate-600">Sequence</span>

                <span

                  className={cn(

                    'px-2 py-0.5 rounded-md font-bold uppercase text-[10px]',

                    resultClass(latestSnapshot.sequenceSuccess),

                  )}

                >

                  {analyticsNeurologicalOutcomeLabel(t, latestSnapshot.sequenceSuccess)}

                </span>

              </div>

              <div className="flex items-center justify-between gap-2">

                <span className="font-semibold text-slate-600">Fluency words</span>

                <span className="font-black text-purple-600 tabular-nums">

                  {latestSnapshot.fluencyCount}

                </span>

              </div>

              <div className="flex items-center justify-between gap-2">

                <span className="font-semibold text-slate-600">Trail errors</span>

                <span className="font-black text-slate-700 tabular-nums">

                  {latestSnapshot.trailErrors}

                </span>

              </div>

              <div className="flex items-center justify-between gap-2">

                <span className="font-semibold text-slate-600">Trail time</span>

                <span className="font-black text-slate-700 tabular-nums">

                  {latestSnapshot.trailLatency}s

                </span>

              </div>

            </div>

          </div>

        )}



        {hasChart ? (

          <div className="w-full overflow-visible">

            <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT}>

              <LineChart data={chartData} margin={chartMargin}>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                <CircleAnalyticsChartXAxis variant="sparse" />

                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} />

                <Tooltip

                  labelFormatter={circleAnalyticsTooltipLabelFormatter}

                  contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0' }}

                />

                <Line dataKey="overall" name={overallLabel} stroke="#7c3aed" strokeWidth={2} {...circleAnalyticsSparseLineProps} />

                <Line dataKey="executive" name={executiveLabel} stroke="#2563eb" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />

                <Line dataKey="language" name={languageLabel} stroke="#059669" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />

                <Line dataKey="attention" name={attentionLabel} stroke="#d97706" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />

              </LineChart>

            </ResponsiveContainer>

            <CircleAnalyticsChartFooter

              legend={[...legend]}

              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin, 28)}

              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}

              sparsePointCount={chartData.length}

            />

          </div>

        ) : (

          <p className="text-[11px] text-slate-400 italic text-center py-2">

            {t('analytics.chartNotSynced')}

          </p>

        )}

      </div>

    </div>

  );

}

