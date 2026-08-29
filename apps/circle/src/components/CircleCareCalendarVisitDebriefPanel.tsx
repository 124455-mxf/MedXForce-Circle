/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState } from 'react';
import { ClipboardCopy, Loader2, Mic, MicOff, NotebookPen, Stethoscope } from 'lucide-react';
import {
  createManualVisitNotesDebrief,
  isManualVisitNotesDebrief,
  visitNoteAdditions,
  type CareCalendarVisitDebrief,
  type CareCalendarVisitNoteAddition,
} from '@medxforce/shared';
import { useDictation } from '../hooks/useDictation';
import { copyVisitDebriefToClipboard } from '../lib/visitBriefExport';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import { circleUiLanguageToLocale } from '../lib/circleLanguages';
import { cn } from '../lib/utils';

const VISIT_NOTES_MAX = 2000;

type CircleCareCalendarVisitDebriefPanelProps = {
  debrief?: CareCalendarVisitDebrief;
  canEdit?: boolean;
  allowCreate?: boolean;
  capturedByName?: string;
  editedByUid?: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  onSave?: (debrief: CareCalendarVisitDebrief) => void | Promise<void>;
};

function formatNoteWhen(capturedAt: number, locale: string): string {
  return new Date(capturedAt).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function noteAttribution(
  item: CareCalendarVisitNoteAddition,
  t: CircleCareCalendarVisitDebriefPanelProps['t'],
  locale: string,
  recorded: boolean,
): string {
  const when = formatNoteWhen(item.capturedAt, locale);
  const name = item.capturedByName?.trim();
  if (recorded && name) return t('visitBrief.debriefCapturedByAt', { name, when });
  return name
    ? t('visitBrief.notesCapturedByAt', { name, when })
    : t('visitBrief.notesCapturedAt', { when });
}

export function CircleCareCalendarVisitDebriefPanel({
  debrief,
  canEdit = false,
  allowCreate = false,
  capturedByName,
  editedByUid,
  t,
  onSave,
}: CircleCareCalendarVisitDebriefPanelProps) {
  const { language } = useCircleI18nContext();
  const locale = circleUiLanguageToLocale(language);
  const additions = visitNoteAdditions(debrief);
  const [draftSummary, setDraftSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isRecording, micError, setMicError, toggleRecording, stopRecording } = useDictation();

  useEffect(() => {
    setDraftSummary('');
    setError(null);
  }, [debrief?.visitCaptureId, debrief?.publishedAt, debrief?.summary, debrief?.editedAt]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  const applyDraft = (next: string) => setDraftSummary(next.slice(0, VISIT_NOTES_MAX));

  const handleDictation = () => {
    setMicError(null);
    void toggleRecording(() => draftSummary, applyDraft);
  };

  const canCompose = canEdit && !!onSave && (debrief || allowCreate);
  if (!debrief && !canCompose) return null;

  const creating = !debrief;
  const manualNotes = isManualVisitNotesDebrief(debrief);
  const dirty = draftSummary.trim().length > 0;
  const TitleIcon = creating || manualNotes ? NotebookPen : Stethoscope;

  const handleSave = async () => {
    if (!onSave || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(
        createManualVisitNotesDebrief({
          ...(creating ? { summary: draftSummary } : { addedText: draftSummary, existing: debrief }),
          capturedByName,
          editedByUid,
        }),
      );
      setDraftSummary('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('visitBrief.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    const payload = debrief
      ? debrief
      : createManualVisitNotesDebrief({ summary: draftSummary, capturedByName, editedByUid });
    if (!payload.summary.trim() && !draftSummary.trim()) return;
    try {
      await copyVisitDebriefToClipboard(
        draftSummary.trim() && creating
          ? payload
          : debrief ?? payload,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('visitBrief.copyError'));
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <TitleIcon size={18} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-900">
            {t(creating || manualNotes ? 'visitBrief.notesTitle' : 'visitBrief.debriefTitle')}
          </p>
          {creating && additions.length === 0 ? (
            <p className="text-sm text-slate-500 mt-0.5">{t('visitBrief.notesEmpty')}</p>
          ) : null}
        </div>
        {canCompose ? (
          <button
            type="button"
            onClick={handleDictation}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors',
              isRecording
                ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                : 'text-slate-500 hover:bg-white hover:text-emerald-800',
            )}
            aria-label={
              isRecording
                ? t('dashboard.careCalendar.fields.dictateStop')
                : t('dashboard.careCalendar.fields.dictate')
            }
            aria-pressed={isRecording}
          >
            {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
            {isRecording
              ? t('dashboard.careCalendar.fields.dictateStop')
              : t('dashboard.careCalendar.fields.dictate')}
          </button>
        ) : null}
      </div>

      {additions.map((item, index) => (
        <div
          key={`${item.capturedAt}-${index}`}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 space-y-1"
        >
          <p className="text-xs font-semibold text-slate-500">
            {noteAttribution(item, t, locale, !manualNotes && index === 0)}
          </p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{item.text}</p>
        </div>
      ))}

      {canCompose ? (
        <div className="space-y-1.5">
          <textarea
            value={draftSummary}
            onChange={(e) => applyDraft(e.target.value)}
            rows={additions.length ? 4 : 5}
            maxLength={VISIT_NOTES_MAX}
            placeholder={t(additions.length ? 'visitBrief.notesAddPlaceholder' : 'visitBrief.notesPlaceholder')}
            className={cn(
              'w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-800 leading-relaxed',
              isRecording ? 'border-red-200 ring-2 ring-red-100' : 'border-emerald-100',
            )}
          />
          {isRecording ? (
            <p className="text-xs text-red-600 font-medium">
              {t('dashboard.careCalendar.fields.dictateListening')}
            </p>
          ) : null}
          {micError ? (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {micError}
            </p>
          ) : null}
        </div>
      ) : null}

      {debrief && debrief.actionItems.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('visitBrief.debriefActionItems')}
          </p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {debrief.actionItems.map((item) => (
              <li key={item.text}>• {item.text}</li>
            ))}
          </ul>
          <p className="text-sm text-slate-500 mt-2">{t('visitBrief.debriefTasksHint')}</p>
        </div>
      ) : null}

      {debrief && debrief.followUpQuestions.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('visitBrief.debriefFollowUp')}
          </p>
          <ol className="mt-1 space-y-1 text-sm text-slate-700 list-decimal list-inside">
            {debrief.followUpQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(debrief || draftSummary.trim()) && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            <ClipboardCopy size={14} />
            {copied ? t('visitBrief.copied') : t('visitBrief.copy')}
          </button>
        )}
        {canCompose && dirty ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving
              ? t('visitBrief.saving')
              : creating
                ? t('visitBrief.saveNotes')
                : t('visitBrief.saveNotes')}
          </button>
        ) : null}
      </div>
    </section>
  );
}
