import { useMemo, useState } from 'react';
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
import {
  BarChart3,
  ChartLine,
  Inbox,
  Minus,
  Reply,
  Send,
  TrendingDown,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  MessagesMessagingBreakdown,
  MessagesTimelinePoint,
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
import { buildCircleMessagingLiveStats } from '../lib/circleMessagingLiveAnalytics';
import { useCirclePatientThreadsContext } from '../context/CirclePatientThreadsContext';
import { useCircleT } from '../lib/circleI18nContext';
import {
  analyticsTrendHigherLowerStable,
  analyticsWindowDaysLabel,
} from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';
import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';

export type CircleMessagesAnalyticsFocus = 'messaging' | 'communication';

type CircleMessagesAnalyticsDetailProps = {
  focus?: CircleMessagesAnalyticsFocus;
  communication: number;
  messaging: number;
  trend?: AnalyticsTrendDirection;
  topItems?: TopCountItem[];
  messagingBreakdown?: MessagesMessagingBreakdown;
  timeline?: MessagesTimelinePoint[];
};

const BREAKDOWN_ROWS: { key: keyof MessagesMessagingBreakdown; labelKey: string }[] = [
  { key: 'sent', labelKey: 'analytics.messages.sentMessages' },
  { key: 'replies', labelKey: 'analytics.messages.replies' },
  { key: 'conversations', labelKey: 'analytics.messages.conversations' },
  { key: 'updates', labelKey: 'analytics.messages.updates' },
  { key: 'drafts', labelKey: 'analytics.messages.drafts' },
  { key: 'notes', labelKey: 'analytics.messages.notes' },
  { key: 'deletions', labelKey: 'analytics.messages.deletions' },
];

const NEW_MESSAGE_COLOR = '#2563eb';
const REPLY_COLOR = '#d97706';
const CIRCLE_STARTED_COLOR = '#7c3aed';
const COMMUNICATION_COLOR = '#6366f1';
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
      ? 'text-blue-600 bg-blue-50'
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

function mergeTopItems(items: TopCountItem[] | undefined): TopCountItem[] {
  if (!items?.length) return [];
  const byLabel = new Map<string, number>();
  for (const item of items) {
    const label = item.label.trim();
    if (!label) continue;
    const count = typeof item.count === 'number' && Number.isFinite(item.count) ? item.count : 0;
    byLabel.set(label, (byLabel.get(label) ?? 0) + count);
  }
  return [...byLabel.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function TopTopicsList({
  items,
  t,
}: {
  items: TopCountItem[] | undefined;
  t: ReturnType<typeof useCircleT>;
}) {
  const merged = mergeTopItems(items);
  if (merged.length === 0) {
    return <p className="text-[13px] text-slate-400 italic py-2">{t('analytics.noTopicsInPeriod')}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {merged.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-slate-700 truncate flex-1">{item.label}</span>
          <span className="text-[13px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">
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

function trendFromSeries(
  values: number[],
  fallback: AnalyticsTrendDirection,
): AnalyticsTrendDirection {
  if (values.length < 4) return fallback;
  const mid = Math.ceil(values.length / 2);
  const previous = values.slice(0, mid).reduce((sum, value) => sum + value, 0);
  const recent = values.slice(mid).reduce((sum, value) => sum + value, 0);
  if (recent > previous * 1.15 && recent >= previous + 2) return 'up';
  if (recent < previous * 0.85 && previous >= recent + 2) return 'down';
  return 'stable';
}

function syncedSplitTimeline(
  timeline: MessagesTimelinePoint[] | undefined,
  key: 'sent' | 'replies',
): { date: string; value: number }[] {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  return timeline.map((point) => ({
    date: point.date,
    value: typeof point[key] === 'number' && Number.isFinite(point[key]) ? (point[key] as number) : 0,
  }));
}

function preferNonEmptyTimeline(
  synced: { date: string; value: number }[],
  live: { date: string; value: number }[],
): { date: string; value: number }[] {
  if (synced.some((point) => point.value > 0)) return synced;
  return live;
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

function MessagingMetricCard({
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

export function CircleMessagesAnalyticsDetail({
  focus = 'messaging',
  communication = 0,
  trend = 'stable',
  topItems,
  messagingBreakdown,
  timeline,
}: CircleMessagesAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const isMessaging = focus === 'messaging';
  const { rawMessages, repliesByMessageId } = useCirclePatientThreadsContext();
  const liveStats = useMemo(
    () => buildCircleMessagingLiveStats(rawMessages, repliesByMessageId),
    [rawMessages, repliesByMessageId],
  );

  const communicationLabel = t('analytics.messages.communication');
  const headerClass = isMessaging ? 'bg-blue-50/60' : 'bg-indigo-50/60';
  const extraBreakdownRows = isMessaging
    ? BREAKDOWN_ROWS.filter(
        (row) =>
          row.key !== 'sent' &&
          row.key !== 'replies' &&
          safeBreakdownValue(messagingBreakdown, row.key) > 0,
      )
    : [];

  const syncedSent = safeBreakdownValue(messagingBreakdown, 'sent');
  const syncedReplies = safeBreakdownValue(messagingBreakdown, 'replies');
  const sentCount = syncedSent > 0 ? syncedSent : liveStats.newMessages;
  const replyCount = syncedReplies > 0 ? syncedReplies : liveStats.replies;
  const sentChartData = preferNonEmptyTimeline(
    syncedSplitTimeline(timeline, 'sent'),
    liveStats.newMessagesTimeline,
  );
  const replyChartData = preferNonEmptyTimeline(
    syncedSplitTimeline(timeline, 'replies'),
    liveStats.repliesTimeline,
  );

  const communicationTrend = trendFromSeries(
    Array.isArray(timeline)
      ? timeline.map((point) =>
          typeof point.communication === 'number' && Number.isFinite(point.communication)
            ? point.communication
            : 0,
        )
      : [],
    trend,
  );
  const communicationChartData = prepareDailyBucketChartData(
    Array.isArray(timeline)
      ? timeline.map((point) => ({
          date: point.date,
          value:
            typeof point.communication === 'number' && Number.isFinite(point.communication)
              ? point.communication
              : 0,
        }))
      : undefined,
  );
  const hasCommunicationChart = communicationChartData.length > 0;
  const chartMargin = circleAnalyticsChartMargin();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={cn('px-3 py-2 border-b border-slate-100', headerClass)}>
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {analyticsWindowDaysLabel(t, 30)}
        </p>
      </div>
      <div className="p-4 space-y-4">
        {isMessaging ? (
          <>
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

            <MessagingMetricCard
              icon={Send}
              title={t('analytics.messages.sentMessages')}
              value={sentCount}
              hint={t('analytics.messages.sentHint')}
              color={NEW_MESSAGE_COLOR}
              iconWrapClass="text-blue-600"
              cardClass="border-blue-200 bg-blue-50/50"
              titleClass="text-blue-700"
              valueClass="text-blue-700"
              chartType={chartType}
              chartData={sentChartData}
            />
            <MessagingMetricCard
              icon={Reply}
              title={t('analytics.messages.replies')}
              value={replyCount}
              hint={t('analytics.messages.repliesHint')}
              color={REPLY_COLOR}
              iconWrapClass="text-amber-600"
              cardClass="border-amber-200 bg-amber-50/50"
              titleClass="text-amber-800"
              valueClass="text-amber-700"
              chartType={chartType}
              chartData={replyChartData}
            />

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-white text-rose-600 flex items-center justify-center shrink-0">
                    <Inbox size={14} />
                  </span>
                  <p className="text-[11px] font-bold text-rose-800 uppercase tracking-tight">
                    {t('analytics.messages.unreadToday')}
                  </p>
                </div>
                <p className="text-xl font-black text-rose-700 leading-none tabular-nums">
                  {liveStats.unreadToday}
                </p>
              </div>
              <p className="text-[12px] text-slate-500 leading-snug">
                {t('analytics.messages.unreadTodayHint')}
              </p>
            </div>

            <MessagingMetricCard
              icon={UserPlus}
              title={t('analytics.messages.circleStarted')}
              value={liveStats.circleStarted}
              hint={t('analytics.messages.circleStartedHint')}
              color={CIRCLE_STARTED_COLOR}
              iconWrapClass="text-violet-600"
              cardClass="border-violet-200 bg-violet-50/50"
              titleClass="text-violet-800"
              valueClass="text-violet-700"
              chartType={chartType}
              chartData={liveStats.circleStartedTimeline}
            />

            {extraBreakdownRows.length > 0 && (
              <div className="pt-2 border-t border-slate-50 grid grid-cols-1 gap-1">
                {extraBreakdownRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                      {t(row.labelKey)}
                    </span>
                    <span className="text-[11px] font-black text-slate-500 bg-slate-50 px-1 rounded-sm min-w-[14px] text-center">
                      {safeBreakdownValue(messagingBreakdown, row.key)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-tight text-indigo-500">
                {communicationLabel}
              </p>
              <p className="text-2xl font-black leading-none tabular-nums text-indigo-600">
                {communication}
              </p>
              <p className="text-[12px] text-slate-500 leading-snug">
                {t('analytics.messages.hintCommunication')}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-50 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.trend')}</span>
                <TrendSummary trend={communicationTrend} t={t} />
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
            </div>

            {hasCommunicationChart ? (
              <div className="w-full min-w-0 overflow-visible">
                <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>
                  {chartType === 'line' ? (
                    <LineChart key="communication-line" data={communicationChartData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <CircleAnalyticsChartXAxis />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 13, fill: '#94a3b8' }}
                        allowDecimals={false}
                        width={32}
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
                        name={communicationLabel}
                        stroke={COMMUNICATION_COLOR}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart key="communication-bar" data={communicationChartData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <CircleAnalyticsChartXAxis />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 13, fill: '#94a3b8' }}
                        allowDecimals={false}
                        width={32}
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
                      <Bar
                        dataKey="value"
                        name={communicationLabel}
                        fill={COMMUNICATION_COLOR}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
                <CircleAnalyticsChartFooter
                  legend={[{ color: COMMUNICATION_COLOR, label: communicationLabel }]}
                  plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin)}
                  plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}
                />
              </div>
            ) : (
              <p className="text-[13px] text-slate-400 text-center leading-relaxed py-2">
                {t('analytics.chartNotSynced')}
              </p>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-50">
              <p className="text-[12px] font-bold text-slate-400 uppercase">
                {t('analytics.messages.topTopics')}
              </p>
              <TopTopicsList items={topItems} t={t} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
