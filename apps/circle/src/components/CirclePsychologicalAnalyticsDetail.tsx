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
  PsychologicalScoreTrend,
  PsychologicalTimelinePoint,
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
import { cn } from '../lib/utils';
import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';
import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';

const PSYCHOLOGICAL_LEGEND = [
  { color: '#db2777', label: 'Mood' },
  { color: '#dc2626', label: 'Anxiety' },
  { color: '#2563eb', label: 'Sleep' },
  { color: '#d97706', label: 'Stress' },
  { color: '#059669', label: 'Energy' },
] as const;

type CirclePsychologicalAnalyticsDetailProps = {
  count?: number;
  trend?: AnalyticsTrendDirection;
  mood?: PsychologicalScoreTrend;
  anxiety?: PsychologicalScoreTrend;
  sleep?: PsychologicalScoreTrend;
  stress?: PsychologicalScoreTrend;
  energy?: PsychologicalScoreTrend;
  timeline?: PsychologicalTimelinePoint[];
};

function trendLabel(trend: AnalyticsTrendDirection, higherIsBetter = true): string {
  if (trend === 'stable') return 'Stable';
  if (higherIsBetter) return trend === 'up' ? 'Improving' : 'Declining';
  return trend === 'up' ? 'Declining' : 'Improving';
}

function TrendBadge({
  trend,
  higherIsBetter = true,
}: {
  trend: AnalyticsTrendDirection;
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
      <span className="text-[11px] font-bold text-slate-600">{trendLabel(trend, higherIsBetter)}</span>
    </span>
  );
}

function MetricCard({
  label,
  data,
  higherIsBetter = true,
}: {
  label: string;
  data: PsychologicalScoreTrend;
  higherIsBetter?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-2">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-black text-slate-800 tabular-nums">{data.current}/10</p>
        <TrendBadge trend={data.trend} higherIsBetter={higherIsBetter} />
      </div>
      <p className="text-[10px] text-slate-400 font-semibold tabular-nums">
        {data.change > 0 ? `+${data.change}` : data.change} vs period start
      </p>
    </div>
  );
}

export function CirclePsychologicalAnalyticsDetail({
  count = 0,
  trend = 'stable',
  mood,
  anxiety,
  sleep,
  stress,
  energy,
  timeline,
}: CirclePsychologicalAnalyticsDetailProps) {
  const chartData = prepareSparseTimelineChartData(
    Array.isArray(timeline) ? timeline : undefined,
  );
  const hasChart = chartData.length > 0;
  const chartMargin = circleAnalyticsChartMargin({ right: 8, left: -18 });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-pink-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Check-ins (30 days)
            </p>
            <p className="text-2xl font-black text-pink-600 tabular-nums leading-none">{count}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Mood trend</p>
            <div className="pt-1">
              <TrendBadge trend={trend} />
            </div>
          </div>
        </div>

        {mood && anxiety && sleep && stress && energy && (
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Mood" data={mood} />
            <MetricCard label="Anxiety" data={anxiety} higherIsBetter={false} />
            <MetricCard label="Sleep" data={sleep} />
            <MetricCard label="Stress" data={stress} higherIsBetter={false} />
            <MetricCard label="Energy" data={energy} />
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
                <Line dataKey="mood" name="Mood" stroke="#db2777" strokeWidth={2} {...circleAnalyticsSparseLineProps} />
                <Line dataKey="anxiety" name="Anxiety" stroke="#dc2626" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />
                <Line dataKey="sleep" name="Sleep" stroke="#2563eb" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />
                <Line dataKey="stress" name="Stress" stroke="#d97706" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />
                <Line dataKey="energy" name="Energy" stroke="#059669" strokeWidth={1.5} {...circleAnalyticsSparseLineProps} />
              </LineChart>
            </ResponsiveContainer>
            <CircleAnalyticsChartFooter
              legend={[...PSYCHOLOGICAL_LEGEND]}
              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin, 28)}
              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}
              sparsePointCount={chartData.length}
            />
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic text-center py-2">
            Chart data not synced yet. On the patient app, open Analytics and tap Sync to Circle.
          </p>
        )}
      </div>
    </div>
  );
}
