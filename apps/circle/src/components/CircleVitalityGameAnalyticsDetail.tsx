import { useState } from 'react';

import {

  Bar,

  BarChart,

  CartesianGrid,

  Line,

  LineChart,

  ResponsiveContainer,

  Tooltip,

  YAxis,

} from 'recharts';

import { BarChart3, ChartLine, Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import type { AnalyticsTrendDirection, VitalityGameTimelinePoint } from '@medxforce/shared';

import {

  CIRCLE_ANALYTICS_CHART_HEIGHT,

  circleAnalyticsChartMargin,

  circleAnalyticsPlotInsetLeft,

  circleAnalyticsPlotInsetRight,

  circleAnalyticsTooltipLabelFormatter,

  prepareDailyBucketChartData,

} from '../lib/circleAnalyticsChart';

import { useCircleT } from '../lib/circleI18nContext';

import {

  analyticsDifficultyLabel,

  analyticsTrendImprovingDeclining,

  analyticsWindowDaysLabel,

} from '../lib/circleAnalyticsI18n';

import { cn } from '../lib/utils';

import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';

import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';



type CircleVitalityGameAnalyticsDetailProps = {

  gamesPlayed?: number;

  avgAccuracy?: number;

  totalTimeLabel?: string;

  trend?: AnalyticsTrendDirection;

  level?: string;

  timeline?: VitalityGameTimelinePoint[];

};



function accuracyTrendCopy(

  trend: AnalyticsTrendDirection,

  t: ReturnType<typeof useCircleT>,

): {

  label: string;

  hint: string;

  colorClass: string;

} {

  if (trend === 'up') {

    return {

      label: analyticsTrendImprovingDeclining(t, trend),

      hint: t('analytics.vitalityGame.improvingHint'),

      colorClass: 'text-emerald-700 bg-emerald-50',

    };

  }

  if (trend === 'down') {

    return {

      label: analyticsTrendImprovingDeclining(t, trend),

      hint: t('analytics.vitalityGame.decliningHint'),

      colorClass: 'text-amber-700 bg-amber-50',

    };

  }

  return {

    label: analyticsTrendImprovingDeclining(t, trend),

    hint: t('analytics.vitalityGame.aboutSameHint'),

    colorClass: 'text-slate-600 bg-slate-100',

  };

}



function AccuracyTrendRow({

  trend,

  t,

}: {

  trend: AnalyticsTrendDirection;

  t: ReturnType<typeof useCircleT>;

}) {

  const copy = accuracyTrendCopy(trend, t);

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (

    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">

      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

        {t('analytics.trend')}

      </p>

      <div className="flex items-center gap-2">

        <span

          className={cn(

            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold',

            copy.colorClass,

          )}

        >

          <Icon size={12} />

          {copy.label}

        </span>

      </div>

      <p className="text-[9px] text-slate-400 leading-snug">{copy.hint}</p>

    </div>

  );

}



export function CircleVitalityGameAnalyticsDetail({

  gamesPlayed = 0,

  avgAccuracy = 0,

  totalTimeLabel = '0M 0S',

  trend = 'stable',

  level = 'N/A',

  timeline,

}: CircleVitalityGameAnalyticsDetailProps) {

  const t = useCircleT();

  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  const gamesLabel = t('analytics.vitalityGame.games');

  const accuracyLabel = t('analytics.vitalityGame.accuracy');

  const legend = [

    { color: '#a855f7', label: gamesLabel },

    { color: '#3b82f6', label: accuracyLabel },

  ] as const;

  const chartData = prepareDailyBucketChartData(Array.isArray(timeline) ? timeline : undefined);

  const hasChart = chartData.some((point) => point.games > 0);

  const chartMargin = circleAnalyticsChartMargin({ right: 8, left: 0 });



  return (

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50">

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">

          {analyticsWindowDaysLabel(t, 30)}

        </p>

      </div>

      <div className="p-4 space-y-4">

        <div className="grid grid-cols-2 gap-3">

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.vitalityGame.gamesPlayed')}

            </p>

            <p className="text-2xl font-black text-purple-600 tabular-nums leading-none">

              {gamesPlayed}

            </p>

          </div>

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.vitalityGame.avgAccuracy')}

            </p>

            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">

              {avgAccuracy}%

            </p>

          </div>

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.vitalityGame.difficulty')}

            </p>

            <p className="text-sm font-black text-slate-800 leading-tight">

              {analyticsDifficultyLabel(t, level)}

            </p>

          </div>

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.vitalityGame.totalTime')}

            </p>

            <div className="flex items-center gap-1.5">

              <Clock size={14} className="text-slate-400 shrink-0" />

              <p className="text-sm font-black text-slate-800 tabular-nums leading-tight">

                {totalTimeLabel}

              </p>

            </div>

          </div>

        </div>



        <AccuracyTrendRow trend={trend} t={t} />



        <div className="pt-3 border-t border-slate-50 space-y-2">

          <div className="flex items-center justify-between gap-2">

            <div>

              <p className="text-[10px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</p>

            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">

              <button

                type="button"

                onClick={() => setChartType('line')}

                className={cn(

                  'p-1.5 rounded-md transition-colors',

                  chartType === 'line'

                    ? 'text-purple-600 bg-white shadow-sm'

                    : 'text-slate-400 hover:text-slate-600',

                )}

                aria-label={t('analytics.lineChart')}

                aria-pressed={chartType === 'line'}

              >

                <ChartLine size={14} />

              </button>

              <button

                type="button"

                onClick={() => setChartType('bar')}

                className={cn(

                  'p-1.5 rounded-md transition-colors',

                  chartType === 'bar'

                    ? 'text-purple-600 bg-white shadow-sm'

                    : 'text-slate-400 hover:text-slate-600',

                )}

                aria-label={t('analytics.barChart')}

                aria-pressed={chartType === 'bar'}

              >

                <BarChart3 size={14} />

              </button>

            </div>

          </div>

        </div>



        {hasChart ? (

          <div className="w-full min-w-0 overflow-visible">

            <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>

              {chartType === 'bar' ? (

                <BarChart data={chartData} margin={chartMargin}>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                  <CircleAnalyticsChartXAxis />

                  <YAxis

                    yAxisId="games"

                    allowDecimals={false}

                    axisLine={false}

                    tickLine={false}

                    tick={{ fontSize: 9, fill: '#94a3b8' }}

                    width={24}

                  />

                  <YAxis

                    yAxisId="accuracy"

                    orientation="right"

                    domain={[0, 100]}

                    axisLine={false}

                    tickLine={false}

                    tick={{ fontSize: 9, fill: '#94a3b8' }}

                    width={28}

                  />

                  <Tooltip

                    labelFormatter={circleAnalyticsTooltipLabelFormatter}

                    contentStyle={{

                      borderRadius: '12px',

                      border: 'none',

                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',

                      fontSize: '11px',

                    }}

                  />

                  <Bar

                    yAxisId="games"

                    dataKey="games"

                    name={gamesLabel}

                    fill="#a855f7"

                    radius={[3, 3, 0, 0]}

                  />

                  <Line

                    yAxisId="accuracy"

                    type="monotone"

                    dataKey="accuracy"

                    name={accuracyLabel}

                    stroke="#3b82f6"

                    strokeWidth={2}

                    dot={false}

                    activeDot={{ r: 3 }}

                    connectNulls

                  />

                </BarChart>

              ) : (

                <LineChart data={chartData} margin={chartMargin}>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                  <CircleAnalyticsChartXAxis />

                  <YAxis

                    yAxisId="games"

                    allowDecimals={false}

                    axisLine={false}

                    tickLine={false}

                    tick={{ fontSize: 9, fill: '#94a3b8' }}

                    width={24}

                  />

                  <YAxis

                    yAxisId="accuracy"

                    orientation="right"

                    domain={[0, 100]}

                    axisLine={false}

                    tickLine={false}

                    tick={{ fontSize: 9, fill: '#94a3b8' }}

                    width={28}

                  />

                  <Tooltip

                    labelFormatter={circleAnalyticsTooltipLabelFormatter}

                    contentStyle={{

                      borderRadius: '12px',

                      border: 'none',

                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',

                      fontSize: '11px',

                    }}

                  />

                  <Line

                    yAxisId="games"

                    type="monotone"

                    dataKey="games"

                    name={gamesLabel}

                    stroke="#a855f7"

                    strokeWidth={2}

                    dot={false}

                    activeDot={{ r: 3 }}

                  />

                  <Line

                    yAxisId="accuracy"

                    type="monotone"

                    dataKey="accuracy"

                    name={accuracyLabel}

                    stroke="#3b82f6"

                    strokeWidth={2}

                    dot={false}

                    activeDot={{ r: 3 }}

                    connectNulls

                  />

                </LineChart>

              )}

            </ResponsiveContainer>

            <CircleAnalyticsChartFooter

              legend={[...legend]}

              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin, 24)}

              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin, 28)}

            />

          </div>

        ) : (

          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">

            {t('analytics.chartNotSynced')}

          </p>

        )}

      </div>

    </div>

  );

}

