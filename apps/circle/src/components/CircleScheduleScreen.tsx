/** @license SPDX-License-Identifier: Apache-2.0 */
import { Calendar, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AnalyticsMetricId, CirclePatientSummary } from '@medxforce/shared';
import { normalizeMemberRole } from '@medxforce/shared';
import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';
import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';
import { useCircleRemoteSettingsFromShell } from '../context/CircleSelectedPatientContext';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import {
  circleHeaderActionButtonClass,
  circleSectionEmptyStateClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { CircleDashboardAssessmentScheduleSection } from './CircleDashboardAssessmentScheduleSection';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { formatCircleBadgeCount } from './CircleCountBadge';
import type { CircleScheduleAppointmentFocus, CircleScheduleViewIntent } from '../lib/circleSchedulePreferences';

type CircleScheduleScreenProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  actionBadgeCount?: number;
  viewIntent?: CircleScheduleViewIntent | null;
  appointmentFocus?: CircleScheduleAppointmentFocus | null;
  onAppointmentFocusConsumed?: () => void;
  onOpenCountChange?: (count: number) => void;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onRecordVisit?: (entryId: string, restoreSheet?: CircleScheduleAppointmentFocus) => void;
  onManageClinicalReferences?: () => void;
};

export function CircleScheduleScreen({
  user,
  db,
  patient,
  actionBadgeCount = 0,
  viewIntent = null,
  appointmentFocus = null,
  onAppointmentFocusConsumed,
  onOpenCountChange,
  onOpenAssessment,
  onRecordVisit,
  onManageClinicalReferences,
}: CircleScheduleScreenProps) {
  const t = useCircleT();
  const compactChrome = useCircleCompactChrome();
  const memberRole = normalizeMemberRole(patient.role);
  const { byMetricId } = useCircleAnalyticsSummaries(db, patient);
  const { snapshot: profileSnapshot } = useCirclePatientProfileSnapshot(db, patient.patientId);
  const { settings: remoteSettings } = useCircleRemoteSettingsFromShell();
  const [addAppointment, setAddAppointment] = useState<((dateKey?: string) => void) | null>(null);
  const [visibleOpenCount, setVisibleOpenCount] = useState<number | null>(null);
  const registerAddAppointment = useCallback((add: ((dateKey?: string) => void) | null) => {
    setAddAppointment(() => add);
  }, []);
  const handleOpenCountChange = useCallback(
    (count: number) => {
      setVisibleOpenCount(count);
      onOpenCountChange?.(count);
    },
    [onOpenCountChange],
  );
  const headerOpenCount = visibleOpenCount ?? actionBadgeCount;

  // Circle Schedule is for the care team — independent of patient-tablet Schedule visibility.
  const scheduleTabEnabled = memberRole !== 'friend';

  if (!scheduleTabEnabled) {
    return (
      <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
        <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
          <div className={cn(circleWorkTabHeaderClass(compactChrome), 'space-y-2 min-w-0')}>
            <CircleWorkTabSectionIntro
              icon={Calendar}
              iconClassName="text-blue-600"
              title={t('dashboard.assessmentScheduleCalendar.title')}
              subtitle={t('dashboard.assessmentScheduleCalendar.subtitle')}
            />
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <p className={circleSectionEmptyStateClass}>{t('schedulePage.unavailable')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), 'space-y-2 min-w-0')}>
          <CircleWorkTabSectionIntro
            icon={Calendar}
            iconClassName="text-blue-600"
            title={t('dashboard.assessmentScheduleCalendar.title')}
            subtitle={t('dashboard.assessmentScheduleCalendar.subtitle')}
            titleExtra={
              headerOpenCount > 0 ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                  {t('schedulePage.views.actionBadge', {
                    count: formatCircleBadgeCount(headerOpenCount),
                  })}
                </span>
              ) : undefined
            }
            trailing={
              addAppointment ? (
                <button
                  type="button"
                  onClick={() => addAppointment()}
                  className={circleHeaderActionButtonClass}
                  aria-label={t('dashboard.careCalendar.addTitle')}
                  title={t('dashboard.careCalendar.addTitle')}
                >
                  <Plus size={18} className="[@media(max-height:740px)]:size-4" />
                </button>
              ) : undefined
            }
          />
        </div>
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <CircleDashboardAssessmentScheduleSection
            key={viewIntent ?? 'default'}
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
            scheduleEnabled
            featuresVisibility={remoteSettings?.featuresVisibility}
            remoteAssessmentSchedule={remoteSettings?.assessmentSchedule}
            enabled={scheduleTabEnabled}
            fullPage
            t={t}
            onOpenAssessment={onOpenAssessment}
            onRecordVisit={onRecordVisit}
            onManageClinicalReferences={onManageClinicalReferences}
            onRegisterAddAppointment={registerAddAppointment}
            onOpenCountChange={handleOpenCountChange}
            viewIntent={viewIntent}
            appointmentFocus={appointmentFocus}
            onAppointmentFocusConsumed={onAppointmentFocusConsumed}
          />
        </div>
      </div>
    </div>
  );
}
