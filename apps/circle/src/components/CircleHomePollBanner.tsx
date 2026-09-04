import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  isCirclePollClosed,
  openCirclePolls,
  subscribeCirclePollVotes,
  normalizeMemberRole,
  type CircleMemberThreadPost,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { useCircleMemberThread } from '../hooks/useCircleMemberThread';
import { useCirclePatientMemberLanguages } from '../hooks/useCirclePatientMemberLanguages';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import { DASHBOARD_RECENCY_TINT_CLASSES } from '../lib/circleDashboardStats';
import { dashboardTileTitleClass } from '../lib/circleSectionStyles';
import { circlePollInboxBadgeLabel } from '../lib/circlePostInboxI18n';
import { resolveStoredMessageText } from '../lib/messageTranslationDisplay';
import { cn } from '../lib/utils';
import { formatCircleBadgeCount } from './CircleCountBadge';
import { CirclePollPost } from './CirclePollPost';

const HOME_POLL_VOTE_LISTEN_MAX = 10;

type CircleHomePollBannerProps = {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
};

function useHomePollVotedIds(
  db: Firestore,
  patientId: string,
  uid: string,
  polls: CircleMemberThreadPost[],
): Record<string, boolean> {
  const [votedById, setVotedById] = useState<Record<string, boolean>>({});
  const listenKey = polls
    .slice(0, HOME_POLL_VOTE_LISTEN_MAX)
    .map((post) => post.id)
    .join('|');

  useEffect(() => {
    const watched = polls.slice(0, HOME_POLL_VOTE_LISTEN_MAX);
    if (watched.length === 0) {
      setVotedById({});
      return;
    }
    const unsubs = watched.map((post) =>
      subscribeCirclePollVotes(db, patientId, post.threadKind, post.id, (votes) => {
        setVotedById((current) => ({
          ...current,
          [post.id]: votes.some((vote) => vote.uid === uid),
        }));
      }),
    );
    return () => {
      for (const unsub of unsubs) unsub();
    };
    // polls is represented by listenKey so we do not resubscribe on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listenKey captures poll ids
  }, [db, listenKey, patientId, uid]);

  return votedById;
}

export function CircleHomePollBanner({ user, db, patient }: CircleHomePollBannerProps) {
  const t = useCircleT();
  const { language: viewerLanguage } = useCircleI18nContext();
  const memberRole = normalizeMemberRole(patient.role);
  const canOpen = canParticipateInCircleOpenThread(memberRole);
  const canRestricted = canSeeCircleRestrictedThread(memberRole);
  const { posts: openPosts } = useCircleMemberThread(db, patient.patientId, 'open', canOpen, user.uid);
  const { posts: restrictedPosts } = useCircleMemberThread(
    db,
    patient.patientId,
    'restricted',
    canRestricted,
    user.uid,
  );
  const memberLanguages = useCirclePatientMemberLanguages(db, patient.patientId, user.uid, {
    pendingProvision: patient.isPendingProvision === true,
  });
  const [expanded, setExpanded] = useState(false);
  const [closeTick, setCloseTick] = useState(0);

  const visiblePosts = useMemo(
    () => [...openPosts, ...(canRestricted ? restrictedPosts : [])],
    [canRestricted, openPosts, restrictedPosts],
  );
  const polls = useMemo(() => openCirclePolls(visiblePosts), [closeTick, visiblePosts]);
  const pollIdsKey = polls.map((row) => row.id).join('|');
  const post = polls[0] ?? null;
  const votedById = useHomePollVotedIds(db, patient.patientId, user.uid, polls);
  const unvotedCount = polls.filter((row) => votedById[row.id] !== true).length;
  const multiple = polls.length > 1;

  useEffect(() => {
    setExpanded(false);
  }, [pollIdsKey]);

  useEffect(() => {
    const nextClose = polls
      .map((row) => row.pollClosesAt)
      .filter((value): value is number => typeof value === 'number' && value > Date.now())
      .sort((a, b) => a - b)[0];
    if (!nextClose) return;
    const wait = Math.min(Math.max(nextClose - Date.now() + 50, 250), 60_000);
    const id = window.setTimeout(() => setCloseTick((n) => n + 1), wait);
    return () => window.clearTimeout(id);
  }, [polls, closeTick]);

  if (!post || isCirclePollClosed(post)) return null;

  const question = resolveStoredMessageText(
    { text: post.text, translations: post.translations },
    viewerLanguage,
  );
  const translationTargetLanguages = [
    ...new Set(Object.values(memberLanguages.byUid)),
  ] as CircleUiLanguage[];
  const recencyTint = unvotedCount > 0 ? 'orange' : 'green';

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden',
        multiple ? DASHBOARD_RECENCY_TINT_CLASSES[recencyTint] : 'border-blue-200 bg-blue-50',
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          'w-full text-left px-4 py-3.5 transition-colors',
          multiple
            ? 'flex flex-col sm:flex-row sm:items-stretch gap-3'
            : 'flex items-start gap-3 hover:bg-blue-100/70',
        )}
        aria-expanded={expanded}
      >
        {multiple ? (
          <>
            <div className="flex flex-col gap-2 min-w-0 sm:flex-1 sm:justify-between">
              <div className="flex items-center gap-2 w-full min-w-0">
                <BarChart3 size={16} className="shrink-0 text-blue-600" aria-hidden />
                <span className={cn(dashboardTileTitleClass, 'truncate')}>
                  {t('circle.homePollsTitle')}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-snug">
                {expanded ? t('circle.pollHideVotes') : t('circle.homePollsHint')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 w-full items-start sm:w-56 sm:shrink-0 sm:pl-4 sm:border-l sm:border-slate-200/80">
              <div className="min-w-0">
                <p className="font-bold tabular-nums leading-none text-3xl text-slate-800">
                  {formatCircleBadgeCount(polls.length)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 leading-snug">
                  {t('circle.homePollsActive')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="font-bold tabular-nums leading-none text-3xl text-slate-800">
                  {formatCircleBadgeCount(unvotedCount)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 leading-snug">
                  {t('circle.homePollsUnvoted')}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <BarChart3 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700/80">
                {circlePollInboxBadgeLabel(t, post)}
                {post.threadKind === 'restricted' ? ` · ${t('circle.threadLabelRestricted')}` : ''}
              </p>
              <p className="font-semibold text-slate-800 text-sm mt-1.5 leading-snug">
                {question.displayText}
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-800 shrink-0 mt-1 inline-flex items-center gap-1">
              {expanded ? t('circle.pollHideVotes') : t('circle.pollSeeVotes')}
              {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
            </span>
          </>
        )}
      </button>
      {expanded ? (
        <div className={cn('px-4 pb-4 space-y-4', multiple && 'pt-1')}>
          {polls.map((row) => (
            <div
              key={row.id}
              className={cn(multiple && 'rounded-xl border border-slate-200/80 bg-white/80 p-3')}
            >
              {multiple && row.threadKind === 'restricted' ? (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  {t('circle.threadLabelRestricted')}
                </p>
              ) : null}
              <CirclePollPost
                post={row}
                db={db}
                patientId={patient.patientId}
                memberUid={user.uid}
                memberDisplayName={user.displayName || undefined}
                isProxy={memberRole === 'proxy'}
                memberRole={memberRole}
                isOwn={row.authorUid === user.uid}
                viewerLanguage={viewerLanguage}
                translationTargetLanguages={translationTargetLanguages}
                t={t}
                hideQuestion={!multiple}
                allowEdit={false}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
