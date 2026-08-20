import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Loader2,
  Maximize2,
  Plus,
  X,
} from 'lucide-react';
import {
  careTransitionRegionFromCountry,
  countryDisplayName,
  normalizeCountryCode,
  normalizeMemberRole,
  type CareTransitionChecklistItem,
  type CareTransitionPackId,
  type CareTransitionRegion,
  type CircleHelpTask,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCareTransitionReadiness } from '../hooks/useCareTransitionReadiness';
import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { useCirclePatientMemberLanguages } from '../hooks/useCirclePatientMemberLanguages';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import { buildCircleHelpTaskTranslations } from '../lib/circleThreadPostTranslate';
import { CircleHelpTaskCopy } from './CircleHelpTaskCopy';
import { circleHeaderActionButtonClass } from '../lib/circleSectionStyles';
import { formatCareTransitionPackStartedAt } from '../lib/careTransitionBannerDismiss';
import {
  buildLocalizedTaskCopyText,
  localizeCareTransitionItem,
  localizeCareTransitionKnow,
  localizeCareTransitionPack,
} from '../lib/localizeCareTransition';
import { cn } from '../lib/utils';

type CircleCareTransitionReadinessPanelProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  /** Compact embed for profile / inbox */
  compact?: boolean;
  /** Hide the title row when the parent overlay already shows it */
  hideHeader?: boolean;
  /**
   * Profile embed: collapse the checklist behind a summary row.
   * Defaults to collapsed; remembers expand/collapse per patient.
   */
  collapsible?: boolean;
  onClose?: () => void;
  /** Open the full-screen checklist modal */
  onExpand?: () => void;
  /** When false, hide everyday Circle help (e.g. expanded pack overlay). */
  showCircleHelp?: boolean;
  /**
   * Circle Tasks inbox: create from the screen header +, not per-card plus buttons.
   * Profile / dashboard keep their own card +.
   */
  composeInHeader?: boolean;
  helpComposerOpen?: boolean;
  onHelpComposerOpenChange?: (open: boolean) => void;
  packStarterOpen?: boolean;
  onPackStarterOpenChange?: (open: boolean) => void;
};

function careTransitionCollapsedStorageKey(patientId: string): string {
  return `circle:careTransitionCollapsed:${patientId}`;
}

/** Default collapsed when unset — profile should stay calm until opened. */
function readCareTransitionCollapsed(patientId: string): boolean {
  try {
    const raw = localStorage.getItem(careTransitionCollapsedStorageKey(patientId));
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export function CircleCareTransitionReadinessPanel({
  user,
  db,
  patient,
  compact = false,
  hideHeader = false,
  collapsible = false,
  onClose,
  onExpand,
  showCircleHelp = true,
  composeInHeader = false,
  helpComposerOpen: helpComposerOpenProp,
  onHelpComposerOpenChange,
  packStarterOpen: packStarterOpenProp,
  onPackStarterOpenChange,
}: CircleCareTransitionReadinessPanelProps) {
  const t = useCircleT();
  const { language: viewerLanguage } = useCircleI18nContext();
  const role = normalizeMemberRole(patient.role);
  const memberLanguages = useCirclePatientMemberLanguages(db, patient.patientId, user.uid, {
    pendingProvision: patient.isPendingProvision === true,
  });
  const { snapshot: profileSnapshot } = useCirclePatientProfileSnapshot(db, patient.patientId);
  const {
    state,
    loading,
    saving,
    error,
    pack,
    packs,
    activeItems,
    dismissedItems,
    progress,
    doneSet,
    canManage,
    canWorkTasks,
    canViewTasks,
    setActivePack,
    setRegion,
    syncRegionFromCountry,
    toggleDone,
    dismissItem,
    restoreDismissed,
    addCustomTask,
    removeCustomTask,
    attachKnowCourse,
    circleHelpTasks,
    canAddHelp,
    canClaimHelp,
    addCircleHelpTask,
    claimCircleHelpTask,
    releaseCircleHelpTask,
    toggleCircleHelpDone,
    removeCircleHelpTask,
  } = useCareTransitionReadiness(db, patient.patientId, user.uid, role, t);

  const openHelpTasks = useMemo(
    () =>
      [...circleHelpTasks.filter((task) => !task.done)].sort((a, b) => b.createdAt - a.createdAt),
    [circleHelpTasks],
  );
  const completedHelpTasks = useMemo(
    () =>
      [...circleHelpTasks.filter((task) => task.done)].sort((a, b) => b.createdAt - a.createdAt),
    [circleHelpTasks],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedHelpTaskId, setExpandedHelpTaskId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftWhy, setDraftWhy] = useState('');
  const [draftHelpTitle, setDraftHelpTitle] = useState('');
  const [draftHelpNote, setDraftHelpNote] = useState('');
  const [draftKnowTitle, setDraftKnowTitle] = useState('');
  const [draftKnowUrl, setDraftKnowUrl] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [localHelpComposerOpen, setLocalHelpComposerOpen] = useState(false);
  const [localPackStarterOpen, setLocalPackStarterOpen] = useState(false);
  const [helpCreating, setHelpCreating] = useState(false);
  const [completedHelpOpen, setCompletedHelpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    collapsible ? readCareTransitionCollapsed(patient.patientId) : false,
  );

  const helpComposerOpen = composeInHeader
    ? Boolean(helpComposerOpenProp)
    : localHelpComposerOpen;
  const packStarterOpen = composeInHeader
    ? Boolean(packStarterOpenProp)
    : localPackStarterOpen;

  const setHelpComposerOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const current = helpComposerOpen;
    const next = typeof open === 'function' ? open(current) : open;
    if (composeInHeader) onHelpComposerOpenChange?.(next);
    else setLocalHelpComposerOpen(next);
  };
  const setPackStarterOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const current = packStarterOpen;
    const next = typeof open === 'function' ? open(current) : open;
    if (composeInHeader) onPackStarterOpenChange?.(next);
    else setLocalPackStarterOpen(next);
  };

  const helpActionButtonClass =
    'px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50';

  useEffect(() => {
    if (!collapsible) return;
    setCollapsed(readCareTransitionCollapsed(patient.patientId));
  }, [collapsible, patient.patientId]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(
          careTransitionCollapsedStorageKey(patient.patientId),
          next ? '1' : '0',
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const profileCountry = profileSnapshot?.identity.country ?? '';
  const countryCode = normalizeCountryCode(profileCountry);
  const autoRegion = careTransitionRegionFromCountry(profileCountry);

  useEffect(() => {
    if (!canManage || loading || !state) return;
    void syncRegionFromCountry(profileCountry);
  }, [canManage, loading, profileCountry, state?.regionManual, syncRegionFromCountry, state]);

  const knowList = useMemo(() => {
    if (!pack || !state) return [];
    return [...pack.suggestedKnow, ...state.attachedKnow].map((course) =>
      localizeCareTransitionKnow(t, course),
    );
  }, [pack, state, t]);

  const localizedPack = useMemo(
    () => (pack ? localizeCareTransitionPack(t, pack) : null),
    [pack, t],
  );

  const localizedPacks = useMemo(
    () => packs.map((p) => localizeCareTransitionPack(t, p)),
    [packs, t],
  );

  const localizedActiveItems = useMemo(
    () => activeItems.map((item) => localizeCareTransitionItem(t, item)),
    [activeItems, t],
  );

  const localizedDismissedItems = useMemo(
    () => dismissedItems.map((item) => localizeCareTransitionItem(t, item)),
    [dismissedItems, t],
  );

  const selected = useMemo(() => {
    if (selectedId) {
      return (
        localizedActiveItems.find((i) => i.id === selectedId) ??
        localizedDismissedItems.find((i) => i.id === selectedId) ??
        null
      );
    }
    return localizedActiveItems.find((item) => !doneSet.has(item.id)) ?? null;
  }, [doneSet, localizedActiveItems, localizedDismissedItems, selectedId]);

  const packComplete = progress.total > 0 && progress.done >= progress.total;
  const startedLabel =
    state?.activePackId && state.packActivatedAt && state.packActivatedAt > 0
      ? t('careTransition.startedAt', {
          date: formatCareTransitionPackStartedAt(state.packActivatedAt, viewerLanguage),
        })
      : null;

  const copyTask = async (item: CareTransitionChecklistItem) => {
    if (!localizedPack) return;
    const text = buildLocalizedTaskCopyText(t, localizedPack.title, item, patient.displayName);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTaskId(item.id);
      window.setTimeout(() => {
        setCopiedTaskId((current) => (current === item.id ? null : current));
      }, 1800);
    } catch (err) {
      console.warn('[careTransitionReadiness] copy failed', err);
    }
  };

  const collapsedSummary =
    localizedPack != null
      ? t('careTransition.collapsedSummary', {
          pack: localizedPack.title,
          done: progress.done,
          total: progress.total,
          percent: progress.percent,
        })
      : t('careTransition.collapsedSummaryNone');

  const collapseToggle =
    collapsible ? (
      <button
        type="button"
        onClick={toggleCollapsed}
        className={cn(
          'flex-1 min-w-0 flex items-start gap-3 text-left',
          compact ? 'p-4' : 'p-5',
        )}
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? t('careTransition.showSectionAria')
            : t('careTransition.hideSectionAria')
        }
      >
        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          {loading || !state ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <ClipboardList size={20} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-800">{t('careTransition.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">
            {loading || !state ? t('careTransition.loadingSummary') : collapsedSummary}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-slate-400 transition-transform mt-1',
            collapsed && '-rotate-90',
          )}
          aria-hidden
        />
      </button>
    ) : null;

  if (loading || !state) {
    if (collapsible) {
      if (!canManage) {
        return (
          <div className="py-6 flex justify-center text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        );
      }
      return <div>{collapseToggle}</div>;
    }
    return (
      <div className="py-10 flex justify-center text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const cardPad = compact || collapsible ? 'p-4' : 'p-5';
  const cardClass = cn('rounded-3xl border border-slate-100 bg-white', cardPad);
  const hasActivePack = Boolean(state.activePackId);
  const showPackControls = canManage && (hasActivePack || packStarterOpen);
  const showCareTransitionCard = canManage || hasActivePack;

  const togglePackStarter = () => {
    if (collapsible && collapsed) {
      setCollapsed(false);
      try {
        localStorage.setItem(careTransitionCollapsedStorageKey(patient.patientId), '0');
      } catch {
        /* ignore */
      }
      setPackStarterOpen(true);
      return;
    }
    setPackStarterOpen((open) => !open);
  };

  const packStartButton =
    !composeInHeader && canManage && !hasActivePack ? (
      <button
        type="button"
        onClick={togglePackStarter}
        className={cn(circleHeaderActionButtonClass, collapsible && 'mt-4 mr-4')}
        aria-label={t('careTransition.startPackAria')}
        title={t('careTransition.startPackAria')}
        aria-expanded={packStarterOpen}
      >
        {packStarterOpen ? (
          <X size={18} className="[@media(max-height:740px)]:size-4" />
        ) : (
          <Plus size={18} className="[@media(max-height:740px)]:size-4" />
        )}
      </button>
    ) : null;

  const helpMemberName =
    user.displayName?.trim() || user.email?.split('@')[0] || t('circle.circleMemberFallback');

  const renderHelpTask = (task: CircleHelpTask) => {
    const claimed = Boolean(task.claimedByUid);
    const mine = task.claimedByUid === user.uid;
    const canRemove = canManage || task.createdByUid === user.uid;
    const canRelease = canManage || mine;
    const helpExpanded = !task.done || expandedHelpTaskId === task.id;
    const helpTaskHeader = (
      <div className="flex items-start gap-2">
        <CheckCircle2
          size={18}
          className={cn(
            'mt-0.5 shrink-0',
            task.done ? 'text-emerald-600' : 'text-slate-300',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <CircleHelpTaskCopy
            task={task}
            isOwn={task.createdByUid === user.uid}
            viewerLanguage={viewerLanguage}
            t={t}
            done={task.done}
          />
          {task.done ? (
            <p className="text-[11px] font-semibold text-emerald-700 mt-1 truncate">
              {claimed
                ? `${t('careTransition.circleHelpCompleted')} · ${
                    task.claimedByName.trim() || t('circle.circleMemberFallback')
                  }`
                : t('careTransition.circleHelpCompleted')}
            </p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('careTransition.circleHelpCreatedBy', {
                  name: task.createdByName.trim() || t('circle.circleMemberFallback'),
                })}
              </p>
              {claimed ? (
                <p className="text-[11px] text-slate-400">
                  {t('careTransition.circleHelpTaskTaken', {
                    name: task.claimedByName.trim() || t('circle.circleMemberFallback'),
                  })}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
    return (
      <div
        key={task.id}
        className={cn(
          'rounded-2xl border px-3 py-3 space-y-2',
          task.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white',
        )}
      >
        {task.done ? (
          <button
            type="button"
            className="w-full text-left"
            onClick={() =>
              setExpandedHelpTaskId((current) => (current === task.id ? null : task.id))
            }
            aria-expanded={helpExpanded}
          >
            {helpTaskHeader}
          </button>
        ) : (
          helpTaskHeader
        )}
        {helpExpanded &&
        (canWorkTasks || (!task.done && (canClaimHelp || canRelease || canRemove))) ? (
        <div className="flex flex-wrap gap-2 pl-7">
          {canWorkTasks ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void toggleCircleHelpDone(task.id, helpMemberName);
                if (!task.done) setExpandedHelpTaskId(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold text-white',
                task.done ? 'bg-emerald-600' : 'bg-blue-600',
              )}
            >
              {task.done
                ? t('careTransition.markNotDone')
                : t('careTransition.markDone')}
            </button>
          ) : null}
          {!task.done && !claimed && canClaimHelp ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void claimCircleHelpTask(task.id, helpMemberName)}
              className={cn(
                helpActionButtonClass,
                'border border-slate-200 bg-white text-slate-700',
              )}
            >
              {t('careTransition.circleHelpClaim')}
            </button>
          ) : null}
          {!task.done && claimed && canRelease ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void releaseCircleHelpTask(task.id)}
              className={cn(
                helpActionButtonClass,
                'border border-slate-200 bg-white text-slate-700',
              )}
            >
              {t('careTransition.circleHelpRelease')}
            </button>
          ) : null}
          {!task.done && canRemove ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void removeCircleHelpTask(task.id)}
              className={cn(
                helpActionButtonClass,
                'border border-red-200 bg-red-50 text-red-700',
              )}
            >
              {t('careTransition.circleHelpRemove')}
            </button>
          ) : null}
        </div>
        ) : null}
      </div>
    );
  };

  const circleHelpCard =
    canViewTasks && showCircleHelp ? (
      <section className={cn(cardClass, 'space-y-3')}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
            <HeartHandshake size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-800">{t('careTransition.circleHelpTitle')}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {t('careTransition.circleHelpHint')}
            </p>
          </div>
          {canAddHelp && !composeInHeader ? (
            <button
              type="button"
              onClick={() => setHelpComposerOpen((open) => !open)}
              className={circleHeaderActionButtonClass}
              aria-label={t('careTransition.circleHelpAdd')}
              title={t('careTransition.circleHelpAdd')}
              aria-expanded={helpComposerOpen}
            >
              {helpComposerOpen ? (
                <X size={18} className="[@media(max-height:740px)]:size-4" />
              ) : (
                <Plus size={18} className="[@media(max-height:740px)]:size-4" />
              )}
            </button>
          ) : null}
        </div>
        {openHelpTasks.length === 0 && completedHelpTasks.length === 0 ? (
          <p className="text-sm text-slate-500">{t('careTransition.circleHelpEmpty')}</p>
        ) : openHelpTasks.length > 0 ? (
          <div className="space-y-2">{openHelpTasks.map(renderHelpTask)}</div>
        ) : null}
        {canAddHelp && helpComposerOpen ? (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <input
              value={draftHelpTitle}
              onChange={(e) => setDraftHelpTitle(e.target.value)}
              placeholder={t('careTransition.circleHelpTitlePlaceholder')}
              disabled={helpCreating}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
            />
            <input
              value={draftHelpNote}
              onChange={(e) => setDraftHelpNote(e.target.value)}
              placeholder={t('careTransition.circleHelpNotePlaceholder')}
              disabled={helpCreating}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
            />
            <button
              type="button"
              disabled={helpCreating || saving || !draftHelpTitle.trim()}
              onClick={() => {
                const title = draftHelpTitle;
                const note = draftHelpNote;
                const memberName =
                  user.displayName?.trim() ||
                  user.email?.split('@')[0] ||
                  t('circle.circleMemberFallback');
                const targetLanguages = [
                  ...new Set(Object.values(memberLanguages.byUid)),
                ] as CircleUiLanguage[];
                setHelpCreating(true);
                void buildCircleHelpTaskTranslations(
                  title,
                  note,
                  viewerLanguage,
                  targetLanguages,
                )
                  .then((translations) =>
                    addCircleHelpTask(title, note, memberName, translations),
                  )
                  .then(() => {
                    setDraftHelpTitle('');
                    setDraftHelpNote('');
                    setHelpComposerOpen(false);
                  })
                  .finally(() => {
                    setHelpCreating(false);
                  });
              }}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white disabled:opacity-50"
            >
              {helpCreating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('careTransition.circleHelpCreating')}
                </>
              ) : (
                t('careTransition.circleHelpAdd')
              )}
            </button>
          </div>
        ) : null}
        {completedHelpTasks.length > 0 ? (
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setCompletedHelpOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-2 py-1.5 text-left"
              aria-expanded={completedHelpOpen}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t('careTransition.circleHelpCompleted')} ({completedHelpTasks.length})
              </span>
              {completedHelpOpen ? (
                <ChevronUp size={16} className="text-slate-400 shrink-0" aria-hidden />
              ) : (
                <ChevronDown size={16} className="text-slate-400 shrink-0" aria-hidden />
              )}
            </button>
            {completedHelpOpen ? (
              <div className="space-y-2 pt-1">{completedHelpTasks.map(renderHelpTask)}</div>
            ) : null}
          </div>
        ) : null}
      </section>
    ) : null;

  return (
    <div className="space-y-3">
      {circleHelpCard}
      {showCareTransitionCard ? (
      <section
        className={cn(
          'rounded-3xl border border-slate-100 bg-white',
          collapsible ? 'overflow-hidden' : cn(cardPad, 'space-y-4'),
        )}
      >
      {collapsible ? (
        <div className="flex items-start">
          {collapseToggle}
          {packStartButton}
        </div>
      ) : null}
      {collapsible && collapsed ? null : (
      <div className={cn('space-y-4', collapsible && 'border-t border-slate-100', collapsible && cardPad)}>
      {hideHeader || collapsible ? null : (
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
          <ClipboardList size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800">
                {t('careTransition.title')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t('careTransition.subtitle', { name: patient.displayName })}
              </p>
              {startedLabel ? (
                <p className="text-[11px] text-slate-500 mt-1 font-medium">{startedLabel}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {packStartButton}
              {onExpand && hasActivePack ? (
                <button
                  type="button"
                  onClick={onExpand}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={t('careTransition.expand')}
                  title={t('careTransition.expand')}
                >
                  <Maximize2 size={18} />
                </button>
              ) : null}
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
                  aria-label={t('common.close')}
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      )}

      {(hideHeader || collapsible) && startedLabel ? (
        <p className="text-[11px] text-slate-500 font-medium">{startedLabel}</p>
      ) : null}

      {hideHeader && packStartButton ? (
        <div className="flex justify-end">{packStartButton}</div>
      ) : null}

      {pack?.kind === 'crisis' ? (
        <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-2xl p-3">
          {t('careTransition.crisisHint')}
        </p>
      ) : null}

      {showPackControls ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="care-transition-active-pack"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block"
            >
              {t('careTransition.activePack')}
            </label>
            <select
              id="care-transition-active-pack"
              disabled={saving}
              value={state.activePackId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                void setActivePack(value ? (value as CareTransitionPackId) : null);
              }}
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm font-semibold bg-white',
                packComplete
                  ? 'border-emerald-300 text-emerald-800'
                  : 'border-slate-200 text-slate-800',
              )}
            >
              <option value="">{t('careTransition.none')}</option>
              {localizedPacks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kind === 'crisis' ? p.title : `${p.fromLabel} → ${p.toLabel}`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
              {t('careTransition.packSelectHint')}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t('careTransition.tasksFor')}
            </p>
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-semibold text-slate-800">
                {t(`careTransition.region.${state.region}`)}
                {countryCode ? (
                  <span className="text-slate-500 font-medium">
                    {' '}
                    · {countryDisplayName(countryCode, viewerLanguage)}
                  </span>
                ) : null}
                {state.regionManual ? (
                  <span className="text-slate-400 font-medium">
                    {' '}
                    ({t('careTransition.regionManual')})
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => setRegionPickerOpen((open) => !open)}
                className="text-xs font-semibold text-blue-600 shrink-0"
              >
                {regionPickerOpen ? t('careTransition.regionDone') : t('careTransition.regionChange')}
              </button>
            </div>
            {regionPickerOpen ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 px-1 leading-relaxed">
                  {t('careTransition.regionOverrideHint')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['us', 'de', 'generic'] as CareTransitionRegion[]).map((region) => (
                    <button
                      key={region}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        void setRegion(region, { manual: true });
                        setRegionPickerOpen(false);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border',
                        state.region === region
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200',
                      )}
                    >
                      {t(`careTransition.region.${region}`)}
                      {!state.regionManual && region === autoRegion
                        ? ` (${t('careTransition.regionSuggested')})`
                        : ''}
                    </button>
                  ))}
                </div>
                {state.regionManual ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      void setRegion(autoRegion, { manual: false });
                      setRegionPickerOpen(false);
                    }}
                    className="text-xs font-semibold text-slate-600 px-1"
                  >
                    {t('careTransition.regionUseProfile')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!localizedPack ? (
        <p className="text-sm text-slate-500 py-4">
          {packStarterOpen
            ? t('careTransition.choosePack')
            : t('careTransition.startPackEmpty')}
        </p>
      ) : !canViewTasks ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
          <p className="font-semibold text-slate-800 text-sm">{localizedPack.title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('careTransition.friendAwareness', { name: patient.displayName })}
          </p>
          {startedLabel ? (
            <p className="text-[11px] text-slate-500 font-medium">{startedLabel}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{localizedPack.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{localizedPack.subtitle}</p>
                {startedLabel ? (
                  <p className="text-[11px] text-slate-500 mt-1">{startedLabel}</p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-base font-bold tabular-nums',
                    packComplete ? 'text-emerald-700' : 'text-slate-800',
                  )}
                >
                  {progress.done}/{progress.total}
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  {t('careTransition.statActiveDone')}
                </p>
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-base font-bold tabular-nums',
                    packComplete ? 'text-emerald-700' : 'text-slate-800',
                  )}
                >
                  {progress.percent}%
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  {t('careTransition.statReady')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold tabular-nums text-slate-800">
                  {dismissedItems.length}
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  {t('careTransition.statDismissed')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-slate-800 truncate">
                  {role === 'proxy'
                    ? t('careTransition.roleProxy')
                    : role === 'family'
                      ? t('careTransition.roleFamily')
                      : t('careTransition.roleCaregiver')}
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  {t('careTransition.statFilteredFor')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {localizedActiveItems.map((item) => {
              const done = doneSet.has(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-2xl border px-3 py-3 space-y-2',
                    done
                      ? 'border-emerald-200 bg-emerald-50'
                      : selected?.id === item.id
                        ? 'border-blue-200 bg-blue-50/40'
                        : 'border-slate-100 bg-white',
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      if (done) {
                        setSelectedId((current) => (current === item.id ? null : item.id));
                        return;
                      }
                      setSelectedId(item.id);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        size={18}
                        className={cn(
                          'mt-0.5 shrink-0',
                          done ? 'text-emerald-600' : 'text-slate-300',
                        )}
                      />
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            done ? 'text-emerald-900' : 'text-slate-800',
                          )}
                        >
                          {item.custom ? `[${t('careTransition.custom')}] ` : ''}
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.when}</p>
                      </div>
                    </div>
                  </button>
                  {selected?.id === item.id ? (
                    done ? (
                      canWorkTasks ? (
                        <div className="pl-7">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              void toggleDone(item.id);
                              setSelectedId(null);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600"
                          >
                            {t('careTransition.markNotDone')}
                          </button>
                        </div>
                      ) : null
                    ) : (
                    <div className="pl-7 space-y-2">
                      <p className="text-xs text-slate-600 leading-relaxed">{item.why}</p>
                      <div className="flex flex-wrap gap-2">
                        {canWorkTasks ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              void toggleDone(item.id);
                              setSelectedId(null);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600"
                          >
                            {t('careTransition.markDone')}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void copyTask(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700"
                        >
                          <Copy size={13} />
                          {copiedTaskId === item.id
                            ? t('careTransition.copied')
                            : t('careTransition.copyTask')}
                        </button>
                        {canWorkTasks ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void dismissItem(item.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600"
                          >
                            {t('careTransition.dismiss')}
                          </button>
                        ) : null}
                        {item.custom && canManage ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void removeCustomTask(item.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600"
                          >
                            {t('careTransition.removeCustom')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>

          {dismissedItems.length > 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t('careTransition.dismissed')} ({dismissedItems.length})
              </p>
              {localizedDismissedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-sm text-slate-600"
                >
                  <span className="min-w-0 truncate">{item.title}</span>
                  {canWorkTasks ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void restoreDismissed(item.id)}
                      className="text-xs font-semibold text-blue-600 shrink-0"
                    >
                      {t('careTransition.restore')}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {canManage ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Plus size={16} /> {t('careTransition.addCustomTask')}
              </p>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={t('careTransition.taskTitlePlaceholder')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={draftWhy}
                onChange={(e) => setDraftWhy(e.target.value)}
                placeholder={t('careTransition.taskWhyPlaceholder')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={saving || !draftTitle.trim()}
                onClick={() => {
                  void addCustomTask(draftTitle, draftWhy).then(() => {
                    setDraftTitle('');
                    setDraftWhy('');
                  });
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white disabled:opacity-50"
              >
                {t('careTransition.addToPack')}
              </button>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <BookOpen size={16} /> {t('careTransition.knowTitle')}
            </p>
            <p className="text-xs text-slate-500">{t('careTransition.knowHint')}</p>
            {knowList.map((course) => (
              <div key={course.id} className="space-y-1">
                <p className="text-sm font-medium text-slate-800">{course.title}</p>
                <p className="text-xs text-slate-400">
                  {course.duration} · {course.audience}
                </p>
                <a
                  href={course.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600"
                >
                  {t('careTransition.openKnow')}
                </a>
              </div>
            ))}
            {canManage ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <input
                  value={draftKnowTitle}
                  onChange={(e) => setDraftKnowTitle(e.target.value)}
                  placeholder={t('careTransition.knowTitlePlaceholder')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={draftKnowUrl}
                  onChange={(e) => setDraftKnowUrl(e.target.value)}
                  placeholder={t('careTransition.knowUrlPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={saving || !draftKnowTitle.trim()}
                  onClick={() => {
                    void attachKnowCourse({
                      id: `know-custom-${Date.now()}`,
                      title: draftKnowTitle.trim(),
                      duration: 'Link',
                      audience: 'Circle',
                      href:
                        draftKnowUrl.trim() ||
                        'https://know.medxforce.example/courses/custom',
                    }).then(() => {
                      setDraftKnowTitle('');
                      setDraftKnowUrl('');
                    });
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 disabled:opacity-50"
                >
                  {t('careTransition.attachKnow')}
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}
      {saving ? (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> {t('admin.contact.saving')}
        </p>
      ) : null}
      </div>
      )}
      </section>
      ) : null}
    </div>
  );
}
