/** @license SPDX-License-Identifier: Apache-2.0 */
import {
  type AnalyticsMetricId,
  type AssessmentHistoryMap,
  type AssessmentScheduleId,
  type PatientAnalyticsSummary,
  type RemoteAssessmentSchedule,
} from '@medxforce/shared';

const ANALYTIC_METRIC_TO_HISTORY: Partial<Record<AnalyticsMetricId, keyof AssessmentHistoryMap>> = {
  impact: 'impact',
  pain: 'pain',
  'strength-reflex': 'strengthReflex',
  mobility: 'mobility',
  numbness: 'numbness',
  temperature: 'temperature',
  vision: 'vision',
  neurological: 'neurological',
  psychological: 'psychological',
};

const SCHEDULE_ID_TO_METRIC: Partial<Record<AssessmentScheduleId, AnalyticsMetricId>> = {
  impact: 'impact',
  physical: 'pain',
  'strength-reflex': 'strength-reflex',
  mobility: 'mobility',
  numbness: 'numbness',
  temperature: 'temperature',
  vision: 'vision',
  neurological: 'neurological',
  psychological: 'psychological',
};

export function buildAssessmentHistoryMapFromAnalytics(
  byMetricId: Map<string, PatientAnalyticsSummary>,
): AssessmentHistoryMap {
  const histories: AssessmentHistoryMap = {};
  for (const [metricId, historyKey] of Object.entries(ANALYTIC_METRIC_TO_HISTORY)) {
    const summary = byMetricId.get(metricId);
    if (!summary?.latestAt) continue;
    histories[historyKey] = [{ timestamp: summary.latestAt }];
  }
  return histories;
}

export function assessmentScheduleIdToAnalyticsMetric(
  id: AssessmentScheduleId,
): AnalyticsMetricId | null {
  return SCHEDULE_ID_TO_METRIC[id] ?? null;
}

export function buildCircleAssessmentSchedulePreferences(params: {
  treatmentPhase?: string | null;
  appMode?: string | null;
  healthAssessmentsEnabled?: boolean;
}): {
  featuresVisibility: { healthAssessments: boolean };
  appMode?: string;
  fullUserDetails: { clinical: { treatmentPhase?: string } };
} {
  return {
    featuresVisibility: {
      healthAssessments: params.healthAssessmentsEnabled !== false,
    },
    appMode: params.appMode ?? undefined,
    fullUserDetails: {
      clinical: { treatmentPhase: params.treatmentPhase ?? undefined },
    },
  };
}

export type CircleAssessmentScheduleContext = {
  preferences: ReturnType<typeof buildCircleAssessmentSchedulePreferences>;
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
  histories: AssessmentHistoryMap;
};

export function buildCircleAssessmentScheduleContext(params: {
  byMetricId: Map<string, PatientAnalyticsSummary>;
  treatmentPhase?: string | null;
  appMode?: string | null;
  healthAssessmentsEnabled?: boolean;
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
}): CircleAssessmentScheduleContext {
  return {
    preferences: buildCircleAssessmentSchedulePreferences({
      treatmentPhase: params.treatmentPhase,
      appMode: params.appMode,
      healthAssessmentsEnabled: params.healthAssessmentsEnabled,
    }),
    remoteAssessmentSchedule: params.remoteAssessmentSchedule,
    histories: buildAssessmentHistoryMapFromAnalytics(params.byMetricId),
  };
}
