import { useState } from 'react';
import { Eye, Gauge, Move, ScanSearch, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  AnalyticsTrendDirection,
  VisionCategoryTrend,
  VisionFindingItem,
  VisionTimelinePoint,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsTrendHigherLowerStable, analyticsWindowDaysLabel } from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

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

const SCORE_DOMAIN: [number, number] = [0, 10];
const SCORE_TICKS = [0, 5, 10];

function TrendSummary({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up' ? 'text-red-600 bg-red-50' : trend === 'down' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase', colorClass)}>
      <Icon size={12} />
      {analyticsTrendHigherLowerStable(t, trend)}
    </span>
  );
}

function findingStatusClass(status: VisionFindingItem['status']): string {
  if (status === 'issue') return 'bg-red-50 text-red-700';
  if (status === 'normal') return 'bg-emerald-50 text-emerald-700';
  if (status === 'skipped') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-50 text-slate-600';
}

export function CircleVisionAnalyticsDetail({
  count = 0,
  average = 0,
  trend = 'stable',
  timeline,
  latestFindings,
  categoryTrends,
}: CircleVisionAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const findings = Array.isArray(latestFindings) ? latestFindings : [];
  const severityLabel = t('analytics.vision.overallSeverity');
  const focusLabel = t('analytics.vision.focus');
  const fieldLabel = t('analytics.vision.field');
  const motorLabel = t('analytics.vision.motor');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-indigo-50/50">
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
          <CircleAnalyticsChartTypeToggle
            chartType={chartType}
            onChange={setChartType}
            lineAriaLabel={t('analytics.lineChart')}
            barAriaLabel={t('analytics.barChart')}
          />
        </div>

        <CircleAnalyticsSeriesCard
          icon={Gauge}
          title={severityLabel}
          value={average}
          hint={t('analytics.vision.severityHint')}
          color="#6366f1"
          iconWrapClass="text-indigo-600"
          cardClass="border-indigo-200 bg-indigo-50/50"
          titleClass="text-indigo-700"
          valueClass="text-indigo-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'severity')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={ScanSearch}
          title={focusLabel}
          value={categoryTrends?.focus.current ?? count}
          hint={t('analytics.vision.focusHint')}
          color="#f59e0b"
          iconWrapClass="text-amber-600"
          cardClass="border-amber-200 bg-amber-50/50"
          titleClass="text-amber-700"
          valueClass="text-amber-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'focusIssues')}
          variant="sparse"
        />
        <CircleAnalyticsSeriesCard
          icon={Eye}
          title={fieldLabel}
          value={categoryTrends?.field.current ?? 0}
          hint={t('analytics.vision.fieldHint')}
          color="#ef4444"
          iconWrapClass="text-red-600"
          cardClass="border-red-200 bg-red-50/50"
          titleClass="text-red-700"
          valueClass="text-red-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'fieldIssues')}
          variant="sparse"
        />
        <CircleAnalyticsSeriesCard
          icon={Move}
          title={motorLabel}
          value={categoryTrends?.motor.current ?? 0}
          hint={t('analytics.vision.motorHint')}
          color="#8b5cf6"
          iconWrapClass="text-violet-600"
          cardClass="border-violet-200 bg-violet-50/50"
          titleClass="text-violet-700"
          valueClass="text-violet-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'motorIssues')}
          variant="sparse"
        />

        {findings.length > 0 && (
          <div className="pt-1 border-t border-slate-50 space-y-2">
            <p className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.vision.latestFindings')}</p>
            <div className="space-y-1.5">
              {findings.map((finding) => (
                <div key={finding.label} className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[13px] font-semibold text-slate-600 truncate">{finding.label}</span>
                  <span
                    className={cn(
                      'shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-lg max-w-[55%] truncate',
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
      </div>
    </div>
  );
}
