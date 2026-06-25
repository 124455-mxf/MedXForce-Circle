/** @license SPDX-License-Identifier: Apache-2.0 */
import { CalendarClock, Lock } from 'lucide-react';
import {
  SCHEDULABLE_ASSESSMENTS,
  buildDefaultAssessmentScheduleRules,
  formatRecurrenceLabel,
  resolveEffectiveAssessmentScheduleRules,
  sanitizeRemoteAssessmentSchedule,
  setRemoteAssessmentSchedule,
  type AssessmentRecurrence,
  type AssessmentRecurrenceKind,
  type AssessmentScheduleId,
  type AssessmentScheduleRule,
  type PatientRemoteSettingsDoc,
  type RemoteAssessmentSchedule,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleCollapsibleSection } from './CircleCollapsibleSection';

type CircleAssessmentSchedulePanelProps = {
  settings: PatientRemoteSettingsDoc;
  treatmentPhase?: string | null;
  patch: (next: PatientRemoteSettingsDoc) => void;
  t: (path: string, params?: Record<string, unknown>) => string;
};

const RECURRENCE_KINDS: AssessmentRecurrenceKind[] = ['daily', 'weekdays', 'weekly', 'monthly'];

function defaultRecurrenceForKind(kind: AssessmentRecurrenceKind): AssessmentRecurrence {
  if (kind === 'daily') return { kind: 'daily' };
  if (kind === 'weekdays') return { kind: 'weekdays', daysOfWeek: [1, 3, 5] };
  if (kind === 'weekly') return { kind: 'weekly', dayOfWeek: 1 };
  return { kind: 'monthly', dayOfMonth: 1 };
}

function scheduleT(
  t: CircleAssessmentSchedulePanelProps['t'],
  path: string,
  params?: Record<string, unknown>,
): string {
  if (path.startsWith('settings.assessmentSchedule.')) {
    const sub = path.slice('settings.assessmentSchedule.'.length);
    return t(`remoteSettings.assessmentSchedule.${sub}`, params);
  }
  return t(path, params);
}

function ensureRemoteSchedule(
  settings: PatientRemoteSettingsDoc,
  treatmentPhase?: string | null,
): RemoteAssessmentSchedule {
  const existing = sanitizeRemoteAssessmentSchedule(settings.assessmentSchedule);
  if (existing?.rules && Object.keys(existing.rules).length > 0) {
    return {
      rules: existing.rules,
      lockedIds: existing.lockedIds ?? [],
    };
  }
  return {
    rules: buildDefaultAssessmentScheduleRules(treatmentPhase),
    lockedIds: [],
  };
}

function persistRemoteSchedule(
  settings: PatientRemoteSettingsDoc,
  treatmentPhase: string | null | undefined,
  patch: (next: PatientRemoteSettingsDoc) => void,
  next: RemoteAssessmentSchedule,
) {
  patch(setRemoteAssessmentSchedule(settings, next));
}

export function CircleAssessmentSchedulePanel({
  settings,
  treatmentPhase,
  patch,
  t,
}: CircleAssessmentSchedulePanelProps) {
  const remote = ensureRemoteSchedule(settings, treatmentPhase);
  const locked = new Set(remote.lockedIds ?? []);
  const effectiveRules = resolveEffectiveAssessmentScheduleRules({
    preferences: {
      appMode: settings.appMode,
      fullUserDetails: { clinical: { treatmentPhase: treatmentPhase ?? undefined } },
    },
    remoteAssessmentSchedule: remote,
  });

  const sections = [
    { id: 'physical', titleKey: 'remoteSettings.assessmentSchedule.sections.physical' },
    { id: 'visionHearing', titleKey: 'remoteSettings.assessmentSchedule.sections.visionHearing' },
    {
      id: 'neurologicalPhysiological',
      titleKey: 'remoteSettings.assessmentSchedule.sections.neurologicalPhysiological',
    },
  ] as const;

  const updateRule = (assessmentId: AssessmentScheduleId, patchRule: Partial<AssessmentScheduleRule>) => {
    const nextRules = {
      ...remote.rules,
      [assessmentId]: {
        ...(remote.rules[assessmentId] ?? effectiveRules[assessmentId]),
        ...patchRule,
        assessmentId,
      },
    };
    persistRemoteSchedule(settings, treatmentPhase, patch, {
      ...remote,
      rules: nextRules,
    });
  };

  const toggleLock = (assessmentId: AssessmentScheduleId) => {
    const nextLocked = new Set(locked);
    if (nextLocked.has(assessmentId)) nextLocked.delete(assessmentId);
    else nextLocked.add(assessmentId);
    persistRemoteSchedule(settings, treatmentPhase, patch, {
      ...remote,
      lockedIds: [...nextLocked],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <CalendarClock size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-normal text-slate-800">{t('remoteSettings.assessmentSchedule.title')}</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('remoteSettings.assessmentSchedule.description')}
          </p>
        </div>
      </div>

      {sections.map((section) => {
        const items = SCHEDULABLE_ASSESSMENTS.filter((item) => item.sectionId === section.id);
        const enabledCount = items.filter((item) => effectiveRules[item.id]?.enabled).length;
        return (
          <CircleCollapsibleSection
            key={section.id}
            title={t(section.titleKey)}
            defaultOpen={false}
          >
            <div className="p-4 space-y-2">
              <p className="text-[11px] text-slate-400 px-0.5">
                {t('remoteSettings.assessmentSchedule.sectionSummary', {
                  enabled: enabledCount,
                  total: items.length,
                })}
              </p>
              {items.map((meta) => {
                const rule = effectiveRules[meta.id];
                const isLocked = locked.has(meta.id);
                return (
                  <div
                    key={meta.id}
                    className={cn(
                      'rounded-2xl border border-slate-100 bg-white p-3 space-y-3',
                      !meta.released && 'opacity-70',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {t(`remoteSettings.assessmentSchedule.items.${meta.id}`)}
                          </p>
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Lock size={10} />
                              {t('remoteSettings.assessmentSchedule.lockedForPatient')}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatRecurrenceLabel(rule.recurrence, (path, params) =>
                            scheduleT(t, path, params),
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!meta.released}
                          onClick={() => updateRule(meta.id, { enabled: !rule.enabled })}
                          className={cn(
                            'w-12 h-7 rounded-full transition-all duration-300 relative',
                            !meta.released
                              ? 'bg-slate-200 cursor-not-allowed'
                              : rule.enabled
                                ? 'bg-blue-600'
                                : 'bg-slate-300',
                          )}
                          aria-pressed={rule.enabled}
                        >
                          <span
                            className={cn(
                              'absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300',
                              rule.enabled && meta.released ? 'translate-x-[22px]' : 'translate-x-1',
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          disabled={!meta.released}
                          onClick={() => toggleLock(meta.id)}
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border transition-colors',
                            isLocked
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200',
                            !meta.released && 'opacity-60 cursor-not-allowed',
                          )}
                        >
                          {isLocked
                            ? t('remoteSettings.assessmentSchedule.unlock')
                            : t('remoteSettings.assessmentSchedule.lock')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {RECURRENCE_KINDS.map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          disabled={!meta.released || !rule.enabled}
                          onClick={() => updateRule(meta.id, { recurrence: defaultRecurrenceForKind(kind) })}
                          className={cn(
                            'px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-colors',
                            rule.recurrence.kind === kind
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200',
                            (!meta.released || !rule.enabled) && 'opacity-60 cursor-not-allowed',
                          )}
                        >
                          {scheduleT(t, `settings.assessmentSchedule.kind.${kind}`)}
                        </button>
                      ))}
                    </div>

                    {rule.recurrence.kind === 'weekdays' && (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: 7 }, (_, day) => {
                          const active = rule.recurrence.daysOfWeek.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={!meta.released || !rule.enabled}
                              onClick={() => {
                                const days = active
                                  ? rule.recurrence.kind === 'weekdays'
                                    ? rule.recurrence.daysOfWeek.filter((value) => value !== day)
                                    : []
                                  : rule.recurrence.kind === 'weekdays'
                                    ? [...rule.recurrence.daysOfWeek, day].sort((a, b) => a - b)
                                    : [day];
                                if (days.length === 0) return;
                                updateRule(meta.id, { recurrence: { kind: 'weekdays', daysOfWeek: days } });
                              }}
                              className={cn(
                                'w-9 h-9 rounded-full text-[10px] font-bold border',
                                active
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 text-slate-600 border-slate-100',
                              )}
                            >
                              {scheduleT(t, `settings.assessmentSchedule.weekdayShort.${day}`)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {rule.recurrence.kind === 'weekly' && (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: 7 }, (_, day) => (
                          <button
                            key={day}
                            type="button"
                            disabled={!meta.released || !rule.enabled}
                            onClick={() =>
                              updateRule(meta.id, { recurrence: { kind: 'weekly', dayOfWeek: day } })
                            }
                            className={cn(
                              'w-9 h-9 rounded-full text-[10px] font-bold border',
                              rule.recurrence.dayOfWeek === day
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-100',
                            )}
                          >
                            {scheduleT(t, `settings.assessmentSchedule.weekdayShort.${day}`)}
                          </button>
                        ))}
                      </div>
                    )}

                    {rule.recurrence.kind === 'monthly' && (
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <span>{scheduleT(t, 'settings.assessmentSchedule.dayOfMonth')}</span>
                        <select
                          disabled={!meta.released || !rule.enabled}
                          value={rule.recurrence.dayOfMonth}
                          onChange={(event) =>
                            updateRule(meta.id, {
                              recurrence: {
                                kind: 'monthly',
                                dayOfMonth: Number(event.target.value),
                              },
                            })
                          }
                          className="rounded-xl border border-slate-200 px-2 py-1.5 bg-white text-sm"
                        >
                          {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </CircleCollapsibleSection>
        );
      })}
    </div>
  );
}
