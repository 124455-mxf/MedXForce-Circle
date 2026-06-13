import {

  Area,

  AreaChart,

  CartesianGrid,

  Line,

  ResponsiveContainer,

  Tooltip,

  YAxis,

} from 'recharts';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import type {

  AnalyticsTrendDirection,

  VisionCategoryTrend,

  VisionFindingItem,

  VisionTimelinePoint,

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

  analyticsTrendHigherLowerStable,

  analyticsWindowDaysLabel,

} from '../lib/circleAnalyticsI18n';

import { cn } from '../lib/utils';

import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';

import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';



type CircleVisionAnalyticsDetailProps = {

  count?: number;

  average?: number;

  trend?: AnalyticsTrendDirection;

  timeline?: VisionTimelinePoint[];

  latestFindings?: VisionFindingItem[];

  categoryTrends?: {

    focus: VisionCategoryTrend;

    field: VisionCategoryTrend;

    motor: VisionCategoryTrend;

  };

};



function TrendBadge({

  trend,

  t,

}: {

  trend: AnalyticsTrendDirection;

  t: ReturnType<typeof useCircleT>;

}) {

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const colorClass =

    trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-300';

  return (

    <span className={cn('inline-flex items-center gap-1', colorClass)}>

      <Icon size={14} />

      <span className="text-[11px] font-bold text-slate-600">

        {analyticsTrendHigherLowerStable(t, trend)}

      </span>

    </span>

  );

}



function CategoryCard({

  label,

  data,

  t,

}: {

  label: string;

  data: VisionCategoryTrend;

  t: ReturnType<typeof useCircleT>;

}) {

  return (

    <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-2">

      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>

      <div className="flex items-center justify-between gap-2">

        <p className="text-xl font-black text-slate-800 tabular-nums">{data.current}</p>

        <TrendBadge trend={data.trend} t={t} />

      </div>

    </div>

  );

}



function findingStatusClass(status: VisionFindingItem['status']): string {

  if (status === 'issue') return 'bg-red-50 text-red-700';

  if (status === 'normal') return 'bg-emerald-50 text-emerald-700';

  if (status === 'skipped') return 'bg-slate-100 text-slate-500';

  return 'bg-indigo-50 text-indigo-700';

}



export function CircleVisionAnalyticsDetail({

  count = 0,

  average = 0,

  trend = 'stable',

  timeline,

  latestFindings,

  categoryTrends,

}: CircleVisionAnalyticsDetailProps) {

  const t = useCircleT();

  const overallSeverityLabel = t('analytics.vision.overallSeverity');

  const fieldIssuesLabel = t('analytics.vision.fieldIssues');

  const focusIssuesLabel = t('analytics.vision.focusIssues');

  const motorIssuesLabel = t('analytics.vision.motorIssues');

  const legend = [

    { color: '#6366f1', label: overallSeverityLabel },

    { color: '#ef4444', label: fieldIssuesLabel },

    { color: '#f59e0b', label: focusIssuesLabel },

    { color: '#8b5cf6', label: motorIssuesLabel },

  ] as const;

  const chartData = prepareSparseTimelineChartData(

    Array.isArray(timeline) ? timeline : undefined,

  );

  const hasChart = chartData.length > 0;

  const chartMargin = circleAnalyticsChartMargin({ top: 8, right: 8, left: 8 });

  const findings = Array.isArray(latestFindings) ? latestFindings : [];



  return (

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      <div className="px-3 py-2 border-b border-slate-100 bg-indigo-50/50">

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">

          {analyticsWindowDaysLabel(t, 30)}

        </p>

      </div>

      <div className="p-4 space-y-4">

        <div className="grid grid-cols-3 gap-3">

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.entries30Days')}

            </p>

            <p className="text-2xl font-black text-indigo-600 tabular-nums leading-none">{count}</p>

          </div>

          <div className="space-y-0.5">

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">

              {t('analytics.vision.avgSeverity')}

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



        {categoryTrends && (

          <div className="grid grid-cols-3 gap-2">

            <CategoryCard label={t('analytics.vision.focus')} data={categoryTrends.focus} t={t} />

            <CategoryCard label={t('analytics.vision.field')} data={categoryTrends.field} t={t} />

            <CategoryCard label={t('analytics.vision.motor')} data={categoryTrends.motor} t={t} />

          </div>

        )}



        {hasChart ? (

          <div className="w-full min-w-0 overflow-visible">

            <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>

              <AreaChart data={chartData} margin={chartMargin}>

                <defs>

                  <linearGradient id="visionSeverity" x1="0" y1="0" x2="0" y2="1">

                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />

                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />

                  </linearGradient>

                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                <CircleAnalyticsChartXAxis variant="sparse" />

                <YAxis

                  domain={[0, 10]}

                  axisLine={false}

                  tickLine={false}

                  tick={{ fontSize: 9, fill: '#94a3b8' }}

                  width={24}

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

                <Area

                  dataKey="severity"

                  name={overallSeverityLabel}

                  stroke="#6366f1"

                  strokeWidth={3}

                  fill="url(#visionSeverity)"

                  {...circleAnalyticsSparseLineProps}

                />

                <Line

                  dataKey="fieldIssues"

                  name={fieldIssuesLabel}

                  stroke="#ef4444"

                  strokeWidth={2}

                  {...circleAnalyticsSparseLineProps}

                />

                <Line

                  dataKey="focusIssues"

                  name={focusIssuesLabel}

                  stroke="#f59e0b"

                  strokeWidth={2}

                  {...circleAnalyticsSparseLineProps}

                />

                <Line

                  dataKey="motorIssues"

                  name={motorIssuesLabel}

                  stroke="#8b5cf6"

                  strokeWidth={2}

                  {...circleAnalyticsSparseLineProps}

                />

              </AreaChart>

            </ResponsiveContainer>

            <CircleAnalyticsChartFooter

              legend={[...legend]}

              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin, 24)}

              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}

              sparsePointCount={chartData.length}

            />

          </div>

        ) : (

          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">

            {t('analytics.chartNotSynced')}

          </p>

        )}



        {findings.length > 0 && (

          <div className="pt-3 border-t border-slate-50 space-y-2">

            <p className="text-[10px] font-bold text-slate-400 uppercase">

              {t('analytics.vision.latestFindings')}

            </p>

            <div className="space-y-1.5">

              {findings.map((finding) => (

                <div

                  key={finding.label}

                  className="flex items-center justify-between gap-2 min-w-0"

                >

                  <span className="text-[11px] font-semibold text-slate-600 truncate">

                    {finding.label}

                  </span>

                  <span

                    className={cn(

                      'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg max-w-[55%] truncate',

                      findingStatusClass(finding.status),

                    )}

                  >

                    {finding.value}

                  </span>

                </div>

              ))}

            </div>

          </div>

        )}

      </div>

    </div>

  );

}

