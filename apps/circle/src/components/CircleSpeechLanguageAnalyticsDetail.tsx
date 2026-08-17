import { useState } from 'react';
import { AudioLines, BookOpen, MessageCircle, Mic, Repeat, Smile, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalyticsTrendDirection, SpeechLanguageScoreTrend, SpeechLanguageTimelinePoint } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { analyticsTrendImprovingDeclining, analyticsWindowDaysLabel } from '../lib/circleAnalyticsI18n';
import { cn } from '../lib/utils';
import {
  CircleAnalyticsChartTypeToggle,
  CircleAnalyticsSeriesCard,
  seriesFromKeyedTimeline,
  type CircleAnalyticsChartType,
} from './CircleAnalyticsSeriesCard';

type CircleSpeechLanguageAnalyticsDetailProps = {
  count?: number;
  average?: number;
  trend?: AnalyticsTrendDirection;
  overall?: SpeechLanguageScoreTrend;
  spontaneousSpeech?: SpeechLanguageScoreTrend;
  naming?: SpeechLanguageScoreTrend;
  repetition?: SpeechLanguageScoreTrend;
  readingWriting?: SpeechLanguageScoreTrend;
  oralMotor?: SpeechLanguageScoreTrend;
  timeline?: SpeechLanguageTimelinePoint[];
};

const SCORE_DOMAIN: [number, number] = [0, 10];
const SCORE_TICKS = [0, 5, 10];

function TrendSummary({
  trend,
  t,
}: {
  trend: AnalyticsTrendDirection;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const colorClass =
    trend === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : trend === 'down'
        ? 'text-amber-600 bg-amber-50'
        : 'text-slate-400 bg-slate-100';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase', colorClass)}>
      <Icon size={12} />
      {analyticsTrendImprovingDeclining(t, trend)}
    </span>
  );
}

function scoreValue(data: SpeechLanguageScoreTrend | undefined): string {
  if (!data) return '—';
  return `${data.current}/10`;
}

export function CircleSpeechLanguageAnalyticsDetail({
  trend = 'stable',
  overall,
  spontaneousSpeech,
  naming,
  repetition,
  readingWriting,
  oralMotor,
  timeline,
}: CircleSpeechLanguageAnalyticsDetailProps) {
  const t = useCircleT();
  const [chartType, setChartType] = useState<CircleAnalyticsChartType>('bar');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-teal-50/50">
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider text-center">
          {analyticsWindowDaysLabel(t, 30)}
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.trend')}</span>
          <TrendSummary trend={trend} t={t} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-slate-400 uppercase">{t('analytics.chart')}</span>
          <CircleAnalyticsChartTypeToggle
            chartType={chartType}
            onChange={setChartType}
            lineAriaLabel={t('analytics.lineChart')}
            barAriaLabel={t('analytics.barChart')}
          />
        </div>

        <CircleAnalyticsSeriesCard
          icon={MessageCircle}
          title={t('analytics.speechLanguage.overall')}
          value={scoreValue(overall)}
          hint={t('analytics.speechLanguage.overallHint')}
          color="#0f766e"
          iconWrapClass="text-teal-700"
          cardClass="border-teal-200 bg-teal-50/50"
          titleClass="text-teal-800"
          valueClass="text-teal-800"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'overall')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Mic}
          title={t('analytics.speechLanguage.spontaneousSpeech')}
          value={scoreValue(spontaneousSpeech)}
          hint={t('analytics.speechLanguage.spontaneousHint')}
          color="#2563eb"
          iconWrapClass="text-blue-600"
          cardClass="border-blue-200 bg-blue-50/50"
          titleClass="text-blue-700"
          valueClass="text-blue-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'spontaneousSpeech')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Smile}
          title={t('analytics.speechLanguage.naming')}
          value={scoreValue(naming)}
          hint={t('analytics.speechLanguage.namingHint')}
          color="#d97706"
          iconWrapClass="text-amber-600"
          cardClass="border-amber-200 bg-amber-50/50"
          titleClass="text-amber-700"
          valueClass="text-amber-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'naming')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={Repeat}
          title={t('analytics.speechLanguage.repetition')}
          value={scoreValue(repetition)}
          hint={t('analytics.speechLanguage.repetitionHint')}
          color="#e11d48"
          iconWrapClass="text-rose-600"
          cardClass="border-rose-200 bg-rose-50/50"
          titleClass="text-rose-700"
          valueClass="text-rose-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'repetition')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={BookOpen}
          title={t('analytics.speechLanguage.readingWriting')}
          value={scoreValue(readingWriting)}
          hint={t('analytics.speechLanguage.readingWritingHint')}
          color="#7c3aed"
          iconWrapClass="text-violet-600"
          cardClass="border-violet-200 bg-violet-50/50"
          titleClass="text-violet-700"
          valueClass="text-violet-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'readingWriting')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
        <CircleAnalyticsSeriesCard
          icon={AudioLines}
          title={t('analytics.speechLanguage.oralMotor')}
          value={scoreValue(oralMotor)}
          hint={t('analytics.speechLanguage.oralMotorHint')}
          color="#059669"
          iconWrapClass="text-emerald-600"
          cardClass="border-emerald-200 bg-emerald-50/50"
          titleClass="text-emerald-700"
          valueClass="text-emerald-700"
          chartType={chartType}
          chartData={seriesFromKeyedTimeline(timeline, 'oralMotor')}
          variant="sparse"
          yDomain={SCORE_DOMAIN}
          yTicks={SCORE_TICKS}
          allowDecimals
        />
      </div>
    </div>
  );
}
