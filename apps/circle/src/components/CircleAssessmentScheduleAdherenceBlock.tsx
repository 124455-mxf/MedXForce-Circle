import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarX } from 'lucide-react';
import type { AnalyticsMetricId, RemoteAssessmentSchedule } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import {
  buildAssessmentScheduleAdherence,
  completionTimestampsFromAnalyticsTimeline,
  type AnalyticsAdherenceTimelinePoint,
} from '../lib/circleAssessmentAdherence';
import { coarsenAdherenceTimeline, type AnalyticsDetailChartGrain } from '../lib/circleAnalyticsDetailRange';
import { analyticsMetricIdToAssessmentScheduleId } from '../lib/circleAssessmentScheduleMetrics';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CircleAssessmentScheduleAdherenceBlockProps = {
  metricId: AnalyticsMetricId | string;
  remoteSchedule?: RemoteAssessmentSchedule;
  scheduleEnabled?: boolean;
  timeline?: AnalyticsAdherenceTimelinePoint[];
  latestAt?: number | null;
  windowDays?: number;
  grain?: AnalyticsDetailChartGrain;
  windowLabel?: string;
};

const TAKEN_MISSED_DOMAIN: [number, number] = [0, 1];
const TAKEN_MISSED_TICKS = [0, 1];

export function CircleAssessmentScheduleAdherenceBlock({
  metricId,
  remoteSchedule,
  scheduleEnabled = true,
  timeline,
  latestAt,
  windowDays,
  grain = 'day',
  windowLabel,
}: CircleAssessmentScheduleAdherenceBlockProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');

  const rule = useMemo(() => {
    if (!scheduleEnabled) return null;
    const scheduleId = analyticsMetricIdToAssessmentScheduleId(metricId);
    if (!scheduleId) return null;
    const next = remoteSchedule?.rules?.[scheduleId];
    return next?.enabled ? next : null;
  }, [metricId, remoteSchedule, scheduleEnabled]);

  const adherence = useMemo(() => {
    if (!rule) return null;
    return buildAssessmentScheduleAdherence({
      recurrence: rule.recurrence,
      completions: completionTimestampsFromAnalyticsTimeline(timeline, latestAt),
      windowDays,
    });
  }, [latestAt, rule, timeline, windowDays]);

  if (!rule || !adherence) return null;

  const takenChart = coarsenAdherenceTimeline(adherence.takenTimeline, grain);
  const missedChart = coarsenAdherenceTimeline(adherence.missedTimeline, grain);
  const maxChartValue = Math.max(
    1,
    ...takenChart.map((point) => point.value),
    ...missedChart.map((point) => point.value),
  );
  const yDomain: [number, number] = grain === 'day' ? TAKEN_MISSED_DOMAIN : [0, maxChartValue];
  const yTicks = grain === 'day' ? TAKEN_MISSED_TICKS : undefined;
  const windowHint = windowLabel ?? t('analytics.windowDays', { days: windowDays ?? 30 });

  const graceHint =
    adherence.graceDays > 0
      ? t('analytics.scheduleAdherence.graceDays', { days: adherence.graceDays })
      : t('analytics.scheduleAdherence.graceNone');
  const dueHint =
    adherence.dueToday > 0 ? ` ${t('analytics.scheduleAdherence.dueToday')}` : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-emerald-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {t('analytics.scheduleAdherence.title')}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-[12px] text-slate-500 leading-snug">
          {graceHint}
          {dueHint}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</span>
          <CircleAnalyticsChartTypeToggle
            chartType={chartType}
            onChange={setChartType}
            lineAriaLabel={t('analytics.lineChart')}
            barAriaLabel={t('analytics.barChart')}
          />
        </div>

        <CircleAnalyticsSeriesCard
          icon={CalendarCheck}
          title={t('analytics.scheduleAdherence.taken')}
          value={adherence.taken}
          hint={t('analytics.scheduleAdherence.takenHint', {
            taken: adherence.taken,
            scheduled: adherence.scheduled,
            window: windowHint,
          })}
          color="#059669"
          iconWrapClass="text-emerald-600"
          cardClass="border-emerald-200 bg-emerald-50/50"
          titleClass="text-emerald-700"
          valueClass="text-emerald-700"
          chartType={chartType}
          chartData={takenChart}
          yDomain={yDomain}
          yTicks={yTicks}
        />

        <CircleAnalyticsSeriesCard
          icon={CalendarX}
          title={t('analytics.scheduleAdherence.missed')}
          value={adherence.missed}
          hint={t('analytics.scheduleAdherence.missedHint', {
            missed: adherence.missed,
            scheduled: adherence.scheduled,
          })}
          color="#e11d48"
          iconWrapClass="text-rose-600"
          cardClass="border-rose-200 bg-rose-50/50"
          titleClass="text-rose-700"
          valueClass="text-rose-700"
          chartType={chartType}
          chartData={missedChart}
          yDomain={yDomain}
          yTicks={yTicks}
        />
      </div>
    </div>
  );
}
