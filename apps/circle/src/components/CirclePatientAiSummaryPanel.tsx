/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CircleHelp,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Pill,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UserRound,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from 'recharts';
import {
  copyPatientAiSummaryToClipboard,
  downloadPatientAiSummaryPdf,
  type PatientAiSummary,
  type PatientAiSummaryTrend,
} from '../lib/patientAiSummary';
import { generatePatientAiSummary } from '../services/clinicalReferenceUploadApi';
import { useCircleT, type CircleTranslator } from '../lib/circleI18nContext';

function SummarySectionCard({
  icon: Icon,
  title,
  items,
  emptyLabel,
}: {
  icon: typeof Stethoscope;
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
        <Icon size={14} className="text-blue-600" />
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-blue-400 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: PatientAiSummaryTrend['trend'] }) {
  if (trend === 'up') {
    return <TrendingUp size={14} className="text-rose-500" aria-hidden />;
  }
  if (trend === 'down') {
    return <TrendingDown size={14} className="text-emerald-600" aria-hidden />;
  }
  return <span className="text-[10px] font-bold text-slate-400">—</span>;
}

function scaleCheckInOrdinal(score: number): number {
  return ((score - 1) / 2) * 10;
}

function AssessmentTrendCard({
  trend,
  t,
}: {
  trend: PatientAiSummaryTrend;
  t: CircleTranslator;
}) {
  const isCheckIn = trend.metricId === 'daily-check-in';
  const checkInChartData = useMemo(() => {
    if (!isCheckIn) return [];
    return trend.points.map((point) => ({
      date: point.date,
      pain: typeof point.pain === 'number' ? point.pain : undefined,
      mood: typeof point.mood === 'number' ? scaleCheckInOrdinal(point.mood) : undefined,
      sleep: typeof point.sleep === 'number' ? scaleCheckInOrdinal(point.sleep) : undefined,
    }));
  }, [isCheckIn, trend.points]);

  const hasCheckInSeries = checkInChartData.some(
    (point) => point.pain != null || point.mood != null || point.sleep != null,
  );
  const assessmentPoints = useMemo(
    () =>
      trend.points
        .filter((point) => typeof point.value === 'number')
        .map((point) => ({ date: point.date, value: point.value as number })),
    [trend.points],
  );
  const hasAssessmentChart = !isCheckIn && assessmentPoints.length > 1;
  const primaryLabel =
    trend.primaryLabel ||
    (trend.average != null
      ? t('clinicalReferences.patientSummary.trendAverage')
      : t('clinicalReferences.patientSummary.trendEntries'));
  const primaryValue =
    trend.primaryValue && trend.primaryValue !== '—'
      ? trend.primaryValue
      : trend.average != null
        ? String(trend.average)
        : '—';
  const skipRateLabel = trend.skipRate != null ? `${Math.round(trend.skipRate)}%` : '—';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{trend.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {trend.ageLabel || t('clinicalReferences.patientSummary.sourceDateUnknown')}
          </p>
        </div>
        <TrendBadge trend={trend.trend} />
      </div>

      {isCheckIn ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {t('clinicalReferences.patientSummary.checkInCompleted')}
            </p>
            <p className="text-xl font-bold text-emerald-700">{primaryValue}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              {t('clinicalReferences.patientSummary.checkInSkipRate')}
            </p>
            <p className="text-xl font-bold text-amber-700">{skipRateLabel}</p>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {primaryLabel}
          </p>
          <p className="text-xl font-bold text-blue-700">{primaryValue}</p>
          {trend.secondaryText ? (
            <p className="text-[11px] text-slate-500 mt-0.5">{trend.secondaryText}</p>
          ) : null}
        </div>
      )}

      {isCheckIn && hasCheckInSeries ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('clinicalReferences.patientSummary.checkInAnswerTrend')}
          </p>
          <div className="h-16 w-full rounded-xl bg-slate-50 border border-slate-100 px-1 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkInChartData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                {checkInChartData.some((point) => point.pain != null) ? (
                  <Line
                    type="monotone"
                    dataKey="pain"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    connectNulls
                  />
                ) : null}
                {checkInChartData.some((point) => point.mood != null) ? (
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="#10b981"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    connectNulls
                  />
                ) : null}
                {checkInChartData.some((point) => point.sleep != null) ? (
                  <Line
                    type="monotone"
                    dataKey="sleep"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    connectNulls
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {t('clinicalReferences.patientSummary.checkInPain')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t('clinicalReferences.patientSummary.checkInMood')}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {t('clinicalReferences.patientSummary.checkInSleep')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">
            {t('clinicalReferences.patientSummary.checkInChartHint')}
          </p>
        </div>
      ) : null}

      {hasAssessmentChart ? (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t('clinicalReferences.patientSummary.trendActivity')}
          </p>
          <div className="h-14 w-full rounded-xl bg-blue-50/50 border border-blue-100 px-1 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assessmentPoints} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#bfdbfe"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {trend.secondaryText && isCheckIn ? (
        <p className="text-[11px] text-slate-500">{trend.secondaryText}</p>
      ) : null}
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{trend.summaryText}</p>
    </div>
  );
}

function PatientAiSummaryBody({
  summary,
  t,
}: {
  summary: PatientAiSummary;
  t: CircleTranslator;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const identity = summary.identity ?? { name: 'Unknown patient' };
  const sources = summary.sources ?? [];
  const warnings = summary.documentWarnings ?? [];
  const trends = summary.trends ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {t('clinicalReferences.patientSummary.fieldName')}
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {identity.name}
              {identity.nickname ? (
                <span className="font-semibold text-slate-500"> ({identity.nickname})</span>
              ) : null}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {t('clinicalReferences.patientSummary.fieldDobAge')}
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {identity.dob
                ? `${identity.dob}${identity.ageYears != null ? ` · age ${identity.ageYears}` : ''}`
                : t('clinicalReferences.patientSummary.notOnProfile')}
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {t('clinicalReferences.patientSummary.fieldTreatmentPhase')}
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {identity.treatmentPhase || t('clinicalReferences.patientSummary.notOnProfile')}
            </p>
          </div>
        </div>

        <p className="text-lg font-bold text-slate-900 leading-snug">{summary.headline}</p>
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{summary.overview}</p>
        {summary.profileCompleteness ? (
          <p className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
            {summary.profileCompleteness}
          </p>
        ) : null}
        <p className="text-[11px] text-slate-400">
          {t('clinicalReferences.patientSummary.generatedAt', {
            time: new Date(summary.generatedAt).toLocaleString(),
          })}
        </p>
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
            <AlertTriangle size={14} />
            {t('clinicalReferences.patientSummary.documentWarnings')}
          </p>
          <ul className="space-y-2">
            {warnings.map((item) => (
              <li
                key={item}
                className="text-sm text-amber-950 leading-relaxed rounded-xl bg-white/80 border border-amber-100 px-3 py-2"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummarySectionCard
          icon={Stethoscope}
          title={t('clinicalReferences.patientSummary.clinicalHighlights')}
          items={summary.clinicalHighlights ?? []}
          emptyLabel={t('clinicalReferences.patientSummary.noneOnProfile')}
        />
        <SummarySectionCard
          icon={Pill}
          title={t('clinicalReferences.patientSummary.medications')}
          items={summary.medications ?? []}
          emptyLabel={t('clinicalReferences.patientSummary.noneOnProfile')}
        />
      </div>

      {trends.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-0.5">
            {t('clinicalReferences.patientSummary.assessmentTrends')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trends.map((trend) => (
              <AssessmentTrendCard key={trend.metricId} trend={trend} t={t} />
            ))}
          </div>
        </div>
      ) : null}

      <SummarySectionCard
        icon={FileText}
        title={t('clinicalReferences.patientSummary.documentInsights')}
        items={summary.documentInsights ?? []}
        emptyLabel={t('clinicalReferences.patientSummary.noMatchingDocuments')}
      />

      <SummarySectionCard
        icon={CircleHelp}
        title={t('clinicalReferences.patientSummary.openQuestions')}
        items={summary.openQuestions ?? []}
        emptyLabel={t('clinicalReferences.patientSummary.noOpenQuestions')}
      />

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setSourcesOpen((open) => !open)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
          aria-expanded={sourcesOpen}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <UserRound size={14} className="text-blue-600" />
            {t('clinicalReferences.patientSummary.dataSources')}
            <span className="normal-case tracking-normal font-semibold text-slate-400">
              ({sources.length})
            </span>
          </p>
          {sourcesOpen ? (
            <ChevronDown size={16} className="text-slate-400 shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          )}
        </button>
        {sourcesOpen ? (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
            {sources.length > 0 ? (
              <ul className="space-y-2">
                {sources.map((source) => (
                  <li
                    key={`${source.kind}-${source.label}-${source.asOfLabel ?? ''}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-slate-800">{source.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[source.asOfLabel, source.ageLabel].filter(Boolean).join(' · ') ||
                        t('clinicalReferences.patientSummary.sourceDateUnknown')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">
                {t('clinicalReferences.patientSummary.noSources')}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CirclePatientAiSummaryPanel({ patientId }: { patientId: string }) {
  const t = useCircleT();
  const [summary, setSummary] = useState<PatientAiSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const runPatientSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const next = await generatePatientAiSummary(patientId);
      setSummary(next);
      setSummaryExpanded(true);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : t('clinicalReferences.patientSummary.generateError'),
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    setCopyError(null);
    try {
      await copyPatientAiSummaryToClipboard(summary);
      setSummaryCopied(true);
      window.setTimeout(() => setSummaryCopied(false), 2000);
    } catch {
      setSummaryCopied(false);
      setCopyError(t('clinicalReferences.patientSummary.copyError'));
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 p-5 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                <Sparkles size={18} aria-hidden />
              </span>
              {t('clinicalReferences.patientSummary.title')}
            </p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {t('clinicalReferences.patientSummary.subtitle')}
            </p>
          </div>
        </div>
        {summaryError ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2">
            {summaryError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runPatientSummary()}
            disabled={summaryLoading}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60 shadow-md shadow-blue-200"
          >
            {summaryLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {t('clinicalReferences.patientSummary.generating')}
              </span>
            ) : summary ? (
              t('clinicalReferences.patientSummary.regenerate')
            ) : (
              t('clinicalReferences.patientSummary.generate')
            )}
          </button>
          {summary ? (
            <button
              type="button"
              onClick={() => setSummaryExpanded(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50"
            >
              <Maximize2 size={14} />
              {t('clinicalReferences.patientSummary.viewSummary')}
            </button>
          ) : null}
        </div>
      </section>

      {summary && summaryExpanded ? (
        <div className="fixed inset-0 z-[270] flex items-stretch justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSummaryExpanded(false)}
            aria-label={t('common.close')}
          />
          <div className="relative w-full max-w-4xl bg-white sm:rounded-[28px] shadow-2xl border border-slate-100 flex flex-col max-h-[100dvh] sm:max-h-[92dvh] overflow-hidden">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-600 shrink-0" />
                  {t('clinicalReferences.patientSummary.title')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {t('clinicalReferences.patientSummary.expandedHint')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void copySummary()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50"
                >
                  <ClipboardCopy size={14} />
                  {summaryCopied
                    ? t('clinicalReferences.patientSummary.copied')
                    : t('clinicalReferences.patientSummary.copy')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadPatientAiSummaryPdf(summary)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50"
                >
                  <Download size={14} />
                  {t('clinicalReferences.patientSummary.pdf')}
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryExpanded(false)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label={t('common.close')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {copyError ? (
              <p className="shrink-0 px-4 sm:px-5 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
                {copyError}
              </p>
            ) : null}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <PatientAiSummaryBody summary={summary} t={t} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
