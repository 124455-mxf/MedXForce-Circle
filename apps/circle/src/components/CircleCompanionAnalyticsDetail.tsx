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
import { BarChart3, ChartLine, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  CompanionTimelinePoint,
  TopCountItem,
} from '@medxforce/shared';
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

const COMPANION_LEGEND = [
  { color: '#3b82f6', label: 'Conversations' },
  { color: '#10b981', label: 'Interactions' },
  { color: '#f43f5e', label: 'Detected' },
] as const;

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
};

function trendLabel(trend: AnalyticsTrendDirection): string {
  if (trend === 'up') return 'Higher';
  if (trend === 'down') return 'Lower';
  return 'Stable';
}

function TrendSummary({ trend }: { trend: AnalyticsTrendDirection }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up'
      ? 'text-blue-600 bg-blue-50'
      : trend === 'down'
        ? 'text-slate-500 bg-slate-100'
        : 'text-slate-400 bg-slate-100';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase',
        colorClass,
      )}
    >
      <Icon size={12} />
      {trendLabel(trend)}
    </span>
  );
}

function MetricCell({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className={cn('text-lg font-black leading-none tabular-nums', valueClass ?? 'text-slate-800')}>
        {value}
      </p>
      {hint && <p className="text-[9px] text-slate-400 leading-snug pt-0.5">{hint}</p>}
    </div>
  );
}

function TopTopicsList({ items }: { items: TopCountItem[] | undefined }) {
  const safeItems = items ?? [];
  if (safeItems.length === 0) {
    return <p className="text-[11px] text-slate-400 italic py-2">No topics in this period</p>;
  }
  return (
    <ul className="space-y-1.5">
      {safeItems.map((item, idx) => (
        <li key={idx} className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-slate-700 truncate flex-1">{item.label}</span>
          <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0">
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
}: CircleCompanionAnalyticsDetailProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const chartData = prepareDailyBucketChartData(
    Array.isArray(timeline)
      ? timeline.map((point) => ({
          date: point.date,
          conversations:
            typeof point.conversations === 'number' && Number.isFinite(point.conversations)
              ? point.conversations
              : 0,
          interactions:
            typeof point.interactions === 'number' && Number.isFinite(point.interactions)
              ? point.interactions
              : 0,
          detected:
            typeof point.detected === 'number' && Number.isFinite(point.detected)
              ? point.detected
              : 0,
        }))
      : undefined,
  );
  const hasCharts = chartData.length > 0;
  const chartMargin = circleAnalyticsChartMargin();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-blue-50/60">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold text-blue-500 uppercase">MedIsOn companion</p>
          <p className="text-3xl font-black text-blue-600 leading-none mt-1 tabular-nums">{total}</p>
          <p className="text-[9px] text-slate-400 mt-1 leading-snug">
            Total companion events in the last 30 days (sessions, exchanges, and related activity).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCell label="Conversations" value={conversations} valueClass="text-blue-600" />
          <MetricCell label="Interactions" value={interactions} valueClass="text-emerald-600" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCell label="New" value={newCount} valueClass="text-blue-500" />
          <MetricCell label="Resume" value={resumed} valueClass="text-indigo-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-50">
          <MetricCell
            label="Detected"
            value={detected}
            valueClass="text-rose-500"
            hint="Times the companion was opened after AI detected physical pain or emotional distress in Communication or Messaging."
          />
          <MetricCell
            label="Avg int."
            value={avgInteractions}
            valueClass="text-emerald-600"
            hint="Average back-and-forth exchanges per companion session (interactions ÷ conversations). Higher usually means deeper engagement."
          />
        </div>

        <div className="pt-3 border-t border-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Trend</span>
            <TrendSummary trend={trend} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Chart</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  chartType === 'line'
                    ? 'text-blue-600 bg-white shadow-sm'
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
                    ? 'text-blue-600 bg-white shadow-sm'
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

        {hasCharts ? (
          <div className="w-full min-w-0 overflow-visible">
            <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>
              {chartType === 'line' ? (
                <LineChart key="companion-line" data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <CircleAnalyticsChartXAxis />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    allowDecimals={false}
                    width={32}
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
                    type="monotone"
                    dataKey="conversations"
                    name="Conversations"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="interactions"
                    name="Interactions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="detected"
                    name="Detected"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </LineChart>
              ) : (
                <BarChart key="companion-bar" data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <CircleAnalyticsChartXAxis />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    allowDecimals={false}
                    width={32}
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
                  <Bar dataKey="conversations" name="Conversations" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="interactions" name="Interactions" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="detected" name="Detected" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
            <CircleAnalyticsChartFooter
              legend={[...COMPANION_LEGEND]}
              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin)}
              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}
            />
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
            Chart data not synced yet. On the patient app, open Analytics and tap Sync to Circle.
          </p>
        )}

        <div className="space-y-2 pt-2 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Top topics</p>
          <TopTopicsList items={topTopics} />
        </div>
      </div>
    </div>
  );
}
