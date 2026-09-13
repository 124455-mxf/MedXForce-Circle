import { XAxis, type XAxisProps } from 'recharts';

/** Align with HTML day markers below the plot. */
const X_AXIS_MAX_DAY = 28;

type CircleAnalyticsChartXAxisProps = Partial<XAxisProps> & {
  /**
   * daily — 30 buckets, one per day (categorical index matches left→right order).
   * sparse — assessments/check-ins: plot each point at its real days-ago position.
   */
  variant?: 'daily' | 'sparse';
  /** Right edge of the sparse days-ago axis. 30-day charts stay at 28. */
  domainMax?: number;
};

export function CircleAnalyticsChartXAxis({
  variant = 'daily',
  domainMax = X_AXIS_MAX_DAY,
  ...props
}: CircleAnalyticsChartXAxisProps) {
  if (variant === 'sparse') {
    return (
      <XAxis
        type="number"
        dataKey="daysAgo"
        domain={[0, Math.max(X_AXIS_MAX_DAY, domainMax)]}
        scale="linear"
        allowDecimals={false}
        hide
        {...props}
      />
    );
  }

  return <XAxis hide {...props} />;
}
