/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { AnalyticsMetricId, CircleMemberRole, PatientAnalyticsSummary, RemoteAssessmentSchedule } from '@medxforce/shared';
import { canViewRemoteSettingsTab, normalizeMemberRole } from '@medxforce/shared';
import { buildCircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import { CircleAssessmentScheduleCalendar } from './CircleAssessmentScheduleCalendar';
import { CircleCareCalendarEntryModal } from './CircleCareCalendarEntryModal';
import { useCareCalendarEntries } from '../hooks/useCareCalendarEntries';

export type CircleDashboardAssessmentScheduleSectionProps = {
  db: Firestore;
  patientId: string;
  authorName: string;
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
  db,
  patientId,
  authorName,
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
  const { entries: careEntries } = useCareCalendarEntries(db, patientId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [initialDateKey, setInitialDateKey] = useState<string | undefined>();

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

  const editingEntry = useMemo(
    () => careEntries.find((e) => e.id === editEntryId) ?? null,
    [careEntries, editEntryId],
  );

  const canManageAppointments = canViewRemoteSettingsTab(memberRole);

  if (!enabled || normalizeMemberRole(memberRole) === 'friend') return null;

  const openCreate = (dateKey?: string) => {
    setEditEntryId(null);
    setInitialDateKey(dateKey);
    setModalOpen(true);
  };

  const openEdit = (entryId: string) => {
    setEditEntryId(entryId);
    setInitialDateKey(undefined);
    setModalOpen(true);
  };

  return (
    <>
      <div className="col-span-2 h-[24rem] sm:h-[25rem] min-h-0">
        <CircleAssessmentScheduleCalendar
          schedule={schedule}
          careEntries={careEntries}
          t={t}
          onOpenAssessment={onOpenAssessment as (metricId: AnalyticsMetricId) => void}
          onAddAppointment={canManageAppointments ? openCreate : undefined}
          onEditAppointment={canManageAppointments ? openEdit : undefined}
          compact
        />
      </div>
      {canManageAppointments && (
        <CircleCareCalendarEntryModal
          open={modalOpen}
          db={db}
          patientId={patientId}
          authorName={authorName}
          initialDateKey={initialDateKey}
          editingEntry={editingEntry}
          t={t}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
