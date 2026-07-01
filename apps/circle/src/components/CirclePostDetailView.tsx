import { useCallback, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { Check, ChevronLeft, Copy, Loader2, Maximize2, Trash2 } from 'lucide-react';
import {
  isDropInThreadPost,
  isVisitCaptureThreadPost,
  type CircleMemberThreadPost,
  type CircleMemberThreadPostReply,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { formatCirclePostTime, translateCircleMemberRole } from '../lib/circleScreenI18n';
import {
  circlePostDetailSubtitle,
  circlePostInboxTitle,
} from '../lib/circlePostInboxI18n';
import { writeCircleThreadPostToClipboard } from '../lib/circleThreadClipboard';
import { CircleExpandableMessageComposer } from './CircleExpandableMessageComposer';
import { CircleMemberReplyCard } from './CircleMemberReplyCard';
import { CircleMessageExpandOverlay } from './CircleMessageExpandOverlay';
import { CirclePatientLanguagePill } from './CirclePatientLanguagePill';
import { CirclePostBodyRenderer } from './CirclePostBodyRenderer';
import { circleSectionComposerClass, circleSectionPanelClass } from '../lib/circleSectionStyles';

function circleReplyCountLabel(t: CircleTranslator, count: number): string {
  return t(count === 1 ? 'circle.reply_one' : 'circle.reply_other', { count });
}

function circleRepliesErrorMessage(t: CircleTranslator, error: string): string {
  if (/permission|insufficient/i.test(error)) {
    return t('circle.repliesPermissionDenied');
  }
  return t('circle.repliesLoadFailed');
}

export function CirclePostDetailView({
  post,
  isOwn,
  ownRoleLabel,
  viewerLanguage,
  patientLanguage,
  highlightAsUnread,
  readOnlyAnnouncement = false,
  canReply = false,
  replies = [],
  repliesLoading = false,
  repliesError = null,
  replyDraft = '',
  replySending = false,
  replySendError = null,
  currentUserUid,
  threadLastReadAt = 0,
  onReplyDraftChange,
  onSendReply,
  canDeleteForEveryone,
  onBack,
  onHide,
  onRestore,
  onDeleteForEveryone,
  t,
  db,
  patientId,
  memberContactId,
  memberDocContactId,
  inviteContactId,
  memberDisplayName,
  memberRole,
}: {
  post: CircleMemberThreadPost;
  isOwn: boolean;
  ownRoleLabel: string;
  viewerLanguage: CircleUiLanguage;
  patientLanguage: string | null;
  highlightAsUnread?: boolean;
  readOnlyAnnouncement?: boolean;
  canReply?: boolean;
  replies?: CircleMemberThreadPostReply[];
  repliesLoading?: boolean;
  repliesError?: string | null;
  replyDraft?: string;
  replySending?: boolean;
  replySendError?: string | null;
  currentUserUid: string;
  threadLastReadAt?: number;
  onReplyDraftChange?: (value: string) => void;
  onSendReply?: () => void;
  canDeleteForEveryone?: boolean;
  onBack: () => void;
  onHide?: () => void;
  onRestore?: () => void;
  onDeleteForEveryone?: () => void;
  t: CircleTranslator;
  db?: Firestore;
  patientId?: string;
  memberContactId?: string;
  memberDocContactId?: string;
  inviteContactId?: string;
  memberDisplayName?: string;
  memberRole?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const isVisitCapture = isVisitCaptureThreadPost(post);
  const isDropIn = isDropInThreadPost(post);
  const showPatientLanguagePill = isDropIn || isVisitCapture;
  const title = circlePostInboxTitle(t, post, viewerLanguage, currentUserUid);
  const showReplies = canReply || replies.length > 0;

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
    <>
      <div className={cn(circleSectionPanelClass, 'max-h-full flex flex-col')}>
        <div
          className={cn(
            'shrink-0 border-b',
            highlightAsUnread ? 'bg-red-50/40 border-red-200' : 'bg-white/90 border-slate-100',
          )}
        >
          <div className="flex items-start gap-2 px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
              aria-label={t('circle.backToInbox')}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-800 line-clamp-2 leading-snug min-w-0 flex-1">
                  {title}
                </p>
                {showPatientLanguagePill && patientLanguage ? (
                  <CirclePatientLanguagePill
                    language={patientLanguage}
                    title={t('messages.patientLanguagePillTitle')}
                  />
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {formatCirclePostTime(t, post.createdAt)}
                {' · '}
                {circlePostDetailSubtitle(t, post, isOwn, ownRoleLabel)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
              aria-label={t('circle.expandMessage')}
              title={t('circle.expandMessage')}
            >
              <Maximize2 size={18} />
            </button>
            {onRestore ? (
              <button
                type="button"
                onClick={onRestore}
                className="px-2.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide text-indigo-700 hover:bg-indigo-50 shrink-0"
              >
                {t('circle.restoreToInbox')}
              </button>
            ) : onHide ? (
              <button
                type="button"
                onClick={onHide}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                aria-label={t('circle.removeFromView')}
              >
                <Trash2 size={18} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {readOnlyAnnouncement ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              {t('circle.announcementReadOnlyHint')}
            </p>
          ) : null}
          <CirclePostBodyRenderer
            post={post}
            isOwn={isOwn}
            viewerLanguage={viewerLanguage}
            t={t}
            disableTruncate
            db={db}
            patientId={patientId}
            memberUid={currentUserUid}
            memberContactId={memberContactId}
            memberDocContactId={memberDocContactId}
            inviteContactId={inviteContactId}
            memberDisplayName={memberDisplayName}
            memberRole={memberRole}
          />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyPost()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? t('circle.copied') : t('circle.copyMessage')}
            </button>
            {canDeleteForEveryone && onDeleteForEveryone ? (
              <button
                type="button"
                onClick={onDeleteForEveryone}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} />
                {t('circle.deleteForEveryone')}
              </button>
            ) : null}
          </div>

          {showReplies ? (
            <div className="mt-8 space-y-3">
              {replies.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                      {circleReplyCountLabel(t, replies.length)}
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  {replies.map((reply) => {
                    const replyIsOwn = reply.authorUid === currentUserUid;
                    const replyUnread =
                      !replyIsOwn &&
                      reply.createdAt > threadLastReadAt &&
                      reply.createdAt > post.createdAt;
                    return (
                      <CircleMemberReplyCard
                        key={reply.id}
                        reply={reply}
                        isOwn={replyIsOwn}
                        highlightAsUnread={replyUnread}
                        viewerLanguage={viewerLanguage}
                        t={t}
                      />
                    );
                  })}
                </>
              ) : repliesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={22} className="animate-spin text-indigo-500" />
                </div>
              ) : null}
              {repliesError ? (
                <p className="text-sm text-red-600">{circleRepliesErrorMessage(t, repliesError)}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {canReply && onSendReply && onReplyDraftChange ? (
          <div className={circleSectionComposerClass}>
            {replySendError ? (
              <p className="text-xs text-red-600 mb-2 px-1">{replySendError}</p>
            ) : null}
            <CircleExpandableMessageComposer
              value={replyDraft}
              onChange={onReplyDraftChange}
              placeholder={t('circle.replyPlaceholder')}
              disabled={replySending}
              sending={replySending}
              onClear={() => onReplyDraftChange('')}
              onSend={onSendReply}
              clearLabel={t('circle.clear')}
              sendLabel={t('circle.sendReply')}
              sendingLabel={t('circle.sending')}
              maxLength={5000}
              expandTitle={t('circle.expandReplyTitle')}
            />
          </div>
        ) : null}
      </div>

      <CircleMessageExpandOverlay
        open={expandedOpen}
        title={title}
        subtitle={
          isOwn
            ? ownRoleLabel
            : `${translateCircleMemberRole(t, post.authorRole)} · ${formatCirclePostTime(t, post.createdAt)}`
        }
        onClose={() => setExpandedOpen(false)}
        t={t}
      >
        <CirclePostBodyRenderer
          post={post}
          isOwn={isOwn}
          viewerLanguage={viewerLanguage}
          t={t}
          disableTruncate
          db={db}
          patientId={patientId}
          memberUid={currentUserUid}
          memberContactId={memberContactId}
          memberDocContactId={memberDocContactId}
          inviteContactId={inviteContactId}
          memberDisplayName={memberDisplayName}
          memberRole={memberRole}
        />
      </CircleMessageExpandOverlay>
    </>
  );
}
