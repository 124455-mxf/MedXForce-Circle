import { XAxis, type XAxisProps } from 'recharts';

/** Align with HTML day markers below the plot. */
const X_AXIS_MAX_DAY = 28;

type CircleAnalyticsChartXAxisProps = Partial<XAxisProps> & {
  /**
   * daily — 30 buckets, one per day (categorical index matches left→right order).
   * sparse — assessments/check-ins: plot each point at its real days-ago position.
   */
  variant?: 'daily' | 'sparse';
};

export function CircleAnalyticsChartXAxis({
  variant = 'daily',
  ...props
}: CircleAnalyticsChartXAxisProps) {
  if (variant === 'sparse') {
    return (
      <XAxis
        type="number"
        dataKey="daysAgo"
        domain={[0, X_AXIS_MAX_DAY]}
        scale="linear"
        allowDecimals={false}
        hide
        {...props}
      />
    );
  }

  return <XAxis hide {...props} />;
}
