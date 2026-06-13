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
import { BarChart3, ChartLine, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  DailyCheckInAnswerTrendPoint,
  DailyCheckInTimelinePoint,
} from '@medxforce/shared';
import {
  CIRCLE_ANALYTICS_CHART_HEIGHT,
  circleAnalyticsChartMargin,
  circleAnalyticsPlotInsetLeft,
  circleAnalyticsPlotInsetRight,
  circleAnalyticsSparseLineProps,
  circleAnalyticsTooltipLabelFormatter,
  prepareDailyCheckInParticipationChartData,
  prepareSparseTimelineChartData,
} from '../lib/circleAnalyticsChart';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsWindowDaysLabel } from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import { CircleAnalyticsChartDayMarkers } from './CircleAnalyticsChartDayMarkers';
import { CircleAnalyticsChartXAxis } from './CircleAnalyticsChartXAxis';

type CircleDailyCheckInAnalyticsDetailProps = {
  completed?: number;
  skipped?: number;
  total?: number;
  skipRate?: number;
  trend?: AnalyticsTrendDirection;
  answerTrend?: DailyCheckInAnswerTrendPoint[];
  timeline?: DailyCheckInTimelinePoint[];
};

type DailyCheckInChartView = 'answers' | 'participation';

const STAT_CARD_KEYS = [
  { key: 'completed' as const, labelKey: 'analytics.dailyCheckIn.completed', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'skipped' as const, labelKey: 'analytics.dailyCheckIn.skipped', color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'total' as const, labelKey: 'analytics.dailyCheckIn.total', color: 'text-slate-800', bg: 'bg-slate-50' },
  { key: 'skipRate' as const, labelKey: 'analytics.dailyCheckIn.skipRate', color: 'text-amber-600', bg: 'bg-amber-50' },
];

const ANSWER_TREND_KEYS = [
  { key: 'pain' as const, labelKey: 'analytics.dailyCheckIn.pain', color: '#3b82f6' },
  { key: 'mood' as const, labelKey: 'analytics.dailyCheckIn.mood', color: '#10b981' },
  { key: 'sleep' as const, labelKey: 'analytics.dailyCheckIn.sleep', color: '#8b5cf6' },
  { key: 'vitality' as const, labelKey: 'analytics.dailyCheckIn.vitality', color: '#f59e0b', dashed: true },
] as const;

const PARTICIPATION_COLORS = {
  finished: '#10b981',
  skipped: '#f59e0b',
  notTaken: '#cbd5e1',
} as const;

function engagementTrendCopy(
  trend: AnalyticsTrendDirection,
  t: ReturnType<typeof useCircleT>,
): { label: string; hint: string; colorClass: string } {
  if (trend === 'up') {
    return {
      label: t('analytics.trendMoreCheckIns'),
      hint: t('analytics.dailyCheckIn.moreCheckInsHint'),
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: t('analytics.trendFewerCheckIns'),
      hint: t('analytics.dailyCheckIn.fewerCheckInsHint'),
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: t('analytics.trendAboutTheSame'),
    hint: t('analytics.dailyCheckIn.aboutSameCheckInsHint'),
    colorClass: 'text-slate-600 bg-slate-100',
  };
}

function EngagementTrendRow({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const copy = engagementTrendCopy(trend, t);
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{t('analytics.trend')}</p>
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

function AnswerTrendLegend({
  chartData,
  t,
}: {
  chartData: DailyCheckInAnswerTrendPoint[];
  t: ReturnType<typeof useCircleT>;
}) {
  const items = ANSWER_TREND_KEYS.filter((item) => chartData.some((point) => point[item.key] != null));
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
          {t(item.labelKey)}
        </span>
      ))}
    </div>
  );
}

function ParticipationLegend({ t }: { t: ReturnType<typeof useCircleT> }) {
  const items = [
    { key: 'finished' as const, labelKey: 'analytics.dailyCheckIn.finished', color: PARTICIPATION_COLORS.finished },
    { key: 'skipped' as const, labelKey: 'analytics.dailyCheckIn.skipped', color: PARTICIPATION_COLORS.skipped },
    { key: 'notTaken' as const, labelKey: 'analytics.dailyCheckIn.notTaken', color: PARTICIPATION_COLORS.notTaken },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: item.color }}
          />
          {t(item.labelKey)}
        </span>
      ))}
    </div>
  );
}

function formatTooltipValue(
  key: string,
  value: number | undefined,
  t: ReturnType<typeof useCircleT>,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (key === 'mood') {
    if (value === 3) return t('analytics.dailyCheckIn.moodGood');
    if (value === 2) return t('analytics.dailyCheckIn.moodOk');
    if (value === 1) return t('analytics.dailyCheckIn.moodBad');
    return String(value);
  }
  if (key === 'sleep') {
    if (value === 3) return t('analytics.dailyCheckIn.sleepWell');
    if (value === 2) return t('analytics.dailyCheckIn.sleepOk');
    if (value === 1) return t('analytics.dailyCheckIn.sleepPoorly');
    return String(value);
  }
  if (key === 'vitality') {
    if (value === 3) return t('analytics.dailyCheckIn.vitalityYes');
    if (value === 1) return t('analytics.dailyCheckIn.vitalityNo');
    return String(value);
  }
  if (key === 'pain') return String(value);
  return String(value);
}

function moodLabel(value: number, t: ReturnType<typeof useCircleT>): string {
  if (value === 3) return t('analytics.dailyCheckIn.moodGood');
  if (value === 2) return t('analytics.dailyCheckIn.moodOk');
  if (value === 1) return t('analytics.dailyCheckIn.moodBad');
  return String(value);
}

function sleepLabel(value: number, t: ReturnType<typeof useCircleT>): string {
  if (value === 3) return t('analytics.dailyCheckIn.sleepWell');
  if (value === 2) return t('analytics.dailyCheckIn.sleepOk');
  if (value === 1) return t('analytics.dailyCheckIn.sleepPoorly');
  return String(value);
}

function vitalityLabel(value: number, t: ReturnType<typeof useCircleT>): string {
  if (value === 3) return t('analytics.dailyCheckIn.vitalityYes');
  if (value === 1) return t('analytics.dailyCheckIn.vitalityNo');
  return String(value);
}

function LatestAnswers({
  point,
  t,
}: {
  point: DailyCheckInAnswerTrendPoint;
  t: ReturnType<typeof useCircleT>;
}) {
  const chips: { label: string; value: string; color: string }[] = [];
  if (point.mood != null) {
    chips.push({
      label: t('analytics.dailyCheckIn.mood'),
      value: moodLabel(point.mood, t),
      color: 'text-emerald-700 bg-emerald-50',
    });
  }
  if (point.pain != null) {
    chips.push({
      label: t('analytics.dailyCheckIn.pain'),
      value: String(point.pain),
      color: 'text-blue-700 bg-blue-50',
    });
  }
  if (point.sleep != null) {
    chips.push({
      label: t('analytics.dailyCheckIn.sleep'),
      value: sleepLabel(point.sleep, t),
      color: 'text-violet-700 bg-violet-50',
    });
  }
  if (point.vitality != null) {
    chips.push({
      label: t('analytics.dailyCheckIn.vitality'),
      value: vitalityLabel(point.vitality, t),
      color: 'text-amber-700 bg-amber-50',
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase">{point.label}</p>
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

function participationTooltipFormatter(
  value: number | undefined,
  name: string | undefined,
  t: ReturnType<typeof useCircleT>,
): string | null {
  if (value !== 1) return null;
  if (name === 'finished') return t('analytics.dailyCheckIn.finished');
  if (name === 'skipped') return t('analytics.dailyCheckIn.skipped');
  if (name === 'notTaken') return t('analytics.dailyCheckIn.notTaken');
  return null;
}

export function CircleDailyCheckInAnalyticsDetail({
  completed = 0,
  skipped = 0,
  total = 0,
  skipRate = 0,
  trend = 'stable',
  answerTrend,
  timeline,
}: CircleDailyCheckInAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartView, setChartView] = useState<DailyCheckInChartView>('answers');

  const painLabel = t('analytics.dailyCheckIn.pain');
  const moodLabelText = t('analytics.dailyCheckIn.mood');
  const sleepLabelText = t('analytics.dailyCheckIn.sleep');
  const vitalityLabelText = t('analytics.dailyCheckIn.vitality');

  const values = {
    completed,
    skipped,
    total,
    skipRate: `${skipRate}%`,
  };

  const answerChartData = prepareSparseTimelineChartData(
    Array.isArray(answerTrend) ? answerTrend : undefined,
  );
  const participationChartData = useMemo(
    () => prepareDailyCheckInParticipationChartData(Array.isArray(timeline) ? timeline : undefined),
    [timeline],
  );

  const hasAnswerChart = answerChartData.length > 0;
  const hasParticipationChart = participationChartData.length > 0;
  const latestPoint = hasAnswerChart ? answerChartData[0] : undefined;
  const chartMargin = circleAnalyticsChartMargin({ right: 8 });

  const participationSummary = useMemo(() => {
    const source = Array.isArray(timeline) ? timeline : [];
    const finished = source.reduce((sum, point) => sum + (point.completed > 0 ? 1 : 0), 0);
    const skippedDays = source.reduce((sum, point) => sum + (point.skipped > 0 ? 1 : 0), 0);
    const notTaken = source.reduce(
      (sum, point) => sum + (point.completed === 0 && point.skipped === 0 ? 1 : 0),
      0,
    );
    return { finished, skipped: skippedDays, notTaken };
  }, [timeline]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-emerald-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {analyticsWindowDaysLabel(t, 30)}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {STAT_CARD_KEYS.map((card) => (
            <div
              key={card.key}
              className={cn('rounded-2xl border border-slate-100 p-3 space-y-1', card.bg)}
            >
              <p className="text-[9px] font-bold text-slate-400 uppercase">{t(card.labelKey)}</p>
              <p className={cn('text-2xl font-black leading-none tabular-nums', card.color)}>
                {values[card.key]}
              </p>
            </div>
          ))}
        </div>

        <EngagementTrendRow trend={trend} t={t} />

        {chartView === 'answers' && latestPoint ? <LatestAnswers point={latestPoint} t={t} /> : null}

        {chartView === 'participation' && hasParticipationChart ? (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: 'finished', value: participationSummary.finished, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { key: 'skipped', value: participationSummary.skipped, color: 'text-amber-600', bg: 'bg-amber-50' },
                { key: 'notTaken', value: participationSummary.notTaken, color: 'text-slate-500', bg: 'bg-slate-50' },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className={cn('rounded-xl border border-slate-100 p-2.5 space-y-0.5', item.bg)}
              >
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight">
                  {t(`analytics.dailyCheckIn.${item.key}`)}
                </p>
                <p className={cn('text-lg font-black tabular-nums leading-none', item.color)}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="pt-3 border-t border-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              {chartView === 'answers'
                ? t('analytics.dailyCheckIn.answerTrends')
                : t('analytics.dailyCheckIn.participation')}
            </p>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setChartView('answers')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  chartView === 'answers'
                    ? 'text-emerald-600 bg-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600',
                )}
                aria-label={t('analytics.dailyCheckIn.answerTrends')}
                aria-pressed={chartView === 'answers'}
              >
                <ChartLine size={14} />
              </button>
              <button
                type="button"
                onClick={() => setChartView('participation')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  chartView === 'participation'
                    ? 'text-emerald-600 bg-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-600',
                )}
                aria-label={t('analytics.dailyCheckIn.participation')}
                aria-pressed={chartView === 'participation'}
              >
                <BarChart3 size={14} />
              </button>
            </div>
          </div>
        </div>

        {chartView === 'answers' ? (
          hasAnswerChart ? (
            <div className="w-full min-w-0 overflow-visible">
              <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>
                <LineChart data={answerChartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <CircleAnalyticsChartXAxis variant="sparse" />
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
                    labelFormatter={circleAnalyticsTooltipLabelFormatter}
                    formatter={(value, name) => {
                      const key = String(name).toLowerCase();
                      const formatted = formatTooltipValue(
                        key,
                        typeof value === 'number' ? value : undefined,
                        t,
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
                  {answerChartData.some((p) => p.pain != null) && (
                    <Line
                      yAxisId="pain"
                      dataKey="pain"
                      name={painLabel}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      {...circleAnalyticsSparseLineProps}
                    />
                  )}
                  {answerChartData.some((p) => p.mood != null) && (
                    <Line
                      yAxisId="ordinal"
                      dataKey="mood"
                      name={moodLabelText}
                      stroke="#10b981"
                      strokeWidth={2}
                      {...circleAnalyticsSparseLineProps}
                    />
                  )}
                  {answerChartData.some((p) => p.sleep != null) && (
                    <Line
                      yAxisId="ordinal"
                      dataKey="sleep"
                      name={sleepLabelText}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      {...circleAnalyticsSparseLineProps}
                    />
                  )}
                  {answerChartData.some((p) => p.vitality != null) && (
                    <Line
                      yAxisId="ordinal"
                      dataKey="vitality"
                      name={vitalityLabelText}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      {...circleAnalyticsSparseLineProps}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <CircleAnalyticsChartDayMarkers
                plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin)}
                plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin, 28)}
              />
              <AnswerTrendLegend chartData={answerChartData} t={t} />
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
              {completed > 0
                ? t('analytics.dailyCheckIn.answerTrendsNotSynced')
                : t('analytics.dailyCheckIn.noCheckInsInWindow')}
            </p>
          )
        ) : hasParticipationChart ? (
          <div className="w-full min-w-0 overflow-visible">
            <ResponsiveContainer width="100%" height={CIRCLE_ANALYTICS_CHART_HEIGHT} debounce={50}>
              <BarChart data={participationChartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <CircleAnalyticsChartXAxis variant="daily" />
                <YAxis hide domain={[0, 1]} />
                <Tooltip
                  labelFormatter={circleAnalyticsTooltipLabelFormatter}
                  formatter={(value, name) =>
                    participationTooltipFormatter(
                      typeof value === 'number' ? value : undefined,
                      typeof name === 'string' ? name : undefined,
                      t,
                    )
                  }
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                    fontSize: '11px',
                  }}
                />
                <Bar
                  dataKey="finished"
                  name="finished"
                  stackId="participation"
                  fill={PARTICIPATION_COLORS.finished}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="skipped"
                  name="skipped"
                  stackId="participation"
                  fill={PARTICIPATION_COLORS.skipped}
                />
                <Bar
                  dataKey="notTaken"
                  name="notTaken"
                  stackId="participation"
                  fill={PARTICIPATION_COLORS.notTaken}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <CircleAnalyticsChartDayMarkers
              plotInsetLeft={circleAnalyticsPlotInsetLeft(chartMargin)}
              plotInsetRight={circleAnalyticsPlotInsetRight(chartMargin)}
            />
            <ParticipationLegend t={t} />
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 text-center leading-relaxed py-2">
            {t('analytics.dailyCheckIn.participationNotSynced')}
          </p>
        )}
      </div>
    </div>
  );
}
