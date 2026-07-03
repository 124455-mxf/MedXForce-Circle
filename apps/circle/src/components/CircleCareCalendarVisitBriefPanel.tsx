/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { ClipboardCopy, Download, FileText, Loader2, Sparkles } from 'lucide-react';
import type { CareCalendarVisitBrief } from '@medxforce/shared';
import { generateVisitBrief } from '../services/visitBriefApi';
import {
  copyVisitBriefToClipboard,
  downloadVisitBriefHtml,
  downloadVisitBriefWord,
} from '../lib/visitBriefExport';

type CircleCareCalendarVisitBriefPanelProps = {
  patientId: string;
  entryId: string;
  appointmentTitle: string;
  brief?: CareCalendarVisitBrief;
  assessmentHighlights?: string[];
  generatedByUid?: string;
  generatedByName?: string;
  t: (path: string, params?: Record<string, unknown>) => string;
  onBriefGenerated?: (brief: CareCalendarVisitBrief) => void;
};

export function CircleCareCalendarVisitBriefPanel({
  patientId,
  entryId,
  appointmentTitle,
  brief,
  assessmentHighlights = [],
  generatedByUid,
  generatedByName,
  t,
  onBriefGenerated,
}: CircleCareCalendarVisitBriefPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const next = await generateVisitBrief({
        patientId,
        careCalendarEntryId: entryId,
        generatedByUid,
        generatedByName,
        assessmentHighlights,
      });
      onBriefGenerated?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('visitBrief.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!brief) return;
    try {
      await copyVisitBriefToClipboard(brief, appointmentTitle);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('visitBrief.copyError'));
    }
  };

  return (
    <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-sky-900 flex items-center gap-2">
            <Sparkles size={16} className="shrink-0" aria-hidden />
            {t('visitBrief.title')}
          </p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t('visitBrief.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={generating}
          className="shrink-0 px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-60"
        >
          {generating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {t('visitBrief.generating')}
            </span>
          ) : brief ? (
            t('visitBrief.regenerate')
          ) : (
            t('visitBrief.generate')
          )}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      {brief ? (
        <div className="space-y-3 rounded-xl border border-white bg-white/90 p-4">
          <div>
            <p className="text-sm font-bold text-slate-900">{brief.headline}</p>
            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
              {brief.patientContext}
            </p>
          </div>

          {brief.keyTopics.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('visitBrief.keyTopics')}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {brief.keyTopics.map((topic) => (
                  <li key={topic}>• {topic}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {brief.medicationsToDiscuss.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('visitBrief.medications')}
              </p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {brief.medicationsToDiscuss.map((med) => (
                  <li key={med}>• {med}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {brief.referenceNotes.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('visitBrief.references')}
              </p>
              <ul className="mt-1 space-y-2 text-sm text-slate-700">
                {brief.referenceNotes.map((ref) => (
                  <li key={ref.refId}>
                    <span className="font-semibold">{ref.title}</span>
                    <span className="text-slate-500"> — {ref.relevance}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {brief.questionsForDoctor.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('visitBrief.questions')}
              </p>
              <ol className="mt-1 space-y-1 text-sm text-slate-700 list-decimal list-inside">
                {brief.questionsForDoctor.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <ClipboardCopy size={14} />
              {copied ? t('visitBrief.copied') : t('visitBrief.copy')}
            </button>
            <button
              type="button"
              onClick={() => downloadVisitBriefWord(brief, appointmentTitle)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <FileText size={14} />
              {t('visitBrief.exportWord')}
            </button>
            <button
              type="button"
              onClick={() => downloadVisitBriefHtml(brief, appointmentTitle)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <Download size={14} />
              {t('visitBrief.exportHtml')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 leading-relaxed">{t('visitBrief.empty')}</p>
      )}
    </section>
  );
}
