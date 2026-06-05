import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  DomainScoreTrend,
  NeurologicalLatestSnapshot,
  NeurologicalTimelinePoint,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

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

function DomainCard({ label, data }: { label: string; data: DomainScoreTrend }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-2">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-black text-slate-800 tabular-nums">{data.current}</p>
        <TrendBadge trend={data.trend} />
      </div>
      <p className="text-[10px] text-slate-400 font-semibold tabular-nums">
        {data.change > 0 ? `+${data.change}` : data.change} vs period start
      </p>
    </div>
  );
}

function resultLabel(value: boolean | null): string {
  if (value === true) return 'Pass';
  if (value === false) return 'Miss';
  return 'Skipped';
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
  const chartData = Array.isArray(timeline) ? timeline : [];
  const hasChart = chartData.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Sessions (30 days)
            </p>
            <p className="text-2xl font-black text-purple-600 tabular-nums leading-none">{count}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Avg cognitive
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

        {overall && executive && language && attention && (
          <div className="grid grid-cols-2 gap-2">
            <DomainCard label="Overall cognitive" data={overall} />
            <DomainCard label="Executive" data={executive} />
            <DomainCard label="Language" data={language} />
            <DomainCard label="Attention" data={attention} />
          </div>
        )}

        {latestSnapshot && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Latest session snapshot
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
                  {resultLabel(latestSnapshot.namingSuccess)}
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
                  {resultLabel(latestSnapshot.comprehensionSuccess)}
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
                  {resultLabel(latestSnapshot.sequenceSuccess)}
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
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="overall" name="Overall" stroke="#7c3aed" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="executive" name="Executive" stroke="#2563eb" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="language" name="Language" stroke="#059669" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="attention" name="Attention" stroke="#d97706" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
