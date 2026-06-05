import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, DailyCheckInAnswerTrendPoint } from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleDailyCheckInAnalyticsDetailProps = {
  completed?: number;
  skipped?: number;
  total?: number;
  skipRate?: number;
  trend?: AnalyticsTrendDirection;
  answerTrend?: DailyCheckInAnswerTrendPoint[];
};

const STAT_CARDS = [
  { key: 'completed' as const, label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'skipped' as const, label: 'Skipped', color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'total' as const, label: 'Total', color: 'text-slate-800', bg: 'bg-slate-50' },
  { key: 'skipRate' as const, label: 'Skip rate', color: 'text-amber-600', bg: 'bg-amber-50' },
];

const MOOD_LABELS: Record<number, string> = { 3: 'Good', 2: 'OK', 1: 'Bad' };
const SLEEP_LABELS: Record<number, string> = { 3: 'Well', 2: 'OK', 1: 'Poorly' };
const VITALITY_LABELS: Record<number, string> = { 3: 'Yes', 1: 'No' };

function engagementTrendCopy(trend: AnalyticsTrendDirection): {
  label: string;
  hint: string;
  colorClass: string;
} {
  if (trend === 'up') {
    return {
      label: 'More check-ins',
      hint: 'Completed and skipped check-ins are up vs the previous 30 days.',
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: 'Fewer check-ins',
      hint: 'Completed and skipped check-ins are down vs the previous 30 days.',
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: 'About the same',
    hint: 'Check-in frequency is similar to the previous 30 days.',
    colorClass: 'text-slate-600 bg-slate-100',
  };
}

function EngagementTrendRow({ trend }: { trend: AnalyticsTrendDirection }) {
  const copy = engagementTrendCopy(trend);
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
        Engagement vs prior 30 days
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

const ANSWER_TREND_LEGEND = [
  { key: 'pain' as const, label: 'Pain', color: '#3b82f6' },
  { key: 'mood' as const, label: 'Mood', color: '#10b981' },
  { key: 'sleep' as const, label: 'Sleep', color: '#8b5cf6' },
  { key: 'vitality' as const, label: 'Vitality', color: '#f59e0b', dashed: true },
] as const;

function AnswerTrendLegend({ chartData }: { chartData: DailyCheckInAnswerTrendPoint[] }) {
  const items = ANSWER_TREND_LEGEND.filter((item) =>
    chartData.some((point) => point[item.key] != null),
  );

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase"
        >
          {'dashed' in item && item.dashed ? (
            <svg width="12" height="3" aria-hidden className="shrink-0">
              <line
                x1="0"
                y1="1.5"
                x2="12"
                y2="1.5"
                stroke={item.color}
                strokeWidth="2"
                strokeDasharray="3 2"
              />
            </svg>
          ) : (
            <span
              className="inline-block w-2.5 h-0.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function formatTooltipValue(
  key: string,
  value: number | undefined,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (key === 'mood') return MOOD_LABELS[value] ?? String(value);
  if (key === 'sleep') return SLEEP_LABELS[value] ?? String(value);
  if (key === 'vitality') return VITALITY_LABELS[value] ?? String(value);
  if (key === 'pain') return String(value);
  return String(value);
}

function LatestAnswers({ point }: { point: DailyCheckInAnswerTrendPoint }) {
  const chips: { label: string; value: string; color: string }[] = [];
  if (point.mood != null) {
    chips.push({ label: 'Mood', value: MOOD_LABELS[point.mood] ?? String(point.mood), color: 'text-emerald-700 bg-emerald-50' });
  }
  if (point.pain != null) {
    chips.push({ label: 'Pain', value: String(point.pain), color: 'text-blue-700 bg-blue-50' });
  }
  if (point.sleep != null) {
    chips.push({ label: 'Sleep', value: SLEEP_LABELS[point.sleep] ?? String(point.sleep), color: 'text-violet-700 bg-violet-50' });
  }
  if (point.vitality != null) {
    chips.push({
      label: 'Vitality',
      value: VITALITY_LABELS[point.vitality] ?? String(point.vitality),
      color: 'text-amber-700 bg-amber-50',
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase">
        Latest answers · {point.label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold',
              chip.color,
            )}
          >
            <span className="text-slate-400 uppercase">{chip.label}</span>
            {chip.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CircleDailyCheckInAnalyticsDetail({
  completed = 0,
  skipped = 0,
  total = 0,
  skipRate = 0,
  trend = 'stable',
  answerTrend,
}: CircleDailyCheckInAnalyticsDetailProps) {
  const values = {
    completed,
    skipped,
    total,
    skipRate: `${skipRate}%`,
  };
  const chartData = Array.isArray(answerTrend) ? answerTrend : [];
  const hasChart = chartData.length > 0;
  const latestPoint = hasChart ? chartData[chartData.length - 1] : undefined;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-emerald-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {STAT_CARDS.map((card) => (
            <div
              key={card.key}
              className={cn('rounded-2xl border border-slate-100 p-3 space-y-1', card.bg)}
            >
              <p className="text-[9px] font-bold text-slate-400 uppercase">{card.label}</p>
              <p className={cn('text-2xl font-black leading-none tabular-nums', card.color)}>
                {values[card.key]}
              </p>
            </div>
          ))}
        </div>

        <EngagementTrendRow trend={trend} />

        {latestPoint && <LatestAnswers point={latestPoint} />}

        <div className="pt-3 border-t border-slate-50 space-y-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Answer trends</p>
            <p className="text-[9px] text-slate-400 leading-snug mt-0.5">
              Mood, pain, sleep, and vitality interest on completed check-ins.
            </p>
          </div>
        </div>

        {hasChart ? (
          <div className="h-48 w-full min-w-0" style={{ minHeight: 192 }}>
            <ResponsiveContainer width="100%" height={192} debounce={50}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="pain"
                  domain={[0, 10]}
                  ticks={[0, 3, 6, 9, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  width={32}
                />
                <YAxis
                  yAxisId="ordinal"
                  orientation="right"
                  domain={[1, 3]}
                  ticks={[1, 2, 3]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  width={28}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const key = String(name).toLowerCase();
                    const formatted = formatTooltipValue(
                      key,
                      typeof value === 'number' ? value : undefined,
                    );
                    return formatted ?? value;
                  }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                    fontSize: '11px',
                  }}
                />
                {chartData.some((p) => p.pain != null) && (
                  <Line
                    yAxisId="pain"
                    type="monotone"
                    dataKey="pain"
                    name="Pain"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                )}
                {chartData.some((p) => p.mood != null) && (
                  <Line
                    yAxisId="ordinal"
                    type="monotone"
                    dataKey="mood"
                    name="Mood"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                )}
                {chartData.some((p) => p.sleep != null) && (
                  <Line
                    yAxisId="ordinal"
                    type="monotone"
                    dataKey="sleep"
                    name="Sleep"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                )}
                {chartData.some((p) => p.vitality != null) && (
                  <Line
                    yAxisId="ordinal"
                    type="monotone"
                    dataKey="vitality"
                    name="Vitality"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
            {completed > 0
              ? 'Answer trends not synced yet. On the patient app, open Analytics and tap Sync to Circle.'
              : 'No completed check-ins in the last 30 days yet.'}
          </p>
        )}

        {hasChart && (
          <div className="space-y-1">
            <AnswerTrendLegend chartData={chartData} />
            <p className="text-[9px] text-slate-400 leading-snug">
              Pain uses the left scale (0–10).
            </p>
            <p className="text-[9px] text-slate-400 leading-snug">
              Mood, sleep, and vitality use the right scale (1 = low, 3 = high; vitality: 1 = no, 3 =
              yes).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
