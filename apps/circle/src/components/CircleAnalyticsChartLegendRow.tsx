export type CircleAnalyticsLegendItem = {
  color: string;
  label: string;
};

type CircleAnalyticsChartLegendRowProps = {
  items: CircleAnalyticsLegendItem[];
};

export function CircleAnalyticsChartLegendRow({ items }: CircleAnalyticsChartLegendRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 mt-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
