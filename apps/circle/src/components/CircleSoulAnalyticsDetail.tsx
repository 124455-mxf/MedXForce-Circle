import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection } from '@medxforce/shared';
import { cn } from '../lib/utils';

type CircleSoulAnalyticsDetailProps = {
  albumCount?: number;
  photoCount?: number;
  videoCount?: number;
  unseenPhotoCount?: number;
  reactionCount?: number;
  latestAt?: number | null;
  trend?: AnalyticsTrendDirection;
};

function formatLatestDate(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return '—';
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function shareTrendCopy(trend: AnalyticsTrendDirection): {
  label: string;
  hint: string;
  colorClass: string;
} {
  if (trend === 'up') {
    return {
      label: 'More shared',
      hint: 'More photos and videos shared in the last 30 days vs the prior 30 days.',
      colorClass: 'text-emerald-700 bg-emerald-50',
    };
  }
  if (trend === 'down') {
    return {
      label: 'Fewer shared',
      hint: 'Fewer photos and videos shared in the last 30 days vs the prior 30 days.',
      colorClass: 'text-amber-700 bg-amber-50',
    };
  }
  return {
    label: 'About the same',
    hint: 'Sharing volume is similar to the previous 30 days.',
    colorClass: 'text-slate-600 bg-slate-100',
  };
}

function ShareTrendRow({ trend }: { trend: AnalyticsTrendDirection }) {
  const copy = shareTrendCopy(trend);
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
        Sharing vs prior 30 days
      </p>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold',
            copy.colorClass,
          )}
        >
          <Icon size={12} />
          {copy.label}
        </span>
      </div>
      <p className="text-[9px] text-slate-400 leading-snug">{copy.hint}</p>
    </div>
  );
}

export function CircleSoulAnalyticsDetail({
  albumCount = 0,
  photoCount = 0,
  videoCount = 0,
  unseenPhotoCount = 0,
  reactionCount = 0,
  latestAt = null,
  trend = 'stable',
}: CircleSoulAnalyticsDetailProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-rose-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
          30 days
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Albums</p>
            <p className="text-2xl font-black text-rose-600 tabular-nums leading-none">
              {albumCount}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Photos</p>
            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">
              {photoCount}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Videos</p>
            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">
              {videoCount}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Unseen by patient
            </p>
            <p
              className={cn(
                'text-2xl font-black tabular-nums leading-none',
                unseenPhotoCount > 0 ? 'text-amber-600' : 'text-slate-800',
              )}
            >
              {unseenPhotoCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-50">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Reactions
            </p>
            <p className="text-xl font-black text-violet-600 tabular-nums leading-none">
              {reactionCount}
            </p>
            <p className="text-[9px] text-slate-400 leading-snug">
              Emoji reactions on shared family media.
            </p>
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              Latest shared
            </p>
            <p className="text-sm font-black text-slate-800 leading-tight">
              {formatLatestDate(latestAt)}
            </p>
            <p className="text-[9px] text-slate-400 leading-snug">
              Most recent family photo or video.
            </p>
          </div>
        </div>

        <ShareTrendRow trend={trend} />

        <p className="text-[9px] text-slate-400 leading-snug">
          Counts include photos and videos shared from the care circle. Patient uploads and the
          MedXForce exercise library are excluded.
        </p>
      </div>
    </div>
  );
}
