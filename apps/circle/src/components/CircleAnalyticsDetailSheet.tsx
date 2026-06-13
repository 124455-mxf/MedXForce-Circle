import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Brain,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import type {
  AnalyticsMetricDetail,
  AnalyticsTrendDirection,
  PatientAnalyticsSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import {
  analyticsLastDaysLabel,
  analyticsTrendHigherLowerStable,
  analyticsWindowDaysLabel,
} from '../lib/circleAnalyticsI18n';
import { CircleAlertAttentionAnalyticsDetail } from './CircleAlertAttentionAnalyticsDetail';
import { CircleCompanionAnalyticsDetail } from './CircleCompanionAnalyticsDetail';
import { CircleDailyCheckInAnalyticsDetail } from './CircleDailyCheckInAnalyticsDetail';
import { CircleMessagesAnalyticsDetail } from './CircleMessagesAnalyticsDetail';
import { CircleDiaryAnalyticsDetail } from './CircleDiaryAnalyticsDetail';
import { CircleVisionAnalyticsDetail } from './CircleVisionAnalyticsDetail';
import { CircleVitalityGameAnalyticsDetail } from './CircleVitalityGameAnalyticsDetail';
import { CircleSoulAnalyticsDetail } from './CircleSoulAnalyticsDetail';
import { CircleNeurologicalAnalyticsDetail } from './CircleNeurologicalAnalyticsDetail';
import { CirclePsychologicalAnalyticsDetail } from './CirclePsychologicalAnalyticsDetail';

type CircleAnalyticsDetailSheetProps = {
  summary: PatientAnalyticsSummary | null;
  onClose: () => void;
};

function TrendBadge({ trend }: { trend: AnalyticsTrendDirection }) {
  if (trend === 'up') {
    return <TrendingUp size={14} className="text-red-500" />;
  }
  if (trend === 'down') {
    return <TrendingDown size={14} className="text-emerald-500" />;
  }
  return <Minus size={14} className="text-slate-300" />;
}

function WindowHeader({ days }: { days: number }) {
  const t = useCircleT();
  return (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
      {analyticsWindowDaysLabel(t, days)}
    </p>
  );
}

function MetricMini({
  label,
  value,
  valueClass = 'text-slate-800',
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className={cn('text-lg font-black leading-none tabular-nums', valueClass)}>{value}</p>
    </div>
  );
}

function DetailShell({
  windowDays = 30,
  headerClass,
  children,
}: {
  windowDays?: number;
  headerClass?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={cn('px-3 py-2 border-b border-slate-100', headerClass)}>
        <WindowHeader days={windowDays} />
      </div>
      {children}
    </div>
  );
}


function AssessmentCountDetail({
  detail,
  summary,
}: {
  detail: Extract<AnalyticsMetricDetail, { kind: 'assessment_count' }>;
  summary: PatientAnalyticsSummary;
}) {
  const t = useCircleT();
  const entries = detail.count ?? summary.countInWindow;
  const average = detail.average ?? summary.averageInWindow;
  return (
    <DetailShell>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <MetricMini
            label={t('analytics.entries30Days')}
            value={entries}
            valueClass="text-blue-600 text-2xl"
          />
          <MetricMini
            label={t('analytics.average')}
            value={average != null ? average : '—'}
            valueClass="text-slate-800 text-2xl"
          />
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              {t('analytics.trend')}
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <TrendBadge trend={detail.trend} />
              <span className="text-[11px] font-bold text-slate-600">
                {analyticsTrendHigherLowerStable(t, detail.trend)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DetailShell>
  );
}

function renderDetailBody(detail: AnalyticsMetricDetail, summary: PatientAnalyticsSummary) {
  switch (detail.kind) {
    case 'alert_attention':
      return (
        <CircleAlertAttentionAnalyticsDetail
          alerts={detail.alerts}
          attentions={detail.attentions}
          trend={detail.trend}
          timeline={detail.timeline}
        />
      );
    case 'companion':
      return (
        <CircleCompanionAnalyticsDetail
          total={detail.total}
          conversations={detail.conversations}
          interactions={detail.interactions}
          newCount={detail.newCount}
          resumed={detail.resumed}
          detected={detail.detected}
          avgInteractions={detail.avgInteractions}
          trend={detail.trend}
          topTopics={detail.topTopics}
          timeline={detail.timeline}
        />
      );
    case 'messages':
      return (
        <CircleMessagesAnalyticsDetail
          communication={detail.communication}
          messaging={detail.messaging}
          trend={detail.trend}
          topItems={detail.topItems}
          messagingBreakdown={detail.messagingBreakdown}
          timeline={detail.timeline}
        />
      );
    case 'daily_check_in':
      return (
        <CircleDailyCheckInAnalyticsDetail
          completed={detail.completed}
          skipped={detail.skipped}
          total={detail.total}
          skipRate={detail.skipRate}
          trend={detail.trend}
          answerTrend={detail.answerTrend}
          timeline={detail.timeline}
        />
      );
    case 'vitality_game':
      return (
        <CircleVitalityGameAnalyticsDetail
          gamesPlayed={detail.gamesPlayed}
          avgAccuracy={detail.avgAccuracy}
          totalTimeLabel={detail.totalTimeLabel}
          trend={detail.trend}
          level={detail.level}
          timeline={detail.timeline}
        />
      );
    case 'diary':
      return (
        <CircleDiaryAnalyticsDetail
          entryCount={detail.entryCount}
          milestoneCount={detail.milestoneCount}
          latestAt={detail.latestAt}
        />
      );
    case 'soul_gallery':
      return (
        <CircleSoulAnalyticsDetail
          albumCount={detail.albumCount}
          photoCount={detail.photoCount}
          videoCount={detail.videoCount}
          unseenPhotoCount={detail.unseenPhotoCount}
          reactionCount={detail.reactionCount}
          latestAt={detail.latestAt}
          trend={detail.trend}
        />
      );
    case 'vision':
      return (
        <CircleVisionAnalyticsDetail
          count={detail.count}
          average={detail.average}
          trend={detail.trend}
          timeline={detail.timeline}
          latestFindings={detail.latestFindings}
          categoryTrends={detail.categoryTrends}
        />
      );
    case 'neurological':
      return (
        <CircleNeurologicalAnalyticsDetail
          count={detail.count}
          average={detail.average}
          trend={detail.trend}
          overall={detail.overall}
          executive={detail.executive}
          language={detail.language}
          attention={detail.attention}
          timeline={detail.timeline}
          latestSnapshot={detail.latestSnapshot}
        />
      );
    case 'psychological':
      return (
        <CirclePsychologicalAnalyticsDetail
          count={detail.count}
          trend={detail.trend}
          mood={detail.mood}
          anxiety={detail.anxiety}
          sleep={detail.sleep}
          stress={detail.stress}
          energy={detail.energy}
          timeline={detail.timeline}
        />
      );
    case 'assessment_count':
      return <AssessmentCountDetail detail={detail} summary={summary} />;
    default:
      return null;
  }
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  'alert-attention': Bell,
  'speech-history': MessageSquare,
  'ai-conversation': Bot,
  'daily-check-in': Calendar,
  'vitality-game': Sparkles,
  vision: Eye,
  diary: BookOpen,
  'soul-vitality': Heart,
  neurological: Brain,
  psychological: Heart,
};

const SWIPE_DISMISS_PX = 80;

export function CircleAnalyticsDetailSheet({ summary, onClose }: CircleAnalyticsDetailSheetProps) {
  const t = useCircleT();
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef(0);
  const dragYRef = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (!summary) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [summary, onClose]);

  useEffect(() => {
    dragYRef.current = 0;
    setDragY(0);
    dragging.current = false;
  }, [summary?.metricId]);

  if (!summary) return null;

  const Icon = METRIC_ICONS[summary.metricId];
  const detail = summary.detail;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    dragging.current = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragging.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      dragYRef.current = delta;
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    if (dragYRef.current >= SWIPE_DISMISS_PX) onClose();
    else {
      dragYRef.current = 0;
      setDragY(0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="circle-analytics-detail-title"
        className="bg-[#F8FAFC] w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[88vh] flex flex-col min-h-0"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragY === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 rounded-t-[28px] bg-white touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h3 id="circle-analytics-detail-title" className="font-bold text-slate-800 truncate">
                  {summary.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {analyticsLastDaysLabel(t, summary.windowDays)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
              aria-label={t('analytics.close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
          {detail ? (
            renderDetailBody(detail, summary)
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">{summary.summaryText}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{t('analytics.detailNotSynced')}</p>
            </div>
          )}
          <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2">
            {t('analytics.footerHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
