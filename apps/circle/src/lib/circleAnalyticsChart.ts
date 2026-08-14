const DAY_MS = 24 * 60 * 60 * 1000;

export const CIRCLE_ANALYTICS_WINDOW_DAYS = 30;

/** Days-ago markers on the x-axis (0 = today on the left, 28 ≈ four weeks back). */
export const CIRCLE_ANALYTICS_X_TICK_DAYS = [0, 7, 14, 21, 28] as const;

export type CircleAnalyticsChartPoint = {
  daysAgo: number;
  chartDate?: string;
};

function calendarDaysSince(ts: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(ts);
  then.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - then.getTime()) / DAY_MS));
}

function parseTimelinePointDate(date: string, label?: string): number | null {
  if (label) {
    const slashMatch = label.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (slashMatch) {
      const month = Number(slashMatch[1]);
      const day = Number(slashMatch[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const now = new Date();
        let candidate = new Date(now.getFullYear(), month - 1, day);
        if (candidate.getTime() > now.getTime()) {
          candidate = new Date(now.getFullYear() - 1, month - 1, day);
        }
        return calendarDaysSince(candidate.getTime());
      }
    }
  }

  const parsed = Date.parse(date);
  if (!Number.isNaN(parsed)) {
    return calendarDaysSince(parsed);
  }

  const withYear = `${date}, ${new Date().getFullYear()}`;
  const withYearParsed = Date.parse(withYear);
  if (!Number.isNaN(withYearParsed)) {
    return calendarDaysSince(withYearParsed);
  }

  return null;
}

/** Fixed 30-day buckets (oldest→newest in source) with today on the left. */
export function prepareDailyBucketChartData<T extends { date: string }>(
  timeline: T[] | undefined,
): Array<T & CircleAnalyticsChartPoint> {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  return [...timeline].reverse().map((point, index) => ({
    ...point,
    daysAgo: index,
    chartDate: point.date,
  }));
}

/** Sparse timelines (assessments, check-in answers) with most recent on the left. */
export function prepareSparseTimelineChartData<T extends { date: string; label?: string }>(
  timeline: T[] | undefined,
): Array<T & CircleAnalyticsChartPoint> {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  return timeline
    .map((point) => {
      const daysAgo = parseTimelinePointDate(point.date, point.label);
      return {
        ...point,
        daysAgo: daysAgo ?? CIRCLE_ANALYTICS_WINDOW_DAYS - 1,
        chartDate: point.date,
      };
    })
    .sort((a, b) => a.daysAgo - b.daysAgo);
}

/** Plot height inside ResponsiveContainer (legend sits below in HTML). */
export const CIRCLE_ANALYTICS_CHART_HEIGHT = 168;

export function circleAnalyticsTooltipLabelFormatter(
  _label: unknown,
  payload: ReadonlyArray<{ payload?: { chartDate?: string; date?: string } }>,
): string {
  const row = payload[0]?.payload;
  return row?.chartDate ?? row?.date ?? '';
}

/** Day markers and legend are HTML below the SVG plot. */
export const CIRCLE_ANALYTICS_CHART_BOTTOM_MARGIN = 4;

export const CIRCLE_ANALYTICS_Y_AXIS_WIDTH = 32;

export function circleAnalyticsChartMargin(
  overrides: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  } = {},
) {
  return {
    top: 4,
    right: 8,
    left: 4,
    bottom: CIRCLE_ANALYTICS_CHART_BOTTOM_MARGIN,
    ...overrides,
  };
}

export function circleAnalyticsPlotInsetLeft(
  margin: ReturnType<typeof circleAnalyticsChartMargin>,
  yAxisWidth = CIRCLE_ANALYTICS_Y_AXIS_WIDTH,
): number {
  return Math.max(0, margin.left + yAxisWidth);
}

export function circleAnalyticsPlotInsetRight(
  margin: ReturnType<typeof circleAnalyticsChartMargin>,
  extraRightAxisWidth = 0,
): number {
  return margin.right + extraRightAxisWidth;
}

/** Sparse timelines: plot only at real check-in dates, not stretched across 30 days. */
export const circleAnalyticsSparseLineProps = {
  type: 'linear' as const,
  dot: { r: 3, strokeWidth: 2 },
  activeDot: { r: 4 },
  connectNulls: false,
};

/** Daily buckets with gaps: curved segments only between consecutive check-in days. */
export const circleAnalyticsDailyAnswerLineProps = {
  type: 'monotone' as const,
  dot: { r: 3, strokeWidth: 2 },
  activeDot: { r: 4 },
  connectNulls: false,
};

export type DailyCheckInParticipationChartPoint = CircleAnalyticsChartPoint & {
  date: string;
  chartDate?: string;
  finished: number;
  skipped: number;
  notTaken: number;
};

export type DailyCheckInAnswerTrendChartPoint = CircleAnalyticsChartPoint & {
  date: string;
  chartDate?: string;
  label?: string;
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  vitality: number | null;
};

/**
 * Days-ago for a check-in answer. `YYYY-MM-DD` is read as a local calendar day —
 * Date.parse would treat it as UTC midnight and shift the day west of Greenwich.
 */
function answerTrendDaysAgo(date: string, label?: string): number | null {
  const iso = date.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const local = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(local.getTime())) return calendarDaysSince(local.getTime());
  }
  return parseTimelinePointDate(date, label);
}

function localCalendarDayLabel(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** One bar per day: finished, skipped, or not taken (mutually exclusive, stacked height 1). */
export function prepareDailyCheckInParticipationChartData(
  timeline: Array<{ date: string; completed: number; skipped: number }> | undefined,
): DailyCheckInParticipationChartPoint[] {
  return prepareDailyBucketChartData(timeline).map((point) => {
    const finished = point.completed > 0 ? 1 : 0;
    const skipped = point.skipped > 0 && finished === 0 ? 1 : 0;
    const notTaken = finished === 0 && skipped === 0 ? 1 : 0;
    return {
      ...point,
      finished,
      skipped,
      notTaken,
    };
  });
}

/**
 * Expand sparse check-in answers onto the same 30-day daily backbone as participation,
 * so Answer Trends shares the full window (gaps on days without a completed check-in).
 */
export function prepareDailyCheckInAnswerTrendChartData(
  answerTrend:
    | Array<{
        date: string;
        label?: string;
        mood?: number;
        pain?: number;
        sleep?: number;
        vitality?: number;
      }>
    | undefined,
  participationTimeline?: Array<{ date: string }> | undefined,
): DailyCheckInAnswerTrendChartPoint[] {
  const answers = Array.isArray(answerTrend) ? answerTrend : [];
  if (answers.length === 0) return [];

  // Index 0 is today on the left, matching the participation buckets and day markers.
  const backboneDates =
    Array.isArray(participationTimeline) && participationTimeline.length > 0
      ? [...participationTimeline].reverse().map((point) => point.date)
      : [];
  const slotCount = Math.max(CIRCLE_ANALYTICS_WINDOW_DAYS, backboneDates.length);

  const slots: DailyCheckInAnswerTrendChartPoint[] = [];
  for (let daysAgo = 0; daysAgo < slotCount; daysAgo += 1) {
    const date = backboneDates[daysAgo] ?? localCalendarDayLabel(daysAgo);
    slots.push({
      daysAgo,
      date,
      chartDate: date,
      label: date,
      mood: null,
      pain: null,
      sleep: null,
      vitality: null,
    });
  }

  for (const point of answers) {
    const daysAgo = answerTrendDaysAgo(point.date, point.label);
    if (daysAgo == null || daysAgo < 0 || daysAgo >= slots.length) continue;
    const slot = slots[daysAgo];
    slot.chartDate = point.date || slot.chartDate;
    slot.label = point.label || point.date || slot.label;
    slot.mood = point.mood ?? null;
    slot.pain = point.pain ?? null;
    slot.sleep = point.sleep ?? null;
    slot.vitality = point.vitality ?? null;
  }

  return slots;
}
