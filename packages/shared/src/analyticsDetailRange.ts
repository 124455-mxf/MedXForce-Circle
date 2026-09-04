/**
 * Longer-range Analytics detail windows for Circle proxies/caregivers.
 * Keep in sync with medxforce/src/lib/analyticsDetailRange.ts
 *
 * List-page summaries stay at 30 days. Detail timelines for scoped metrics
 * (assessments, daily check-in, alert & attention, companion, messages,
 * diary, vitality, and soul gallery) may include up to
 * ANALYTICS_DETAIL_HISTORY_DAYS.
 */

export type AnalyticsDetailRangeId = '30' | '90' | '180' | 'all';

export const ANALYTICS_LIST_WINDOW_DAYS = 30;
export const ANALYTICS_DETAIL_DAILY_DAYS = 90;
export const ANALYTICS_DETAIL_HISTORY_DAYS = 730;

export const ANALYTICS_DETAIL_RANGE_IDS: readonly AnalyticsDetailRangeId[] = [
  '30',
  '90',
  '180',
  'all',
];

export const ANALYTICS_DETAIL_RANGE_DAYS: Record<Exclude<AnalyticsDetailRangeId, 'all'>, number> = {
  '30': 30,
  '90': 90,
  '180': 180,
};

export type AnalyticsDetailChartGrain = 'day' | 'week' | 'month';

export function parseAnalyticsDetailRangeId(raw: unknown): AnalyticsDetailRangeId {
  if (raw === '30' || raw === '90' || raw === '180' || raw === 'all') return raw;
  return '30';
}

export function analyticsDetailRangeDays(
  rangeId: AnalyticsDetailRangeId,
  seriesSpanDays = ANALYTICS_DETAIL_HISTORY_DAYS,
): number {
  if (rangeId === 'all') return Math.max(1, Math.min(ANALYTICS_DETAIL_HISTORY_DAYS, seriesSpanDays));
  return ANALYTICS_DETAIL_RANGE_DAYS[rangeId];
}

export function analyticsDetailRangeGrain(rangeId: AnalyticsDetailRangeId): AnalyticsDetailChartGrain {
  if (rangeId === '30') return 'day';
  if (rangeId === '90') return 'week';
  return 'month';
}

export function isAnalyticsRangeDetailKind(kind: string | undefined): boolean {
  return (
    kind === 'alert_attention' ||
    kind === 'companion' ||
    kind === 'messages' ||
    kind === 'daily_check_in' ||
    kind === 'assessment_count' ||
    kind === 'vision' ||
    kind === 'neurological' ||
    kind === 'psychological' ||
    kind === 'speech_language' ||
    kind === 'diary' ||
    kind === 'vitality_game' ||
    kind === 'soul_gallery'
  );
}
