import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, ChartLine, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  MessagesMessagingBreakdown,
  MessagesTimelinePoint,
  TopCountItem,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleMessagesAnalyticsDetailProps = {
  communication: number;
  messaging: number;
  trend?: AnalyticsTrendDirection;
  topItems?: TopCountItem[];
  messagingBreakdown?: MessagesMessagingBreakdown;
  timeline?: MessagesTimelinePoint[];
};

const BREAKDOWN_ROWS: { key: keyof MessagesMessagingBreakdown; label: string }[] = [
  { key: 'sent', label: 'Sent messages' },
  { key: 'replies', label: 'Replies' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'updates', label: 'Updates' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'notes', label: 'Notes' },
  { key: 'deletions', label: 'Deletions' },
];

function trendLabel(trend: AnalyticsTrendDirection): string {
  if (trend === 'up') return 'Higher';
  if (trend === 'down') return 'Lower';
  return 'Stable';
}

function TrendSummary({ trend }: { trend: AnalyticsTrendDirection }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up' ? 'text-blue-600 bg-blue-50' : trend === 'down' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase', colorClass)}>
      <Icon size={12} />
      {trendLabel(trend)}
    </span>
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

function safeBreakdownValue(
  breakdown: MessagesMessagingBreakdown | undefined,
  key: keyof MessagesMessagingBreakdown,
): number {
  const value = breakdown?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function CircleMessagesAnalyticsDetail({
  communication = 0,
  messaging = 0,
  trend = 'stable',
  topItems,
  messagingBreakdown,
  timeline,
}: CircleMessagesAnalyticsDetailProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const chartData = Array.isArray(timeline)
    ? timeline.map((point) => ({
        date: point.date,
        communication:
          typeof point.communication === 'number' && Number.isFinite(point.communication)
            ? point.communication
            : 0,
        messaging:
          typeof point.messaging === 'number' && Number.isFinite(point.messaging) ? point.messaging : 0,
      }))
    : [];
  const hasCharts = chartData.length > 0;
  const breakdownRows = messagingBreakdown
    ? BREAKDOWN_ROWS.filter((row) => safeBreakdownValue(messagingBreakdown, row.key) > 0)
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-blue-50/60">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight">Communication</p>
            <p className="text-2xl font-black text-blue-600 leading-none tabular-nums">{communication}</p>
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight">Messaging</p>
            <p className="text-2xl font-black text-emerald-600 leading-none tabular-nums">{messaging}</p>
          </div>
        </div>

        {breakdownRows.length > 0 && (
          <div className="pt-2 border-t border-emerald-50 grid grid-cols-1 gap-1">
            {breakdownRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                  {row.label}
                </span>
                <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-1 rounded-sm min-w-[14px] text-center">
                  {safeBreakdownValue(messagingBreakdown, row.key)}
                </span>
              </div>
            ))}
          </div>
        )}

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
                  chartType === 'line' ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600',
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
                  chartType === 'bar' ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600',
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
          <div className="h-44 w-full min-w-0" style={{ minHeight: 176 }}>
            <ResponsiveContainer width="100%" height={176} debounce={50}>
              {chartType === 'line' ? (
                <LineChart key="messages-line" data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="communication"
                    name="Communication"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="messaging"
                    name="Messaging"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}
                  />
                </LineChart>
              ) : (
                <BarChart key="messages-bar" data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="communication" name="Communication" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="messaging" name="Messaging" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
            Chart data not synced yet. On the patient app, open Analytics and tap Sync to Circle.
          </p>
        )}

        <div className="space-y-2 pt-2 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Top items</p>
          <TopTopicsList items={topItems} />
        </div>
      </div>
    </div>
  );
}
