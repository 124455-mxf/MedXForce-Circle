/** @license SPDX-License-Identifier: Apache-2.0 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { CareCalendarAppointmentTask, CareCalendarEntry, CareCalendarVisitDebrief } from '@medxforce/shared';

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
  scheduleEnabled?: boolean;
  remoteAssessmentSchedule?: RemoteAssessmentSchedule;
  enabled: boolean;
  fullPage?: boolean;
  t: (path: string, params?: Record<string, unknown>) => string;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  onRecordVisit?: (entryId: string) => void;
  onManageClinicalReferences?: () => void;
  onRegisterAddAppointment?: (add: ((dateKey?: string) => void) | null) => void;
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
  scheduleEnabled,
  remoteAssessmentSchedule,
  enabled,
  fullPage = false,
  t,
  onOpenAssessment,
  onRecordVisit,
  onManageClinicalReferences,
  onRegisterAddAppointment,
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
  const effectiveScheduleEnabled =
    canReadRemoteSettings && scheduleEnabled !== false;

  const schedule = useMemo(
    () =>
      buildCircleAssessmentScheduleContext({
        byMetricId,
        treatmentPhase,
        appMode: canReadRemoteSettings ? appMode : undefined,
        scheduleEnabled: effectiveScheduleEnabled,
        remoteAssessmentSchedule: canReadRemoteSettings ? remoteAssessmentSchedule : undefined,
      }),
    [
      byMetricId,
      treatmentPhase,
      appMode,
      canReadRemoteSettings,
      effectiveScheduleEnabled,
      remoteAssessmentSchedule,
    ],
  );

  const editingEntry = useMemo(
    () => careEntries.find((e) => e.id === editEntryId) ?? null,
    [careEntries, editEntryId],
  );

  const canManageAppointments = canViewRemoteSettingsTab(capabilities);
  const sectionVisible = enabled && normalizeMemberRole(memberRole) !== 'friend';

  const openCreate = useCallback((dateKey?: string) => {
    setEditEntryId(null);
    setInitialDateKey(dateKey);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!fullPage || !sectionVisible) return;
    onRegisterAddAppointment?.(canManageAppointments ? openCreate : null);
    return () => onRegisterAddAppointment?.(null);
  }, [canManageAppointments, fullPage, onRegisterAddAppointment, openCreate, sectionVisible]);

  if (!sectionVisible) return null;

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

  const handleClinicalReferenceIdsChange = async (
    entryId: string,
    kind: CareCalendarEntry['kind'],
    ids: string[],
  ) => {
    await updateCareCalendarEntry(db, patientId, entryId, { kind, clinicalReferenceIds: ids });
  };

  const handleVisitDebriefChange = async (
    entryId: string,
    kind: CareCalendarEntry['kind'],
    debrief: CareCalendarVisitDebrief,
  ) => {
    await updateCareCalendarEntry(db, patientId, entryId, { kind, visitDebrief: debrief });
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
          onClinicalReferenceIdsChange={
            canManageAppointments ? handleClinicalReferenceIdsChange : undefined
          }
          onVisitDebriefChange={canManageAppointments ? handleVisitDebriefChange : undefined}
          onManageClinicalReferences={onManageClinicalReferences}
          currentUserUid={user.uid}
          currentUserName={authorName}
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
          hideInlineAddButton={fullPage}
          onRecordVisit={onRecordVisit}
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
