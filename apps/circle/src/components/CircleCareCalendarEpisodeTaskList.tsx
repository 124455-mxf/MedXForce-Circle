/** @license SPDX-License-Identifier: Apache-2.0 */

import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  applyAppointmentTaskStatusChange,
  appointmentTasksForPhase,
  APPOINTMENT_TASK_ASSIGNEE_OPTIONS,
  newAppointmentTaskId,
  normalizeAppointmentTaskAssignee,
  sanitizeCareCalendarAppointmentTasks,
  type CareCalendarAppointmentTask,
  type CareCalendarAppointmentTaskAssignee,
  type CareCalendarAppointmentTaskPhase,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { DebouncedInput } from './DebouncedInput';

type CircleCareCalendarEpisodeTaskListProps = {
  phase: CareCalendarAppointmentTaskPhase;
  tasks: CareCalendarAppointmentTask[] | undefined;
  allTasks: CareCalendarAppointmentTask[] | undefined;
  ct: (key: string, params?: Record<string, unknown>) => string;
  currentUserUid?: string;
  onTasksChange?: (tasks: CareCalendarAppointmentTask[]) => void | Promise<void>;
  onDraftTasksChange?: (tasks: CareCalendarAppointmentTask[] | null) => void;
};

export function CircleCareCalendarEpisodeTaskList({
  phase,
  tasks: phaseTasks,
  allTasks,
  ct,
  currentUserUid,
  onTasksChange,
  onDraftTasksChange,
}: CircleCareCalendarEpisodeTaskListProps) {
  const tasks = phaseTasks ?? [];
  const canEdit = !!onTasksChange;
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const focusTaskIdRef = useRef<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const editorCardRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!focusTaskIdRef.current) return;
    const input = inputRefs.current.get(focusTaskIdRef.current);
    if (input) {
      input.focus();
      focusTaskIdRef.current = null;
    }
  }, [tasks, editingTaskId]);

  useEffect(() => {
    if (!editingTaskId) return;
    const onPointerDown = (event: PointerEvent) => {
      const card = editorCardRef.current;
      if (card && event.target instanceof Node && card.contains(event.target)) return;
      setEditingTaskId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [editingTaskId]);

  const mergePhaseTasks = (nextPhaseTasks: CareCalendarAppointmentTask[]) => {
    const otherPhase = phase === 'pre' ? 'post' : 'pre';
    const other = appointmentTasksForPhase(allTasks, otherPhase);
    return phase === 'pre' ? [...nextPhaseTasks, ...other] : [...other, ...nextPhaseTasks];
  };

  const applyLocal = (nextAll: CareCalendarAppointmentTask[]) => {
    onDraftTasksChange?.(nextAll);
  };

  const localTasksWithEmptyDraft = (
    sanitized: CareCalendarAppointmentTask[],
    source: CareCalendarAppointmentTask[],
  ) => {
    const emptyDraft = source.find(
      (task) => task.source === 'manual' && task.status === 'open' && !task.title.trim(),
    );
    if (!emptyDraft) return sanitized;
    return [...sanitized, emptyDraft];
  };

  const persist = async (nextAll: CareCalendarAppointmentTask[]) => {
    if (!onTasksChange) return;
    applyLocal(nextAll);
    const sanitized = sanitizeCareCalendarAppointmentTasks(nextAll);
    try {
      await onTasksChange(sanitized);
      onDraftTasksChange?.(localTasksWithEmptyDraft(sanitized, nextAll));
      setSaveError(false);
    } catch (err) {
      console.warn('Care calendar task save failed', err);
      onDraftTasksChange?.(null);
      setSaveError(true);
      throw err;
    }
  };

  const addTask = () => {
    const existingEmpty = tasks.find(
      (task) => task.source === 'manual' && task.status === 'open' && !task.title.trim(),
    );
    if (existingEmpty) {
      setEditingTaskId(existingEmpty.id);
      focusTaskIdRef.current = existingEmpty.id;
      return;
    }

    const id = newAppointmentTaskId();
    const nextPhase = [
      ...tasks,
      {
        id,
        phase,
        assignee: 'patient' as const,
        title: '',
        status: 'open' as const,
        source: 'manual' as const,
      },
    ];
    setEditingTaskId(id);
    focusTaskIdRef.current = id;
    applyLocal(mergePhaseTasks(nextPhase));
  };

  const updateTask = async (taskId: string, patch: Partial<CareCalendarAppointmentTask>) => {
    const base = allTasks ?? [];
    const nextAll = base.map((task) => (task.id === taskId ? { ...task, ...patch } : task));
    applyLocal(nextAll);
    const updated = nextAll.find((task) => task.id === taskId);
    if (updated?.title.trim()) {
      await persist(nextAll);
    }
  };

  const removeTask = async (taskId: string) => {
    setEditingTaskId((current) => (current === taskId ? null : current));
    const nextAll = (allTasks ?? []).filter((task) => task.id !== taskId);
    await persist(nextAll);
  };

  const toggleStatus = async (taskId: string, nextStatus: 'open' | 'done') => {
    const nextAll = applyAppointmentTaskStatusChange(allTasks ?? [], taskId, nextStatus, currentUserUid);
    await persist(nextAll);
  };

  const phaseLabel = phase === 'pre' ? ct('fields.preTasks') : ct('fields.postTasks');

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-sm font-bold text-slate-700">{phaseLabel}</p>
        {canEdit ? (
          <button
            type="button"
            onClick={addTask}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-violet-700 text-xs font-bold hover:bg-violet-50"
          >
            <Plus size={14} />
            {ct('fields.addTask')}
          </button>
        ) : null}
      </div>
      {saveError ? (
        <p className="text-sm text-rose-600 px-0.5">{ct('errors.saveFailed')}</p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 px-0.5">{ct('episode.noTasks')}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const done = task.status === 'done';
            const isEmptyDraft = !task.title.trim();
            const editable =
              canEdit &&
              task.source === 'manual' &&
              !done &&
              (isEmptyDraft || editingTaskId === task.id);

            return (
              <li
                key={task.id}
                ref={editingTaskId === task.id ? editorCardRef : undefined}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border',
                  done ? 'border-slate-100 bg-slate-50/60' : 'border-violet-100 bg-violet-50/40',
                )}
              >
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void toggleStatus(task.id, done ? 'open' : 'done')}
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
                ) : null}

                <div className="min-w-0 flex-1 space-y-2">
                  {editable ? (
                    <>
                      <DebouncedInput
                        ref={(node) => {
                          if (node) inputRefs.current.set(task.id, node);
                          else inputRefs.current.delete(task.id);
                        }}
                        value={task.title}
                        onChange={(value) => void updateTask(task.id, { title: value })}
                        debounceTime={300}
                        placeholder={ct('fields.taskPlaceholder')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                      />
                      <select
                        value={task.assignee}
                        onChange={(e) =>
                          void updateTask(task.id, {
                            assignee: e.target.value as CareCalendarAppointmentTaskAssignee,
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        {APPOINTMENT_TASK_ASSIGNEE_OPTIONS.map((assignee) => (
                          <option key={assignee} value={assignee}>
                            {ct(`taskAssignees.${assignee}`)}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <p
                        className={cn(
                          'text-sm font-medium text-slate-800',
                          done && 'line-through text-slate-400',
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        {ct(`taskAssignees.${normalizeAppointmentTaskAssignee(task.assignee)}`)}
                        {task.source === 'ai' ? ` · ${ct('episode.taskSourceAi')}` : ''}
                      </p>
                    </>
                  )}
                </div>

                {canEdit && !done ? (
                  <div className="flex shrink-0 items-start gap-0.5">
                    {task.source === 'manual' && task.title.trim() && !editable ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(task.id);
                          focusTaskIdRef.current = task.id;
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                        aria-label={ct('episode.editTask')}
                      >
                        <Pencil size={14} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void removeTask(task.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      aria-label={ct('fields.removeTask')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
