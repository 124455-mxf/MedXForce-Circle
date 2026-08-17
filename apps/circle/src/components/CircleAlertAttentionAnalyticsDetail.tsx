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
import { BarChart3, Bell, ChartLine, Minus, Siren, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { AlertAttentionTimelinePoint, AnalyticsTrendDirection } from '@medxforce/shared';
import {
  circleAnalyticsChartMargin,
  circleAnalyticsTooltipLabelFormatter,
  prepareDailyBucketChartData,
} from '../lib/circleAnalyticsChart';
import { useCircleT } from '../lib/circleI18nContext';
import {
  analyticsTrendHigherLowerStable,
  analyticsWindowDaysLabel,
} from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';

type CircleAlertAttentionAnalyticsDetailProps = {
  alerts?: number;
  attentions?: number;
  trend?: AnalyticsTrendDirection;
  timeline?: AlertAttentionTimelinePoint[];
};

const ALERT_COLOR = '#dc2626';
const ATTENTION_COLOR = '#2563eb';
const MINI_CHART_HEIGHT = 112;

function TrendSummary({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up'
      ? 'text-red-600 bg-red-50'
      : trend === 'down'
        ? 'text-emerald-600 bg-emerald-50'
        : 'text-slate-400 bg-slate-100';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase',
        colorClass,
      )}
    >
      <Icon size={12} />
      {analyticsTrendHigherLowerStable(t, trend)}
    </span>
  );
}

function MiniSeriesChart({
  data,
  color,
  label,
  chartType,
}: {
  data: { date: string; value: number }[];
  color: string;
  label: string;
  chartType: 'line' | 'bar';
}) {
  const chartData = prepareDailyBucketChartData(data);
  const chartMargin = circleAnalyticsChartMargin();
  if (chartData.length === 0) return null;

  return (
    <div className="w-full min-w-0 overflow-visible pt-1">
      <ResponsiveContainer width="100%" height={MINI_CHART_HEIGHT} debounce={50}>
        {chartType === 'line' ? (
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <CircleAnalyticsChartXAxis />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              labelFormatter={circleAnalyticsTooltipLabelFormatter}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                fontSize: '13px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <CircleAnalyticsChartXAxis />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              labelFormatter={circleAnalyticsTooltipLabelFormatter}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                fontSize: '13px',
              }}
            />
            <Bar dataKey="value" name={label} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function AlertAttentionCard({
  icon: Icon,
  title,
  value,
  hint,
  color,
  iconWrapClass,
  cardClass,
  titleClass,
  valueClass,
  chartType,
  chartData,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  hint: string;
  color: string;
  iconWrapClass: string;
  cardClass: string;
  titleClass: string;
  valueClass: string;
  chartType: 'line' | 'bar';
  chartData: { date: string; value: number }[];
}) {
  return (
    <div className={cn('rounded-xl border p-3 space-y-1.5', cardClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0', iconWrapClass)}>
            <Icon size={14} />
          </span>
          <p className={cn('text-[11px] font-bold uppercase tracking-tight', titleClass)}>{title}</p>
        </div>
        <p className={cn('text-xl font-black leading-none tabular-nums', valueClass)}>{value}</p>
      </div>
      <p className="text-[12px] text-slate-500 leading-snug">{hint}</p>
      <MiniSeriesChart data={chartData} color={color} label={title} chartType={chartType} />
    </div>
  );
}

function seriesFromTimeline(
  timeline: AlertAttentionTimelinePoint[] | undefined,
  key: 'alert' | 'attention',
): { date: string; value: number }[] {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  return timeline.map((point) => {
    const raw = point[key];
    return {
      date: point.date,
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : 0,
    };
  });
}

export function CircleAlertAttentionAnalyticsDetail({
  alerts = 0,
  attentions = 0,
  trend = 'stable',
  timeline,
}: CircleAlertAttentionAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const alertLabel = t('analytics.alertAttention.alert');
  const attentionLabel = t('analytics.alertAttention.attention');
  const alertChartData = seriesFromTimeline(timeline, 'alert');
  const attentionChartData = seriesFromTimeline(timeline, 'attention');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-rose-50/60">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {analyticsWindowDaysLabel(t, 30)}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.trend')}</span>
          <TrendSummary trend={trend} t={t} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                chartType === 'line' ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600',
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
                chartType === 'bar' ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600',
              )}
              aria-label={t('analytics.barChart')}
              aria-pressed={chartType === 'bar'}
            >
              <BarChart3 size={14} />
            </button>
          </div>
        </div>

        <AlertAttentionCard
          icon={Siren}
          title={alertLabel}
          value={alerts}
          hint={t('analytics.alertAttention.alertHint')}
          color={ALERT_COLOR}
          iconWrapClass="text-red-600"
          cardClass="border-red-200 bg-red-50/50"
          titleClass="text-red-700"
          valueClass="text-red-700"
          chartType={chartType}
          chartData={alertChartData}
        />
        <AlertAttentionCard
          icon={Bell}
          title={attentionLabel}
          value={attentions}
          hint={t('analytics.alertAttention.attentionHint')}
          color={ATTENTION_COLOR}
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={attentionChartData}
        />
      </div>
    </div>
  );
}
