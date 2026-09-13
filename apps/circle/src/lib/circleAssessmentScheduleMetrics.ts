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
  speech: 'speech',
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
  balance: 'balance',
  vision: 'vision',
  speech: 'speech',
  neurological: 'neurological',
  physiological: 'physiological',
  psychological: 'psychological',
};

const METRIC_ID_TO_SCHEDULE: Partial<Record<AnalyticsMetricId, AssessmentScheduleId>> = {
  impact: 'impact',
  pain: 'physical',
  'strength-reflex': 'strength-reflex',
  mobility: 'mobility',
  numbness: 'numbness',
  temperature: 'temperature',
  balance: 'balance',
  vision: 'vision',
  speech: 'speech',
  neurological: 'neurological',
  physiological: 'physiological',
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

export function analyticsMetricIdToAssessmentScheduleId(
  metricId: string,
): AssessmentScheduleId | null {
  return METRIC_ID_TO_SCHEDULE[metricId as AnalyticsMetricId] ?? null;
}

export function buildCircleAssessmentSchedulePreferences(params: {
  treatmentPhase?: string | null;
  appMode?: string | null;
  scheduleEnabled?: boolean;
  featuresVisibility?: Record<string, unknown>;
}): {
  featuresVisibility: Record<string, unknown>;
  appMode?: string;
  fullUserDetails: { clinical: { treatmentPhase?: string } };
} {
  return {
    featuresVisibility: {
      ...(params.featuresVisibility ?? {}),
      // Circle Schedule stays available to the care team even if the tablet Schedule tab is off.
      schedule: params.scheduleEnabled !== false,
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
  scheduleEnabled?: boolean;
  featuresVisibility?: Record<string, unknown>;
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
}): CircleAssessmentScheduleContext {
  return {
    preferences: buildCircleAssessmentSchedulePreferences({
      treatmentPhase: params.treatmentPhase,
      appMode: params.appMode,
      scheduleEnabled: params.scheduleEnabled,
      featuresVisibility: params.featuresVisibility,
    }),
    remoteAssessmentSchedule: params.remoteAssessmentSchedule,
    histories: buildAssessmentHistoryMapFromAnalytics(params.byMetricId),
  };
}
