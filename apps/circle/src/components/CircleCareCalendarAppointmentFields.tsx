/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useState } from 'react';
import { ChevronDown, Mic, MicOff, Plus, Trash2 } from 'lucide-react';
import type { CareCalendarEntryKind } from '@medxforce/shared';
import {
  appointmentTasksForPhase,
  defaultAppointmentTasksForSubtype,
  newAppointmentTaskId,
  supportsCareCalendarAppointmentEpisode,
  visitSubtypesForKind,
  type CareCalendarAppointmentTask,
  type CareCalendarAppointmentTaskAssignee,
  type CareCalendarAppointmentTaskPhase,
  type CareCalendarVisitSubtype,
} from '@medxforce/shared';
import { useDictation } from '../hooks/useDictation';
import { cn } from '../lib/utils';

const SUPPORTING_NOTES_MAX = 2000;

const TASK_ASSIGNEES: CareCalendarAppointmentTaskAssignee[] = [
  'patient',
  'caregiver',
  'family',
  'proxy',
  'creator',
];

type CircleCareCalendarAppointmentEpisodeFieldsProps = {
  kind: CareCalendarEntryKind;
  visitSubtype?: CareCalendarVisitSubtype;
  onVisitSubtypeChange: (subtype: CareCalendarVisitSubtype | undefined) => void;
  supportingNotes: string;
  onSupportingNotesChange: (value: string) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

type CircleCareCalendarAppointmentTaskFieldsProps = {
  kind: CareCalendarEntryKind;
  visitSubtype?: CareCalendarVisitSubtype;
  appointmentTasks: CareCalendarAppointmentTask[];
  onAppointmentTasksChange: (tasks: CareCalendarAppointmentTask[]) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  isEditing?: boolean;
};

type CircleCareCalendarAppointmentFieldsProps = CircleCareCalendarAppointmentEpisodeFieldsProps &
  CircleCareCalendarAppointmentTaskFieldsProps;

function TaskEditorSection({
  phase,
  tasks,
  allTasks,
  onChange,
  t,
  defaultExpanded = false,
}: {
  phase: CareCalendarAppointmentTaskPhase;
  tasks: CareCalendarAppointmentTask[];
  allTasks: CareCalendarAppointmentTask[];
  onChange: (tasks: CareCalendarAppointmentTask[]) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  defaultExpanded?: boolean;
}) {
  const phaseKey = phase === 'pre' ? 'preTasks' : 'postTasks';
  const otherPhase = phase === 'pre' ? 'post' : 'pre';
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  const updatePhaseTasks = (nextPhaseTasks: CareCalendarAppointmentTask[]) => {
    const other = appointmentTasksForPhase(allTasks, otherPhase);
    onChange(phase === 'pre' ? [...nextPhaseTasks, ...other] : [...other, ...nextPhaseTasks]);
  };

  const addTask = () => {
    setExpanded(true);
    updatePhaseTasks([
      ...tasks,
      {
        id: newAppointmentTaskId(),
        phase,
        assignee: 'patient',
        title: '',
        status: 'open',
        source: 'manual',
      },
    ]);
  };

  const updateTask = (id: string, patch: Partial<CareCalendarAppointmentTask>) => {
    updatePhaseTasks(tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  };

  const removeTask = (id: string) => {
    updatePhaseTasks(tasks.filter((task) => task.id !== id));
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 overflow-hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex-1 flex items-center gap-2 px-4 py-3 text-left text-sm font-bold text-slate-800 min-w-0"
          aria-expanded={expanded}
        >
          <span className="shrink-0">{t(`fields.${phaseKey}`)}</span>
          {!expanded && (
            <span className="flex-1 min-w-0 truncate text-sm font-normal text-slate-500">
              {tasks.length > 0
                ? t('fields.tasksCount', { count: tasks.length })
                : t('fields.noTasks')}
            </span>
          )}
          <ChevronDown
            size={16}
            className={cn('shrink-0 text-slate-400 transition-transform ml-auto', expanded && 'rotate-180')}
          />
        </button>
        <button
          type="button"
          onClick={addTask}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 mr-2 rounded-lg text-sm text-violet-700 font-bold hover:bg-violet-50"
          aria-label={t('fields.addTask')}
        >
          <Plus size={14} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 px-4 pb-4 border-t border-slate-100 pt-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400">{t('fields.noTasks')}</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border border-slate-100 bg-white"
                >
                  <input
                    value={task.title}
                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    placeholder={t('fields.taskPlaceholder')}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                  />
                  <div className="flex gap-2 shrink-0">
                    <select
                      value={task.assignee}
                      onChange={(e) =>
                        updateTask(task.id, { assignee: e.target.value as CareCalendarAppointmentTaskAssignee })
                      }
                      className="px-2 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    >
                      {TASK_ASSIGNEES.map((assignee) => (
                        <option key={assignee} value={assignee}>
                          {t(`taskAssignees.${assignee}`)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      aria-label={t('fields.removeTask')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CircleCareCalendarAppointmentEpisodeFields({
  kind,
  visitSubtype,
  onVisitSubtypeChange,
  supportingNotes,
  onSupportingNotesChange,
  t,
}: CircleCareCalendarAppointmentEpisodeFieldsProps) {
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();

  useEffect(() => () => stopRecording(), [stopRecording]);

  if (!supportsCareCalendarAppointmentEpisode(kind)) {
    return null;
  }

  const handleDictation = () => {
    setMicError(null);
    void toggleRecording(
      () => supportingNotes,
      (value) => onSupportingNotesChange(value.slice(0, SUPPORTING_NOTES_MAX)),
    );
  };

  const subtypes = visitSubtypesForKind(kind);

  return (
    <div className="space-y-5 pt-1 border-t border-slate-100">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700">{t('fields.visitSubtype')}</span>
        <select
          value={visitSubtype ?? ''}
          onChange={(e) => onVisitSubtypeChange(e.target.value as CareCalendarVisitSubtype)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
        >
          {subtypes.map((subtype) => (
            <option key={subtype} value={subtype}>
              {t(`visitSubtype.${subtype}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-700">{t('fields.supportingNotes')}</span>
          <button
            type="button"
            onClick={handleDictation}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors',
              isRecording
                ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                : 'text-slate-500 hover:bg-slate-100 hover:text-violet-700',
            )}
            aria-label={isRecording ? t('fields.dictateStop') : t('fields.dictate')}
            aria-pressed={isRecording}
          >
            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            {isRecording ? t('fields.dictateStop') : t('fields.dictate')}
          </button>
        </div>
        <textarea
          value={supportingNotes}
          onChange={(e) => onSupportingNotesChange(e.target.value.slice(0, SUPPORTING_NOTES_MAX))}
          rows={3}
          maxLength={SUPPORTING_NOTES_MAX}
          className={cn(
            'w-full px-4 py-3 rounded-xl border resize-none text-sm',
            isRecording ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200',
          )}
          placeholder={t('fields.supportingNotesPlaceholder')}
        />
        {isRecording && (
          <p className="text-xs text-red-600 font-medium">{t('fields.dictateListening')}</p>
        )}
        {micError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {micError}
          </p>
        )}
      </label>
    </div>
  );
}

export function CircleCareCalendarAppointmentTaskFields({
  kind,
  visitSubtype,
  appointmentTasks,
  onAppointmentTasksChange,
  t,
  isEditing = false,
}: CircleCareCalendarAppointmentTaskFieldsProps) {
  if (!supportsCareCalendarAppointmentEpisode(kind)) {
    return null;
  }

  const preTasks = appointmentTasksForPhase(appointmentTasks, 'pre');
  const postTasks = appointmentTasksForPhase(appointmentTasks, 'post');

  return (
    <div className="space-y-3">
      {isEditing && visitSubtype && (
        <button
          type="button"
          onClick={() => onAppointmentTasksChange(defaultAppointmentTasksForSubtype(visitSubtype))}
          className="text-sm text-violet-700 font-bold hover:underline text-left"
        >
          {t('fields.resetSuggestedTasks')}
        </button>
      )}
      <TaskEditorSection
        phase="pre"
        tasks={preTasks}
        allTasks={appointmentTasks}
        onChange={onAppointmentTasksChange}
        t={t}
        defaultExpanded={isEditing && preTasks.length > 0}
      />
      <TaskEditorSection
        phase="post"
        tasks={postTasks}
        allTasks={appointmentTasks}
        onChange={onAppointmentTasksChange}
        t={t}
        defaultExpanded={isEditing && postTasks.length > 0}
      />
    </div>
  );
}

export function CircleCareCalendarAppointmentFields({
  kind,
  visitSubtype,
  onVisitSubtypeChange,
  supportingNotes,
  onSupportingNotesChange,
  appointmentTasks,
  onAppointmentTasksChange,
  t,
  isEditing = false,
}: CircleCareCalendarAppointmentFieldsProps) {
  return (
    <>
      <CircleCareCalendarAppointmentEpisodeFields
        kind={kind}
        visitSubtype={visitSubtype}
        onVisitSubtypeChange={onVisitSubtypeChange}
        supportingNotes={supportingNotes}
        onSupportingNotesChange={onSupportingNotesChange}
        t={t}
      />
      <CircleCareCalendarAppointmentTaskFields
        kind={kind}
        visitSubtype={visitSubtype}
        appointmentTasks={appointmentTasks}
        onAppointmentTasksChange={onAppointmentTasksChange}
        t={t}
        isEditing={isEditing}
      />
    </>
  );
}
