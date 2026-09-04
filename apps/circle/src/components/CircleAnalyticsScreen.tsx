import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  ChevronRight,
  Clock,
  Keyboard,
  Loader2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import {
  circleDisplayFirstName,
  ANALYTICS_METRIC_DEFINITIONS,
  ANALYTICS_SECTIONS,
  buildPlaceholderAnalyticsSummary,
  canReadAnalyticsAudience,
  isSameCalendarDay,
  subscribeRemoteSettings,
  isHospitalFeatureEnabledInRemoteSettings,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
  type RemoteAssessmentSchedule,
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
  dashboardSectionTitleClass,
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
import {
  ANALYTICS_METRIC_ICONS,
  analyticsMetricIconWrapClass,
} from '../lib/circleAnalyticsMetricUi';
import { CircleAnalyticsDetailSheet } from './CircleAnalyticsDetailSheet';
import { CircleAssessmentsOverviewSheet } from './CircleAssessmentsOverviewSheet';
import {
  CircleAnalyticsPeriodOverviewSheet,
  type AnalyticsPeriodDays,
} from './CircleAnalyticsPeriodOverviewSheet';
import type { CircleMessagesAnalyticsFocus } from './CircleMessagesAnalyticsDetail';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';

const METRIC_ICONS = ANALYTICS_METRIC_ICONS;

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
  titleOverride,
  iconOverride,
  iconClassOverride,
}: {
  summary: PatientAnalyticsSummary;
  onOpen: () => void;
  t: CircleTranslator;
  language: CircleUiLanguage;
  titleOverride?: string;
  iconOverride?: LucideIcon;
  iconClassOverride?: string;
}) {
  const localized = localizeAnalyticsSummary(t, summary, language);
  const Icon = iconOverride ?? METRIC_ICONS[localized.metricId] ?? Activity;
  const footerLabel = metricFooterLabel(localized, t, language);
  const unreleased = !localized.isReleased || localized.status === 'coming_soon';
  const iconClass = unreleased
    ? 'bg-slate-100 text-slate-400'
    : iconClassOverride ?? analyticsMetricIconWrapClass(localized.metricId);
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
          'flex-1 min-w-0 text-base font-normal leading-snug truncate',
          unreleased ? 'text-slate-400' : 'text-slate-800',
        )}
      >
        {titleOverride ?? localized.title}
      </p>
      <div
        className={cn(
          'flex items-center gap-1 shrink-0 max-w-[46%] text-[12px] font-bold uppercase tracking-wider',
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

type AnalyticsListCard = {
  summary: PatientAnalyticsSummary;
  messagesFocus?: CircleMessagesAnalyticsFocus;
};

function expandAnalyticsListCards(summaries: PatientAnalyticsSummary[]): AnalyticsListCard[] {
  return summaries.flatMap((summary) => {
    if (summary.metricId !== 'speech-history') return [{ summary }];
    return [
      { summary, messagesFocus: 'messaging' as const },
      { summary, messagesFocus: 'communication' as const },
    ];
  });
}

export function CircleAnalyticsScreen({
  patient,
  initialMetricId = null,
  initialMessagesFocus = null,
  initialAssessmentsOverview = false,
  initialPeriodOverviewDays = null,
  onInitialMetricConsumed,
  onCloseToOrigin,
}: {
  patient: CirclePatientSummary;
  initialMetricId?: AnalyticsMetricId | null;
  initialMessagesFocus?: CircleMessagesAnalyticsFocus | null;
  initialAssessmentsOverview?: boolean;
  initialPeriodOverviewDays?: AnalyticsPeriodDays | null;
  onInitialMetricConsumed?: () => void;
  onCloseToOrigin?: () => void;
}) {
  const [detailSummary, setDetailSummary] = useState<PatientAnalyticsSummary | null>(null);
  const [detailMessagesFocus, setDetailMessagesFocus] =
    useState<CircleMessagesAnalyticsFocus | null>(null);
  const [assessmentsOverviewOpen, setAssessmentsOverviewOpen] = useState(false);
  const [periodOverviewDays, setPeriodOverviewDays] = useState<AnalyticsPeriodDays | null>(null);
  const [remoteSettingsLoading, setRemoteSettingsLoading] = useState(true);
  const [remoteSettingsFromFirestore, setRemoteSettingsFromFirestore] = useState(false);
  const [dailyCheckInEnabled, setDailyCheckInEnabled] = useState(false);
  const [messagingEnabled, setMessagingEnabled] = useState(false);
  const [communicationEnabled, setCommunicationEnabled] = useState(false);
  const [companionEnabled, setCompanionEnabled] = useState(false);
  const [vitalityEnabled, setVitalityEnabled] = useState(false);
  const [assessmentSchedule, setAssessmentSchedule] = useState<RemoteAssessmentSchedule | undefined>();
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const compactChrome = useCircleCompactChrome();
  const { t, language } = useCircleI18nContext();
  const { byMetricId, totalFromServer, loading, error } = useCircleAnalyticsSummaries(
    firebase.db,
    patient,
  );
  const closeReturnsToOriginRef = useRef(false);

  useEffect(() => {
    setRemoteSettingsLoading(true);
    return subscribeRemoteSettings(
      firebase.db,
      patient.patientId,
      (remote) => {
        setRemoteSettingsFromFirestore(remote != null);
        const enabled = remote?.dailyCheckIn?.enabled === true;
        setDailyCheckInEnabled(enabled);
        setMessagingEnabled(
          isHospitalFeatureEnabledInRemoteSettings(remote, 'hospitalFeatureMessaging'),
        );
        setCommunicationEnabled(remote?.featuresVisibility?.communication === true);
        setCompanionEnabled(remote?.featuresVisibility?.aiCompanion === true);
        setVitalityEnabled(
          isHospitalFeatureEnabledInRemoteSettings(remote, 'hospitalFeatureVitality'),
        );
        setAssessmentSchedule(remote?.assessmentSchedule);
        const intensive =
          remote?.appMode === 'intensive_care' || remote?.appMode === 'hospital';
        setScheduleEnabled(!intensive && remote?.featuresVisibility?.schedule !== false);
        setRemoteSettingsLoading(false);
      },
      () => {
        setRemoteSettingsFromFirestore(false);
        setDailyCheckInEnabled(false);
        setMessagingEnabled(false);
        setCommunicationEnabled(false);
        setCompanionEnabled(false);
        setVitalityEnabled(false);
        setAssessmentSchedule(undefined);
        setScheduleEnabled(true);
        setRemoteSettingsLoading(false);
      },
    );
  }, [patient.patientId]);

  useEffect(() => {
    if (!initialMetricId || loading) return;
    const summary = resolveAnalyticsSummary(initialMetricId, byMetricId, patient);
    if (summary?.isReleased && summary.status !== 'coming_soon') {
      setAssessmentsOverviewOpen(false);
      setPeriodOverviewDays(null);
      setDetailSummary(localizeAnalyticsSummary(t, summary, language));
      setDetailMessagesFocus(
        initialMetricId === 'speech-history' ? (initialMessagesFocus ?? 'messaging') : null,
      );
      closeReturnsToOriginRef.current = true;
    }
    onInitialMetricConsumed?.();
  }, [
    initialMetricId,
    initialMessagesFocus,
    loading,
    byMetricId,
    patient,
    onInitialMetricConsumed,
    t,
    language,
  ]);

  useEffect(() => {
    if (!initialAssessmentsOverview || loading) return;
    setPeriodOverviewDays(null);
    setAssessmentsOverviewOpen(true);
    closeReturnsToOriginRef.current = true;
    onInitialMetricConsumed?.();
  }, [initialAssessmentsOverview, loading, onInitialMetricConsumed]);

  useEffect(() => {
    if (!initialPeriodOverviewDays || loading) return;
    setAssessmentsOverviewOpen(false);
    setPeriodOverviewDays(initialPeriodOverviewDays);
    closeReturnsToOriginRef.current = true;
    onInitialMetricConsumed?.();
  }, [initialPeriodOverviewDays, loading, onInitialMetricConsumed]);

  return (
    <>
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass)}>
          <CircleWorkTabSectionIntro
            icon={BarChart3}
            iconTileClassName="bg-blue-50 text-blue-600"
            title={t('analytics.title')}
            subtitle={t('analytics.subtitle', {
              name: circleDisplayFirstName(patient.displayName, patient.firstName),
            })}
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
                  if (
                    id === 'daily-check-in' &&
                    (!dailyCheckInEnabled || !remoteSettingsFromFirestore || remoteSettingsLoading)
                  ) {
                    return null;
                  }
                  const synced = byMetricId.get(id);
                  if (id === 'daily-check-in' && synced?.summaryText === 'Daily check-in off') {
                    return null;
                  }
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
              const listCards = expandAnalyticsListCards(cards);
              if (listCards.length === 0) return null;

              return (
                <section key={section.id} className="space-y-1.5">
                  <h4 className={cn(dashboardSectionTitleClass, 'pt-0.5')}>
                    {analyticsSectionTitle(t, section.id)}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {listCards.map((card) => (
                      <AnalyticsMetricRow
                        key={`${card.summary.metricId}-${card.messagesFocus ?? 'default'}`}
                        summary={card.summary}
                        t={t}
                        language={language}
                        titleOverride={
                          card.messagesFocus === 'messaging'
                            ? t('analytics.metrics.messaging')
                            : card.messagesFocus === 'communication'
                              ? t('analytics.metrics.communication')
                              : undefined
                        }
                        iconOverride={
                          card.messagesFocus === 'communication'
                            ? Keyboard
                            : card.messagesFocus === 'messaging'
                              ? MessageSquare
                              : undefined
                        }
                        iconClassOverride={
                          card.messagesFocus === 'communication'
                            ? 'bg-indigo-50 text-indigo-600'
                            : card.messagesFocus === 'messaging'
                              ? 'bg-emerald-50 text-emerald-600'
                              : undefined
                        }
                        onOpen={() => {
                          setDetailSummary(localizeAnalyticsSummary(t, card.summary, language));
                          setDetailMessagesFocus(card.messagesFocus ?? null);
                        }}
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
    <CircleAssessmentsOverviewSheet
      open={assessmentsOverviewOpen}
      patient={patient}
      byMetricId={byMetricId}
      onOpenMetric={(metricId) => {
        const summary = resolveAnalyticsSummary(metricId, byMetricId, patient);
        if (!summary?.isReleased || summary.status === 'coming_soon') return;
        setDetailSummary(localizeAnalyticsSummary(t, summary, language));
        setDetailMessagesFocus(null);
      }}
      onClose={() => {
        setAssessmentsOverviewOpen(false);
        setDetailSummary(null);
        setDetailMessagesFocus(null);
        if (closeReturnsToOriginRef.current) {
          closeReturnsToOriginRef.current = false;
          onCloseToOrigin?.();
        }
      }}
    />
    <CircleAnalyticsPeriodOverviewSheet
      open={periodOverviewDays != null}
      initialDays={periodOverviewDays ?? 7}
      patient={patient}
      byMetricId={byMetricId}
      dailyCheckInEnabled={dailyCheckInEnabled && remoteSettingsFromFirestore && !remoteSettingsLoading}
      messagingEnabled={messagingEnabled}
      communicationEnabled={communicationEnabled}
      companionEnabled={companionEnabled}
      vitalityEnabled={vitalityEnabled}
      onOpenMetric={(metricId, messagesFocus) => {
        const summary = resolveAnalyticsSummary(metricId, byMetricId, patient);
        if (!summary?.isReleased || summary.status === 'coming_soon') return;
        setDetailSummary(localizeAnalyticsSummary(t, summary, language));
        setDetailMessagesFocus(
          metricId === 'speech-history' ? (messagesFocus ?? 'messaging') : null,
        );
      }}
      onClose={() => {
        setPeriodOverviewDays(null);
        setDetailSummary(null);
        setDetailMessagesFocus(null);
        if (closeReturnsToOriginRef.current) {
          closeReturnsToOriginRef.current = false;
          onCloseToOrigin?.();
        }
      }}
    />
    <CircleAnalyticsDetailSheet
      summary={detailSummary}
      messagesFocus={detailMessagesFocus}
      assessmentSchedule={assessmentSchedule}
      scheduleEnabled={scheduleEnabled}
      onClose={() => {
        setDetailSummary(null);
        setDetailMessagesFocus(null);
        if (assessmentsOverviewOpen || periodOverviewDays != null) return;
        if (closeReturnsToOriginRef.current) {
          closeReturnsToOriginRef.current = false;
          onCloseToOrigin?.();
        }
      }}
    />
    </>
  );
}
