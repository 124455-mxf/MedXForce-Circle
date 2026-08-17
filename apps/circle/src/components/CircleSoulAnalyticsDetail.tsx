import { useMemo, useState } from 'react';
import { Calendar, Images, Heart, Image, Video, EyeOff, User, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, SoulGalleryTimelinePoint } from '@medxforce/shared';
import { useCircleSoulGalleryLiveTimeline } from '../hooks/useCircleSoulGalleryLiveTimeline';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsWindowDaysLabel } from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  CircleAnalyticsStatCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CircleSoulAnalyticsDetailProps = {
  patientId?: string;
  albumCount?: number;
  photoCount?: number;
  videoCount?: number;
  unseenPhotoCount?: number;
  reactionCount?: number;
  latestAt?: number | null;
  trend?: AnalyticsTrendDirection;
  timeline?: SoulGalleryTimelinePoint[];
};

function formatLatestDate(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function shareTrendCopy(
  trend: AnalyticsTrendDirection,
  t: ReturnType<typeof useCircleT>,
): { label: string; hint: string; colorClass: string } {
  if (trend === 'up') {
    return {
      label: t('analytics.trendMoreShared'),
      hint: t('analytics.soul.moreSharedHint'),
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: t('analytics.trendFewerShared'),
      hint: t('analytics.soul.fewerSharedHint'),
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: t('analytics.trendAboutTheSame'),
    hint: t('analytics.soul.aboutSameHint'),
    colorClass: 'text-slate-600 bg-slate-100',
  };
}

export function CircleSoulAnalyticsDetail({
  patientId,
  albumCount = 0,
  photoCount = 0,
  videoCount = 0,
  unseenPhotoCount = 0,
  reactionCount = 0,
  latestAt = null,
  trend = 'stable',
  timeline,
}: CircleSoulAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const live = useCircleSoulGalleryLiveTimeline(patientId);
  const chartTimeline = useMemo(() => {
    if (live.timeline.length > 0) return live.timeline;
    return Array.isArray(timeline) ? timeline : [];
  }, [live.timeline, timeline]);
  const circleUnseen = live.circleUnseenPhotoCount;
  const patientUnseen = live.patientUnseenPhotoCount ?? unseenPhotoCount;
  const copy = shareTrendCopy(trend, t);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const hasChart = chartTimeline.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-rose-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {analyticsWindowDaysLabel(t, 30)}
        </p>
      </div>
      <div className="p-4 space-y-3">
        {hasChart && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</span>
            <CircleAnalyticsChartTypeToggle
              chartType={chartType}
              onChange={setChartType}
              lineAriaLabel={t('analytics.lineChart')}
              barAriaLabel={t('analytics.barChart')}
            />
          </div>
        )}

        <CircleAnalyticsSeriesCard
          icon={Image}
          title={t('analytics.soul.photos')}
          value={photoCount}
          hint={t('analytics.soul.photosHint')}
          color="#e11d48"
          iconWrapClass="text-rose-600"
          cardClass="border-rose-200 bg-rose-50/50"
          titleClass="text-rose-700"
          valueClass="text-rose-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(chartTimeline, 'photos')}
        />
        <CircleAnalyticsSeriesCard
          icon={Video}
          title={t('analytics.soul.videos')}
          value={videoCount}
          hint={t('analytics.soul.videosHint')}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(chartTimeline, 'videos')}
        />
        <CircleAnalyticsSeriesCard
          icon={Heart}
          title={t('analytics.soul.reactions')}
          value={reactionCount}
          hint={t('analytics.soul.reactionsHint')}
          color="#7c3aed"
          iconWrapClass="text-violet-600"
          cardClass="border-violet-200 bg-violet-50/50"
          titleClass="text-violet-700"
          valueClass="text-violet-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(chartTimeline, 'reactions')}
        />
        <CircleAnalyticsStatCard
          icon={EyeOff}
          title={t('analytics.soul.unseenCircle')}
          value={circleUnseen}
          hint={t('analytics.soul.unseenCircleHint')}
          iconWrapClass={circleUnseen > 0 ? 'text-amber-600' : 'text-slate-500'}
          cardClass={circleUnseen > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/70'}
          titleClass={circleUnseen > 0 ? 'text-amber-700' : 'text-slate-600'}
          valueClass={circleUnseen > 0 ? 'text-amber-700' : 'text-slate-800'}
        />
        <CircleAnalyticsStatCard
          icon={User}
          title={t('analytics.soul.unseenPatient')}
          value={patientUnseen}
          hint={t('analytics.soul.unseenPatientHint')}
          iconWrapClass={patientUnseen > 0 ? 'text-orange-600' : 'text-slate-500'}
          cardClass={patientUnseen > 0 ? 'border-orange-200 bg-orange-50/50' : 'border-slate-200 bg-slate-50/70'}
          titleClass={patientUnseen > 0 ? 'text-orange-700' : 'text-slate-600'}
          valueClass={patientUnseen > 0 ? 'text-orange-700' : 'text-slate-800'}
        />
        <CircleAnalyticsStatCard
          icon={Images}
          title={t('analytics.soul.albums')}
          value={albumCount}
          hint={t('analytics.soul.albumsHint')}
          iconWrapClass="text-slate-600"
          cardClass="border-slate-200 bg-slate-50/70"
          titleClass="text-slate-600"
          valueClass="text-slate-800"
        />
        <CircleAnalyticsStatCard
          icon={Calendar}
          title={t('analytics.soul.lastShared')}
          value={formatLatestDate(latestAt)}
          iconWrapClass="text-slate-600"
          cardClass="border-slate-200 bg-slate-50/70"
          titleClass="text-slate-600"
          valueClass="text-[13px] font-bold text-slate-800 leading-tight"
        />

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{t('analytics.trend')}</p>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[13px] font-bold', copy.colorClass)}>
              <TrendIcon size={12} />
              {copy.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">{copy.hint}</p>
        </div>
      </div>
    </div>
  );
}
