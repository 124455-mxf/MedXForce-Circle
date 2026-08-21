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
  ListTodo,
  Loader2,
  Maximize2,
  Plus,
  X,
} from 'lucide-react';
import {
  careTransitionItemClaim,
  careTransitionRegionFromCountry,
  circleDisplayFirstName,
  countryDisplayName,
  createDiaryEntry,
  normalizeCountryCode,
  normalizeMemberRole,
  type CareTransitionChecklistItem,
  type CareTransitionPackId,
  type CareTransitionRegion,
  type CircleHelpTask,
  type CirclePatientSummary,
  getCareTransitionPack,
} from '@medxforce/shared';
import { useCareTransitionReadiness } from '../hooks/useCareTransitionReadiness';
import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { useCirclePatientMemberLanguages } from '../hooks/useCirclePatientMemberLanguages';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import { buildCircleHelpTaskTranslations } from '../lib/circleThreadPostTranslate';
import { CircleHelpTaskCopy } from './CircleHelpTaskCopy';
import { CircleHelpTaskComposer } from './CircleHelpTaskComposer';
import { CircleCareTransitionPackComposer, CircleCareTransitionPackNoteFields } from './CircleCareTransitionPackComposer';
import { CircleCareTransitionDraftBadge } from './CircleCareTransitionDraftBadge';
import { circleHeaderActionButtonClass } from '../lib/circleSectionStyles';
import { formatCareTransitionPackStartedAt } from '../lib/careTransitionBannerDismiss';
import {
  buildLocalizedTaskCopyText,
  localizeCareTransitionItem,
  localizeCareTransitionKnow,
  localizeCareTransitionPack,
} from '../lib/localizeCareTransition';
import { cn } from '../lib/utils';
import { buildCircleDiaryTranslations } from '../lib/buildCircleDiaryTranslations';

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
  /**
   * Render only the pack review/start modal (e.g. Home banner Open on a draft).
   * Pair with packStarterOpen / onPackStarterOpenChange.
   */
  composerOnly?: boolean;
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
  composerOnly = false,
}: CircleCareTransitionReadinessPanelProps) {
  const t = useCircleT();
  const { language: viewerLanguage } = useCircleI18nContext();
  const role = normalizeMemberRole(patient.role);
  const patientFirstName = circleDisplayFirstName(patient.displayName, patient.firstName);
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
    packDraft,
    packs,
    activeItems,
    dismissedItems,
    progress,
    doneSet,
    canManage,
    canWorkTasks,
    canViewTasks,
    setActivePack,
    sharePackWithCircle,
    postPackNote,
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
    claimPackItem,
    releasePackItem,
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
  const [draftKnowTitle, setDraftKnowTitle] = useState('');
  const [draftKnowUrl, setDraftKnowUrl] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [localHelpComposerOpen, setLocalHelpComposerOpen] = useState(false);
  const [localPackStarterOpen, setLocalPackStarterOpen] = useState(false);
  const [helpCreating, setHelpCreating] = useState(false);
  const [packNote, setPackNote] = useState('');
  const [packNoteInDiary, setPackNoteInDiary] = useState(false);
  const [followUpNoteOpen, setFollowUpNoteOpen] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpNoteInDiary, setFollowUpNoteInDiary] = useState(false);
  const [followUpSending, setFollowUpSending] = useState(false);
  const [packSharing, setPackSharing] = useState(false);
  const [packConfirm, setPackConfirm] = useState<'end' | 'discard' | null>(null);
  const [completedHelpOpen, setCompletedHelpOpen] = useState(false);
  const [closedPacksOpen, setClosedPacksOpen] = useState(false);
  const [expandedClosedPackId, setExpandedClosedPackId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() =>
    collapsible ? readCareTransitionCollapsed(patient.patientId) : false,
  );

  const helpComposerOpen = composeInHeader
    ? Boolean(helpComposerOpenProp)
    : localHelpComposerOpen;
  const packStarterControlled = composeInHeader || composerOnly;
  const packStarterOpen = packStarterControlled
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
    if (packStarterControlled) onPackStarterOpenChange?.(next);
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
    const text = buildLocalizedTaskCopyText(t, localizedPack.title, item, patientFirstName);
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
      ? packDraft
        ? t('careTransition.collapsedSummaryReview', { pack: localizedPack.title })
        : t('careTransition.collapsedSummary', {
            pack: localizedPack.title,
            done: progress.done,
            total: progress.total,
            percent: progress.percent,
          })
      : (state?.closedPacks?.length ?? 0) > 0
        ? t('careTransition.collapsedSummaryClosed', {
            count: state?.closedPacks?.length ?? 0,
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

  const createCircleHelpTaskFromComposer = async (title: string, note: string) => {
    if (!state) return;
    const memberName =
      user.displayName?.trim() ||
      user.email?.split('@')[0] ||
      t('circle.circleMemberFallback');
    const targetLanguages = [...new Set(Object.values(memberLanguages.byUid))] as CircleUiLanguage[];
    setHelpCreating(true);
    try {
      const translations = await buildCircleHelpTaskTranslations(
        title,
        note,
        viewerLanguage,
        targetLanguages,
      );
      await addCircleHelpTask(title, note, memberName, translations);
      setHelpComposerOpen(false);
    } finally {
      setHelpCreating(false);
    }
  };

  const helpTaskComposer = canAddHelp ? (
    <CircleHelpTaskComposer
      open={helpComposerOpen}
      sending={helpCreating}
      onClose={() => setHelpComposerOpen(false)}
      onPost={createCircleHelpTaskFromComposer}
    />
  ) : null;

  if (loading || !state) {
    if (composerOnly) return null;
    if (collapsible) {
      if (!canManage) {
        return (
          <>
            <div className="py-6 flex justify-center text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
            {helpTaskComposer}
          </>
        );
      }
      return (
        <>
          <div>{collapseToggle}</div>
          {helpTaskComposer}
        </>
      );
    }
    return (
      <>
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
        {helpTaskComposer}
      </>
    );
  }

  const cardPad = compact || collapsible ? 'p-4' : 'p-5';
  const cardClass = cn('rounded-3xl border border-slate-100 bg-white', cardPad);
  const hasSelectedPack = Boolean(state.activePackId);
  const hasActivePack = Boolean(pack);
  const closedPacks = state.closedPacks ?? [];
  const showPackControls = canManage && hasSelectedPack && !packDraft && !hideHeader;
  const showCareTransitionCard =
    canManage || hasActivePack || (canViewTasks && closedPacks.length > 0);

  const openPackStarter = () => {
    if (collapsible && collapsed) {
      setCollapsed(false);
      try {
        localStorage.setItem(careTransitionCollapsedStorageKey(patient.patientId), '0');
      } catch {
        /* ignore */
      }
    }
    setPackStarterOpen(true);
  };

  const packStartButton =
    !composeInHeader && !hideHeader && !composerOnly && canManage && (!hasSelectedPack || packDraft) ? (
      <button
        type="button"
        onClick={openPackStarter}
        className={cn(circleHeaderActionButtonClass, collapsible && 'mt-4 mr-4')}
        aria-label={t('careTransition.startPackAria')}
        title={t('careTransition.startPackAria')}
        aria-expanded={packStarterOpen}
      >
        <Plus size={18} className="[@media(max-height:740px)]:size-4" />
      </button>
    ) : null;

  const helpMemberName =
    user.displayName?.trim() || user.email?.split('@')[0] || t('circle.circleMemberFallback');

  const addPackNoteToDiary = async (note: string) => {
    const body = note.trim();
    if (!body) return;
    const title = (localizedPack?.title.trim() || t('careTransition.title')).slice(0, 200);
    const targetLanguages = [
      ...new Set([viewerLanguage, ...Object.values(memberLanguages.byUid)]),
    ] as CircleUiLanguage[];
    const { sourceLanguage, translations } = await buildCircleDiaryTranslations({
      title,
      body,
      targetLanguages,
      fallbackSourceLanguage: viewerLanguage,
    });
    await createDiaryEntry(db, {
      patientId: patient.patientId,
      authorUid: user.uid,
      authorName: helpMemberName,
      draft: {
        title,
        body,
        mood: '',
        experienceAt: Date.now(),
        visibility: 'circle',
        isMilestone: false,
      },
      sourceLanguage,
      translations,
    });
  };

  const shareDraftPack = async (note: string, alsoDiary: boolean) => {
    setPackSharing(true);
    try {
      await sharePackWithCircle({ note, authorName: helpMemberName });
      if (alsoDiary && note.trim()) {
        try {
          await addPackNoteToDiary(note);
        } catch (err) {
          console.warn('[careTransitionReadiness] pack note diary skipped', err);
        }
      }
      setPackNote('');
      setPackNoteInDiary(false);
      setPackStarterOpen(false);
    } finally {
      setPackSharing(false);
    }
  };

  const postLivePackNote = async () => {
    const note = followUpNote.trim();
    if (!note || followUpSending) return;
    setFollowUpSending(true);
    try {
      await postPackNote(note, helpMemberName);
      if (followUpNoteInDiary) {
        try {
          await addPackNoteToDiary(note);
        } catch (err) {
          console.warn('[careTransitionReadiness] pack note diary skipped', err);
        }
      }
      setFollowUpNote('');
      setFollowUpNoteInDiary(false);
      setFollowUpNoteOpen(false);
    } catch (err) {
      console.warn('[careTransitionReadiness] pack note announcement skipped', err);
    } finally {
      setFollowUpSending(false);
    }
  };

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
            <>
              <p className="text-[11px] font-semibold text-emerald-700 mt-1 truncate">
                {claimed
                  ? `${t('careTransition.circleHelpCompleted')} · ${
                      task.claimedByName.trim() || t('circle.circleMemberFallback')
                    }`
                  : t('careTransition.circleHelpCompleted')}
              </p>
              {task.doneAt && task.doneAt > 0 ? (
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {formatCareTransitionPackStartedAt(task.doneAt, viewerLanguage)}
                </p>
              ) : null}
            </>
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
              onClick={() => setHelpComposerOpen(true)}
              className={circleHeaderActionButtonClass}
              aria-label={t('careTransition.circleHelpAdd')}
              title={t('careTransition.circleHelpAdd')}
              aria-expanded={helpComposerOpen}
            >
              <Plus size={18} className="[@media(max-height:740px)]:size-4" />
            </button>
          ) : null}
        </div>
        {openHelpTasks.length === 0 && completedHelpTasks.length === 0 ? (
          <p className="text-sm text-slate-500">{t('careTransition.circleHelpEmpty')}</p>
        ) : openHelpTasks.length > 0 ? (
          <div className="space-y-2">{openHelpTasks.map(renderHelpTask)}</div>
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
    <div className={composerOnly ? undefined : 'space-y-3'}>
      {composerOnly ? null : (
      <>
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
              {t('careTransition.subtitle', { name: patientFirstName })}
            </p>
            {startedLabel && !packDraft ? (
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{startedLabel}</p>
            ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {packStartButton}
              {onExpand && hasActivePack && !packDraft ? (
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

      {(hideHeader || collapsible) && !packDraft && startedLabel ? (
        <p className="text-[11px] text-slate-500 font-medium">{startedLabel}</p>
      ) : null}

      {hideHeader && packStartButton ? (
        <div className="flex justify-end">{packStartButton}</div>
      ) : null}

      {pack?.kind === 'crisis' && !packDraft ? (
        <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-2xl p-3">
          {t('careTransition.crisisHint')}
        </p>
      ) : null}

      {showPackControls ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            <ListTodo size={14} className="text-slate-400" aria-hidden />
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
      ) : null}

      {hideHeader && (packDraft || !localizedPack) ? null : packDraft && canManage && localizedPack ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 space-y-3">
          <div className="space-y-1.5">
            <CircleCareTransitionDraftBadge />
            <p className="font-semibold text-slate-800 text-sm">{localizedPack.title}</p>
            <p className="text-xs text-amber-950 leading-relaxed">
              {t('careTransition.reviewHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPackStarterOpen(true)}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white"
          >
            {t('careTransition.continueReview')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setPackConfirm('discard')}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-600"
          >
            {t('careTransition.discardDraft')}
          </button>
        </div>
      ) : !localizedPack ? (
        canManage ? (
          <p className="text-sm text-slate-500 py-4">
            {t('careTransition.startPackEmpty')}
          </p>
        ) : null
      ) : !canViewTasks ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
          <p className="font-semibold text-slate-800 text-sm">{localizedPack.title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('careTransition.friendAwareness', { name: patientFirstName })}
          </p>
          {state.packNote?.trim() ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {state.packNote.trim()}
            </p>
          ) : null}
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
            {canManage && followUpNoteOpen ? (
              <div className="space-y-3">
                <CircleCareTransitionPackNoteFields
                  note={followUpNote}
                  onNoteChange={setFollowUpNote}
                  alsoDiary={followUpNoteInDiary}
                  onAlsoDiaryChange={setFollowUpNoteInDiary}
                  disabled={followUpSending}
                  required
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={followUpSending}
                    onClick={() => {
                      setFollowUpNoteOpen(false);
                      setFollowUpNote('');
                      setFollowUpNoteInDiary(false);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600"
                  >
                    {t('careTransition.packCancelNote')}
                  </button>
                  <button
                    type="button"
                    disabled={followUpSending || !followUpNote.trim()}
                    onClick={() => void postLivePackNote()}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white disabled:opacity-50"
                  >
                    {followUpSending
                      ? t('careTransition.packNotePosting')
                      : t('careTransition.packPostNote')}
                  </button>
                </div>
              </div>
            ) : canManage ? (
              <button
                type="button"
                onClick={() => setFollowUpNoteOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-800"
              >
                {t('careTransition.packAddNote')}
              </button>
            ) : null}
            {state.packNote?.trim() ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t('careTransition.packLiveNote')}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {state.packNote.trim()}
                </p>
              </div>
            ) : null}
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
            {packComplete && canManage ? (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 leading-relaxed">
                {t('careTransition.endPackReadyHint')}
              </p>
            ) : null}
            {canManage ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setPackConfirm('end')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-semibold',
                  packComplete
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-200 text-slate-700',
                )}
              >
                {t('careTransition.endPack')}
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            {localizedActiveItems.map((item) => {
              const done = doneSet.has(item.id);
              const claim = careTransitionItemClaim(state?.packItemClaims, item.id);
              const claimed = Boolean(claim?.claimedByUid);
              const claimName =
                claim?.claimedByName.trim() || t('circle.circleMemberFallback');
              const canReleasePack = Boolean(
                claim && (canManage || claim.claimedByUid === user.uid),
              );
              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-2xl border px-3 py-3 space-y-2',
                    done
                      ? 'border-emerald-200 bg-emerald-50'
                      : selected?.id === item.id
                        ? 'border-blue-200 bg-blue-50/40'
                        : 'border-slate-200 bg-slate-50',
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
                        {done ? (
                          claimed ? (
                            <p className="text-[11px] font-semibold text-emerald-700 mt-1 truncate">
                              {`${t('careTransition.circleHelpCompleted')} · ${claimName}`}
                            </p>
                          ) : null
                        ) : claimed ? (
                          <p className="text-[11px] text-slate-400 mt-1">
                            {t('careTransition.circleHelpTaskTaken', { name: claimName })}
                          </p>
                        ) : null}
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
                        {!claimed && canClaimHelp ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void claimPackItem(item.id, helpMemberName)}
                            className={cn(
                              helpActionButtonClass,
                              'border border-slate-200 bg-white text-slate-700',
                            )}
                          >
                            {t('careTransition.circleHelpClaim')}
                          </button>
                        ) : null}
                        {claimed && canReleasePack ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void releasePackItem(item.id)}
                            className={cn(
                              helpActionButtonClass,
                              'border border-slate-200 bg-white text-slate-700',
                            )}
                          >
                            {t('careTransition.circleHelpRelease')}
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
                      {canManage || canWorkTasks ? (
                        <div className="flex flex-wrap gap-2">
                          {canManage ? (
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
                          ) : null}
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
                        </div>
                      ) : null}
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

      {!hideHeader && canViewTasks && closedPacks.length > 0 ? (
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setClosedPacksOpen((open) => !open)}
            className="w-full flex items-center justify-between gap-2 py-1.5 text-left"
            aria-expanded={closedPacksOpen}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t('careTransition.closedPacks')} ({closedPacks.length})
            </span>
            {closedPacksOpen ? (
              <ChevronUp size={16} className="text-slate-400 shrink-0" aria-hidden />
            ) : (
              <ChevronDown size={16} className="text-slate-400 shrink-0" aria-hidden />
            )}
          </button>
          {closedPacksOpen ? (
            <div className="space-y-2 pt-1">
              {closedPacks.map((closed) => {
                const closedPack = getCareTransitionPack(closed.packId);
                const closedTitle = closedPack
                  ? localizeCareTransitionPack(t, closedPack).title
                  : closed.packId;
                const endedLabel = formatCareTransitionPackStartedAt(
                  closed.endedAt,
                  viewerLanguage,
                );
                const datesLabel =
                  closed.startedAt && closed.startedAt > 0
                    ? t('careTransition.closedPackDates', {
                        started: formatCareTransitionPackStartedAt(
                          closed.startedAt,
                          viewerLanguage,
                        ),
                        ended: endedLabel,
                      })
                    : t('careTransition.closedPackEndedOnly', { date: endedLabel });
                return (
                  <div
                    key={closed.id}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 space-y-2"
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() =>
                        setExpandedClosedPackId((current) =>
                          current === closed.id ? null : closed.id,
                        )
                      }
                      aria-expanded={expandedClosedPackId === closed.id}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-600"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-emerald-900">{closedTitle}</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            {datesLabel}
                            {closed.total > 0
                              ? ` · ${t('careTransition.closedPackProgress', {
                                  done: closed.done,
                                  total: closed.total,
                                })}`
                              : ''}
                          </p>
                          {closed.packNote.trim() ? (
                            <p className="text-xs text-emerald-900/80 leading-relaxed whitespace-pre-wrap line-clamp-2 mt-1">
                              {closed.packNote.trim()}
                            </p>
                          ) : null}
                        </div>
                        {expandedClosedPackId === closed.id ? (
                          <ChevronUp size={16} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                        ) : (
                          <ChevronDown size={16} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                        )}
                      </div>
                    </button>
                    {expandedClosedPackId === closed.id ? (
                      <div className="space-y-1.5 pl-7">
                        {(closed.items.length > 0
                          ? closed.items
                          : (closedPack?.items ?? []).map((item) => ({
                              id: item.id,
                              title: item.title,
                              when: item.when,
                              done: closed.total > 0 && closed.done >= closed.total,
                            }))
                        ).map((item) => {
                          const template = closedPack?.items.find((row) => row.id === item.id);
                          const localized = template
                            ? localizeCareTransitionItem(t, template)
                            : item;
                          return (
                            <div key={item.id} className="flex items-start gap-2">
                              <CheckCircle2
                                size={16}
                                className={cn(
                                  'mt-0.5 shrink-0',
                                  item.done ? 'text-emerald-600' : 'text-emerald-300',
                                )}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-emerald-900">
                                  {localized.title}
                                </p>
                                {localized.when ? (
                                  <p className="text-[11px] text-emerald-700">{localized.when}</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

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
      {helpTaskComposer}
      </>
      )}
      {canManage ? (
        <CircleCareTransitionPackComposer
          open={packStarterOpen}
          sending={saving || packSharing}
          packs={localizedPacks}
          resumeReview={packDraft}
          currentPackId={state.activePackId}
          reviewTitle={localizedPack?.title}
          packNote={packNote}
          onPackNoteChange={setPackNote}
          alsoDiary={packNoteInDiary}
          onAlsoDiaryChange={setPackNoteInDiary}
          onClose={() => setPackStarterOpen(false)}
          onStart={async (packId) => {
            if (state.activePackId !== packId) await setActivePack(packId);
          }}
          onShare={shareDraftPack}
        >
          <div className="space-y-4">
            {pack?.kind === 'crisis' ? (
              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-2xl p-3">
                {t('careTransition.crisisHint')}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <ListTodo size={14} className="text-slate-400" aria-hidden />
                {t('careTransition.tasksFor')}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {t(`careTransition.region.${state.region}`)}
                  {countryCode ? (
                    <span className="text-slate-500 font-medium">
                      {' '}
                      · {countryDisplayName(countryCode, viewerLanguage)}
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
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              {localizedActiveItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <ListTodo size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {item.custom ? `[${t('careTransition.custom')}] ` : ''}
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.when}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.why}</p>
                  <div className="flex flex-wrap gap-2">
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
              ))}
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
            </div>
          </div>
        </CircleCareTransitionPackComposer>
      ) : null}
      {packConfirm ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div
            className="bg-white p-6 rounded-[28px] shadow-2xl max-w-md w-full space-y-4 border border-slate-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-transition-pack-confirm-title"
          >
            <h3
              id="care-transition-pack-confirm-title"
              className="text-lg font-bold text-slate-900"
            >
              {packConfirm === 'end'
                ? t('careTransition.endPackConfirmTitle')
                : t('careTransition.discardDraftConfirmTitle')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {packConfirm === 'end'
                ? t('careTransition.endPackConfirmBody')
                : t('careTransition.discardDraftConfirmBody')}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => setPackConfirm(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setPackConfirm(null);
                  void setActivePack(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-white font-semibold text-sm disabled:opacity-50"
              >
                {packConfirm === 'end'
                  ? t('careTransition.endPackConfirm')
                  : t('careTransition.discardDraft')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
