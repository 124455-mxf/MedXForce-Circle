/** @license SPDX-License-Identifier: Apache-2.0 */
import { useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { CareCalendarDayEvent } from '@medxforce/shared';
import {
  appointmentTasksForPhase,
  openAppointmentTaskCount,
  supportsCareCalendarAppointmentEpisode,
  type CareCalendarAppointmentTask,
} from '@medxforce/shared';
import { cn } from '../lib/utils';

type EpisodeTab = 'details' | 'prepare' | 'followup';

type CircleCareCalendarAppointmentEpisodePanelProps = {
  event: CareCalendarDayEvent;
  ct: (key: string) => string;
  currentUserUid?: string;
  onTasksChange?: (tasks: CareCalendarAppointmentTask[]) => void | Promise<void>;
  detailsContent?: ReactNode;
};

export function CircleCareCalendarAppointmentEpisodePanel({
  event,
  ct,
  currentUserUid,
  onTasksChange,
  detailsContent,
}: CircleCareCalendarAppointmentEpisodePanelProps) {
  const hasEpisode = supportsCareCalendarAppointmentEpisode(event.kind);
  const [tab, setTab] = useState<EpisodeTab>('details');
  const openPre = openAppointmentTaskCount(appointmentTasksForPhase(event.appointmentTasks, 'pre'));
  const openPost = openAppointmentTaskCount(appointmentTasksForPhase(event.appointmentTasks, 'post'));

  if (!hasEpisode) {
    return <>{detailsContent}</>;
  }

  const toggleTask = async (taskId: string, nextStatus: 'open' | 'done' | 'dismissed') => {
    if (!onTasksChange || !event.appointmentTasks) return;
    const now = Date.now();
    const next = event.appointmentTasks.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        status: nextStatus,
        doneAt: nextStatus === 'open' ? undefined : now,
        doneByUid: nextStatus === 'open' ? undefined : currentUserUid,
      };
    });
    await onTasksChange(next);
  };

  const renderTaskList = (phase: 'pre' | 'post') => {
    const tasks = appointmentTasksForPhase(event.appointmentTasks, phase);
    if (!tasks.length) {
      return <p className="text-sm text-slate-400">{ct('episode.noTasks')}</p>;
    }
    return (
      <ul className="space-y-2">
        {tasks.map((task) => {
          const done = task.status === 'done';
          const dismissed = task.status === 'dismissed';
          return (
            <li
              key={task.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl border',
                done || dismissed ? 'border-slate-100 bg-slate-50/60' : 'border-violet-100 bg-violet-50/40',
              )}
            >
              {onTasksChange && !dismissed && (
                <button
                  type="button"
                  onClick={() => toggleTask(task.id, done ? 'open' : 'done')}
                  className={cn(
                    'mt-0.5 shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center',
                    done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 text-slate-400 hover:border-violet-400',
                  )}
                  aria-label={done ? ct('episode.markOpen') : ct('episode.markDone')}
                >
                  {done ? <Check size={14} /> : null}
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium text-slate-800',
                    (done || dismissed) && 'line-through text-slate-400',
                  )}
                >
                  {task.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">
                  {ct(`taskAssignees.${task.assignee}`)}
                </p>
              </div>
              {onTasksChange && phase === 'post' && !done && !dismissed && (
                <button
                  type="button"
                  onClick={() => toggleTask(task.id, 'dismissed')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
                  aria-label={ct('episode.dismissTask')}
                >
                  <X size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
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
            key === 'prepare' && openPre > 0
              ? openPre
              : key === 'followup' && openPost > 0
                ? openPost
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
        <div className="space-y-3">
          {event.visitSubtype && (
            <p className="text-sm text-slate-600">
              <span className="font-bold text-slate-700">{ct('fields.visitSubtype')}: </span>
              {ct(`visitSubtype.${event.visitSubtype}`)}
            </p>
          )}
          {detailsContent}
          {event.supportingNotes && (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-1">{ct('fields.supportingNotes')}</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.supportingNotes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'prepare' && renderTaskList('pre')}
      {tab === 'followup' && renderTaskList('post')}
    </div>
  );
}
