/** @license SPDX-License-Identifier: Apache-2.0 */
import type { AnalyticsMetricId, AssessmentHistoryMap } from '@medxforce/shared';
import {
  careCalendarAssessmentNudgeShortTitleKey,
  countRecommendedCareCalendarAssessmentNudges,
  getCareCalendarAssessmentNudges,
  type CareCalendarAssessmentNudge,
  type CareCalendarAssessmentNudgePhase,
} from '@medxforce/shared';
import type { CareCalendarDayEvent } from '@medxforce/shared';
import { assessmentScheduleIdToAnalyticsMetric } from '../lib/circleAssessmentScheduleMetrics';
import { cn } from '../lib/utils';

type CircleCareCalendarAssessmentNudgesListProps = {
  event: CareCalendarDayEvent;
  dateKey: string;
  phase: CareCalendarAssessmentNudgePhase;
  preferences: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  };
  histories: AssessmentHistoryMap;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
};

function nudgeLabel(
  nudge: CareCalendarAssessmentNudge,
  t: CircleCareCalendarAssessmentNudgesListProps['t'],
): string {
  const metricId = assessmentScheduleIdToAnalyticsMetric(nudge.assessmentId);
  if (metricId) return t(`analytics.metrics.${metricId}`);
  return t(careCalendarAssessmentNudgeShortTitleKey(nudge.titleKey));
}

export function CircleCareCalendarAssessmentNudgesList({
  event,
  dateKey,
  phase,
  preferences,
  histories,
  ct,
  t,
  onOpenAssessment,
}: CircleCareCalendarAssessmentNudgesListProps) {
  const nudges = getCareCalendarAssessmentNudges(
    event,
    dateKey,
    phase,
    preferences,
    histories,
  );

  if (!nudges.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-slate-600">
        {phase === 'pre'
          ? ct('episode.assessmentNudgesPreTitle')
          : ct('episode.assessmentNudgesPostTitle')}
      </p>
      <ul className="space-y-2">
        {nudges.map((nudge) => {
          const metricId = assessmentScheduleIdToAnalyticsMetric(nudge.assessmentId);
          return (
            <li
              key={`${nudge.assessmentId}-${phase}`}
              className={cn(
                'flex items-center justify-between gap-3 p-3 rounded-xl border',
                nudge.recommended
                  ? 'border-blue-200 bg-blue-50/70'
                  : 'border-slate-100 bg-slate-50/60',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{nudgeLabel(nudge, t)}</p>
                {nudge.recommended ? (
                  <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mt-0.5">
                    {ct('episode.assessmentNudgeRecommended')}
                  </p>
                ) : null}
              </div>
              {onOpenAssessment && metricId ? (
                <button
                  type="button"
                  onClick={() => onOpenAssessment(metricId)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  {t('dashboard.assessmentScheduleCalendar.view')}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CircleCareCalendarAssessmentNudgeHint({
  event,
  dateKey,
  preferences,
  histories,
  ct,
}: {
  event: CareCalendarDayEvent;
  dateKey: string;
  preferences: CircleCareCalendarAssessmentNudgesListProps['preferences'];
  histories: AssessmentHistoryMap;
  ct: (key: string, params?: Record<string, unknown>) => string;
}) {
  const nudges = getCareCalendarAssessmentNudges(
    event,
    dateKey,
    'pre',
    preferences,
    histories,
  );
  const count = countRecommendedCareCalendarAssessmentNudges(nudges);
  if (!count) return null;

  return (
    <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
      {ct('episode.assessmentNudgesShort', { count })}
    </p>
  );
}
