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
import { cn } from '../lib/utils';
import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';
import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';

const VITALITY_LEGEND = [
  { color: '#a855f7', label: 'Games' },
  { color: '#3b82f6', label: 'Accuracy %' },
] as const;

type CircleVitalityGameAnalyticsDetailProps = {
  gamesPlayed?: number;
  avgAccuracy?: number;
  totalTimeLabel?: string;
  trend?: AnalyticsTrendDirection;
  level?: string;
  timeline?: VitalityGameTimelinePoint[];
};

function accuracyTrendCopy(trend: AnalyticsTrendDirection): {
  label: string;
  hint: string;
  colorClass: string;
} {
  if (trend === 'up') {
    return {
      label: 'Improving',
      hint: 'Average score is higher than the previous 30 days.',
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: 'Declining',
      hint: 'Average score is lower than the previous 30 days.',
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: 'About the same',
    hint: 'Average score is similar to the previous 30 days.',
    colorClass: 'text-slate-600 bg-slate-100',
  };
}

function AccuracyTrendRow({ trend }: { trend: AnalyticsTrendDirection }) {
  const copy = accuracyTrendCopy(trend);
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
        Accuracy vs prior 30 days
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

function formatDifficulty(level: string): string {
  const normalized = level.trim().toUpperCase();
  if (normalized === 'LOW') return 'Easy';
  if (normalized === 'MEDIUM') return 'Medium';
  if (normalized === 'HIGH') return 'Hard';
  if (normalized === 'N/A') return '—';
  return level;
}

export function CircleVitalityGameAnalyticsDetail({
  gamesPlayed = 0,
  avgAccuracy = 0,
  totalTimeLabel = '0M 0S',
  trend = 'stable',
  level = 'N/A',
  timeline,
}: CircleVitalityGameAnalyticsDetailProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const chartData = prepareDailyBucketChartData(Array.isArray(timeline) ? timeline : undefined);
  const hasChart = chartData.some((point) => point.games > 0);
  const chartMargin = circleAnalyticsChartMargin({ right: 8, left: 0 });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Games played
            </p>
            <p className="text-2xl font-black text-purple-600 tabular-nums leading-none">
              {gamesPlayed}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Avg accuracy
            </p>
            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">
              {avgAccuracy}%
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Difficulty
            </p>
            <p className="text-sm font-black text-slate-800 leading-tight">
              {formatDifficulty(level)}
            </p>
            <p className="text-[9px] text-slate-400 leading-snug">Latest session level</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Total time
            </p>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <p className="text-sm font-black text-slate-800 tabular-nums leading-tight">
                {totalTimeLabel}
              </p>
            </div>
          </div>
        </div>

        <AccuracyTrendRow trend={trend} />

        <div className="pt-3 border-t border-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Activity</p>
              <p className="text-[9px] text-slate-400 leading-snug mt-0.5">
                Games played and average accuracy per day.
              </p>
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
                aria-label="Line chart"
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
                aria-label="Bar chart"
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
                    name="Games"
                    fill="#a855f7"
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    yAxisId="accuracy"
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
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
                    name="Games"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="accuracy"
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
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
              legend={[...VITALITY_LEGEND]}
              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin, 24)}
              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin, 28)}
            />
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
            No mind games in the last 30 days yet.
          </p>
        )}
      </div>
    </div>
  );
}
