import { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Flag,
  Heart,
  Languages,
  Sparkles,
  Stethoscope,
  Target,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  buildPatientInsightItems,
  countFilledPatientInsights,
  type CirclePatientInsightItem,
  type CirclePatientInsightKey,
} from '@medxforce/shared';
import type { CirclePatientProfileSnapshot } from '@medxforce/shared';
import type { CirclePatientSummary } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { insightLabelT, localizeInsightItem, patientFriendlyDisplayName } from '../lib/dashboardI18n';
import { cn } from '../lib/utils';

type CirclePatientInsightsSectionProps = {
  patient: CirclePatientSummary;
  snapshot: CirclePatientProfileSnapshot | null;
  loading?: boolean;
  onOpenProfile?: () => void;
};

const INSIGHT_ICONS: Record<CirclePatientInsightKey, LucideIcon> = {
  activeHobbies: Sparkles,
  passiveHobbies: Heart,
  topicTriggers: AlertTriangle,
  languagesSpoken: Languages,
  personalGoals: Target,
  socialAnchors: Users,
  primaryDiagnosis: Stethoscope,
  dateOfOnset: Flag,
  occupation: Briefcase,
  treatmentPhase: Stethoscope,
};

function InsightCard({
  item,
  onOpenProfile,
  t,
}: {
  item: CirclePatientInsightItem;
  onOpenProfile?: () => void;
  t: ReturnType<typeof useCircleT>;
}) {
  const Icon = INSIGHT_ICONS[item.key];
  const Wrapper = onOpenProfile ? 'button' : 'div';

  return (
    <Wrapper
      type={onOpenProfile ? 'button' : undefined}
      onClick={onOpenProfile}
      className={cn(
        'relative h-full min-h-[5.75rem] w-full text-left p-4 rounded-2xl border transition-colors flex flex-col',
        item.filled
          ? 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/20'
          : 'bg-slate-50/80 border-dashed border-slate-200 hover:border-slate-300',
        onOpenProfile && 'cursor-pointer',
      )}
    >
      {item.overflowCount && item.overflowCount > 0 ? (
        <span className="absolute top-3 right-3 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-500">
          {t('dashboard.totalCount', { count: item.totalCount })}
        </span>
      ) : null}
      <div className="flex items-start gap-2.5">
        <Icon
          size={18}
          className={cn('shrink-0 mt-0.5', item.filled ? 'text-blue-600' : 'text-slate-400')}
        />
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {insightLabelT(t, item.key)}
          </p>
          <p
            className={cn(
              'text-sm mt-1 leading-snug line-clamp-2',
              item.filled ? 'text-slate-800 font-medium' : 'text-slate-400 italic',
            )}
            title={item.filled ? item.value : undefined}
          >
            {item.filled ? item.value : t('dashboard.notAddedYet')}
          </p>
          {!item.filled && item.hint ? (
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
              {item.hint}
            </p>
          ) : null}
          {item.filled && item.overflowCount && item.overflowCount > 0 && onOpenProfile ? (
            <p className="text-[11px] font-semibold text-blue-600 mt-1.5">
              {t('dashboard.viewAllInProfile')}
            </p>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

export function CirclePatientInsightsSection({
  patient,
  snapshot,
  loading = false,
  onOpenProfile,
}: CirclePatientInsightsSectionProps) {
  const t = useCircleT();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <section className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
          {t('dashboard.getToKnowEllipsis')}
        </h3>
        <div className="p-5 rounded-2xl border border-slate-100 bg-white text-sm text-slate-400">
          {t('dashboard.loadingInsights')}
        </div>
      </section>
    );
  }

  const items = buildPatientInsightItems(snapshot, patient.role).map((item) =>
    localizeInsightItem(t, item),
  );
  if (items.length === 0) return null;

  const counts = countFilledPatientInsights(items);
  const friendlyName = patientFriendlyDisplayName(snapshot, patient.displayName);
  const sectionTitle = t('dashboard.getToKnow', { name: friendlyName });

  return (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 leading-snug">{sectionTitle}</h3>
          <p className="text-xs font-medium text-slate-500 mt-1 leading-snug">
            {t('dashboard.insightsAvailable', { count: counts.filled, total: counts.total })}
          </p>
          {!expanded ? (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {t('dashboard.insightsTap')}
            </p>
          ) : null}
        </div>
        <ChevronDown
          size={18}
          className={cn('text-slate-400 shrink-0 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('dashboard.insightsAvailable', { count: counts.filled, total: counts.total })}
            </p>
            {onOpenProfile ? (
              <button
                type="button"
                onClick={onOpenProfile}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0"
              >
                {t('dashboard.fullProfile')}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <InsightCard key={item.key} item={item} onOpenProfile={onOpenProfile} t={t} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
