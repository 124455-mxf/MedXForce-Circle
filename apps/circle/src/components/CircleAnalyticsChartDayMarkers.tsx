import { CIRCLE_ANALYTICS_X_TICK_DAYS } from '../lib/circleAnalyticsChart';

/** Align with the 0–28 tick scale in the analytics mockup (today on the left). */
const X_AXIS_MAX_DAY = 28;

type CircleAnalyticsChartDayMarkersProps = {
  /** Left inset matching chart margin.left + YAxis width. */
  plotInsetLeft?: number;
  /** Right inset matching chart margin.right. */
  plotInsetRight?: number;
};

export function CircleAnalyticsChartDayMarkers({
  plotInsetLeft = 36,
  plotInsetRight = 8,
}: CircleAnalyticsChartDayMarkersProps) {
  return (
    <div
      className="w-full tabular-nums"
      style={{ paddingLeft: plotInsetLeft, paddingRight: plotInsetRight }}
    >
      <div className="relative h-5 border-t border-slate-200">
        {CIRCLE_ANALYTICS_X_TICK_DAYS.map((day) => (
          <span
            key={day}
            className="absolute top-1.5 -translate-x-1/2 text-[9px] font-semibold text-slate-500"
            style={{ left: `${(day / X_AXIS_MAX_DAY) * 100}%` }}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}
