import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  ChevronRight,
  Clock,
  Ear,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
  Mic,
  Move,
  Scale,
  Sparkles,
  ThermometerSun,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  ANALYTICS_METRIC_DEFINITIONS,
  ANALYTICS_SECTIONS,
  buildPlaceholderAnalyticsSummary,
  canReadAnalyticsAudience,
  isSameCalendarDay,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  circleAnalyticsMetricRowClass,
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionEmptyStateClass,
  circleSectionHeaderStackClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { useCircleI18nContext, type CircleTranslator } from '../lib/circleI18nContext';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import {
  analyticsSectionTitle,
  analyticsSummaryFooterText,
  localizeAnalyticsSummary,
} from '../lib/circleAnalyticsI18n';
import { firebase } from '../lib/firebaseClient';
import { CircleAnalyticsDetailSheet } from './CircleAnalyticsDetailSheet';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';

const METRIC_ICONS: Record<AnalyticsMetricId, LucideIcon> = {
  'alert-attention': Bell,
  'speech-history': MessageSquare,
  'ai-conversation': Bot,
  'daily-check-in': Calendar,
  impact: Activity,
  pain: Activity,
  'strength-reflex': Scale,
  mobility: Move,
  numbness: Zap,
  temperature: ThermometerSun,
  balance: Activity,
  vision: Eye,
  hearing: Ear,
  speech: Mic,
  neurological: Brain,
  physiological: Activity,
  psychological: Heart,
  stroke: Heart,
  diary: BookOpen,
  'vitality-game': Sparkles,
  'soul-vitality': Heart,
};

const METRIC_COLORS: Record<string, string> = {
  pain: 'bg-rose-50 text-rose-600',
  numbness: 'bg-purple-50 text-purple-600',
  mobility: 'bg-emerald-50 text-emerald-600',
  temperature: 'bg-cyan-50 text-cyan-600',
  neurological: 'bg-purple-50 text-purple-600',
  physiological: 'bg-blue-50 text-blue-600',
  psychological: 'bg-pink-50 text-pink-600',
};

function footerColorClass(tone: PatientAnalyticsSummary['footerTone']): string {
  if (tone === 'warning') return 'text-red-500';
  if (tone === 'attention') return 'text-amber-600';
  return 'text-slate-500';
}

function metricFooterLabel(
  summary: PatientAnalyticsSummary,
  t: CircleTranslator,
  language: CircleUiLanguage,
): string {
  return analyticsSummaryFooterText(t, summary, language);
}

function isTodayAlertAttention(summary: PatientAnalyticsSummary): boolean {
  return (
    summary.metricId === 'alert-attention' &&
    summary.latestAt != null &&
    isSameCalendarDay(summary.latestAt, Date.now())
  );
}

function resolveAnalyticsSummary(
  metricId: AnalyticsMetricId,
  byMetricId: Map<string, PatientAnalyticsSummary>,
  patient: CirclePatientSummary,
): PatientAnalyticsSummary | null {
  const synced = byMetricId.get(metricId);
  if (synced) return synced;
  if (!ANALYTICS_METRIC_DEFINITIONS[metricId]) return null;
  if (
    !patient.capabilities ||
    !canReadAnalyticsAudience(
      ANALYTICS_METRIC_DEFINITIONS[metricId].audience,
      patient.role,
      patient.capabilities,
    )
  ) {
    return null;
  }
  return buildPlaceholderAnalyticsSummary(metricId, patient.patientId);
}

function AnalyticsMetricRow({
  summary,
  onOpen,
  t,
  language,
}: {
  summary: PatientAnalyticsSummary;
  onOpen: () => void;
  t: CircleTranslator;
  language: CircleUiLanguage;
}) {
  const localized = localizeAnalyticsSummary(t, summary, language);
  const Icon = METRIC_ICONS[localized.metricId] ?? Activity;
  const footerLabel = metricFooterLabel(localized, t, language);
  const unreleased = !localized.isReleased || localized.status === 'coming_soon';
  const iconClass = unreleased
    ? 'bg-slate-100 text-slate-400'
    : METRIC_COLORS[localized.metricId] ?? 'bg-blue-50 text-blue-600';
  const tappable = localized.isReleased && localized.status !== 'coming_soon';
  const todayAlertAttention = isTodayAlertAttention(localized);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!tappable}
      className={cn(
        circleAnalyticsMetricRowClass,
        'w-full text-left transition-colors',
        tappable && 'hover:border-blue-200 hover:bg-blue-50/30 active:scale-[0.99]',
        !tappable && 'cursor-default',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          iconClass,
          '[@media(max-height:740px)]:w-9 [@media(max-height:740px)]:h-9',
        )}
      >
        <Icon size={18} />
      </div>
      <p
        className={cn(
          'flex-1 min-w-0 text-sm font-normal leading-snug truncate',
          unreleased ? 'text-slate-400' : 'text-slate-800',
        )}
      >
        {localized.title}
      </p>
      <div
        className={cn(
          'flex items-center gap-1 shrink-0 max-w-[46%] text-[10px] font-bold uppercase tracking-wider',
          unreleased
            ? 'text-slate-400'
            : todayAlertAttention
              ? 'text-red-500'
              : footerColorClass(localized.footerTone),
        )}
      >
        <Clock size={10} className="shrink-0 opacity-80" />
        <span className="truncate">{footerLabel}</span>
      </div>
      {tappable && <ChevronRight size={16} className="text-slate-300 shrink-0" />}
    </button>
  );
}

export function CircleAnalyticsScreen({
  patient,
  initialMetricId = null,
  onInitialMetricConsumed,
}: {
  patient: CirclePatientSummary;
  initialMetricId?: AnalyticsMetricId | null;
  onInitialMetricConsumed?: () => void;
}) {
  const [detailSummary, setDetailSummary] = useState<PatientAnalyticsSummary | null>(null);
  const compactChrome = useCircleCompactChrome();
  const { t, language } = useCircleI18nContext();
  const { byMetricId, totalFromServer, loading, error } = useCircleAnalyticsSummaries(
    firebase.db,
    patient,
  );

  useEffect(() => {
    if (!initialMetricId || loading) return;
    const summary = resolveAnalyticsSummary(initialMetricId, byMetricId, patient);
    if (summary?.isReleased && summary.status !== 'coming_soon') {
      setDetailSummary(localizeAnalyticsSummary(t, summary, language));
    }
    onInitialMetricConsumed?.();
  }, [initialMetricId, loading, byMetricId, patient, onInitialMetricConsumed, t, language]);

  return (
    <>
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass)}>
          <CircleWorkTabSectionIntro
            icon={BarChart3}
            iconClassName="text-blue-600"
            title={t('analytics.title')}
            subtitle={t('analytics.subtitle', { name: patient.displayName })}
          />
        </div>

        <div className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass, 'space-y-4')}>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {loading ? (
            <div className="py-10 flex justify-center text-slate-400 [@media(max-height:740px)]:py-6">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            ANALYTICS_SECTIONS.map((section) => {
              const cards = section.itemIds
                .map((id) => {
                  const synced = byMetricId.get(id);
                  if (synced) return synced;
                  if (!ANALYTICS_METRIC_DEFINITIONS[id]) return null;
                  if (
                    !patient.capabilities ||
                    !canReadAnalyticsAudience(
                      ANALYTICS_METRIC_DEFINITIONS[id].audience,
                      patient.role,
                      patient.capabilities,
                    )
                  ) {
                    return null;
                  }
                  return buildPlaceholderAnalyticsSummary(id, patient.patientId);
                })
                .filter((s): s is PatientAnalyticsSummary => s != null);
              if (cards.length === 0) return null;

              return (
                <section key={section.id} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5 pt-0.5">
                    {analyticsSectionTitle(t, section.id)}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {cards.map((summary) => (
                      <AnalyticsMetricRow
                        key={summary.metricId}
                        summary={summary}
                        t={t}
                        language={language}
                        onOpen={() => setDetailSummary(localizeAnalyticsSummary(t, summary, language))}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {!loading && byMetricId.size === 0 && (
            <div className={circleSectionEmptyStateClass}>
              {error &&
              (error.includes('resource-exhausted') ||
                error.toLowerCase().includes('quota')) ? (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed max-w-md mx-auto">
                  {t('analytics.emptyQuota')}
                </p>
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                  {totalFromServer > 0
                    ? t('analytics.emptyNoMatchRole')
                    : t('analytics.emptyNoCloud')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    <CircleAnalyticsDetailSheet
      summary={detailSummary}
      onClose={() => setDetailSummary(null)}
    />
    </>
  );
}
