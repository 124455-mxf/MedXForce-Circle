import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Check, Copy, Loader2, Shield, Trash2, Users } from 'lucide-react';
import {
  canDeleteCircleThreadPostForEveryone,
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  createCircleMemberThreadPost,
  deleteCircleThreadPostForEveryone,
  hideCircleThreadPostForUser,
  isVisitCaptureThreadPost,
  type CircleMemberRole,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import {
  circleThreadDescriptionI18n,
  circleThreadLabelI18n,
  formatCirclePostTime,
  formatCircleThreadActionError,
  translateCircleMemberRole,
} from '../lib/circleScreenI18n';
import {
  circleCompactCardClass,
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionComposerClass,
  circleSectionContextHintClass,
  circleSectionEmptyStateClass,
  circleSectionHeaderClass,
  circleSectionHeaderStackClass,
  circleSectionPanelClass,
  circleSectionSubtitleClass,
  circleSectionTitleClass,
  circleTabButtonClass,
  circleTabListClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { useCircleMemberThread } from '../hooks/useCircleMemberThread';
import { useCircleThreadSortOrder } from '../hooks/useCircleThreadSortOrder';
import {
  getCircleThreadLastReadAt,
  markCircleThreadRead,
  subscribeCircleThreadRead,
} from '../lib/circleMemberThreadRead';
import { writeCircleThreadPostToClipboard } from '../lib/circleThreadClipboard';
import { CircleExpandableMessageComposer } from './CircleExpandableMessageComposer';
import { CircleMessageDeleteConfirmModal } from './CircleMessageDeleteConfirmModal';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { ResponsiveTabLabel } from './ResponsiveTabLabel';

interface CircleCircleScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  unreadCount: number;
  openUnreadCount: number;
  restrictedUnreadCount: number;
}

function useCircleThreadLastRead(
  patientId: string,
  userId: string,
  threadKind: CircleMemberThreadKind,
): number {
  return useSyncExternalStore(
    subscribeCircleThreadRead,
    () => getCircleThreadLastReadAt(patientId, userId, threadKind),
    () => 0,
  );
}

import { CircleTabCountBadge, formatCircleBadgeCount } from './CircleCountBadge';

const CIRCLE_THREAD_POST_PREVIEW_LENGTH = 200;

function CircleThreadPostText({
  text,
  t,
}: {
  text: string;
  t: ReturnType<typeof useCircleT>;
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = text.length > CIRCLE_THREAD_POST_PREVIEW_LENGTH;

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  const displayText =
    !shouldCollapse || expanded
      ? text
      : `${text.slice(0, CIRCLE_THREAD_POST_PREVIEW_LENGTH).trimEnd()}…`;

  return (
    <div className="pl-1">
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          {expanded ? t('circle.showLess') : t('circle.showMore')}
        </button>
      ) : null}
    </div>
  );
}

function ThreadPostCard({
  post,
  isOwn,
  ownRoleLabel,
  highlightAsUnread = false,
  canDeleteForEveryone = false,
  onHide,
  onDeleteForEveryone,
  t,
}: {
  post: CircleMemberThreadPost;
  isOwn: boolean;
  ownRoleLabel: string;
  highlightAsUnread?: boolean;
  canDeleteForEveryone?: boolean;
  onHide: () => void;
  onDeleteForEveryone?: () => void;
  t: ReturnType<typeof useCircleT>;
}) {
  const [copied, setCopied] = useState(false);
  const isVisitCapture = isVisitCaptureThreadPost(post);

  const handleCopyPost = useCallback(async () => {
    try {
      await writeCircleThreadPostToClipboard(post);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [post]);

  return (
    <div
      data-post-id={post.id}
      className={cn(
        circleCompactCardClass,
        'relative overflow-hidden group/post',
        highlightAsUnread
          ? 'bg-red-50/40 border-red-200'
          : isOwn
            ? 'bg-blue-50/50 border-blue-100'
            : 'bg-white border-slate-100',
      )}
    >
      <div
        className={cn(
          'absolute top-0 left-0 w-1 h-full',
          highlightAsUnread ? 'bg-red-500' : isOwn ? 'bg-blue-400' : 'bg-indigo-300',
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 mb-2 pl-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {highlightAsUnread && (
              <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                {t('circle.badgeNew')}
              </span>
            )}
            <p className={cn('text-xs font-bold', isOwn ? 'text-blue-700' : 'text-slate-800')}>
              {isOwn ? t('circle.you') : post.authorName}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
            {isOwn ? ownRoleLabel : translateCircleMemberRole(t, post.authorRole)}
          </p>
        </div>
        <div className="flex items-start gap-1 shrink-0">
          <span className="text-[10px] text-slate-400 tabular-nums pt-0.5">
            {formatCirclePostTime(t, post.createdAt)}
          </span>
          <button
            type="button"
            onClick={() => void handleCopyPost()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 transition-opacity"
            aria-label={
              copied
                ? t('circle.messageCopied')
                : isVisitCapture
                  ? t('circle.copyVisitCapture')
                  : t('circle.copyMessage')
            }
            title={
              copied
                ? t('circle.copied')
                : isVisitCapture
                  ? t('circle.copySummaryTranscript')
                  : t('circle.copyMessage')
            }
          >
            {copied ? (
              <Check size={14} className="text-emerald-600" aria-hidden />
            ) : (
              <Copy size={14} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={onHide}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/80 opacity-100 sm:opacity-0 sm:group-hover/post:opacity-100 transition-opacity"
            aria-label={t('circle.removeFromView')}
          >
            <Trash2 size={14} />
          </button>
          {canDeleteForEveryone && onDeleteForEveryone && (
            <button
              type="button"
              onClick={onDeleteForEveryone}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 opacity-100 sm:opacity-0 sm:group-hover/post:opacity-100 transition-opacity"
              aria-label={t('circle.deleteForEveryone')}
              title={t('circle.deleteForEveryone')}
            >
              <Trash2 size={14} className="fill-current" />
            </button>
          )}
        </div>
      </div>
      <CircleThreadPostText text={post.text} t={t} />
    </div>
  );
}

function formatCircleThreadActionErrorLocalized(
  t: ReturnType<typeof useCircleT>,
  err: unknown,
  fallbackKey: 'circle.hideFailed' | 'circle.deleteFailed',
): string {
  return formatCircleThreadActionError(t, err, fallbackKey);
}

export function CircleCircleScreen({
  user,
  db,
  patient,
  unreadCount,
  openUnreadCount,
  restrictedUnreadCount,
}: CircleCircleScreenProps) {
  const t = useCircleT();
  const memberRole = patient.role as CircleMemberRole;
  const ownRoleLabel = translateCircleMemberRole(t, memberRole);
  const isProxy = patient.role === 'proxy' && !!patient.capabilities.inviteMembers;
  const canOpen = canParticipateInCircleOpenThread(memberRole);
  const canRestricted = canSeeCircleRestrictedThread(memberRole);

  const [activeThread, setActiveThread] = useState<CircleMemberThreadKind>('open');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hideTarget, setHideTarget] = useState<CircleMemberThreadPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CircleMemberThreadPost | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToLatestPostPendingRef = useRef(false);
  const compactChrome = useCircleCompactChrome();
  const threadSort = useCircleThreadSortOrder();

  const activeThreadLastRead = useCircleThreadLastRead(
    patient.patientId,
    user.uid,
    activeThread,
  );

  const activeUnreadCount =
    activeThread === 'open' ? openUnreadCount : restrictedUnreadCount;

  const handleMarkAllRead = useCallback(() => {
    markCircleThreadRead(patient.patientId, user.uid, activeThread);
  }, [activeThread, patient.patientId, user.uid]);

  useEffect(() => {
    if (!canRestricted && activeThread === 'restricted') {
      setActiveThread('open');
    }
  }, [activeThread, canRestricted]);

  const threadEnabled = activeThread === 'open' ? canOpen : canRestricted;

  const { loading, error, posts } = useCircleMemberThread(
    db,
    patient.patientId,
    activeThread,
    threadEnabled,
    user.uid,
  );

  const authorName = useMemo(
    () => user.displayName?.trim() || user.email?.split('@')[0] || t('circle.circleMemberFallback'),
    [t, user.displayName, user.email],
  );

  const orderedPosts = useMemo(() => {
    if (threadSort === 'newest') return [...posts].reverse();
    return posts;
  }, [posts, threadSort]);

  const recentContext = useMemo(
    () =>
      posts
        .slice(-6)
        .map((p) => `${p.authorName}: ${p.text}`)
        .join('\n'),
    [posts],
  );

  const newestPostId = posts.at(-1)?.id;

  const scrollTargetPostId = useMemo(() => {
    const unreadFromOthers = posts.filter(
      (post) => post.authorUid !== user.uid && post.createdAt > activeThreadLastRead,
    );
    if (threadSort === 'newest') {
      return unreadFromOthers.at(-1)?.id ?? newestPostId;
    }
    return unreadFromOthers[0]?.id ?? newestPostId;
  }, [activeThreadLastRead, newestPostId, posts, threadSort, user.uid]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || posts.length === 0) return;

    const scrollPostToStart = (postId: string) => {
      const node = el.querySelector(`[data-post-id="${postId}"]`);
      if (node) {
        node.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    };

    requestAnimationFrame(() => {
      if (scrollToLatestPostPendingRef.current) {
        scrollToLatestPostPendingRef.current = false;
        if (newestPostId) scrollPostToStart(newestPostId);
        return;
      }

      if (scrollTargetPostId) {
        scrollPostToStart(scrollTargetPostId);
      }
    });
  }, [
    activeThread,
    loading,
    newestPostId,
    posts.length,
    scrollTargetPostId,
    threadSort,
  ]);

  useEffect(() => {
    if (!patient.patientId || !user.uid) return;

    return () => {
      if (activeThread === 'open' && canOpen) {
        markCircleThreadRead(patient.patientId, user.uid, 'open');
      }
      if (activeThread === 'restricted' && canRestricted) {
        markCircleThreadRead(patient.patientId, user.uid, 'restricted');
      }
    };
  }, [activeThread, canOpen, canRestricted, patient.patientId, user.uid]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !threadEnabled) return;
    setSending(true);
    setSendError(null);
    try {
      await createCircleMemberThreadPost(db, {
        patientId: patient.patientId,
        threadKind: activeThread,
        authorUid: user.uid,
        authorName,
        authorRole: memberRole,
        text,
      });
      scrollToLatestPostPendingRef.current = true;
      setDraft('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('circle.sendFailed'));
    } finally {
      setSending(false);
    }
  }, [
    activeThread,
    authorName,
    db,
    draft,
    memberRole,
    patient.patientId,
    sending,
    threadEnabled,
    user.uid,
  ]);

  const confirmHide = useCallback(async () => {
    if (!hideTarget) return;
    setActionPending(true);
    setActionError(null);
    try {
      await hideCircleThreadPostForUser(
        db,
        patient.patientId,
        user.uid,
        activeThread,
        hideTarget.id,
      );
      setHideTarget(null);
    } catch (err) {
      setActionError(formatCircleThreadActionErrorLocalized(t, err, 'circle.hideFailed'));
    } finally {
      setActionPending(false);
    }
  }, [activeThread, db, hideTarget, patient.patientId, user.uid]);

  const confirmDeleteForEveryone = useCallback(async () => {
    if (!deleteTarget) return;
    setActionPending(true);
    setActionError(null);
    try {
      await deleteCircleThreadPostForEveryone(
        db,
        patient.patientId,
        activeThread,
        deleteTarget.id,
      );
      setDeleteTarget(null);
    } catch (err) {
      setActionError(formatCircleThreadActionErrorLocalized(t, err, 'circle.deleteFailed'));
    } finally {
      setActionPending(false);
    }
  }, [activeThread, db, deleteTarget, patient.patientId]);

  if (!canOpen) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
        <p className="text-sm text-slate-500 leading-relaxed">{t('circle.unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleSectionHeaderClass, circleSectionHeaderStackClass, compactChrome && 'p-3 space-y-2')}>
          <div className="flex items-start justify-between gap-2">
            <CircleWorkTabSectionIntro
              icon={Users}
              iconClassName="text-indigo-600"
              title={t('circle.title')}
              subtitle={t('circle.subtitle')}
              titleExtra={
                unreadCount > 0 ? (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                    {t('circle.unreadBadge', { count: formatCircleBadgeCount(unreadCount) })}
                  </span>
                ) : undefined
              }
            />
          </div>

          <div className={circleTabListClass} role="tablist" aria-label={t('circle.threadsAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeThread === 'open'}
              onClick={() => setActiveThread('open')}
              className={circleTabButtonClass(activeThread === 'open')}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Users size={14} className="shrink-0 [@media(max-height:740px)]:hidden" />
                <ResponsiveTabLabel long={t('circle.tabCircleLong')} compact={t('circle.tabCircleCompact')} />
                <CircleTabCountBadge count={openUnreadCount} />
              </span>
            </button>
            {canRestricted && (
              <button
                type="button"
                role="tab"
                aria-selected={activeThread === 'restricted'}
                onClick={() => setActiveThread('restricted')}
                className={circleTabButtonClass(activeThread === 'restricted')}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Shield size={14} className="shrink-0 [@media(max-height:740px)]:hidden" />
                  <ResponsiveTabLabel
                    long={t('circle.tabCareCoordinationLong')}
                    compact={t('circle.tabCareCoordinationCompact')}
                  />
                  <CircleTabCountBadge count={restrictedUnreadCount} />
                </span>
              </button>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <p className={cn(circleSectionContextHintClass, 'flex-1 min-w-0')}>
              {circleThreadDescriptionI18n(t, activeThread)}
            </p>
            {activeUnreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:text-red-900 px-2 py-1 rounded-lg hover:bg-red-100/80"
              >
                {t('circle.markAllRead')}
              </button>
            )}
          </div>
        </div>

        <div ref={scrollRef} className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass)}>
          {(error || sendError) && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error || sendError}
            </p>
          )}

          {loading ? (
            <div className="py-12 flex justify-center text-slate-400 [@media(max-height:740px)]:py-8">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className={circleSectionEmptyStateClass}>
              <p className="text-sm font-bold text-slate-700">
                {circleThreadLabelI18n(t, activeThread)}
              </p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto [@media(max-height:740px)]:mt-1 [@media(max-height:740px)]:text-xs">
                {t('circle.emptyHint')}
              </p>
            </div>
          ) : (
            orderedPosts.map((post) => {
              const isOwn = post.authorUid === user.uid;
              const highlightAsUnread =
                !isOwn && post.createdAt > activeThreadLastRead;
              const canDeleteForEveryone = canDeleteCircleThreadPostForEveryone(post, {
                uid: user.uid,
                isProxy,
              });
              return (
                <ThreadPostCard
                  key={post.id}
                  post={post}
                  isOwn={isOwn}
                  ownRoleLabel={ownRoleLabel}
                  highlightAsUnread={highlightAsUnread}
                  canDeleteForEveryone={canDeleteForEveryone}
                  onHide={() => {
                    setActionError(null);
                    setHideTarget(post);
                  }}
                  onDeleteForEveryone={
                    canDeleteForEveryone
                      ? () => {
                          setActionError(null);
                          setDeleteTarget(post);
                        }
                      : undefined
                  }
                  t={t}
                />
              );
            })
          )}
        </div>

        <div className={circleSectionComposerClass}>
          <CircleExpandableMessageComposer
            value={draft}
            onChange={setDraft}
            placeholder={
              activeThread === 'open'
                ? t('circle.composerPlaceholderCircle')
                : t('circle.composerPlaceholderCareTeam')
            }
            disabled={sending}
            sending={sending}
            onClear={() => setDraft('')}
            onSend={handleSend}
            clearLabel={t('circle.clear')}
            sendLabel={t('circle.sendToEveryone')}
            sendingLabel={t('circle.sending')}
            maxLength={5000}
            expandTitle={
              activeThread === 'open'
                ? t('circle.expandTitleCircle')
                : t('circle.expandTitleCareTeam')
            }
            aiGuidance={{
              threadLabel: circleThreadLabelI18n(t, activeThread),
              memberRole,
              recentContext: recentContext || undefined,
            }}
          />
        </div>
      </div>

      <CircleMessageDeleteConfirmModal
        open={!!hideTarget}
        onClose={() => {
          if (actionPending) return;
          setHideTarget(null);
          setActionError(null);
        }}
        onConfirm={() => void confirmHide()}
        isDeleting={actionPending}
        errorMessage={actionError}
        title={t('circle.hideTitle')}
        description={t('circle.hideDescription')}
        confirmLabel={t('circle.hideConfirm')}
      />

      <CircleMessageDeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (actionPending) return;
          setDeleteTarget(null);
          setActionError(null);
        }}
        onConfirm={() => void confirmDeleteForEveryone()}
        isDeleting={actionPending}
        errorMessage={actionError}
        title={t('circle.deleteTitle')}
        description={
          deleteTarget && deleteTarget.authorUid === user.uid
            ? t('circle.deleteDescriptionOwn')
            : t('circle.deleteDescriptionProxy')
        }
        confirmLabel={t('circle.deleteConfirm')}
      />
    </div>
  );
}
