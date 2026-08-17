import { BookOpen, Calendar, Flag } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';
import { CircleAnalyticsStatCard } from './CircleAnalyticsSeriesCard';

type CircleDiaryAnalyticsDetailProps = {
  entryCount?: number;
  milestoneCount?: number;
  latestAt?: number | null;
};

function formatLatestDate(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CircleDiaryAnalyticsDetail({
  entryCount = 0,
  milestoneCount = 0,
  latestAt = null,
}: CircleDiaryAnalyticsDetailProps) {
  const t = useCircleT();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-amber-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {t('analytics.diary.sharedDiary')}
        </p>
      </div>
      <div className="p-4 space-y-3">
        <CircleAnalyticsStatCard
          icon={BookOpen}
          title={t('analytics.diary.entries')}
          value={entryCount}
          hint={t('analytics.diary.entriesHint')}
          iconWrapClass="text-amber-600"
          cardClass="border-amber-200 bg-amber-50/50"
          titleClass="text-amber-700"
          valueClass="text-amber-700"
        />
        <CircleAnalyticsStatCard
          icon={Flag}
          title={t('analytics.diary.milestones')}
          value={milestoneCount}
          hint={t('analytics.diary.milestonesHint')}
          iconWrapClass="text-violet-600"
          cardClass="border-violet-200 bg-violet-50/50"
          titleClass="text-violet-700"
          valueClass="text-violet-700"
        />
        <CircleAnalyticsStatCard
          icon={Calendar}
          title={t('analytics.diary.lastEntry')}
          value={formatLatestDate(latestAt)}
          iconWrapClass="text-slate-600"
          cardClass="border-slate-200 bg-slate-50/70"
          titleClass="text-slate-600"
          valueClass="text-slate-800"
        />
        <p className="text-[11px] text-slate-400 leading-snug">{t('analytics.diary.footnote')}</p>
      </div>
    </div>
  );
}
