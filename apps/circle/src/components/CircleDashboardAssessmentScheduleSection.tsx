/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo } from 'react';
import type { AnalyticsMetricId, CircleMemberRole, PatientAnalyticsSummary, RemoteAssessmentSchedule } from '@medxforce/shared';
import { normalizeMemberRole } from '@medxforce/shared';
import { buildCircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import { CircleAssessmentScheduleCalendar } from './CircleAssessmentScheduleCalendar';

export type CircleDashboardAssessmentScheduleSectionProps = {
  memberRole: CircleMemberRole;
  byMetricId: Map<string, PatientAnalyticsSummary>;
  treatmentPhase?: string | null;
  appMode?: string | null;
  healthAssessmentsEnabled?: boolean;
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
  enabled: boolean;
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
};

export function CircleDashboardAssessmentScheduleSection({
  memberRole,
  byMetricId,
  treatmentPhase,
  appMode,
  healthAssessmentsEnabled,
  remoteAssessmentSchedule,
  enabled,
  t,
  onOpenAssessment,
}: CircleDashboardAssessmentScheduleSectionProps) {
  const schedule = useMemo(
    () =>
      buildCircleAssessmentScheduleContext({
        byMetricId,
        treatmentPhase,
        appMode,
        healthAssessmentsEnabled,
        remoteAssessmentSchedule,
      }),
    [byMetricId, treatmentPhase, appMode, healthAssessmentsEnabled, remoteAssessmentSchedule],
  );

  if (!enabled || normalizeMemberRole(memberRole) === 'friend') return null;

  return (
    <div className="col-span-2 h-[24rem] sm:h-[25rem] min-h-0">
      <CircleAssessmentScheduleCalendar
        schedule={schedule}
        t={t}
        onOpenAssessment={onOpenAssessment as (metricId: AnalyticsMetricId) => void}
        compact
      />
    </div>
  );
}
