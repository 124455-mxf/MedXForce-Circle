import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ListTodo } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  careTransitionHomeOpenItems,
  careTransitionItemClaim,
  getCareTransitionPack,
  isCareTransitionPackLive,
  normalizeMemberRole,
  type CareTransitionHomeOpenItem,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCareTransitionReadiness } from '../hooks/useCareTransitionReadiness';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import { DASHBOARD_RECENCY_TINT_CLASSES } from '../lib/circleDashboardStats';
import { dashboardTileTitleClass } from '../lib/circleSectionStyles';
import { localizeCareTransitionItem, localizeCareTransitionPack } from '../lib/localizeCareTransition';
import { resolveStoredMessageText } from '../lib/messageTranslationDisplay';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { CircleHelpTaskCopy } from './CircleHelpTaskCopy';

const HOME_TASK_ACTION_CLASS = 'px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50';

type CircleHomeTasksBannerProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
};

function helpTaskTitle(
  task: CareTransitionHomeOpenItem & { kind: 'help' },
  language: CircleUiLanguage,
): string {
  return resolveStoredMessageText(
    {
      text: task.task.title,
      translations: (task.task.translations ?? []).map((entry) => ({
        language: entry.language,
        text: entry.title,
        isAuto: entry.isAuto,
      })),
    },
    language,
  ).displayText;
}

function stopToggle(event: MouseEvent) {
  event.stopPropagation();
}

export function CircleHomeTasksBanner({ user, db, patient }: CircleHomeTasksBannerProps) {
  const t = useCircleT();
  const { language: viewerLanguage } = useCircleI18nContext();
  const memberRole = normalizeMemberRole(patient.role);
  const {
    state,
    loading,
    saving,
    canViewTasks,
    canWorkTasks,
    canClaimHelp,
    canManage,
    claimCircleHelpTask,
    releaseCircleHelpTask,
    toggleCircleHelpDone,
    claimPackItem,
    releasePackItem,
    toggleDone,
  } = useCareTransitionReadiness(db, patient.patientId, user.uid, memberRole, t);
  const [expanded, setExpanded] = useState(false);
  const helpMemberName = user.displayName?.trim() || t('circle.circleMemberFallback');

  const items = useMemo(
    () => (state && canViewTasks ? careTransitionHomeOpenItems(state, memberRole, user.uid) : []),
    [canViewTasks, memberRole, state, user.uid],
  );
  const itemIdsKey = items.map((row) => row.id).join('|');
  const first = items[0] ?? null;
  const claimedByYou = items.filter((row) => row.claimedByUid === user.uid).length;
  const multiple = items.length > 1;

  useEffect(() => {
    setExpanded(false);
  }, [itemIdsKey]);

  if (loading || !canViewTasks || !first) return null;

  const recencyTint = claimedByYou > 0 ? 'orange' : 'green';
  const livePack =
    state && isCareTransitionPackLive(state) && state.activePackId
      ? getCareTransitionPack(state.activePackId)
      : null;
  const packLabel = livePack
    ? localizeCareTransitionPack(t, livePack).title
    : t('careTransition.title');

  const singleTitle =
    first.kind === 'help'
      ? helpTaskTitle(first, viewerLanguage)
      : localizeCareTransitionItem(t, first.item).title;
  const singleClaim =
    first.kind === 'pack' && state
      ? careTransitionItemClaim(state.packItemClaims, first.item.id)
      : null;
  const singleSub =
    first.claimedByUid === user.uid
      ? t('circle.homeTasksClaimedByYou')
      : first.kind === 'help' && first.task.claimedByUid
        ? t('careTransition.circleHelpTaskTaken', {
            name: first.task.claimedByName.trim() || t('circle.circleMemberFallback'),
          })
        : first.kind === 'pack' && singleClaim
          ? t('careTransition.circleHelpTaskTaken', {
              name: singleClaim.claimedByName.trim() || t('circle.circleMemberFallback'),
            })
          : first.kind === 'pack'
            ? localizeCareTransitionItem(t, first.item).when
            : null;

  const renderActions = (row: CareTransitionHomeOpenItem) => {
    const mine = row.claimedByUid === user.uid;
    const claimed = Boolean(row.claimedByUid);
    const canRelease = canManage || mine;
    if (row.kind === 'help') {
      return (
        <div className="flex flex-wrap gap-2" onClick={stopToggle}>
          {canWorkTasks ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggleCircleHelpDone(row.task.id, helpMemberName)}
              className={cn(HOME_TASK_ACTION_CLASS, 'text-white bg-blue-600')}
            >
              {t('careTransition.markDone')}
            </button>
          ) : null}
          {!claimed && canClaimHelp ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void claimCircleHelpTask(row.task.id, helpMemberName)}
              className={cn(HOME_TASK_ACTION_CLASS, 'border border-slate-200 bg-white text-slate-700')}
            >
              {t('careTransition.circleHelpClaim')}
            </button>
          ) : null}
          {claimed && canRelease ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void releaseCircleHelpTask(row.task.id)}
              className={cn(HOME_TASK_ACTION_CLASS, 'border border-slate-200 bg-white text-slate-700')}
            >
              {t('careTransition.circleHelpRelease')}
            </button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2" onClick={stopToggle}>
        {canWorkTasks ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void toggleDone(row.item.id)}
            className={cn(HOME_TASK_ACTION_CLASS, 'text-white bg-blue-600')}
          >
            {t('careTransition.markDone')}
          </button>
        ) : null}
        {!claimed && canClaimHelp ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void claimPackItem(row.item.id, helpMemberName)}
            className={cn(HOME_TASK_ACTION_CLASS, 'border border-slate-200 bg-white text-slate-700')}
          >
            {t('careTransition.circleHelpClaim')}
          </button>
        ) : null}
        {claimed && canRelease ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void releasePackItem(row.item.id)}
            className={cn(HOME_TASK_ACTION_CLASS, 'border border-slate-200 bg-white text-slate-700')}
          >
            {t('careTransition.circleHelpRelease')}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden',
        multiple ? DASHBOARD_RECENCY_TINT_CLASSES[recencyTint] : 'border-sky-200 bg-sky-50',
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          'w-full text-left px-4 py-3.5 transition-colors',
          multiple
            ? 'flex flex-col sm:flex-row sm:items-stretch gap-3'
            : 'flex items-start gap-3 hover:bg-sky-100/70',
        )}
        aria-expanded={expanded}
      >
        {multiple ? (
          <>
            <div className="flex flex-col gap-2 min-w-0 sm:flex-1 sm:justify-between">
              <div className="flex items-center gap-2 w-full min-w-0">
                <ListTodo size={16} className="shrink-0 text-sky-700" aria-hidden />
                <span className={cn(dashboardTileTitleClass, 'truncate')}>
                  {t('circle.homeTasksTitle')}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-snug">
                {expanded ? t('circle.homeTasksHide') : t('circle.homeTasksHint')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 w-full items-start sm:w-56 sm:shrink-0 sm:pl-4 sm:border-l sm:border-slate-200/80">
              <div className="min-w-0">
                <p className="font-bold tabular-nums leading-none text-3xl text-slate-800">
                  {formatCircleBadgeCount(items.length)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 leading-snug">
                  {t('circle.homeTasksOpen')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="font-bold tabular-nums leading-none text-3xl text-slate-800">
                  {formatCircleBadgeCount(claimedByYou)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 leading-snug">
                  {t('circle.homeTasksYours')}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
              <ListTodo size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700/80">
                {first.kind === 'help' ? t('careTransition.circleHelpTitle') : packLabel}
              </p>
              <p className="font-semibold text-slate-800 text-sm mt-1.5 leading-snug">{singleTitle}</p>
              {singleSub ? <p className="text-xs text-slate-600 mt-1">{singleSub}</p> : null}
            </div>
            <span className="text-xs font-semibold text-sky-800 shrink-0 mt-1 inline-flex items-center gap-1">
              {expanded ? t('circle.homeTasksHide') : t('circle.homeTasksSee')}
              {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
            </span>
          </>
        )}
      </button>
      {expanded ? (
        <div className={cn('px-4 pb-4 space-y-3', multiple && 'pt-1')}>
          {items.map((row) => {
            const packItem = row.kind === 'pack' ? localizeCareTransitionItem(t, row.item) : null;
            const packClaim =
              row.kind === 'pack' && state
                ? careTransitionItemClaim(state.packItemClaims, row.item.id)
                : null;
            return (
              <div
                key={row.id}
                className={cn(
                  'rounded-xl border border-slate-200/80 bg-white/80 p-3 space-y-2',
                  !multiple && 'border-0 bg-transparent p-0',
                )}
              >
                {row.kind === 'help' ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <CircleHelpTaskCopy
                        task={row.task}
                        isOwn={row.task.createdByUid === user.uid}
                        viewerLanguage={viewerLanguage}
                        t={t}
                      />
                      {row.task.claimedByUid ? (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {row.task.claimedByUid === user.uid
                            ? t('circle.homeTasksClaimedByYou')
                            : t('careTransition.circleHelpTaskTaken', {
                                name:
                                  row.task.claimedByName.trim() || t('circle.circleMemberFallback'),
                              })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
                    <div className="min-w-0 flex-1">
                      {multiple ? (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {packLabel}
                        </p>
                      ) : null}
                      <p className="text-sm font-semibold text-slate-800">{packItem?.title}</p>
                      {packItem?.when ? (
                        <p className="text-xs text-slate-500 mt-0.5">{packItem.when}</p>
                      ) : null}
                      {packClaim ? (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {packClaim.claimedByUid === user.uid
                            ? t('circle.homeTasksClaimedByYou')
                            : t('careTransition.circleHelpTaskTaken', {
                                name:
                                  packClaim.claimedByName.trim() || t('circle.circleMemberFallback'),
                              })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
                {renderActions(row)}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
