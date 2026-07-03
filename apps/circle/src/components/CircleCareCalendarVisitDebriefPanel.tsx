/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { ClipboardCopy, Loader2, Stethoscope } from 'lucide-react';
import type { CareCalendarVisitDebrief } from '@medxforce/shared';
import { copyVisitDebriefToClipboard } from '../lib/visitBriefExport';

type CircleCareCalendarVisitDebriefPanelProps = {
  debrief?: CareCalendarVisitDebrief;
  canEdit?: boolean;
  t: (path: string, params?: Record<string, unknown>) => string;
  onSave?: (debrief: CareCalendarVisitDebrief) => void | Promise<void>;
};

export function CircleCareCalendarVisitDebriefPanel({
  debrief,
  canEdit = false,
  t,
  onSave,
}: CircleCareCalendarVisitDebriefPanelProps) {
  const [draftSummary, setDraftSummary] = useState(debrief?.summary ?? '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!debrief) return null;

  const dirty = draftSummary.trim() !== debrief.summary.trim();

  const handleSave = async () => {
    if (!onSave || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...debrief,
        summary: draftSummary.trim().slice(0, 4000),
        editedAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('visitBrief.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await copyVisitDebriefToClipboard({ ...debrief, summary: draftSummary.trim() || debrief.summary });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('visitBrief.copyError'));
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Stethoscope size={18} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-emerald-900">{t('visitBrief.debriefTitle')}</p>
          {debrief.capturedByName ? (
            <p className="text-sm text-slate-500 mt-0.5">
              {t('visitBrief.debriefCapturedBy', { name: debrief.capturedByName })}
            </p>
          ) : null}
        </div>
      </div>

      {canEdit && onSave ? (
        <textarea
          value={draftSummary}
          onChange={(e) => setDraftSummary(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-800 leading-relaxed"
        />
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{debrief.summary}</p>
      )}

      {debrief.actionItems.length > 0 ? (
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

      {debrief.followUpQuestions.length > 0 ? (
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
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
        >
          <ClipboardCopy size={14} />
          {copied ? t('visitBrief.copied') : t('visitBrief.copy')}
        </button>
        {canEdit && onSave && dirty ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? t('visitBrief.saving') : t('visitBrief.saveEdits')}
          </button>
        ) : null}
      </div>
    </section>
  );
}
