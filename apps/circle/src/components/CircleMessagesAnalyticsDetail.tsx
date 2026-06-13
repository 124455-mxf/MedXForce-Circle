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

import { useCircleT } from '../lib/circleI18nContext';

import {

  analyticsTrendHigherLowerStable,

  analyticsWindowDaysLabel,

} from '../lib/circleAnalyticsI18n';

import { cn } from '../lib/utils';

import { CircleAnalyticsChartFooter } from './CircleAnalyticsChartFooter';

import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';



type CircleMessagesAnalyticsDetailProps = {

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



function TrendSummary({

  trend,

  t,

}: {

  trend: AnalyticsTrendDirection;

  t: ReturnType<typeof useCircleT>;

}) {

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const colorClass =

    trend === 'up' ? 'text-blue-600 bg-blue-50' : trend === 'down' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100';

  return (

    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase', colorClass)}>

      <Icon size={12} />

      {analyticsTrendHigherLowerStable(t, trend)}

    </span>

  );

}



function TopTopicsList({

  items,

  t,

}: {

  items: TopCountItem[] | undefined;

  t: ReturnType<typeof useCircleT>;

}) {

  const safeItems = items ?? [];

  if (safeItems.length === 0) {

    return <p className="text-[11px] text-slate-400 italic py-2">{t('analytics.noTopicsInPeriod')}</p>;

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

  const t = useCircleT();

  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const communicationLabel = t('analytics.messages.communication');

  const messagingLabel = t('analytics.messages.messaging');

  const legend = [

    { color: '#6366f1', label: communicationLabel },

    { color: '#10b981', label: messagingLabel },

  ] as const;

  const chartData = prepareDailyBucketChartData(

    Array.isArray(timeline)

      ? timeline.map((point) => ({

          date: point.date,

          communication:

            typeof point.communication === 'number' && Number.isFinite(point.communication)

              ? point.communication

              : 0,

          messaging:

            typeof point.messaging === 'number' && Number.isFinite(point.messaging)

              ? point.messaging

              : 0,

        }))

      : undefined,

  );

  const hasCharts = chartData.length > 0;

  const chartMargin = circleAnalyticsChartMargin();

  const breakdownRows = messagingBreakdown

    ? BREAKDOWN_ROWS.filter((row) => safeBreakdownValue(messagingBreakdown, row.key) > 0)

    : [];



  return (

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      <div className="px-3 py-2 border-b border-slate-100 bg-blue-50/60">

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">

          {analyticsWindowDaysLabel(t, 30)}

        </p>

      </div>

      <div className="p-4 space-y-4">

        <div className="grid grid-cols-2 gap-4">

          <div className="space-y-0.5 min-w-0">

            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight">{communicationLabel}</p>

            <p className="text-2xl font-black text-blue-600 leading-none tabular-nums">{communication}</p>

          </div>

          <div className="space-y-0.5 min-w-0">

            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight">{messagingLabel}</p>

            <p className="text-2xl font-black text-emerald-600 leading-none tabular-nums">{messaging}</p>

          </div>

        </div>



        {breakdownRows.length > 0 && (

          <div className="pt-2 border-t border-emerald-50 grid grid-cols-1 gap-1">

            {breakdownRows.map((row) => (

              <div key={row.key} className="flex items-center justify-between gap-2">

                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">

                  {t(row.labelKey)}

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

            <span className="text-[10px] font-bold text-slate-400 uppercase">{t('analytics.trend')}</span>

            <TrendSummary trend={trend} t={t} />

          </div>

          <div className="flex items-center justify-between gap-2">

            <span className="text-[10px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</span>

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



        {hasCharts ? (

          <div className="w-full min-w-0 overflow-visible">

            <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>

              {chartType === 'line' ? (

                <LineChart key="messages-line" data={chartData} margin={chartMargin}>

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

                    dataKey="communication"

                    name={communicationLabel}

                    stroke="#6366f1"

                    strokeWidth={2}

                    dot={false}

                    activeDot={{ r: 3 }}

                  />

                  <Line

                    type="monotone"

                    dataKey="messaging"

                    name={messagingLabel}

                    stroke="#10b981"

                    strokeWidth={2}

                    dot={false}

                    activeDot={{ r: 3 }}

                  />

                </LineChart>

              ) : (

                <BarChart key="messages-bar" data={chartData} margin={chartMargin}>

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

                  <Bar dataKey="communication" name={communicationLabel} fill="#6366f1" radius={[3, 3, 0, 0]} />

                  <Bar dataKey="messaging" name={messagingLabel} fill="#10b981" radius={[3, 3, 0, 0]} />

                </BarChart>

              )}

            </ResponsiveContainer>

            <CircleAnalyticsChartFooter

              legend={[...legend]}

              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin)}

              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}

            />

          </div>

        ) : (

          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">

            {t('analytics.chartNotSynced')}

          </p>

        )}



        <div className="space-y-2 pt-2 border-t border-slate-50">

          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('analytics.messages.topTopics')}</p>

          <TopTopicsList items={topItems} t={t} />

        </div>

      </div>

    </div>

  );

}

