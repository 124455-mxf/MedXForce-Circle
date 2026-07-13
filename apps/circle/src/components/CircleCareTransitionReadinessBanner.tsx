import { ClipboardList } from 'lucide-react';
import {
  careTransitionProgress,
  filterChecklistForViewer,
  getCareTransitionPack,
  normalizeMemberRole,
  type CareTransitionReadinessState,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import { localizeCareTransitionPack } from '../lib/localizeCareTransition';

type CircleCareTransitionReadinessBannerProps = {
  patient: CirclePatientSummary;
  state: CareTransitionReadinessState | null;
  loading?: boolean;
  onOpen: () => void;
};

export function CircleCareTransitionReadinessBanner({
  patient,
  state,
  loading,
  onOpen,
}: CircleCareTransitionReadinessBannerProps) {
  const t = useCircleT();
  if (loading || !state?.activePackId) return null;

  const pack = getCareTransitionPack(state.activePackId);
  if (!pack) return null;
  const localizedPack = localizeCareTransitionPack(t, pack);

  const role = normalizeMemberRole(patient.role);
  const items = filterChecklistForViewer(
    pack,
    state.region,
    role,
    state.customTasks,
    new Set(state.dismissedIds),
  );
  const progress = careTransitionProgress(items, new Set(state.doneIds));
  if (progress.total > 0 && progress.done >= progress.total) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3 hover:bg-amber-100/70 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
        <ClipboardList size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700/80">
          {t('careTransition.title')}
        </p>
        <p className="font-semibold text-slate-800 text-sm mt-0.5">{localizedPack.title}</p>
        <p className="text-xs text-slate-600 mt-1">
          {t('careTransition.bannerProgress', {
            done: String(progress.done),
            total: String(progress.total),
          })}
        </p>
      </div>
      <span className="text-xs font-semibold text-amber-800 shrink-0 mt-1">
        {t('careTransition.open')}
      </span>
    </button>
  );
}
