import {
  ANALYTICS_DETAIL_RANGE_IDS,
  type AnalyticsDetailRangeId,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import type { CircleTranslator } from '../lib/circleI18nContext';

const RANGE_LABEL_KEYS: Record<AnalyticsDetailRangeId, string> = {
  '30': 'analytics.range30',
  '90': 'analytics.range90',
  '180': 'analytics.range6Months',
  all: 'analytics.rangeSinceStart',
};

type CircleAnalyticsRangeChipsProps = {
  value: AnalyticsDetailRangeId;
  onChange: (next: AnalyticsDetailRangeId) => void;
  t: CircleTranslator;
};

export function CircleAnalyticsRangeChips({ value, onChange, t }: CircleAnalyticsRangeChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('analytics.rangeGroup')}>
      {ANALYTICS_DETAIL_RANGE_IDS.map((rangeId) => {
        const selected = rangeId === value;
        return (
          <button
            key={rangeId}
            type="button"
            onClick={() => onChange(rangeId)}
            aria-pressed={selected}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors',
              selected
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {t(RANGE_LABEL_KEYS[rangeId])}
          </button>
        );
      })}
    </div>
  );
}
