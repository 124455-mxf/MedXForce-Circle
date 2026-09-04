/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
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
  DASHBOARD_STATS_DAYS,
  DASHBOARD_STATS_DAYS_30,
  assessmentTakenCountLastN,
  assessmentThirtyDayTrend,
  sumAlertAttentionLastN,
  sumCompanionLastNExcludingDetected,
  sumDailyCheckInLastN,
  sumMessagesLastN,
  sumVitalityGamesLastN,
} from '../lib/circleDashboardStats';
import type { CircleMessagesAnalyticsFocus } from './CircleMessagesAnalyticsDetail';

export type AnalyticsPeriodDays = 7 | 30;

type CircleAnalyticsPeriodOverviewSheetProps = {
  open: boolean;
  initialDays: AnalyticsPeriodDays;
  patient: CirclePatientSummary;
  byMetricId: Map<string, PatientAnalyticsSummary>;
  dailyCheckInEnabled: boolean;
  messagingEnabled: boolean;
  communicationEnabled: boolean;
  companionEnabled: boolean;
  vitalityEnabled: boolean;
  onOpenMetric: (metricId: AnalyticsMetricId, messagesFocus?: CircleMessagesAnalyticsFocus) => void;
  onClose: () => void;
};

type PeriodRow = {
  key: string;
  metricId: AnalyticsMetricId;
  messagesFocus?: CircleMessagesAnalyticsFocus;
  title: string;
  count: number;
  trend: AnalyticsTrendDirection | null;
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

function canReadMetric(
  metricId: AnalyticsMetricId,
  patient: CirclePatientSummary,
): boolean {
  const definition = ANALYTICS_METRIC_DEFINITIONS[metricId];
  if (!definition?.isReleased) return false;
  if (!patient.capabilities) return false;
  return canReadAnalyticsAudience(definition.audience, patient.role, patient.capabilities);
}

function buildPeriodRows(
  days: AnalyticsPeriodDays,
  patient: CirclePatientSummary,
  byMetricId: Map<string, PatientAnalyticsSummary>,
  flags: {
    dailyCheckInEnabled: boolean;
    messagingEnabled: boolean;
    communicationEnabled: boolean;
    companionEnabled: boolean;
    vitalityEnabled: boolean;
  },
  t: ReturnType<typeof useCircleT>,
): { engagement: PeriodRow[]; assessments: PeriodRow[] } {
  const engagement: PeriodRow[] = [];

  const pushEngagement = (
    metricId: AnalyticsMetricId,
    count: number,
    title: string,
    messagesFocus?: CircleMessagesAnalyticsFocus,
  ) => {
    if (count <= 0 || !canReadMetric(metricId, patient)) return;
    const summary = byMetricId.get(metricId);
    engagement.push({
      key: messagesFocus ? `${metricId}-${messagesFocus}` : metricId,
      metricId,
      messagesFocus,
      title,
      count,
      trend: assessmentThirtyDayTrend(summary),
    });
  };

  const alert = byMetricId.get('alert-attention');
  const alertStats = sumAlertAttentionLastN(
    alert?.detail?.kind === 'alert_attention' ? alert.detail.timeline : undefined,
    days,
  );
  pushEngagement('alert-attention', alertStats.total, analyticsMetricTitle(t, 'alert-attention'));

  if (flags.dailyCheckInEnabled) {
    const checkIn = byMetricId.get('daily-check-in');
    const checkInStats = sumDailyCheckInLastN(
      checkIn?.detail?.kind === 'daily_check_in' ? checkIn.detail.timeline : undefined,
      days,
    );
    pushEngagement('daily-check-in', checkInStats.completed, analyticsMetricTitle(t, 'daily-check-in'));
  }

  const messages = byMetricId.get('speech-history');
  const messageStats = sumMessagesLastN(
    messages?.detail?.kind === 'messages' ? messages.detail.timeline : undefined,
    days,
  );
  if (flags.messagingEnabled) {
    pushEngagement(
      'speech-history',
      messageStats.messaging,
      t('analytics.metrics.messaging'),
      'messaging',
    );
  }
  if (flags.communicationEnabled) {
    pushEngagement(
      'speech-history',
      messageStats.communication,
      t('analytics.metrics.communication'),
      'communication',
    );
  }

  if (flags.companionEnabled) {
    const companion = byMetricId.get('ai-conversation');
    pushEngagement(
      'ai-conversation',
      sumCompanionLastNExcludingDetected(
        companion?.detail?.kind === 'companion' ? companion.detail.timeline : undefined,
        days,
      ),
      analyticsMetricTitle(t, 'ai-conversation'),
    );
  }

  if (flags.vitalityEnabled) {
    const vitality = byMetricId.get('vitality-game');
    pushEngagement(
      'vitality-game',
      sumVitalityGamesLastN(
        vitality?.detail?.kind === 'vitality_game' ? vitality.detail.timeline : undefined,
        days,
      ),
      analyticsMetricTitle(t, 'vitality-game'),
    );
  }

  const assessments = DASHBOARD_ASSESSMENT_METRIC_IDS.flatMap((rawId) => {
    const metricId = rawId as AnalyticsMetricId;
    if (!canReadMetric(metricId, patient)) return [];
    const summary = byMetricId.get(metricId);
    const count = assessmentTakenCountLastN(summary, days);
    if (count <= 0) return [];
    return [
      {
        key: metricId,
        metricId,
        title: analyticsMetricTitle(t, metricId),
        count,
        trend: assessmentThirtyDayTrend(summary),
      } satisfies PeriodRow,
    ];
  });

  return { engagement, assessments };
}

export function CircleAnalyticsPeriodOverviewSheet({
  open,
  initialDays,
  patient,
  byMetricId,
  dailyCheckInEnabled,
  messagingEnabled,
  communicationEnabled,
  companionEnabled,
  vitalityEnabled,
  onOpenMetric,
  onClose,
}: CircleAnalyticsPeriodOverviewSheetProps) {
  const t = useCircleT();
  const [days, setDays] = useState<AnalyticsPeriodDays>(initialDays);

  useEffect(() => {
    if (open) setDays(initialDays);
  }, [open, initialDays]);

  if (!open) return null;

  const { engagement, assessments } = buildPeriodRows(
    days,
    patient,
    byMetricId,
    {
      dailyCheckInEnabled,
      messagingEnabled,
      communicationEnabled,
      companionEnabled,
      vitalityEnabled,
    },
    t,
  );
  const empty = engagement.length === 0 && assessments.length === 0;

  const renderRow = (row: PeriodRow) => {
    const Icon = analyticsMetricIcon(row.metricId);
    const wrapClass =
      row.messagesFocus === 'communication'
        ? 'bg-indigo-50 text-indigo-600'
        : row.messagesFocus === 'messaging'
          ? 'bg-emerald-50 text-emerald-600'
          : analyticsMetricIconWrapClass(row.metricId);
    const trend = trendPresentation(row.trend, t);
    const TrendIcon = trend?.icon;
    return (
      <button
        key={row.key}
        type="button"
        onClick={() => onOpenMetric(row.metricId, row.messagesFocus)}
        className="w-full rounded-2xl border border-slate-100 bg-white px-3.5 py-3 text-left flex items-center gap-3 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
      >
        <span className={cn(ANALYTICS_SHEET_ICON_TILE_CLASS, wrapClass)}>
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-800 truncate">{row.title}</span>
          <span className="block text-sm text-slate-500 mt-0.5">
            {t('analytics.periodOverviewTaken', { count: row.count })}
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
        <ChevronRight size={16} className="text-slate-300 shrink-0" />
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-analytics-period-overview-title"
        className="bg-[#F8FAFC] w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[88vh] flex flex-col min-h-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 rounded-t-[28px] bg-white">
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
          <div className="px-4 pb-4 sm:pt-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(ANALYTICS_SHEET_ICON_TILE_CLASS, 'bg-blue-50 text-blue-600')}>
                  <BarChart3 size={18} />
                </div>
                <div className="min-w-0">
                  <h3
                    id="circle-analytics-period-overview-title"
                    className="font-bold text-slate-800 text-base truncate"
                  >
                    {days === DASHBOARD_STATS_DAYS_30
                      ? t('analytics.periodOverviewTitle30')
                      : t('analytics.periodOverviewTitle7')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('analytics.periodOverviewHint')}
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
            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t('analytics.rangeGroup')}>
              {([DASHBOARD_STATS_DAYS, DASHBOARD_STATS_DAYS_30] as const).map((option) => {
                const selected = days === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDays(option)}
                    aria-pressed={selected}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors',
                      selected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {option === DASHBOARD_STATS_DAYS
                      ? t('analytics.range7')
                      : t('analytics.range30')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 min-h-0">
          {empty ? (
            <p className="text-sm text-slate-500 px-1 py-6 text-center">
              {t('analytics.periodOverviewEmpty')}
            </p>
          ) : null}
          {engagement.length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                {t('analytics.sections.communication')}
              </h4>
              <div className="space-y-2">{engagement.map(renderRow)}</div>
            </section>
          ) : null}
          {assessments.length > 0 ? (
            <section className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                {t('analytics.assessmentsOverviewTitle')}
              </h4>
              <div className="space-y-2">{assessments.map(renderRow)}</div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
