import type { CircleAnalyticsLegendItem } from './CircleAnalyticsChartLegendRow';
import { CircleAnalyticsChartDayMarkers } from './CircleAnalyticsChartDayMarkers';
import { CircleAnalyticsChartLegendRow } from './CircleAnalyticsChartLegendRow';

type CircleAnalyticsChartFooterProps = {
  legend: CircleAnalyticsLegendItem[];
  plotInsetLeft?: number;
  plotInsetRight?: number;
  /** Sparse charts: show when few real dates exist (not daily buckets). */
  sparsePointCount?: number;
};

export function CircleAnalyticsChartFooter({
  legend,
  plotInsetLeft,
  plotInsetRight,
  sparsePointCount,
}: CircleAnalyticsChartFooterProps) {
  return (
    <>
      <CircleAnalyticsChartDayMarkers
        plotInsetLeft={plotInsetLeft}
        plotInsetRight={plotInsetRight}
      />
      <CircleAnalyticsChartLegendRow items={legend} />
      {sparsePointCount != null && sparsePointCount > 0 && sparsePointCount <= 5 && (
        <p className="text-[9px] text-slate-400 text-center leading-snug pt-1 px-2">
          Dots mark actual check-in dates ({sparsePointCount} in this period) — not every day has
          data.
        </p>
      )}
    </>
  );
}
