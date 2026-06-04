import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Clock,
  Ear,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
  Mic,
  Move,
  Scale,
  Sparkles,
  ThermometerSun,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  ANALYTICS_SECTIONS,
  type AnalyticsMetricId,
  type CirclePatientSummary,
  type PatientAnalyticsSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  circleInsetCardClass,
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionEmptyStateClass,
  circleSectionHeaderClass,
  circleSectionHeaderStackClass,
  circleSectionPanelClass,
  circleSectionSubtitleClass,
  circleSectionTitleClass,
} from '../lib/circleSectionStyles';
import { useCircleAnalyticsSummaries } from '../hooks/useCircleAnalyticsSummaries';
import { firebase } from '../lib/firebaseClient';

const METRIC_ICONS: Record<AnalyticsMetricId, LucideIcon> = {
  'alert-attention': Bell,
  'speech-history': MessageSquare,
  'ai-conversation': Bot,
  'daily-check-in': Calendar,
  impact: Activity,
  pain: Activity,
  'strength-reflex': Scale,
  mobility: Move,
  numbness: Zap,
  temperature: ThermometerSun,
  balance: Activity,
  vision: Eye,
  hearing: Ear,
  speech: Mic,
  neurological: Brain,
  physiological: Activity,
  psychological: Heart,
  stroke: Heart,
  diary: BookOpen,
  'vitality-game': Sparkles,
  'soul-vitality': Heart,
};

const METRIC_COLORS: Record<string, string> = {
  pain: 'bg-rose-50 text-rose-600',
  numbness: 'bg-purple-50 text-purple-600',
  mobility: 'bg-emerald-50 text-emerald-600',
  temperature: 'bg-cyan-50 text-cyan-600',
  neurological: 'bg-purple-50 text-purple-600',
  psychological: 'bg-pink-50 text-pink-600',
};

function footerColorClass(tone: PatientAnalyticsSummary['footerTone']): string {
  if (tone === 'warning') return 'text-red-500 font-bold';
  if (tone === 'attention') return 'text-amber-600 font-bold';
  return 'text-slate-500 font-bold';
}

function AnalyticsMetricCard({ summary }: { summary: PatientAnalyticsSummary }) {
  const Icon = METRIC_ICONS[summary.metricId] ?? Activity;
  const iconClass = METRIC_COLORS[summary.metricId] ?? 'bg-blue-50 text-blue-600';

  return (
    <div className={cn(circleInsetCardClass, 'flex flex-col min-h-[132px]')}>
      <div className="p-4 flex-1 flex flex-col [@media(max-height:740px)]:p-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            iconClass,
          )}
        >
          <Icon size={20} />
        </div>
        <div className="mt-3 space-y-1 min-w-0">
          <h4 className={circleSectionTitleClass}>{summary.title}</h4>
          <p className={circleSectionSubtitleClass}>{summary.description}</p>
        </div>
      </div>
      <div className="px-4 pb-3 pt-2 border-t border-slate-50 [@media(max-height:740px)]:px-3">
        {!summary.isReleased || summary.status === 'coming_soon' ? (
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <Clock size={10} />
            <span>To be released</span>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-1.5 text-[10px] uppercase tracking-wider',
              footerColorClass(summary.footerTone),
            )}
          >
            <Clock size={10} />
            <span>{summary.summaryText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CircleAnalyticsScreen({ patient }: { patient: CirclePatientSummary }) {
  const { byMetricId, totalFromServer, loading, error } = useCircleAnalyticsSummaries(
    firebase.db,
    patient,
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleSectionPanelClass, 'max-h-full')}>
        <div className={cn(circleSectionHeaderClass, circleSectionHeaderStackClass)}>
          <div className="min-w-0">
            <h3 className={circleSectionTitleClass}>Analytics</h3>
            <p className={circleSectionSubtitleClass}>
              Trends for {patient.displayName} — summaries update when the patient app syncs.
            </p>
          </div>
        </div>

        <div className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass, 'space-y-5')}>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 [@media(max-height:740px)]:py-8">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            ANALYTICS_SECTIONS.map((section) => {
              const cards = section.itemIds
                .map((id) => byMetricId.get(id))
                .filter((s): s is PatientAnalyticsSummary => s != null);
              if (cards.length === 0) return null;

              return (
                <section key={section.id} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
                    {section.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cards.map((summary) => (
                      <AnalyticsMetricCard key={summary.metricId} summary={summary} />
                    ))}
                  </div>
                </section>
              );
            })
          )}

          {!loading && byMetricId.size === 0 && (
            <div className={circleSectionEmptyStateClass}>
              {error &&
              (error.includes('resource-exhausted') ||
                error.toLowerCase().includes('quota')) ? (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed max-w-md mx-auto">
                  Firebase daily write limit is exhausted for this project. Analytics cannot sync
                  until the quota resets (usually midnight Pacific) or billing is enabled. Close
                  extra tabs to stop background writes, then try again tomorrow.
                </p>
              ) : (
                <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                  {totalFromServer > 0
                    ? 'Summaries exist but none match your role. Caregivers see physical trends; everyone sees engagement (messages, check-in, vitality).'
                    : 'No analytics in the cloud yet. On the patient app, open Analytics and tap Sync to Circle while signed in. If sync fails, check the patient console for quota or permission errors.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
