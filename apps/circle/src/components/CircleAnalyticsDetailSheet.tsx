import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import {
  Keyboard,
  MessageSquare,
  X,
  type LucideIcon,
} from 'lucide-react';
import type {
  AnalyticsMetricDetail,
  PatientAnalyticsSummary,
  RemoteAssessmentSchedule,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsDetailRangeWindowLabel } from '../lib/circleAnalyticsI18n';
import {
  ANALYTICS_SHEET_ICON_TILE_CLASS,
  analyticsMetricIcon,
  analyticsMetricIconWrapClass,
} from '../lib/circleAnalyticsMetricUi';
import {
  analyticsDetailRangeDays,
  applyAnalyticsDetailRange,
  isAnalyticsRangeDetailKind,
  readAnalyticsDetailRange,
  writeAnalyticsDetailRange,
  type AnalyticsDetailChartGrain,
  type AnalyticsDetailRangeId,
} from '../lib/circleAnalyticsDetailRange';
import { CircleAnalyticsRangeChips } from './CircleAnalyticsRangeChips';
import { CircleAlertAttentionAnalyticsDetail } from './CircleAlertAttentionAnalyticsDetail';
import { CircleAssessmentCountAnalyticsDetail } from './CircleAssessmentCountAnalyticsDetail';
import { CircleCompanionAnalyticsDetail } from './CircleCompanionAnalyticsDetail';
import { CircleDailyCheckInAnalyticsDetail } from './CircleDailyCheckInAnalyticsDetail';
import {
  CircleMessagesAnalyticsDetail,
  type CircleMessagesAnalyticsFocus,
} from './CircleMessagesAnalyticsDetail';
import { CircleDiaryAnalyticsDetail } from './CircleDiaryAnalyticsDetail';
import { CircleVisionAnalyticsDetail } from './CircleVisionAnalyticsDetail';
import { CircleVitalityGameAnalyticsDetail } from './CircleVitalityGameAnalyticsDetail';
import { CircleSoulAnalyticsDetail } from './CircleSoulAnalyticsDetail';
import { CircleNeurologicalAnalyticsDetail } from './CircleNeurologicalAnalyticsDetail';
import { CirclePsychologicalAnalyticsDetail } from './CirclePsychologicalAnalyticsDetail';
import { CircleSpeechLanguageAnalyticsDetail } from './CircleSpeechLanguageAnalyticsDetail';
import { CircleAssessmentScheduleAdherenceBlock } from './CircleAssessmentScheduleAdherenceBlock';

type CircleAnalyticsDetailSheetProps = {
  summary: PatientAnalyticsSummary | null;
  messagesFocus?: CircleMessagesAnalyticsFocus | null;
  assessmentSchedule?: RemoteAssessmentSchedule;
  scheduleEnabled?: boolean;
  onClose: () => void;
};

function withScheduleAdherence(
  summary: PatientAnalyticsSummary,
  assessmentSchedule: RemoteAssessmentSchedule | undefined,
  scheduleEnabled: boolean,
  timeline: Array<{ date: string; label?: string; count?: number }> | undefined,
  windowDays: number,
  grain: AnalyticsDetailChartGrain,
  windowLabel: string | undefined,
  body: ReactNode,
) {
  return (
    <div className="space-y-3">
      <CircleAssessmentScheduleAdherenceBlock
        metricId={summary.metricId}
        remoteSchedule={assessmentSchedule}
        scheduleEnabled={scheduleEnabled}
        timeline={timeline}
        latestAt={summary.latestAt}
        windowDays={windowDays}
        grain={grain}
        windowLabel={windowLabel}
      />
      {body}
    </div>
  );
}

function renderDetailBody(
  detail: AnalyticsMetricDetail,
  summary: PatientAnalyticsSummary,
  messagesFocus?: CircleMessagesAnalyticsFocus | null,
  assessmentSchedule?: RemoteAssessmentSchedule,
  scheduleEnabled = true,
  windowLabel?: string,
  windowDays = 30,
  grain: AnalyticsDetailChartGrain = 'day',
  adherenceTimeline?: Array<{ date: string; label?: string; count?: number }>,
) {
  switch (detail.kind) {
    case 'alert_attention':
      return (
        <CircleAlertAttentionAnalyticsDetail
          alerts={detail.alerts}
          attentions={detail.attentions}
          trend={detail.trend}
          timeline={detail.timeline}
          windowLabel={windowLabel}
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
          windowLabel={windowLabel}
        />
      );
    case 'messages':
      return (
        <CircleMessagesAnalyticsDetail
          key={messagesFocus ?? 'messaging'}
          focus={messagesFocus ?? 'messaging'}
          communication={detail.communication}
          messaging={detail.messaging}
          trend={detail.trend}
          topItems={detail.topItems}
          messagingBreakdown={detail.messagingBreakdown}
          timeline={detail.timeline}
          windowLabel={windowLabel}
          windowDays={windowDays}
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
          windowLabel={windowLabel}
          grain={grain}
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
          windowLabel={windowLabel}
        />
      );
    case 'diary':
      return (
        <CircleDiaryAnalyticsDetail
          entryCount={detail.entryCount}
          milestoneCount={detail.milestoneCount}
          latestAt={detail.latestAt}
          timeline={detail.timeline}
          windowLabel={windowLabel}
        />
      );
    case 'soul_gallery':
      return (
        <CircleSoulAnalyticsDetail
          patientId={summary.patientId}
          albumCount={detail.albumCount}
          photoCount={detail.photoCount}
          videoCount={detail.videoCount}
          unseenPhotoCount={detail.unseenPhotoCount}
          reactionCount={detail.reactionCount}
          latestAt={detail.latestAt}
          trend={detail.trend}
          timeline={detail.timeline}
          windowLabel={windowLabel}
          windowDays={windowDays}
        />
      );
    case 'vision':
      return withScheduleAdherence(
        summary,
        assessmentSchedule,
        scheduleEnabled,
        adherenceTimeline ?? detail.timeline,
        windowDays,
        grain,
        windowLabel,
        <CircleVisionAnalyticsDetail
          count={detail.count}
          average={detail.average}
          trend={detail.trend}
          timeline={detail.timeline}
          latestFindings={detail.latestFindings}
          categoryTrends={detail.categoryTrends}
          windowLabel={windowLabel}
        />,
      );
    case 'neurological':
      return withScheduleAdherence(
        summary,
        assessmentSchedule,
        scheduleEnabled,
        adherenceTimeline ?? detail.timeline,
        windowDays,
        grain,
        windowLabel,
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
          windowLabel={windowLabel}
        />,
      );
    case 'psychological':
      return withScheduleAdherence(
        summary,
        assessmentSchedule,
        scheduleEnabled,
        adherenceTimeline ?? detail.timeline,
        windowDays,
        grain,
        windowLabel,
        <CirclePsychologicalAnalyticsDetail
          count={detail.count}
          trend={detail.trend}
          mood={detail.mood}
          anxiety={detail.anxiety}
          sleep={detail.sleep}
          stress={detail.stress}
          energy={detail.energy}
          timeline={detail.timeline}
          windowLabel={windowLabel}
        />,
      );
    case 'speech_language':
      return withScheduleAdherence(
        summary,
        assessmentSchedule,
        scheduleEnabled,
        adherenceTimeline ?? detail.timeline,
        windowDays,
        grain,
        windowLabel,
        <CircleSpeechLanguageAnalyticsDetail
          count={detail.count}
          average={detail.average}
          trend={detail.trend}
          overall={detail.overall}
          spontaneousSpeech={detail.spontaneousSpeech}
          naming={detail.naming}
          repetition={detail.repetition}
          readingWriting={detail.readingWriting}
          oralMotor={detail.oralMotor}
          timeline={detail.timeline}
          windowLabel={windowLabel}
        />,
      );
    case 'assessment_count':
      return withScheduleAdherence(
        summary,
        assessmentSchedule,
        scheduleEnabled,
        adherenceTimeline ?? detail.timeline,
        windowDays,
        grain,
        windowLabel,
        <CircleAssessmentCountAnalyticsDetail
          metricId={summary.metricId}
          count={detail.count ?? summary.countInWindow}
          average={detail.average ?? summary.averageInWindow}
          trend={detail.trend}
          timeline={detail.timeline}
          windowLabel={windowLabel}
        />,
      );
    default:
      return null;
  }
}

const SWIPE_DISMISS_PX = 80;

export function CircleAnalyticsDetailSheet({
  summary,
  messagesFocus = null,
  assessmentSchedule,
  scheduleEnabled = true,
  onClose,
}: CircleAnalyticsDetailSheetProps) {
  const t = useCircleT();
  const [dragY, setDragY] = useState(0);
  const [rangeId, setRangeId] = useState<AnalyticsDetailRangeId>('30');
  const touchStartY = useRef(0);
  const dragYRef = useRef(0);
  const dragging = useRef(false);
  const patientId = summary?.patientId ?? '';

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
  }, [summary?.metricId, messagesFocus]);

  useEffect(() => {
    if (!patientId) return;
    setRangeId(readAnalyticsDetailRange(patientId));
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    writeAnalyticsDetailRange(patientId, rangeId);
  }, [patientId, rangeId]);

  if (!summary) return null;

  const Icon: LucideIcon =
    messagesFocus === 'communication'
      ? Keyboard
      : messagesFocus === 'messaging'
        ? MessageSquare
        : analyticsMetricIcon(summary.metricId);
  const detail = summary.detail;
  const ranged = isAnalyticsRangeDetailKind(detail?.kind);
  const applied = ranged && detail ? applyAnalyticsDetailRange(detail, rangeId) : null;
  const activeDetail = applied?.detail ?? detail;
  const windowDays = applied?.windowDays ?? analyticsDetailRangeDays(rangeId);
  const grain = applied?.grain ?? 'day';
  const windowLabel = analyticsDetailRangeWindowLabel(t, rangeId, windowDays);
  const title =
    messagesFocus === 'communication'
      ? t('analytics.metrics.communication')
      : messagesFocus === 'messaging'
        ? t('analytics.metrics.messaging')
        : summary.title;
  const iconWrapClass =
    messagesFocus === 'communication'
      ? 'bg-indigo-50 text-indigo-600'
      : messagesFocus === 'messaging'
        ? 'bg-emerald-50 text-emerald-600'
        : analyticsMetricIconWrapClass(summary.metricId);

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
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
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
          <div className="px-4 pb-4 sm:pt-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(ANALYTICS_SHEET_ICON_TILE_CLASS, iconWrapClass)}>
                  <Icon size={18} />
                </div>
                <h3
                  id="circle-analytics-detail-title"
                  className="font-bold text-slate-800 text-base truncate"
                >
                  {title}
                </h3>
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
            <div className="mt-3">
              <CircleAnalyticsRangeChips value={rangeId} onChange={setRangeId} t={t} />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
          {activeDetail ? (
            renderDetailBody(
              activeDetail,
              summary,
              messagesFocus,
              assessmentSchedule,
              scheduleEnabled,
              windowLabel,
              windowDays,
              grain,
              applied?.adherenceTimeline,
            )
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">{summary.summaryText}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{t('analytics.detailNotSynced')}</p>
            </div>
          )}
          <p className="text-[12px] text-slate-400 text-center leading-relaxed px-2">
            {t('analytics.footerHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
