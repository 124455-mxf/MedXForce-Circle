/** @license SPDX-License-Identifier: Apache-2.0 */
import { Calendar } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AnalyticsMetricId, CirclePatientSummary } from '@medxforce/shared';
import { normalizeMemberRole } from '@medxforce/shared';
import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';
import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';
import { useCircleRemoteSettingsFromShell } from '../context/CircleSelectedPatientContext';
import { useCircleT } from '../lib/circleI18nContext';
import {
  circleSectionEmptyStateClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { CircleDashboardAssessmentScheduleSection } from './CircleDashboardAssessmentScheduleSection';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';

type CircleScheduleScreenProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
};

export function CircleScheduleScreen({
  user,
  db,
  patient,
  onOpenAssessment,
}: CircleScheduleScreenProps) {
  const t = useCircleT();
  const memberRole = normalizeMemberRole(patient.role);
  const { byMetricId } = useCircleAnalyticsSummaries(db, patient);
  const { snapshot: profileSnapshot } = useCirclePatientProfileSnapshot(db, patient.patientId);
  const { settings: remoteSettings } = useCircleRemoteSettingsFromShell();

  const scheduleEnabled = memberRole !== 'friend';

  if (!scheduleEnabled) {
    return (
      <div className={circleWorkTabPanelClass}>
        <CircleWorkTabSectionIntro
          icon={Calendar}
          title={t('dashboard.assessmentScheduleCalendar.title')}
          subtitle={t('dashboard.assessmentScheduleCalendar.subtitle')}
        />
        <p className={circleSectionEmptyStateClass}>{t('schedulePage.unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <CircleWorkTabSectionIntro
        icon={Calendar}
        title={t('dashboard.assessmentScheduleCalendar.title')}
        subtitle={t('dashboard.assessmentScheduleCalendar.subtitle')}
      />
      <div className="flex flex-col flex-1 min-h-0">
        <CircleDashboardAssessmentScheduleSection
          db={db}
          patientId={patient.patientId}
          user={user}
          patient={patient}
          authorName={user.displayName || user.email || 'Circle'}
          memberRole={memberRole}
          capabilities={patient.capabilities}
          byMetricId={byMetricId}
          treatmentPhase={profileSnapshot?.clinical?.treatmentPhase}
          appMode={remoteSettings?.appMode}
          healthAssessmentsEnabled={remoteSettings?.featuresVisibility?.healthAssessments}
          remoteAssessmentSchedule={remoteSettings?.assessmentSchedule}
          enabled={scheduleEnabled}
          fullPage
          t={t}
          onOpenAssessment={onOpenAssessment}
        />
      </div>
    </div>
  );
}
