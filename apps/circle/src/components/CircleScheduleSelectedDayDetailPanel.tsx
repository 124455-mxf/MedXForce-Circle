/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Firestore } from 'firebase/firestore';
import type { AnalyticsMetricId, AssessmentHistoryMap, AssessmentScheduleDayEvent, CareCalendarDayEvent } from '@medxforce/shared';
import { assessmentScheduleIdToAnalyticsMetric } from '../lib/circleAssessmentScheduleMetrics';
import type { CircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import {
  CIRCLE_SCHEDULE_DAY_DETAIL_PANEL_CLASS,
  CIRCLE_SCHEDULE_DAY_DETAIL_SECTION_CLASS,
} from '../lib/circleScheduleLayout';
import { CircleScheduleDayAppointmentCard } from './CircleScheduleTodayView';
import { cn } from '../lib/utils';

type CircleScheduleSelectedDayDetailPanelProps = {
  selectedDateKey: string;
  todayKey: string;
  careEvents: CareCalendarDayEvent[];
  assessmentEvents: AssessmentScheduleDayEvent[];
  t: (path: string, params?: Record<string, unknown>) => string;
  assessmentLabel: (event: AssessmentScheduleDayEvent) => string;
  onOpenAppointment: (event: CareCalendarDayEvent) => void;
  onEditAppointment?: (entryId: string) => void;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  db?: Firestore;
  patientId?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  currentUserUid?: string;
  className?: string;
};

export function CircleScheduleSelectedDayDetailPanel({
  selectedDateKey,
  todayKey,
  careEvents,
  assessmentEvents,
  t,
  assessmentLabel,
  onOpenAppointment,
  onEditAppointment,
  onOpenAssessment,
  assessmentSchedule,
  db,
  patientId,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
  currentUserUid,
  className,
}: CircleScheduleSelectedDayDetailPanelProps) {
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);

  const dayLabel = new Date(selectedDateKey + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={cn(CIRCLE_SCHEDULE_DAY_DETAIL_PANEL_CLASS, className)}>
      <p className="font-bold text-slate-500 uppercase tracking-wider text-xs pb-3 border-b border-slate-200/80">
        {t('dashboard.assessmentScheduleCalendar.dayDetail', { date: dayLabel })}
      </p>

      {careEvents.length > 0 ? (
        <div className={CIRCLE_SCHEDULE_DAY_DETAIL_SECTION_CLASS}>
          <p className="font-bold text-violet-700 uppercase tracking-wider text-xs">
            {ct('dayAppointments')}
          </p>
          <ul className="space-y-3">
            {careEvents.map((event) => (
              <CircleScheduleDayAppointmentCard
                key={`${event.entryId}-${selectedDateKey}`}
                event={event}
                dateKey={selectedDateKey}
                ct={ct}
                t={t}
                showTimingHighlight={selectedDateKey === todayKey}
                assessmentSchedule={assessmentSchedule}
                onOpen={() => onOpenAppointment(event)}
                onEdit={onEditAppointment ? () => onEditAppointment(event.entryId) : undefined}
                db={db}
                patientId={patientId}
                memberContactId={memberContactId}
                memberDocContactId={memberDocContactId}
                inviteContactId={inviteContactId}
                memberDisplayName={memberDisplayName}
                memberRole={memberRole}
                currentUserUid={currentUserUid}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {assessmentEvents.length > 0 ? (
        <div className={CIRCLE_SCHEDULE_DAY_DETAIL_SECTION_CLASS}>
          <p className="font-bold text-slate-500 uppercase tracking-wider text-xs">
            {ct('dayAssessments')}
          </p>
          <ul className="space-y-3">
            {assessmentEvents.map((event) => {
              const metricId = assessmentScheduleIdToAnalyticsMetric(event.id);
              return (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-white border border-slate-100 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate text-sm">
                      {assessmentLabel(event)}
                    </p>
                    <p
                      className={cn(
                        'font-bold uppercase tracking-wider mt-0.5 text-[10px]',
                        event.status === 'due' && 'text-rose-600',
                        event.status === 'upcoming' && 'text-amber-600',
                        event.status === 'completed' && 'text-emerald-600',
                      )}
                    >
                      {t(`dashboard.assessmentScheduleCalendar.status.${event.status}`)}
                    </p>
                  </div>
                  {metricId && onOpenAssessment && event.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => onOpenAssessment(metricId)}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                    >
                      {t('dashboard.assessmentScheduleCalendar.view')}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {assessmentEvents.length === 0 && careEvents.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t('dashboard.assessmentScheduleCalendar.noAssessmentsDay')}
        </p>
      ) : null}
    </div>
  );
}
