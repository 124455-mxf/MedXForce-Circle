/** @license SPDX-License-Identifier: Apache-2.0 */
import { ChevronRight, ClipboardCheck, X } from 'lucide-react';
import {
  ANALYTICS_METRIC_DEFINITIONS,
  canReadAnalyticsAudience,
  resolveEffectiveAssessmentScheduleRules,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
  type RemoteAssessmentSchedule,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { analyticsMetricTitle, formatAnalyticsShortDate } from '../lib/circleAnalyticsI18n';
import {
  ANALYTICS_SHEET_ICON_TILE_CLASS,
  analyticsMetricIcon,
  analyticsMetricIconWrapClass,
} from '../lib/circleAnalyticsMetricUi';
import {
  completionsByScheduleIdFromAnalytics,
  listMissedScheduledAssessments,
  SCHEDULED_ASSESSMENT_MISS_WINDOW_DAYS,
} from '../lib/circleAssessmentAdherence';
import type { CircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';

type CircleMissedAssessmentsSheetProps = {
  open: boolean;
  patient: CirclePatientSummary;
  byMetricId: Map<string, PatientAnalyticsSummary>;
  schedulePreferences: CircleAssessmentScheduleContext['preferences'];
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
  onOpenMetric: (metricId: AnalyticsMetricId) => void;
  onClose: () => void;
};

function canOpenMetric(
  metricId: AnalyticsMetricId,
  patient: CirclePatientSummary,
  byMetricId: Map<string, PatientAnalyticsSummary>,
): boolean {
  const definition = ANALYTICS_METRIC_DEFINITIONS[metricId];
  if (!definition?.isReleased) return false;
  if (!patient.capabilities) return false;
  if (!canReadAnalyticsAudience(definition.audience, patient.role, patient.capabilities)) {
    return false;
  }
  const summary = byMetricId.get(metricId);
  return summary?.status !== 'coming_soon';
}

export function CircleMissedAssessmentsSheet({
  open,
  patient,
  byMetricId,
  schedulePreferences,
  remoteAssessmentSchedule,
  onOpenMetric,
  onClose,
}: CircleMissedAssessmentsSheetProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();

  if (!open) return null;

  const rules = resolveEffectiveAssessmentScheduleRules({
    preferences: schedulePreferences,
    remoteAssessmentSchedule,
  });
  const rows = listMissedScheduledAssessments({
    rules,
    completionsByScheduleId: completionsByScheduleIdFromAnalytics(byMetricId),
    windowDays: SCHEDULED_ASSESSMENT_MISS_WINDOW_DAYS,
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
        aria-labelledby="circle-missed-assessments-title"
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
                <ClipboardCheck size={18} />
              </div>
              <div className="min-w-0">
                <h3
                  id="circle-missed-assessments-title"
                  className="font-bold text-slate-800 text-base truncate"
                >
                  {t('analytics.missedAssessmentsTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('analytics.missedAssessmentsHint')}
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
              {t('analytics.missedAssessmentsEmpty')}
            </p>
          ) : null}
          {rows.map((row) => {
            const metricId = row.metricId;
            const Icon = metricId ? analyticsMetricIcon(metricId) : ClipboardCheck;
            const title = metricId
              ? analyticsMetricTitle(t, metricId)
              : row.assessmentId;
            const dates = row.missedAt
              .map((ts) => formatAnalyticsShortDate(ts, language))
              .join(', ');
            const tappable = metricId != null && canOpenMetric(metricId, patient, byMetricId);
            const content = (
              <>
                <span
                  className={cn(
                    ANALYTICS_SHEET_ICON_TILE_CLASS,
                    metricId ? analyticsMetricIconWrapClass(metricId) : 'bg-sky-50 text-sky-700',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-800 truncate">{title}</span>
                  <span className="block text-sm text-slate-500 mt-0.5">
                    {t('analytics.missedAssessmentsDetail', {
                      count: row.missed,
                      dates,
                    })}
                  </span>
                </span>
                {tappable ? <ChevronRight size={16} className="text-slate-300 shrink-0" /> : null}
              </>
            );
            if (!tappable) {
              return (
                <div
                  key={row.assessmentId}
                  className="w-full rounded-2xl border border-slate-100 bg-white px-3.5 py-3 text-left flex items-center gap-3"
                >
                  {content}
                </div>
              );
            }
            return (
              <button
                key={row.assessmentId}
                type="button"
                onClick={() => onOpenMetric(metricId)}
                className="w-full rounded-2xl border border-slate-100 bg-white px-3.5 py-3 text-left flex items-center gap-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
