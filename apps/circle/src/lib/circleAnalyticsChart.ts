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
