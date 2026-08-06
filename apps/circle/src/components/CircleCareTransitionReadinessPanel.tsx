import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  ChevronDown,
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
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCareTransitionReadiness } from '../hooks/useCareTransitionReadiness';
import { useCirclePatientProfileSnapshot } from '../hooks/useCirclePatientProfileSnapshot';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
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
}: CircleCareTransitionReadinessPanelProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const role = normalizeMemberRole(patient.role);
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
    setActivePack,
    setRegion,
    syncRegionFromCountry,
    toggleDone,
    dismissItem,
    restoreDismissed,
    addCustomTask,
    removeCustomTask,
    attachKnowCourse,
  } = useCareTransitionReadiness(db, patient.patientId, user.uid, role, t);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftWhy, setDraftWhy] = useState('');
  const [draftKnowTitle, setDraftKnowTitle] = useState('');
  const [draftKnowUrl, setDraftKnowUrl] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    collapsible ? readCareTransitionCollapsed(patient.patientId) : false,
  );

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
    if (!selectedId) return localizedActiveItems[0] ?? localizedDismissedItems[0] ?? null;
    return (
      localizedActiveItems.find((i) => i.id === selectedId) ??
      localizedDismissedItems.find((i) => i.id === selectedId) ??
      null
    );
  }, [localizedActiveItems, localizedDismissedItems, selectedId]);

  const packComplete = progress.total > 0 && progress.done >= progress.total;
  const startedLabel =
    state?.packActivatedAt && state.packActivatedAt > 0
      ? t('careTransition.startedAt', {
          date: formatCareTransitionPackStartedAt(state.packActivatedAt, language),
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
          'w-full flex items-start gap-3 text-left',
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
      return <div>{collapseToggle}</div>;
    }
    return (
      <div className="py-10 flex justify-center text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (collapsible && collapsed) {
    return <div>{collapseToggle}</div>;
  }

  return (
    <div>
      {collapseToggle}
      <div
        className={cn(
          'space-y-4',
          compact || collapsible ? 'p-4' : 'p-5',
          collapsible && 'border-t border-slate-100',
        )}
      >
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
            <div className="flex items-center gap-1 shrink-0">
              {onExpand ? (
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

      {pack?.kind === 'crisis' ? (
        <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-2xl p-3">
          {t('careTransition.crisisHint')}
        </p>
      ) : null}

      {canManage ? (
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
                    · {countryDisplayName(countryCode, language)}
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
          {canManage
            ? t('careTransition.choosePack')
            : t('careTransition.noActivePack')}
        </p>
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
                    : role === 'family' || role === 'friend'
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
                    onClick={() => setSelectedId(item.id)}
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
                    <div className="pl-7 space-y-2">
                      <p className="text-xs text-slate-600 leading-relaxed">{item.why}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void toggleDone(item.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-semibold text-white',
                            done ? 'bg-emerald-600' : 'bg-blue-600',
                          )}
                        >
                          {done
                            ? t('careTransition.markNotDone')
                            : t('careTransition.markDone')}
                        </button>
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
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void dismissItem(item.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600"
                        >
                          {t('careTransition.dismiss')}
                        </button>
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
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void restoreDismissed(item.id)}
                    className="text-xs font-semibold text-blue-600 shrink-0"
                  >
                    {t('careTransition.restore')}
                  </button>
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
    </div>
  );
}
