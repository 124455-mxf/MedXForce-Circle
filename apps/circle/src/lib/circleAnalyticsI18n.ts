import type {
  AnalyticsMetricId,
  AnalyticsSectionId,
  AnalyticsTrendDirection,
  PatientAnalyticsSummary,
} from '@medxforce/shared';
import type { CircleUiLanguage } from './circleLanguages';
import type { CircleTranslator } from './circleI18nContext';

const METRIC_TITLE_KEYS: Record<AnalyticsMetricId, string> = {
  'alert-attention': 'analytics.metrics.alertAttention',
  'speech-history': 'analytics.metrics.messages',
  'ai-conversation': 'analytics.metrics.companion',
  'daily-check-in': 'analytics.metrics.dailyCheckIn',
  impact: 'analytics.metrics.impact',
  pain: 'analytics.metrics.pain',
  'strength-reflex': 'analytics.metrics.strengthReflex',
  mobility: 'analytics.metrics.mobility',
  numbness: 'analytics.metrics.numbness',
  temperature: 'analytics.metrics.temperature',
  balance: 'analytics.metrics.balance',
  vision: 'analytics.metrics.vision',
  hearing: 'analytics.metrics.hearing',
  speech: 'analytics.metrics.speech',
  neurological: 'analytics.metrics.neurological',
  physiological: 'analytics.metrics.physiological',
  psychological: 'analytics.metrics.psychological',
  stroke: 'analytics.metrics.stroke',
  diary: 'analytics.metrics.diary',
  'vitality-game': 'analytics.metrics.vitalityGame',
  'soul-vitality': 'analytics.metrics.soulVitality',
};

const SECTION_TITLE_KEYS: Record<AnalyticsSectionId, string> = {
  communication: 'analytics.sections.communication',
  physical: 'analytics.sections.physical',
  visionHearing: 'analytics.sections.visionHearing',
  speech: 'analytics.sections.speech',
  neurologicalPhysiological: 'analytics.sections.neurologicalPhysiological',
  postStroke: 'analytics.sections.postStroke',
  vitality: 'analytics.sections.vitality',
};

const SUMMARY_TEXT_KEYS: Record<string, string> = {
  'To be released': 'analytics.summaryToBeReleased',
  'No data yet': 'analytics.summaryNoDataYet',
  'No assessments yet': 'analytics.summaryNoAssessmentsYet',
  'No check-ins yet': 'analytics.summaryNoCheckInsYet',
  'Not enabled for patient': 'analytics.summaryNotEnabled',
  'No shared family media yet': 'analytics.summaryNoFamilyMedia',
  'No shared diary entries yet': 'analytics.summaryNoDiaryEntries',
};

const LATEST_PREFIX = /^Latest:\s*(.+)$/i;
const LAST_ON_PREFIX = /^Last on\s+(.+)$/i;
const SKIP_RATE_PREFIX = /^Skip Rate:\s*(\d+)%$/i;
const SHARED_ITEMS_PREFIX = /^(\d+)\s+shared items?$/i;
const SHARED_ENTRIES_PREFIX = /^(\d+)\s+shared entries?$/i;

function circleLanguageToLocale(language: CircleUiLanguage): string {
  if (language === 'German') return 'de';
  if (language === 'Spanish') return 'es';
  if (language === 'Polish') return 'pl';
  return 'en';
}

export function formatAnalyticsShortDate(ts: number, language: CircleUiLanguage): string {
  return new Date(ts).toLocaleDateString(circleLanguageToLocale(language), {
    day: 'numeric',
    month: 'short',
  });
}

/** Reformat English synced date labels (e.g. "Jun 3", "4 Jun") for the Circle UI locale. */
function reformatSyncedSummaryDateLabel(label: string, language: CircleUiLanguage): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  const year = new Date().getFullYear();
  const candidates = [`${trimmed}, ${year}`, `${trimmed} ${year}`];
  for (const candidate of candidates) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      return formatAnalyticsShortDate(parsed, language);
    }
  }
  return trimmed;
}

function localizedLatestSummary(
  t: CircleTranslator,
  summary: PatientAnalyticsSummary,
  language: CircleUiLanguage,
  dateLabel: string,
): string {
  return t('analytics.summaryLatest', {
    date:
      summary.latestAt != null
        ? formatAnalyticsShortDate(summary.latestAt, language)
        : reformatSyncedSummaryDateLabel(dateLabel, language),
  });
}

function localizedLastOnSummary(
  t: CircleTranslator,
  summary: PatientAnalyticsSummary,
  language: CircleUiLanguage,
  dateLabel: string,
): string {
  return t('analytics.summaryLastOn', {
    date:
      summary.latestAt != null
        ? formatAnalyticsShortDate(summary.latestAt, language)
        : reformatSyncedSummaryDateLabel(dateLabel, language),
  });
}

function localizedSharedItemsLabel(t: CircleTranslator, count: number): string {
  return count === 1
    ? t('analytics.summarySharedItem', { count })
    : t('analytics.summarySharedItems', { count });
}

function localizedSharedEntriesLabel(t: CircleTranslator, count: number): string {
  return count === 1
    ? t('analytics.summarySharedEntry', { count })
    : t('analytics.summarySharedEntries', { count });
}

function localizeSyncedSummaryPattern(
  t: CircleTranslator,
  summary: PatientAnalyticsSummary,
  language: CircleUiLanguage,
): string | null {
  const text = summary.summaryText.trim();

  const latestMatch = text.match(LATEST_PREFIX);
  if (latestMatch) {
    return localizedLatestSummary(t, summary, language, latestMatch[1]);
  }

  const lastOnMatch = text.match(LAST_ON_PREFIX);
  if (lastOnMatch) {
    return localizedLastOnSummary(t, summary, language, lastOnMatch[1]);
  }

  const skipRateMatch = text.match(SKIP_RATE_PREFIX);
  if (skipRateMatch) {
    return t('analytics.summarySkipRate', { rate: skipRateMatch[1] });
  }

  const sharedItemsMatch = text.match(SHARED_ITEMS_PREFIX);
  if (sharedItemsMatch) {
    const count = Number(sharedItemsMatch[1]) || summary.countInWindow;
    return localizedSharedItemsLabel(t, count);
  }

  const sharedEntriesMatch = text.match(SHARED_ENTRIES_PREFIX);
  if (sharedEntriesMatch) {
    const count = Number(sharedEntriesMatch[1]) || summary.countInWindow;
    return localizedSharedEntriesLabel(t, count);
  }

  if (summary.metricId === 'soul-vitality' && summary.countInWindow > 0 && !summary.latestAt) {
    return localizedSharedItemsLabel(t, summary.countInWindow);
  }

  if (summary.metricId === 'diary' && summary.countInWindow > 0 && !summary.latestAt) {
    return localizedSharedEntriesLabel(t, summary.countInWindow);
  }

  return null;
}

export function analyticsMetricTitle(t: CircleTranslator, metricId: AnalyticsMetricId): string {
  const key = METRIC_TITLE_KEYS[metricId];
  return key ? t(key) : metricId;
}

export function analyticsSectionTitle(t: CircleTranslator, sectionId: AnalyticsSectionId): string {
  const key = SECTION_TITLE_KEYS[sectionId];
  return key ? t(key) : sectionId;
}

export function analyticsSummaryFooterText(
  t: CircleTranslator,
  summary: PatientAnalyticsSummary,
  language: CircleUiLanguage = 'English',
): string {
  if (!summary.isReleased || summary.status === 'coming_soon') {
    return t('analytics.summaryToBeReleased');
  }

  const mapped = SUMMARY_TEXT_KEYS[summary.summaryText.trim()];
  if (mapped) return t(mapped);

  const localized = localizeSyncedSummaryPattern(t, summary, language);
  if (localized) return localized;

  return summary.summaryText;
}

export function analyticsWindowDaysLabel(t: CircleTranslator, days: number): string {
  return t('analytics.windowDays', { days });
}

export function analyticsLastDaysLabel(t: CircleTranslator, days: number): string {
  return t('analytics.lastDays', { days });
}

export function analyticsTrendHigherLowerStable(
  t: CircleTranslator,
  trend: AnalyticsTrendDirection,
): string {
  if (trend === 'up') return t('analytics.trendHigher');
  if (trend === 'down') return t('analytics.trendLower');
  return t('analytics.trendStable');
}

export function analyticsTrendImprovingDeclining(
  t: CircleTranslator,
  trend: AnalyticsTrendDirection,
  higherIsBetter = true,
): string {
  if (trend === 'stable') return t('analytics.trendStable');
  if (higherIsBetter) {
    return trend === 'up' ? t('analytics.trendImproving') : t('analytics.trendDeclining');
  }
  return trend === 'up' ? t('analytics.trendDeclining') : t('analytics.trendImproving');
}

export function analyticsDifficultyLabel(t: CircleTranslator, level: string): string {
  const normalized = level.trim().toUpperCase();
  if (normalized === 'LOW') return t('analytics.difficultyEasy');
  if (normalized === 'MEDIUM') return t('analytics.difficultyMedium');
  if (normalized === 'HIGH') return t('analytics.difficultyHard');
  if (normalized === 'N/A') return '—';
  return level;
}

export function analyticsNeurologicalOutcomeLabel(
  t: CircleTranslator,
  value: boolean | null | undefined,
): string {
  if (value === true) return t('analytics.outcomePass');
  if (value === false) return t('analytics.outcomeMiss');
  return t('analytics.outcomeSkipped');
}

export function localizeAnalyticsSummary(
  t: CircleTranslator,
  summary: PatientAnalyticsSummary,
  language: CircleUiLanguage = 'English',
): PatientAnalyticsSummary {
  return {
    ...summary,
    title: analyticsMetricTitle(t, summary.metricId),
    summaryText: analyticsSummaryFooterText(t, summary, language),
  };
}
