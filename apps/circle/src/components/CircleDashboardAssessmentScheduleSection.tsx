/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AnalyticsMetricId, CircleMemberRole, CirclePatientSummary, PatientAnalyticsSummary, PatientCapabilities, RemoteAssessmentSchedule } from '@medxforce/shared';
import { backfillCareCalendarInviteeMemberUidWhereResponded, canViewRemoteSettingsTab, normalizeMemberRole, shouldHideDeclinedAppointmentForContact } from '@medxforce/shared';
import { buildCircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import { CircleAssessmentScheduleCalendar } from './CircleAssessmentScheduleCalendar';
import { CircleCareCalendarEntryModal } from './CircleCareCalendarEntryModal';
import { useCareCalendarEntries, buildCareCalendarEntriesSubscription } from '../hooks/useCareCalendarEntries';
import { useCircleMemberInviteContext } from '../hooks/useCircleMemberInviteContext';
import { updateCareCalendarEntry } from '../services/careCalendarService';
import type { CareCalendarAppointmentTask, CareCalendarEntry } from '@medxforce/shared';

export type CircleDashboardAssessmentScheduleSectionProps = {
  db: Firestore;
  patientId: string;
  user: User;
  patient: CirclePatientSummary;
  authorName: string;
  memberRole: CircleMemberRole;
  capabilities: PatientCapabilities;
  byMetricId: Map<string, PatientAnalyticsSummary>;
  treatmentPhase?: string | null;
  appMode?: string | null;
  healthAssessmentsEnabled?: boolean;
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
  enabled: boolean;
  fullPage?: boolean;
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
};

export function CircleDashboardAssessmentScheduleSection({
  db,
  patientId,
  user,
  patient,
  authorName,
  memberRole,
  capabilities,
  byMetricId,
  treatmentPhase,
  appMode,
  healthAssessmentsEnabled,
  remoteAssessmentSchedule,
  enabled,
  fullPage = false,
  t,
  onOpenAssessment,
}: CircleDashboardAssessmentScheduleSectionProps) {
  const { inviteContext, memberContactId, contact: ownContact, loading: ownContactLoading, inviteContextReady } =
    useCircleMemberInviteContext(db, user, patient);
  const inviteMembershipRepairAttempted = useRef(false);
  const calendarSubscription = useMemo(
    () =>
      buildCareCalendarEntriesSubscription(patient, user.uid, inviteContext, {
        inviteContextReady,
      }),
    [inviteContext, inviteContextReady, patient, user.uid],
  );
  const { entries: careEntries } = useCareCalendarEntries(db, patientId, calendarSubscription);

  useEffect(() => {
    if (
      inviteMembershipRepairAttempted.current ||
      !inviteContextReady ||
      patient.capabilities?.remoteSettings === true
    ) {
      return;
    }
    inviteMembershipRepairAttempted.current = true;
    void backfillCareCalendarInviteeMemberUidWhereResponded(
      db,
      patientId,
      user.uid,
      inviteContext,
    ).catch(() => {
      /* best-effort repair */
    });
  }, [db, inviteContext, inviteContextReady, patient.capabilities?.remoteSettings, patientId, user.uid]);
  const visibleCareEntries = useMemo(
    () =>
      careEntries.filter(
        (entry) =>
          !shouldHideDeclinedAppointmentForContact(
            entry.attendees,
            memberContactId,
            inviteContext,
          ),
      ),
    [careEntries, inviteContext, memberContactId],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [initialDateKey, setInitialDateKey] = useState<string | undefined>();

  const canReadRemoteSettings = canViewRemoteSettingsTab(capabilities);
  const effectiveHealthAssessmentsEnabled =
    canReadRemoteSettings && healthAssessmentsEnabled !== false;

  const schedule = useMemo(
    () =>
      buildCircleAssessmentScheduleContext({
        byMetricId,
        treatmentPhase,
        appMode: canReadRemoteSettings ? appMode : undefined,
        healthAssessmentsEnabled: effectiveHealthAssessmentsEnabled,
        remoteAssessmentSchedule: canReadRemoteSettings ? remoteAssessmentSchedule : undefined,
      }),
    [
      byMetricId,
      treatmentPhase,
      appMode,
      canReadRemoteSettings,
      effectiveHealthAssessmentsEnabled,
      remoteAssessmentSchedule,
    ],
  );

  const editingEntry = useMemo(
    () => careEntries.find((e) => e.id === editEntryId) ?? null,
    [careEntries, editEntryId],
  );

  const canManageAppointments = canViewRemoteSettingsTab(capabilities);

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

  const handleAppointmentTasksChange = async (
    entryId: string,
    kind: CareCalendarEntry['kind'],
    tasks: CareCalendarAppointmentTask[],
  ) => {
    await updateCareCalendarEntry(db, patientId, entryId, { kind, appointmentTasks: tasks });
  };

  return (
    <>
      <div
        className={
          fullPage
            ? 'flex flex-col flex-1 min-h-0 h-full'
            : 'col-span-2 min-h-[34rem] h-[34rem] sm:min-h-[36rem] sm:h-[36rem]'
        }
      >
        <CircleAssessmentScheduleCalendar
          schedule={schedule}
          careEntries={visibleCareEntries}
          t={t}
          onOpenAssessment={onOpenAssessment as (metricId: AnalyticsMetricId) => void}
          onAddAppointment={canManageAppointments ? openCreate : undefined}
          onEditAppointment={canManageAppointments ? openEdit : undefined}
          onAppointmentTasksChange={handleAppointmentTasksChange}
          currentUserUid={user.uid}
          patientId={patientId}
          db={db}
          memberContactId={memberContactId}
          memberDocContactId={inviteContext.memberDocContactId}
          inviteContactId={inviteContext.inviteContactId}
          memberDisplayName={inviteContext.displayName}
          memberRole={memberRole}
          compact={!fullPage}
          hideHeader={fullPage}
          enableViewModes={fullPage}
        />
      </div>
      {canManageAppointments && (
        <CircleCareCalendarEntryModal
          open={modalOpen}
          db={db}
          patientId={patientId}
          authorName={authorName}
          authorUid={user.uid}
          authorRole={memberRole}
          organizerContactId={ownContact?.id}
          organizerContactReady={!ownContactLoading}
          initialDateKey={initialDateKey}
          editingEntry={editingEntry}
          t={t}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
