/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Firestore } from 'firebase/firestore';
import { Mic } from 'lucide-react';
import type { AnalyticsMetricId, AssessmentHistoryMap, CareCalendarDayEvent } from '@medxforce/shared';
import {
  appointmentTasksForPhase,
  appointmentTasksStatusMatch,
  canOfferRecordVisitForAppointment,
  careCalendarDateKey,
  countRecommendedCareCalendarAssessmentNudges,
  getCareCalendarAssessmentNudges,
  openAppointmentTaskCount,
  resolveCareCalendarAppointmentTiming,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTask,
  type CareCalendarVisitBrief,
  type CareCalendarVisitDebrief,
} from '@medxforce/shared';
import { CircleCareCalendarAssessmentNudgesList } from './CircleCareCalendarAssessmentNudgesList';
import { CircleCareCalendarClinicalReferencesPicker } from './CircleCareCalendarClinicalReferencesPicker';
import { CircleCareCalendarEpisodeTaskList } from './CircleCareCalendarEpisodeTaskList';
import { CircleCareCalendarVisitBriefPanel } from './CircleCareCalendarVisitBriefPanel';
import { CircleCareCalendarVisitDebriefPanel } from './CircleCareCalendarVisitDebriefPanel';
import { CircleExpandableTextPreview } from './CircleExpandableTextPreview';
import { cn } from '../lib/utils';

type EpisodeTab = 'details' | 'prepare' | 'followup';

type CircleCareCalendarAppointmentEpisodePanelProps = {
  event: CareCalendarDayEvent;
  appointmentDateKey: string;
  ct: (key: string, params?: Record<string, unknown>) => string;
  t: (path: string, params?: Record<string, unknown>) => string;
  preferences?: {
    featuresVisibility?: Record<string, unknown>;
    appMode?: string;
    fullUserDetails?: { clinical?: { treatmentPhase?: string } } | null;
    assessmentSchedule?: unknown;
  };
  histories?: AssessmentHistoryMap;
  onOpenAssessment?: (metricId: AnalyticsMetricId) => void;
  currentUserUid?: string;
  currentUserName?: string;
  onTasksChange?: (tasks: CareCalendarAppointmentTask[]) => void | Promise<void>;
  detailsContent?: ReactNode;
  onRecordVisit?: (entryId: string) => void;
  patientId?: string;
  db?: Firestore;
  onClinicalReferenceIdsChange?: (ids: string[]) => void | Promise<void>;
  onManageClinicalReferences?: () => void;
  onVisitDebriefChange?: (debrief: CareCalendarVisitDebrief) => void | Promise<void>;
  memberRole?: string;
};

export function CircleCareCalendarAppointmentEpisodePanel({
  event,
  appointmentDateKey,
  ct,
  t,
  preferences,
  histories = {},
  onOpenAssessment,
  currentUserUid,
  currentUserName,
  onTasksChange,
  detailsContent,
  onRecordVisit,
  patientId,
  db,
  onClinicalReferenceIdsChange,
  onManageClinicalReferences,
  onVisitDebriefChange,
  memberRole,
}: CircleCareCalendarAppointmentEpisodePanelProps) {
  const hasEpisode = supportsCareCalendarAppointmentEpisode(event.kind);
  const [tab, setTab] = useState<EpisodeTab>('details');
  const [tasksOverride, setTasksOverride] = useState<CareCalendarAppointmentTask[] | null>(null);
  const [refsOverride, setRefsOverride] = useState<string[] | null>(null);
  const [briefOverride, setBriefOverride] = useState<CareCalendarVisitBrief | null>(null);
  const [debriefOverride, setDebriefOverride] = useState<CareCalendarVisitDebrief | null>(null);

  const activeTasks = useMemo(() => {
    const live = event.appointmentTasks ?? [];
    if (!tasksOverride) return event.appointmentTasks;
    const liveIds = new Set(live.map((task) => task.id));
    const extraDrafts = tasksOverride.filter(
      (task) => task.source === 'manual' && !task.title.trim() && !liveIds.has(task.id),
    );
    if (tasksOverride.some((task) => task.title.trim())) return tasksOverride;
    return extraDrafts.length ? [...live, ...extraDrafts] : event.appointmentTasks;
  }, [event.appointmentTasks, tasksOverride]);
  const activeReferenceIds = refsOverride ?? event.clinicalReferenceIds ?? [];
  const activeBrief = briefOverride ?? event.visitBrief;
  const activeDebrief = debriefOverride ?? event.visitDebrief;

  useEffect(() => {
    setTasksOverride(null);
    setRefsOverride(null);
    setBriefOverride(null);
    setDebriefOverride(null);
  }, [event.entryId]);

  useEffect(() => {
    setRefsOverride((current) => {
      if (!current) return null;
      const stored = event.clinicalReferenceIds ?? [];
      return current.length === stored.length && current.every((id, i) => id === stored[i])
        ? null
        : current;
    });
  }, [event.clinicalReferenceIds]);

  useEffect(() => {
    setTasksOverride((current) => {
      if (!current) return null;
      if (appointmentTasksStatusMatch(event.appointmentTasks, current)) return null;
      const liveIds = new Set((event.appointmentTasks ?? []).map((task) => task.id));
      const unsavedDrafts = current.filter(
        (task) => task.source === 'manual' && !task.title.trim() && !liveIds.has(task.id),
      );
      return unsavedDrafts.length ? unsavedDrafts : null;
    });
  }, [event.appointmentTasks]);

  useEffect(() => {
    setBriefOverride((current) => {
      if (!current) return null;
      const stored = event.visitBrief;
      return stored?.generatedAt === current.generatedAt ? null : current;
    });
  }, [event.visitBrief]);

  useEffect(() => {
    setDebriefOverride((current) => {
      if (!current) return null;
      const stored = event.visitDebrief;
      return stored?.publishedAt === current.publishedAt && stored.summary === current.summary
        ? null
        : current;
    });
  }, [event.visitDebrief]);

  const openPre = openAppointmentTaskCount(appointmentTasksForPhase(activeTasks, 'pre'));
  const openPost = openAppointmentTaskCount(appointmentTasksForPhase(activeTasks, 'post'));

  const preNudgeCount = useMemo(() => {
    if (!preferences) return 0;
    return countRecommendedCareCalendarAssessmentNudges(
      getCareCalendarAssessmentNudges(event, appointmentDateKey, 'pre', preferences, histories),
    );
  }, [appointmentDateKey, event, histories, preferences]);

  const postNudgeCount = useMemo(() => {
    if (!preferences) return 0;
    return countRecommendedCareCalendarAssessmentNudges(
      getCareCalendarAssessmentNudges(event, appointmentDateKey, 'post', preferences, histories),
    );
  }, [appointmentDateKey, event, histories, preferences]);

  const assessmentHighlights = useMemo(() => {
    if (!preferences) return [] as string[];
    return getCareCalendarAssessmentNudges(
      event,
      appointmentDateKey,
      'pre',
      preferences,
      histories,
    )
      .filter((nudge) => nudge.recommended)
      .map((nudge) => t(nudge.titleKey))
      .slice(0, 12);
  }, [appointmentDateKey, event, histories, preferences, t]);

  const showRecordVisit = useMemo(() => {
    if (!onRecordVisit) return false;
    const timing = resolveCareCalendarAppointmentTiming(event, appointmentDateKey);
    return canOfferRecordVisitForAppointment(event.kind, timing, {
      isAppointmentToday: appointmentDateKey === careCalendarDateKey(new Date()),
    });
  }, [appointmentDateKey, event, onRecordVisit]);

  if (!hasEpisode) {
    return <>{detailsContent}</>;
  }

  const taskListProps = {
    allTasks: activeTasks,
    ct,
    currentUserUid,
    onTasksChange,
    onDraftTasksChange: setTasksOverride,
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
        {(
          [
            ['details', ct('episode.tabDetails')],
            ['prepare', ct('episode.tabPrepare')],
            ['followup', ct('episode.tabFollowup')],
          ] as const
        ).map(([key, label]) => {
          const badge =
            key === 'prepare' && openPre + preNudgeCount > 0
              ? openPre + preNudgeCount
              : key === 'followup' && openPost + postNudgeCount > 0
                ? openPost + postNudgeCount
                : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-colors relative',
                tab === key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500',
              )}
            >
              {label}
              {badge > 0 && (
                <span className="ml-1 inline-flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-violet-600 text-white text-[10px] px-1">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'details' && (
        <div className="space-y-4">
          {event.visitSubtype && (
            <p className="text-sm text-slate-600">
              <span className="font-bold text-slate-700">{ct('fields.visitSubtype')}: </span>
              {ct(`visitSubtype.${event.visitSubtype}`)}
            </p>
          )}
          {detailsContent}
          {event.supportingNotes ? (
            <CircleExpandableTextPreview
              label={ct('fields.supportingNotes')}
              text={event.supportingNotes}
              t={t}
              rootClassName={cn(
                (event.details || detailsContent) && 'pt-4 mt-2 border-t border-slate-100',
              )}
            />
          ) : null}
          {showRecordVisit ? (
            <button
              type="button"
              onClick={() => onRecordVisit?.(event.entryId)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200/80 py-3 px-4"
            >
              <Mic size={16} className="shrink-0" aria-hidden />
              {ct('episode.recordVisit')}
            </button>
          ) : null}
        </div>
      )}

      {tab === 'prepare' && (
        <div className="space-y-4">
          {preferences ? (
            <CircleCareCalendarAssessmentNudgesList
              event={event}
              dateKey={appointmentDateKey}
              phase="pre"
              preferences={preferences}
              histories={histories}
              ct={ct}
              t={t}
              onOpenAssessment={onOpenAssessment}
            />
          ) : null}
          {patientId && db && onClinicalReferenceIdsChange ? (
            <CircleCareCalendarClinicalReferencesPicker
              db={db}
              patientId={patientId}
              selectedIds={activeReferenceIds}
              onManageLibrary={onManageClinicalReferences}
              onChange={async (ids) => {
                setRefsOverride(ids);
                try {
                  await onClinicalReferenceIdsChange(ids);
                } catch {
                  setRefsOverride(null);
                }
              }}
            />
          ) : null}
          {patientId ? (
            <CircleCareCalendarVisitBriefPanel
              patientId={patientId}
              entryId={event.entryId}
              appointmentTitle={event.title}
              brief={activeBrief}
              assessmentHighlights={assessmentHighlights}
              generatedByUid={currentUserUid}
              generatedByName={currentUserName}
              db={db}
              memberRole={memberRole}
              t={t}
              onBriefGenerated={(brief) => setBriefOverride(brief)}
            />
          ) : null}
          <CircleCareCalendarEpisodeTaskList
            phase="pre"
            tasks={appointmentTasksForPhase(activeTasks, 'pre')}
            {...taskListProps}
          />
        </div>
      )}
      {tab === 'followup' && (
        <div className="space-y-4">
          {preferences ? (
            <CircleCareCalendarAssessmentNudgesList
              event={event}
              dateKey={appointmentDateKey}
              phase="post"
              preferences={preferences}
              histories={histories}
              ct={ct}
              t={t}
              onOpenAssessment={onOpenAssessment}
            />
          ) : null}
          <CircleCareCalendarVisitDebriefPanel
            debrief={activeDebrief}
            canEdit={!!onVisitDebriefChange}
            t={t}
            onSave={
              onVisitDebriefChange
                ? async (debrief) => {
                    setDebriefOverride(debrief);
                    try {
                      await onVisitDebriefChange(debrief);
                    } catch {
                      setDebriefOverride(null);
                    }
                  }
                : undefined
            }
          />
          <CircleCareCalendarEpisodeTaskList
            phase="post"
            tasks={appointmentTasksForPhase(activeTasks, 'post')}
            {...taskListProps}
          />
          {showRecordVisit ? (
            <button
              type="button"
              onClick={() => onRecordVisit?.(event.entryId)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-colors py-3 px-4"
            >
              <Mic size={16} className="shrink-0" aria-hidden />
              {ct('episode.recordVisit')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
