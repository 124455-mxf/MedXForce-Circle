import type { ReactNode } from 'react';
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
import { BarChart3, ChartLine, type LucideIcon } from 'lucide-react';
import {
  circleAnalyticsChartMargin,
  circleAnalyticsSparseLineProps,
  circleAnalyticsTooltipLabelFormatter,
  prepareDailyBucketChartData,
  prepareSparseTimelineChartData,
} from '../lib/circleAnalyticsChart';
import { cn } from '../lib/utils';
import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';

export type CircleAnalyticsChartType = 'line' | 'bar';

export type CircleAnalyticsSeriesPoint = {
  date: string;
  value: number;
  label?: string;
};

const MINI_CHART_HEIGHT = 112;

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
  fontSize: '13px',
} as const;

export function seriesFromKeyedTimeline<T extends { date: string; label?: string }>(
  timeline: T[] | undefined,
  key: keyof T,
): CircleAnalyticsSeriesPoint[] {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  return timeline.map((point) => {
    const raw = point[key];
    return {
      date: point.date,
      label: point.label,
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : 0,
    };
  });
}

export function CircleAnalyticsChartTypeToggle({
  chartType,
  onChange,
  lineAriaLabel,
  barAriaLabel,
}: {
  chartType: CircleAnalyticsChartType;
  onChange: (next: CircleAnalyticsChartType) => void;
  lineAriaLabel: string;
  barAriaLabel: string;
}) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
      <button
        type="button"
        onClick={() => onChange('line')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          chartType === 'line' ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600',
        )}
        aria-label={lineAriaLabel}
        aria-pressed={chartType === 'line'}
      >
        <ChartLine size={14} />
      </button>
      <button
        type="button"
        onClick={() => onChange('bar')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          chartType === 'bar' ? 'text-blue-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600',
        )}
        aria-label={barAriaLabel}
        aria-pressed={chartType === 'bar'}
      >
        <BarChart3 size={14} />
      </button>
    </div>
  );
}

function MiniSeriesChart({
  data,
  color,
  label,
  chartType,
  variant = 'daily',
  yDomain,
  yTicks,
  allowDecimals = false,
}: {
  data: CircleAnalyticsSeriesPoint[];
  color: string;
  label: string;
  chartType: CircleAnalyticsChartType;
  variant?: 'daily' | 'sparse';
  yDomain?: [number, number];
  yTicks?: number[];
  allowDecimals?: boolean;
}) {
  const chartData =
    variant === 'sparse' ? prepareSparseTimelineChartData(data) : prepareDailyBucketChartData(data);
  const chartMargin = circleAnalyticsChartMargin();
  const sparseDomainMax = chartData.reduce(
    (max, point) => Math.max(max, Number(point.daysAgo) || 0),
    28,
  );
  if (chartData.length === 0) return null;

  const yAxis = (
    <YAxis
      domain={yDomain}
      ticks={yTicks}
      axisLine={false}
      tickLine={false}
      tick={{ fontSize: 11, fill: '#94a3b8' }}
      allowDecimals={allowDecimals}
      width={28}
    />
  );
  const tooltip = (
    <Tooltip labelFormatter={circleAnalyticsTooltipLabelFormatter} contentStyle={TOOLTIP_STYLE} />
  );

  return (
    <div className="w-full min-w-0 overflow-visible pt-1">
      <ResponsiveContainer width="100%" height={MINI_CHART_HEIGHT} debounce={50}>
        {chartType === 'line' ? (
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <CircleAnalyticsChartXAxis variant={variant} domainMax={sparseDomainMax} />
            {yAxis}
            {tooltip}
            <Line
              type={variant === 'sparse' ? circleAnalyticsSparseLineProps.type : 'monotone'}
              dataKey="value"
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={variant === 'sparse' ? circleAnalyticsSparseLineProps.dot : false}
              activeDot={variant === 'sparse' ? circleAnalyticsSparseLineProps.activeDot : { r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <CircleAnalyticsChartXAxis variant={variant} domainMax={sparseDomainMax} />
            {yAxis}
            {tooltip}
            <Bar dataKey="value" name={label} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function SeriesCardShell({
  icon: Icon,
  title,
  value,
  hint,
  iconWrapClass,
  cardClass,
  titleClass,
  valueClass,
  children,
}: {
  icon: LucideIcon;
  title: string;
  value: ReactNode;
  hint?: string;
  iconWrapClass: string;
  cardClass: string;
  titleClass: string;
  valueClass: string;
  children?: ReactNode;
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
      {hint ? <p className="text-[12px] text-slate-500 leading-snug">{hint}</p> : null}
      {children}
    </div>
  );
}

export function CircleAnalyticsStatCard({
  icon,
  title,
  value,
  hint,
  iconWrapClass,
  cardClass,
  titleClass,
  valueClass,
}: {
  icon: LucideIcon;
  title: string;
  value: ReactNode;
  hint?: string;
  iconWrapClass: string;
  cardClass: string;
  titleClass: string;
  valueClass: string;
}) {
  return (
    <SeriesCardShell
      icon={icon}
      title={title}
      value={value}
      hint={hint}
      iconWrapClass={iconWrapClass}
      cardClass={cardClass}
      titleClass={titleClass}
      valueClass={valueClass}
    />
  );
}

export function CircleAnalyticsSeriesCard({
  icon,
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
  variant = 'daily',
  yDomain,
  yTicks,
  allowDecimals = false,
}: {
  icon: LucideIcon;
  title: string;
  value: ReactNode;
  hint?: string;
  color: string;
  iconWrapClass: string;
  cardClass: string;
  titleClass: string;
  valueClass: string;
  chartType: CircleAnalyticsChartType;
  chartData: CircleAnalyticsSeriesPoint[];
  variant?: 'daily' | 'sparse';
  yDomain?: [number, number];
  yTicks?: number[];
  allowDecimals?: boolean;
}) {
  return (
    <SeriesCardShell
      icon={icon}
      title={title}
      value={value}
      hint={hint}
      iconWrapClass={iconWrapClass}
      cardClass={cardClass}
      titleClass={titleClass}
      valueClass={valueClass}
    >
      <MiniSeriesChart
        data={chartData}
        color={color}
        label={title}
        chartType={chartType}
        variant={variant}
        yDomain={yDomain}
        yTicks={yTicks}
        allowDecimals={allowDecimals}
      />
    </SeriesCardShell>
  );
}
