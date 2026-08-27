/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import {
  careCalendarAppointmentCardSurfaceClasses,
  careCalendarCardTimingBorderClasses,
  careCalendarDateKey,
  careCalendarPrepBorderClasses,
  formatCareCalendarTime,
  formatCareCalendarTimeRange,
  getCalendarWeekDays,
  resolveAppointmentPrepHighlight,
  resolveCareCalendarAppointmentTiming,
  type AnalyticsMetricId,
  type AssessmentScheduleDayEvent,
  type CareCalendarDayEvent,
  type CareCalendarMemberInviteContext,
} from '@medxforce/shared';
import { assessmentScheduleIdToAnalyticsMetric } from '../lib/circleAssessmentScheduleMetrics';
import type { CircleAssessmentScheduleContext } from '../lib/circleAssessmentScheduleMetrics';
import {
  CIRCLE_SCHEDULE_WEEK_SCROLL_CLASS,
  CIRCLE_SCHEDULE_WEEK_VIEW_SHELL_CLASS,
} from '../lib/circleScheduleLayout';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { formatCircleDate } from '../lib/circleLanguages';
import { cn } from '../lib/utils';
import { CircleCareCalendarKindMeta } from './CircleCareCalendarKindMeta';
import { CircleCareCalendarForYouLine } from './CircleCareCalendarForYouLine';
import { CircleCareCalendarSelfRsvpStatusBadge } from './CircleCareCalendarSelfRsvpStatusBadge';
import { CircleTranslatedUserText } from './CircleTranslatedUserText';
import type { CircleScheduleAppointmentSelection } from './CircleScheduleWeekView';

type CircleScheduleWeekAgendaProps = {
  weekAnchor: Date;
  calendarByDay: Map<string, AssessmentScheduleDayEvent[]>;
  careByDay: Map<string, CareCalendarDayEvent[]>;
  todayKey: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  assessmentLabel: (event: AssessmentScheduleDayEvent) => string;
  onOpenAppointment: (selection: CircleScheduleAppointmentSelection) => void;
  onEditAppointment?: (entryId: string) => void;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  assessmentSchedule?: CircleAssessmentScheduleContext;
  db?: Firestore;
  patientId?: string;
  currentUserUid?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
  viewerTimezoneId?: string;
};

function sortCareEvents(events: CareCalendarDayEvent[]): CareCalendarDayEvent[] {
  return [...events].sort((a, b) => (a.startTimeMinutes ?? 0) - (b.startTimeMinutes ?? 0));
}

export function CircleScheduleWeekAgenda({
  weekAnchor,
  calendarByDay,
  careByDay,
  todayKey,
  t,
  assessmentLabel,
  onOpenAppointment,
  onOpenAssessment,
  assessmentSchedule,
  currentUserUid,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  viewerTimezoneId,
}: CircleScheduleWeekAgendaProps) {
  const { language } = useCircleI18nContext();
  const ct = (key: string, params?: Record<string, unknown>) =>
    t(`dashboard.careCalendar.${key}`, params);
  const [expandedAssessmentKey, setExpandedAssessmentKey] = useState<string | null>(null);
  const weekDays = getCalendarWeekDays(weekAnchor);
  const inviteContext = useMemo<CareCalendarMemberInviteContext | null>(
    () =>
      currentUserUid
        ? {
            memberUid: currentUserUid,
            contactId: memberContactId,
            memberDocContactId,
            inviteContactId,
            displayName: memberDisplayName,
          }
        : null,
    [currentUserUid, inviteContactId, memberContactId, memberDisplayName, memberDocContactId],
  );

  return (
    <div className={CIRCLE_SCHEDULE_WEEK_VIEW_SHELL_CLASS}>
      <div className={cn(CIRCLE_SCHEDULE_WEEK_SCROLL_CLASS, 'p-1 space-y-4')}>
        {weekDays.map((date) => {
          const dateKey = careCalendarDateKey(date);
          const isToday = dateKey === todayKey;
          const appointments = sortCareEvents(careByDay.get(dateKey) ?? []);
          const assessments = calendarByDay.get(dateKey) ?? [];
          const dayLabel = formatCircleDate(date, language, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });

          return (
            <section key={dateKey} className="space-y-2">
              <div className={cn('flex items-center gap-2 px-1', isToday && 'text-blue-700')}>
                <h3
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    isToday ? 'text-blue-700' : 'text-slate-500',
                  )}
                >
                  {dayLabel}
                </h3>
                {isToday ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    {t('schedulePage.views.today')}
                  </span>
                ) : null}
              </div>

              {appointments.length === 0 && assessments.length === 0 ? null : (
                <ul className="space-y-2">
                  {appointments.map((event) => {
                    const itemKey = `appt:${dateKey}:${event.entryId}`;
                    const timeLabel =
                      formatCareCalendarTimeRange(event.startTimeMinutes, event.endTimeMinutes, event.timezoneId) ||
                      formatCareCalendarTime(event.startTimeMinutes) ||
                      t('schedulePage.views.allDay');
                    const timing = resolveCareCalendarAppointmentTiming(event, dateKey, {
                      highlightTodayTiming: isToday,
                    });
                    const prepHighlight = assessmentSchedule
                      ? resolveAppointmentPrepHighlight(event, dateKey, timing, {
                          preferences: assessmentSchedule.preferences,
                          histories: assessmentSchedule.histories,
                        })
                      : 'none';
                    return (
                      <li
                        key={itemKey}
                        className={cn(
                          'rounded-2xl overflow-hidden shadow-sm',
                          careCalendarAppointmentCardSurfaceClasses(timing, prepHighlight),
                          prepHighlight !== 'none'
                            ? careCalendarPrepBorderClasses(prepHighlight, 'week')
                            : careCalendarCardTimingBorderClasses(timing, prepHighlight),
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenAppointment({ dateKey, event })}
                          className="flex w-full items-start gap-3 px-3 py-3 text-left"
                        >
                          <span
                            className={cn(
                              'shrink-0 w-16 pt-0.5 text-xs font-bold leading-tight',
                              timing === 'past' && 'text-slate-600',
                              timing === 'in_progress' && 'text-emerald-800',
                              timing !== 'past' && timing !== 'in_progress' && 'text-violet-800',
                            )}
                          >
                            {timeLabel}
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              {inviteContext ? (
                                <CircleCareCalendarSelfRsvpStatusBadge
                                  event={event}
                                  inviteContext={inviteContext}
                                  t={t}
                                  dateKey={dateKey}
                                  size="sm"
                                />
                              ) : null}
                            </span>
                            <CircleTranslatedUserText
                              text={event.title}
                              className="text-sm font-bold text-slate-900"
                              showToggle={false}
                            />
                            <CircleCareCalendarForYouLine
                              dateKey={dateKey}
                              startMinutes={event.startTimeMinutes}
                              endMinutes={event.endTimeMinutes}
                              eventTimeZoneId={event.timezoneId}
                              viewerTimeZoneId={viewerTimezoneId}
                              t={t}
                            />
                            <CircleCareCalendarKindMeta
                              kind={event.kind}
                              visitSubtype={event.visitSubtype}
                              source={event.source}
                              ct={ct}
                            />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {assessments.map((event) => {
                    const itemKey = `assess:${dateKey}:${event.id}`;
                    const expanded = expandedAssessmentKey === itemKey;
                    const metricId = assessmentScheduleIdToAnalyticsMetric(event.id);
                    const isCompleted = event.status === 'completed';
                    const canOpen = !!metricId && !!onOpenAssessment && !isCompleted;
                    const canExpand = !canOpen && !isCompleted;
                    return (
                      <li
                        key={itemKey}
                        className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (canOpen) {
                              onOpenAssessment?.(metricId!);
                              return;
                            }
                            if (!canExpand) return;
                            setExpandedAssessmentKey((current) =>
                              current === itemKey ? null : itemKey,
                            );
                          }}
                          aria-expanded={canExpand ? expanded : undefined}
                          className="flex w-full items-start gap-3 px-3 py-3 text-left"
                        >
                          <span className="shrink-0 w-16 pt-0.5 text-[10px] font-bold text-slate-500 leading-tight">
                            {t('schedulePage.views.allDay')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-slate-900">
                              {assessmentLabel(event)}
                            </span>
                            <span
                              className={cn(
                                'mt-0.5 block text-[10px] font-bold uppercase tracking-wider',
                                event.status === 'due' && 'text-rose-600',
                                event.status === 'upcoming' && 'text-amber-600',
                                isCompleted && 'text-emerald-600',
                              )}
                            >
                              {t(`dashboard.assessmentScheduleCalendar.status.${event.status}`)}
                            </span>
                          </span>
                          {canExpand ? (
                            <ChevronDown
                              size={18}
                              className={cn(
                                'shrink-0 text-slate-400 mt-0.5 transition-transform',
                                expanded && 'rotate-180',
                              )}
                            />
                          ) : null}
                        </button>
                        {expanded && canExpand ? (
                          <div className="border-t border-slate-100 px-3 py-3">
                            <p className="text-sm text-slate-500">
                              {t(`dashboard.assessmentScheduleCalendar.status.${event.status}`)}
                            </p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
