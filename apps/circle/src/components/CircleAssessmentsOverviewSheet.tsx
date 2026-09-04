/** @license SPDX-License-Identifier: Apache-2.0 */
import {
  ChevronRight,
  ClipboardList,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  ANALYTICS_METRIC_DEFINITIONS,
  canReadAnalyticsAudience,
  type AnalyticsMetricId,
  type AnalyticsTrendDirection,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsMetricTitle, analyticsTrendHigherLowerStable } from '../lib/circleAnalyticsI18n';
import {
  ANALYTICS_SHEET_ICON_TILE_CLASS,
  analyticsMetricIcon,
  analyticsMetricIconWrapClass,
} from '../lib/circleAnalyticsMetricUi';
import {
  DASHBOARD_ASSESSMENT_METRIC_IDS,
  assessmentTakenCountLast7,
  assessmentThirtyDayTrend,
} from '../lib/circleDashboardStats';

type CircleAssessmentsOverviewSheetProps = {
  open: boolean;
  patient: CirclePatientSummary;
  byMetricId: Map<string, PatientAnalyticsSummary>;
  onOpenMetric: (metricId: AnalyticsMetricId) => void;
  onClose: () => void;
};

function trendPresentation(
  trend: AnalyticsTrendDirection | null,
  t: ReturnType<typeof useCircleT>,
): { icon: LucideIcon; className: string; label: string } | null {
  if (!trend) return null;
  if (trend === 'up') {
    return {
      icon: TrendingUp,
      className: 'text-blue-700 bg-blue-50',
      label: analyticsTrendHigherLowerStable(t, trend),
    };
  }
  if (trend === 'down') {
    return {
      icon: TrendingDown,
      className: 'text-slate-600 bg-slate-100',
      label: analyticsTrendHigherLowerStable(t, trend),
    };
  }
  return {
    icon: Minus,
    className: 'text-slate-500 bg-slate-100',
    label: analyticsTrendHigherLowerStable(t, trend),
  };
}

export function CircleAssessmentsOverviewSheet({
  open,
  patient,
  byMetricId,
  onOpenMetric,
  onClose,
}: CircleAssessmentsOverviewSheetProps) {
  const t = useCircleT();

  if (!open) return null;

  const rows = DASHBOARD_ASSESSMENT_METRIC_IDS.flatMap((rawId) => {
    const metricId = rawId as AnalyticsMetricId;
    const definition = ANALYTICS_METRIC_DEFINITIONS[metricId];
    if (!definition?.isReleased) return [];
    if (
      !patient.capabilities ||
      !canReadAnalyticsAudience(definition.audience, patient.role, patient.capabilities)
    ) {
      return [];
    }
    const summary = byMetricId.get(metricId);
    const takenLast7 = assessmentTakenCountLast7(summary);
    if (takenLast7 <= 0) return [];
    const trend = assessmentThirtyDayTrend(summary);
    return [
      {
        metricId,
        title: analyticsMetricTitle(t, metricId),
        takenLast7,
        trend,
        tappable: summary?.status !== 'coming_soon',
      },
    ];
  });

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-assessments-overview-title"
        className="bg-[#F8FAFC] w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[88vh] flex flex-col min-h-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 rounded-t-[28px] bg-white">
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-4 sm:pt-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(ANALYTICS_SHEET_ICON_TILE_CLASS, 'bg-sky-50 text-sky-700')}>
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <h3
                  id="circle-assessments-overview-title"
                  className="font-bold text-slate-800 text-base truncate"
                >
                  {t('analytics.assessmentsOverviewTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('analytics.assessmentsOverviewHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
              aria-label={t('analytics.close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-2 min-h-0">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 px-1 py-6 text-center">
              {t('analytics.assessmentsOverviewNoneTaken')}
            </p>
          ) : null}
          {rows.map((row) => {
            const Icon = analyticsMetricIcon(row.metricId);
            const trend = trendPresentation(row.trend, t);
            const TrendIcon = trend?.icon;
            return (
              <button
                key={row.metricId}
                type="button"
                disabled={!row.tappable}
                onClick={() => {
                  if (row.tappable) onOpenMetric(row.metricId);
                }}
                className={cn(
                  'w-full rounded-2xl border border-slate-100 bg-white px-3.5 py-3 text-left flex items-center gap-3 transition-colors',
                  row.tappable
                    ? 'hover:border-blue-200 hover:bg-blue-50/30'
                    : 'opacity-60 cursor-default',
                )}
              >
                <span className={cn(ANALYTICS_SHEET_ICON_TILE_CLASS, analyticsMetricIconWrapClass(row.metricId))}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-800 truncate">{row.title}</span>
                  <span className="block text-sm text-slate-500 mt-0.5">
                    {t('analytics.assessmentsOverviewTaken', { count: row.takenLast7 })}
                  </span>
                </span>
                {trend && TrendIcon ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold shrink-0',
                      trend.className,
                    )}
                    title={t('analytics.assessmentsOverviewTrend30')}
                  >
                    <TrendIcon size={12} />
                    {trend.label}
                  </span>
                ) : null}
                {row.tappable ? (
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
