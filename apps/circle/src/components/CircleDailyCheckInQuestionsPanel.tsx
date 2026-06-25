/** @license SPDX-License-Identifier: Apache-2.0 */
import { cn } from '../lib/utils';
import {
  DAILY_CHECKIN_MAX_QUESTIONS,
  mergeDailyCheckInQuestions,
  resolveDailyCheckInQuestionText,
  setRemoteDailyCheckIn,
  type DailyCheckInQuestion,
  type DailyCheckInQuestionType,
  type PatientRemoteSettingsDoc,
} from '@medxforce/shared';

type CircleDailyCheckInQuestionsPanelProps = {
  settings: PatientRemoteSettingsDoc;
  patch: (next: PatientRemoteSettingsDoc) => void;
  t: (path: string, params?: Record<string, unknown>) => string;
};

const QUESTION_TYPES: DailyCheckInQuestionType[] = ['mood', 'scale', 'yesNo', 'sleep'];

function SettingsToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-12 h-7 rounded-full transition-colors duration-300 relative shrink-0',
        enabled ? 'bg-blue-600' : 'bg-slate-300',
      )}
      aria-pressed={enabled}
    >
      <span
        className={cn(
          'absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300',
          enabled ? 'translate-x-[22px]' : 'translate-x-1',
        )}
      />
    </button>
  );
}

export function CircleDailyCheckInQuestionsPanel({
  settings,
  patch,
  t,
}: CircleDailyCheckInQuestionsPanelProps) {
  const questions = mergeDailyCheckInQuestions(settings.dailyCheckIn?.questions);

  const updateQuestions = (next: DailyCheckInQuestion[]) => {
    patch(setRemoteDailyCheckIn(settings, { questions: next }));
  };

  const patchQuestion = (id: string, questionPatch: Partial<DailyCheckInQuestion>) => {
    updateQuestions(questions.map((q) => (q.id === id ? { ...q, ...questionPatch } : q)));
  };

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <p className="text-xs text-slate-400 leading-relaxed px-0.5">
        {t('dailyCheckIn.settingsQuestionsDesc')}
      </p>
      <div className="space-y-2">
        {questions.slice(0, DAILY_CHECKIN_MAX_QUESTIONS).map((q, index) => {
          const defaultText = q.textKey ? t(q.textKey) : '';
          return (
            <div
              key={q.id}
              className={cn(
                'p-3 rounded-2xl border space-y-3',
                q.enabled ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100 opacity-80',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('dailyCheckIn.questionLabel', { number: index + 1 })}
                    {q.conditional === 'vitalityFeatures' && (
                      <span className="ml-2 normal-case text-emerald-600">
                        ({t('dailyCheckIn.conditionalVitality')})
                      </span>
                    )}
                  </p>
                  {!q.customText?.trim() && defaultText && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{defaultText}</p>
                  )}
                </div>
                <SettingsToggle
                  enabled={q.enabled}
                  onToggle={() => patchQuestion(q.id, { enabled: !q.enabled })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">
                    {t('dailyCheckIn.customQuestionText')}
                  </span>
                  <input
                    type="text"
                    value={q.customText ?? ''}
                    placeholder={defaultText || resolveDailyCheckInQuestionText(q, t)}
                    onChange={(event) => patchQuestion(q.id, { customText: event.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">
                    {t('dailyCheckIn.answerType')}
                  </span>
                  <select
                    value={q.type}
                    onChange={(event) =>
                      patchQuestion(q.id, { type: event.target.value as DailyCheckInQuestionType })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`dailyCheckIn.answerTypes.${type}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
