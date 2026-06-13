import { useCircleT } from '../lib/circleI18nContext';

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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {t('analytics.diary.sharedDiary')}
        </p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              {t('analytics.diary.entries')}
            </p>
            <p className="text-2xl font-black text-amber-600 tabular-nums leading-none">
              {entryCount}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              {t('analytics.diary.milestones')}
            </p>
            <p className="text-2xl font-black text-violet-600 tabular-nums leading-none">
              {milestoneCount}
            </p>
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              {t('analytics.diary.lastEntry')}
            </p>
            <p className="text-sm font-black text-slate-800 leading-tight">
              {formatLatestDate(latestAt)}
            </p>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 leading-snug mt-4">{t('analytics.diary.footnote')}</p>
      </div>
    </div>
  );
}
