import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Languages } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import {
  canCloseCirclePoll,
  canEditCirclePoll,
  canReplyToCircleMemberThreadPost,
  castCirclePollVote,
  closeCirclePoll,
  createCircleMemberThreadPostReply,
  formatCirclePollResultsTally,
  isCirclePollClosed,
  normalizeMemberRole,
  subscribeCirclePollVotes,
  tallyCirclePollVotes,
  updateCirclePoll,
  type CircleMemberThreadPost,
  type CirclePollVote,
} from '@medxforce/shared';
import type { CircleUiLanguage } from '../lib/circleLanguages';
import type { CircleTranslator } from '../lib/circleI18nContext';
import { formatCirclePollClosesAt } from '../lib/circleScreenI18n';
import { buildCirclePollTranslations, buildCircleThreadPostTranslations } from '../lib/circleThreadPostTranslate';
import {
  resolveStoredMessageText,
  resolveStoredPollDescription,
  resolveStoredPollOptions,
} from '../lib/messageTranslationDisplay';
import { cn } from '../lib/utils';
import { CirclePollComposer } from './CirclePollComposer';

export function CirclePollPost({
  post,
  db,
  patientId,
  memberUid,
  memberDisplayName,
  isProxy,
  memberRole,
  isOwn = false,
  viewerLanguage,
  translationTargetLanguages = [],
  t,
  hideQuestion = false,
  allowEdit = true,
}: {
  post: CircleMemberThreadPost;
  db: Firestore;
  patientId: string;
  memberUid: string;
  memberDisplayName?: string;
  isProxy?: boolean;
  memberRole?: string;
  isOwn?: boolean;
  viewerLanguage: CircleUiLanguage;
  translationTargetLanguages?: CircleUiLanguage[];
  t: CircleTranslator;
  hideQuestion?: boolean;
  allowEdit?: boolean;
}) {
  const originalOptions = post.pollOptions ?? [];
  const closed = isCirclePollClosed(post);
  const closesAt = post.pollClosesAt;
  const closedAt = post.pollClosedAt || (closed ? post.pollClosesAt : undefined);
  const [votes, setVotes] = useState<CirclePollVote[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    return subscribeCirclePollVotes(db, patientId, post.threadKind, post.id, setVotes, (message) =>
      setError(message),
    );
  }, [db, patientId, post.id, post.threadKind]);

  useEffect(() => {
    setShowOriginal(false);
  }, [post.text, post.translations, post.pollOptions, post.pollDescription, viewerLanguage]);

  const questionResolved = useMemo(
    () => resolveStoredMessageText({ text: post.text, translations: post.translations }, viewerLanguage),
    [post.text, post.translations, viewerLanguage],
  );
  const optionsResolved = useMemo(
    () =>
      resolveStoredPollOptions(
        { pollOptions: originalOptions, translations: post.translations },
        viewerLanguage,
      ),
    [originalOptions, post.translations, viewerLanguage],
  );

  const descriptionResolved = useMemo(
    () =>
      resolveStoredPollDescription(
        { pollDescription: post.pollDescription, translations: post.translations },
        viewerLanguage,
      ),
    [post.pollDescription, post.translations, viewerLanguage],
  );

  const hasStoredTranslation =
    !isOwn &&
    (questionResolved.hasTranslation ||
      optionsResolved.hasTranslation ||
      descriptionResolved.hasTranslation);
  const questionText =
    isOwn || showOriginal ? questionResolved.originalText : questionResolved.displayText;
  const descriptionText =
    isOwn || showOriginal ? descriptionResolved.originalText : descriptionResolved.displayText;
  const options =
    isOwn || showOriginal ? optionsResolved.originalOptions : optionsResolved.displayOptions;

  const counts = useMemo(() => tallyCirclePollVotes(options.length, votes), [options.length, votes]);
  const total = votes.length;
  const myVote = votes.find((vote) => vote.uid === memberUid);
  const canClose = canCloseCirclePoll(post, memberUid, isProxy === true);
  const canEdit = canEditCirclePoll(post, memberUid);
  const hasVotes = total > 0;

  const handleVote = async (optionIndex: number) => {
    if (closed || saving || myVote?.optionIndex === optionIndex) return;
    setSaving(true);
    setError(null);
    try {
      await castCirclePollVote(db, {
        patientId,
        threadKind: post.threadKind,
        postId: post.id,
        uid: memberUid,
        voterName: memberDisplayName || 'Circle member',
        optionIndex,
        optionCount: originalOptions.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('circle.pollVoteFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!canClose || saving) return;
    setSaving(true);
    setError(null);
    try {
      await closeCirclePoll(db, {
        patientId,
        threadKind: post.threadKind,
        postId: post.id,
      });
      const closerRole = normalizeMemberRole(memberRole || (isProxy ? 'proxy' : 'family'));
      if (!canReplyToCircleMemberThreadPost(post, closerRole, post.threadKind)) return;
      const tally = formatCirclePollResultsTally(originalOptions, counts);
      const text =
        total === 0
          ? t('circle.pollResultsReplyNone')
          : t('circle.pollResultsReply', { tally: tally || '—' });
      let translations: Awaited<ReturnType<typeof buildCircleThreadPostTranslations>> = [];
      try {
        translations = await buildCircleThreadPostTranslations(
          text,
          viewerLanguage,
          translationTargetLanguages,
        );
      } catch {
        translations = [];
      }
      try {
        await createCircleMemberThreadPostReply(db, {
          patientId,
          threadKind: post.threadKind,
          postId: post.id,
          post,
          authorUid: memberUid,
          authorName: memberDisplayName || 'Circle member',
          authorRole: closerRole,
          text,
          ...(translations.length > 0 ? { translations } : {}),
        });
      } catch (replyErr) {
        const message = replyErr instanceof Error ? replyErr.message : '';
        if (translations.length > 0 && /permission-denied|insufficient permissions/i.test(message)) {
          await createCircleMemberThreadPostReply(db, {
            patientId,
            threadKind: post.threadKind,
            postId: post.id,
            post,
            authorUid: memberUid,
            authorName: memberDisplayName || 'Circle member',
            authorRole: closerRole,
            text,
          });
          return;
        }
        setError(t('circle.pollResultsReplyFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('circle.pollCloseFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = useCallback(
    async (question: string, nextOptions: string[], nextClosesAt: number, nextDescription: string) => {
      setEditSaving(true);
      setEditError(null);
      try {
        const translations = hasVotes
          ? undefined
          : await buildCirclePollTranslations(
              question,
              nextOptions,
              viewerLanguage,
              translationTargetLanguages,
              nextDescription,
            );
        await updateCirclePoll(db, {
          patientId,
          threadKind: post.threadKind,
          postId: post.id,
          hasVotes,
          closesAt: nextClosesAt,
          question,
          options: nextOptions,
          description: nextDescription,
          translations,
        });
        setEditing(false);
      } catch (err) {
        setEditError(err instanceof Error ? err.message : t('circle.pollEditFailed'));
      } finally {
        setEditSaving(false);
      }
    },
    [
      db,
      hasVotes,
      patientId,
      post.id,
      post.threadKind,
      t,
      translationTargetLanguages,
      viewerLanguage,
    ],
  );

  return (
    <div className="space-y-3">
      {hideQuestion ? null : (
        <p className="text-base font-semibold text-slate-800 leading-snug">{questionText}</p>
      )}
      {descriptionText ? (
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{descriptionText}</p>
      ) : null}
      <div
        className={cn(
          'space-y-2',
          closed ? 'rounded-2xl border border-sky-200 bg-sky-50/70 p-3' : null,
        )}
      >
        {closed ? (
          <div className="flex items-center gap-2 px-0.5 pb-1">
            <span className="w-7 h-7 rounded-lg border border-sky-100 bg-white text-sky-700 inline-flex items-center justify-center shrink-0">
              <BarChart3 size={14} aria-hidden />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-800">
              {t('circle.pollResultsHeading')}
            </p>
          </div>
        ) : null}
        {options.map((option, index) => {
          const count = counts[index] ?? 0;
          const selected = myVote?.optionIndex === index;
          const width = total > 0 && count > 0 ? Math.max(10, Math.round((count / total) * 100)) : 0;
          return (
            <button
              key={`${index}`}
              type="button"
              disabled={closed || saving}
              onClick={() => void handleVote(index)}
              className={cn(
                'relative w-full text-left rounded-xl border overflow-hidden',
                selected ? 'border-sky-500 ring-1 ring-sky-400/70' : closed ? 'border-sky-200 bg-white' : 'border-slate-200',
                !closed && !selected ? 'hover:border-sky-300' : null,
                closed || saving ? 'cursor-default' : null,
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-sky-300/80"
                style={{ width: `${width}%` }}
              />
              <span className="relative flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 min-w-0 font-medium text-slate-800">
                  {selected ? (
                    <Check size={14} className="shrink-0 text-sky-700" aria-hidden />
                  ) : null}
                  <span className="truncate">{option}</span>
                  {selected ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700 shrink-0">
                      {t('circle.pollYourVote')}
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums font-semibold text-slate-700 shrink-0">{count}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!closed && myVote ? (
        <p className="text-[11px] text-slate-500">{t('circle.pollChangeVoteHint')}</p>
      ) : null}
      {hasStoredTranslation ? (
        <button
          type="button"
          onClick={() => setShowOriginal((value) => !value)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors',
            'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          <Languages size={12} />
          {showOriginal ? t('messages.hideOriginal') : t('messages.showOriginal')}
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 font-medium">
          {closed
            ? [
                t('circle.pollClosed'),
                closedAt ? t('circle.pollClosedOn', { date: formatCirclePollClosesAt(closedAt) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : [
                t(total === 1 ? 'circle.pollVotes_one' : 'circle.pollVotes_other', { count: total }),
                closesAt ? t('circle.pollClosesOn', { date: formatCirclePollClosesAt(closesAt) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {allowEdit && canEdit ? (
            <button
              type="button"
              disabled={saving || editSaving}
              onClick={() => {
                setEditError(null);
                setEditing(true);
              }}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
            >
              {t('circle.pollEdit')}
            </button>
          ) : null}
          {canClose ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleClose()}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-800"
            >
              {t('circle.pollClose')}
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      <CirclePollComposer
        open={editing}
        sending={editSaving}
        error={editError}
        mode="edit"
        lockQuestionAndOptions={hasVotes}
        initialQuestion={post.text}
        initialDescription={post.pollDescription ?? ''}
        initialOptions={originalOptions}
        initialClosesAt={closesAt}
        onClose={() => {
          if (editSaving) return;
          setEditing(false);
          setEditError(null);
        }}
        onPost={handleSaveEdit}
      />
    </div>
  );
}
