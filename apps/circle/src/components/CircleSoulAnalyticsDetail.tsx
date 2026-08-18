import { useMemo, useState } from 'react';
import { Calendar, Images, Heart, Image, Video, EyeOff, User, Users, Minus, TrendingDown, TrendingUp } from 'lucide-react';
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
  windowLabel?: string;
  windowDays?: number;
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
  windowLabel: string,
): { label: string; hint: string; colorClass: string } {
  if (trend === 'up') {
    return {
      label: t('analytics.trendMoreShared'),
      hint: t('analytics.soul.moreSharedHint', { window: windowLabel }),
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: t('analytics.trendFewerShared'),
      hint: t('analytics.soul.fewerSharedHint', { window: windowLabel }),
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: t('analytics.trendAboutTheSame'),
    hint: t('analytics.soul.aboutSameHint', { window: windowLabel }),
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
  windowLabel,
  windowDays = 30,
}: CircleSoulAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');
  const rangeLabel = windowLabel ?? analyticsWindowDaysLabel(t, 30);
  const live = useCircleSoulGalleryLiveTimeline(patientId, true, windowDays);
  const hasSyncedTimeline = Array.isArray(timeline) && timeline.length > 0;
  const chartTimeline = useMemo(() => {
    if (hasSyncedTimeline) return timeline;
    return live.timeline;
  }, [hasSyncedTimeline, timeline, live.timeline]);
  const livePhotos = live.timeline.reduce((sum, point) => sum + point.photos, 0);
  const liveVideos = live.timeline.reduce((sum, point) => sum + point.videos, 0);
  const liveReactions = live.timeline.reduce((sum, point) => sum + point.reactions, 0);
  const displayPhotoCount = hasSyncedTimeline ? photoCount : livePhotos;
  const displayVideoCount = hasSyncedTimeline ? videoCount : liveVideos;
  const displayReactionCount = hasSyncedTimeline ? reactionCount : liveReactions;
  const hasLiveSplit = live.timeline.length > 0;
  const patientReactionCount = hasLiveSplit
    ? live.timeline.reduce((sum, point) => sum + point.patientReactions, 0)
    : 0;
  const circleReactionCount = hasLiveSplit
    ? live.timeline.reduce((sum, point) => sum + point.circleReactions, 0)
    : 0;
  const circleUnseen = live.circleUnseenPhotoCount;
  const patientUnseen = live.patientUnseenPhotoCount ?? unseenPhotoCount;
  const copy = shareTrendCopy(trend, t, rangeLabel);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const hasChart = chartTimeline.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-rose-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {rangeLabel}
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
          value={displayPhotoCount}
          hint={t('analytics.soul.photosHint', { window: rangeLabel })}
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
          value={displayVideoCount}
          hint={t('analytics.soul.videosHint', { window: rangeLabel })}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(chartTimeline, 'videos')}
        />
        {hasLiveSplit ? (
          <>
            <CircleAnalyticsSeriesCard
              icon={Heart}
              title={t('analytics.soul.reactionsByPatient')}
              value={patientReactionCount}
              hint={t('analytics.soul.reactionsByPatientHint', { window: rangeLabel })}
              color="#7c3aed"
              iconWrapClass="text-violet-600"
              cardClass="border-violet-200 bg-violet-50/50"
              titleClass="text-violet-700"
              valueClass="text-violet-700"
              chartType={chartType}
              chartData={seriesFromKeyedTimeline(live.timeline, 'patientReactions')}
            />
            <CircleAnalyticsSeriesCard
              icon={Users}
              title={t('analytics.soul.reactionsByCircle')}
              value={circleReactionCount}
              hint={t('analytics.soul.reactionsByCircleHint', { window: rangeLabel })}
              color="#4f46e5"
              iconWrapClass="text-indigo-600"
              cardClass="border-indigo-200 bg-indigo-50/50"
              titleClass="text-indigo-700"
              valueClass="text-indigo-700"
              chartType={chartType}
              chartData={seriesFromKeyedTimeline(live.timeline, 'circleReactions')}
            />
          </>
        ) : (
          <CircleAnalyticsSeriesCard
            icon={Heart}
            title={t('analytics.soul.reactions')}
            value={displayReactionCount}
            hint={t('analytics.soul.reactionsHint', { window: rangeLabel })}
            color="#7c3aed"
            iconWrapClass="text-violet-600"
            cardClass="border-violet-200 bg-violet-50/50"
            titleClass="text-violet-700"
            valueClass="text-violet-700"
            chartType={chartType}
            chartData={seriesFromKeyedTimeline(chartTimeline, 'reactions')}
          />
        )}
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
