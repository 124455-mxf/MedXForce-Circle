import { useEffect, useState, type MouseEvent } from 'react';
import { ClipboardList, X } from 'lucide-react';
import {
  careTransitionProgress,
  filterChecklistForViewer,
  getCareTransitionPack,
  normalizeMemberRole,
  type CareTransitionReadinessState,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import {
  formatCareTransitionPackStartedAt,
  isCareTransitionBannerHiddenLocally,
  isCareTransitionHomeBannerExpired,
  rememberCareTransitionBannerHidden,
} from '../lib/careTransitionBannerDismiss';
import { localizeCareTransitionPack } from '../lib/localizeCareTransition';

type CircleCareTransitionReadinessBannerProps = {
  patient: CirclePatientSummary;
  readerUid: string;
  state: CareTransitionReadinessState | null;
  loading?: boolean;
  onOpen: () => void;
  /**
   * Home only: hide automatically once the pack has been active this long.
   * Circle keeps its own surfaces without this expiry.
   */
  maxAgeMs?: number;
  /** When false, hide the banner (e.g. friends do not get Home task nudges). */
  enabled?: boolean;
};

export function CircleCareTransitionReadinessBanner({
  patient,
  readerUid,
  state,
  loading,
  onOpen,
  maxAgeMs,
  enabled = true,
}: CircleCareTransitionReadinessBannerProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [patient.patientId, readerUid, state?.activePackId, state?.packActivatedAt]);

  if (!enabled || loading || !state?.activePackId || hidden) return null;

  const pack = getCareTransitionPack(state.activePackId);
  if (!pack) return null;

  if (
    maxAgeMs != null &&
    isCareTransitionHomeBannerExpired(state.packActivatedAt, Date.now(), maxAgeMs)
  ) {
    return null;
  }

  if (
    isCareTransitionBannerHiddenLocally(
      patient.patientId,
      readerUid,
      state.activePackId,
      state.packActivatedAt,
    )
  ) {
    return null;
  }

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

  const startedLabel =
    state.packActivatedAt && state.packActivatedAt > 0
      ? t('careTransition.startedAt', {
          date: formatCareTransitionPackStartedAt(state.packActivatedAt, language),
        })
      : null;

  const hideBanner = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    rememberCareTransitionBannerHidden(
      patient.patientId,
      readerUid,
      state.activePackId!,
      state.packActivatedAt,
    );
    setHidden(true);
  };

  return (
    <div className="relative rounded-2xl border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-amber-100/70 transition-colors rounded-2xl pr-11"
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
          {startedLabel ? (
            <p className="text-[11px] text-slate-500 mt-0.5">{startedLabel}</p>
          ) : null}
        </div>
        <span className="text-xs font-semibold text-amber-800 shrink-0 mt-1">
          {t('careTransition.open')}
        </span>
      </button>
      <button
        type="button"
        onClick={hideBanner}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-amber-700/70 hover:bg-amber-100 hover:text-amber-900"
        aria-label={t('careTransition.hideBanner')}
        title={t('careTransition.hideBanner')}
      >
        <X size={16} />
      </button>
    </div>
  );
}
