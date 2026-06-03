import {
  Activity,
  BarChart3,
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
  return 'text-slate-500';
}

function AnalyticsMetricCard({ summary }: { summary: PatientAnalyticsSummary }) {
  const Icon = METRIC_ICONS[summary.metricId] ?? Activity;
  const iconClass = METRIC_COLORS[summary.metricId] ?? 'bg-blue-50 text-blue-600';

  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm flex flex-col min-h-[140px]">
      <div className="p-5 flex-1 flex flex-col">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0',
            iconClass,
          )}
        >
          <Icon size={24} />
        </div>
        <div className="mt-3 space-y-1 min-w-0">
          <h3 className="text-base font-bold text-slate-800 leading-tight">{summary.title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{summary.description}</p>
        </div>
      </div>
      <div className="px-5 pb-4 pt-2 border-t border-slate-50">
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
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shrink-0">
          <BarChart3 size={24} />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics</h2>
          <p className="text-slate-500 text-sm font-medium">
            Trends for {patient.displayName} — summaries update when the patient app syncs.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : (
        ANALYTICS_SECTIONS.map((section) => {
          const cards = section.itemIds
            .map((id) => byMetricId.get(id))
            .filter((s): s is PatientAnalyticsSummary => s != null);
          if (cards.length === 0) return null;

          return (
            <section key={section.id} className="space-y-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {section.title}
              </h3>
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
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-8 text-center space-y-3">
          {error &&
          (error.includes('resource-exhausted') ||
            error.toLowerCase().includes('quota')) ? (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed max-w-md mx-auto">
              Firebase daily write limit is exhausted for this project. Analytics cannot sync
              until the quota resets (usually midnight Pacific) or billing is enabled. Close extra
              tabs to stop background writes, then try again tomorrow.
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
  );
}
