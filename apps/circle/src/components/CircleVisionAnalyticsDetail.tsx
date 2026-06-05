import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  VisionCategoryTrend,
  VisionFindingItem,
  VisionTimelinePoint,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

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

function trendLabel(trend: AnalyticsTrendDirection): string {
  if (trend === 'up') return 'Higher';
  if (trend === 'down') return 'Lower';
  return 'Stable';
}

function TrendBadge({ trend }: { trend: AnalyticsTrendDirection }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-300';
  return (
    <span className={cn('inline-flex items-center gap-1', colorClass)}>
      <Icon size={14} />
      <span className="text-[11px] font-bold text-slate-600">{trendLabel(trend)}</span>
    </span>
  );
}

function CategoryCard({
  label,
  data,
}: {
  label: string;
  data: VisionCategoryTrend;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-2">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-black text-slate-800 tabular-nums">{data.current}</p>
        <TrendBadge trend={data.trend} />
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
  const chartData = Array.isArray(timeline) ? timeline : [];
  const hasChart = chartData.length > 0;
  const findings = Array.isArray(latestFindings) ? latestFindings : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-indigo-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Entries (30 days)
            </p>
            <p className="text-2xl font-black text-indigo-600 tabular-nums leading-none">{count}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Avg severity
            </p>
            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">{average}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Trend</p>
            <div className="pt-1">
              <TrendBadge trend={trend} />
            </div>
          </div>
        </div>

        {categoryTrends && (
          <div className="grid grid-cols-3 gap-2">
            <CategoryCard label="Focus" data={categoryTrends.focus} />
            <CategoryCard label="Field" data={categoryTrends.field} />
            <CategoryCard label="Motor" data={categoryTrends.motor} />
          </div>
        )}

        {hasChart ? (
          <div className="h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height={208} debounce={50}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="visionSeverity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}
                />
                <Area
                  type="monotone"
                  dataKey="severity"
                  name="Overall severity"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#visionSeverity)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="fieldIssues"
                  name="Field issues"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="focusIssues"
                  name="Focus issues"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="motorIssues"
                  name="Motor issues"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
            No vision assessments in the last 30 days yet.
          </p>
        )}

        {findings.length > 0 && (
          <div className="pt-3 border-t border-slate-50 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Latest findings</p>
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

        {hasChart && (
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 leading-snug">
              Overall severity uses a 0–10 scale (higher = more issues).
            </p>
            <p className="text-[9px] text-slate-400 leading-snug">
              Field, focus, and motor lines show whether issues were present on each assessment day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
