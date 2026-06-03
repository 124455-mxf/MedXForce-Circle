import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Loader2, Shield, Users } from 'lucide-react';
import {
  canParticipateInCircleOpenThread,
  canSeeCircleRestrictedThread,
  circleMemberRoleLabel,
  circleMemberThreadDescription,
  circleMemberThreadLabel,
  createCircleMemberThreadPost,
  type CircleMemberRole,
  type CircleMemberThreadKind,
  type CircleMemberThreadPost,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
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
} from '../lib/circleSectionStyles';
import { useCircleMemberThread } from '../hooks/useCircleMemberThread';
import { markCircleThreadRead } from '../lib/circleMemberThreadRead';
import { CircleAiGuidancePanel } from './CircleAiGuidancePanel';
import { ResponsiveTabLabel } from './ResponsiveTabLabel';

interface CircleCircleScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

function formatPostTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

function ThreadPostCard({
  post,
  isOwn,
}: {
  post: CircleMemberThreadPost;
  isOwn: boolean;
}) {
  return (
    <div
      className={cn(
        circleCompactCardClass,
        'relative overflow-hidden',
        isOwn ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100',
      )}
    >
      <div
        className={cn('absolute top-0 left-0 w-1 h-full', isOwn ? 'bg-blue-400' : 'bg-indigo-300')}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 mb-2 pl-1">
        <div className="min-w-0">
          <p className={cn('text-xs font-bold', isOwn ? 'text-blue-700' : 'text-slate-800')}>
            {isOwn ? 'You' : post.authorName}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
            {circleMemberRoleLabel(post.authorRole)}
          </p>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
          {formatPostTime(post.createdAt)}
        </span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-1">{post.text}</p>
    </div>
  );
}

export function CircleCircleScreen({ user, db, patient }: CircleCircleScreenProps) {
  const memberRole = patient.role as CircleMemberRole;
  const canOpen = canParticipateInCircleOpenThread(memberRole);
  const canRestricted = canSeeCircleRestrictedThread(memberRole);

  const [activeThread, setActiveThread] = useState<CircleMemberThreadKind>('open');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canRestricted && activeThread === 'restricted') {
      setActiveThread('open');
    }
  }, [activeThread, canRestricted]);

  const threadEnabled =
    activeThread === 'open' ? canOpen : canRestricted;

  const { loading, error, posts } = useCircleMemberThread(
    db,
    patient.patientId,
    activeThread,
    threadEnabled,
  );

  const authorName = useMemo(
    () => user.displayName?.trim() || user.email?.split('@')[0] || 'Circle member',
    [user.displayName, user.email],
  );

  const recentContext = useMemo(
    () =>
      posts
        .slice(-6)
        .map((p) => `${p.authorName}: ${p.text}`)
        .join('\n'),
    [posts],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [posts.length, activeThread]);

  useEffect(() => {
    if (!patient.patientId || !user.uid) return;
    if (activeThread === 'open' && canOpen) {
      markCircleThreadRead(patient.patientId, user.uid, 'open');
    }
    if (activeThread === 'restricted' && canRestricted) {
      markCircleThreadRead(patient.patientId, user.uid, 'restricted');
    }
  }, [
    activeThread,
    canOpen,
    canRestricted,
    patient.patientId,
    posts.length,
    user.uid,
  ]);

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
      setDraft('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send message.');
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

  if (!canOpen) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
        <p className="text-sm text-slate-500 leading-relaxed">
          Circle conversations are available to active circle members.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleSectionPanelClass, 'max-h-full')}>
        <div className={cn(circleSectionHeaderClass, circleSectionHeaderStackClass)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={circleSectionTitleClass}>Circle</h3>
              <p className={circleSectionSubtitleClass}>
                Stay connected with everyone in the circle — all members see the same conversation.
              </p>
            </div>
          </div>

          <div className={circleTabListClass} role="tablist" aria-label="Circle threads">
            <button
              type="button"
              role="tab"
              aria-selected={activeThread === 'open'}
              onClick={() => setActiveThread('open')}
              className={circleTabButtonClass(activeThread === 'open')}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <Users size={14} className="shrink-0 [@media(max-height:740px)]:hidden" />
                <ResponsiveTabLabel long="Circle conversation" compact="Circle" />
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
                  <ResponsiveTabLabel long="Care coordination" compact="Care team" />
                </span>
              </button>
            )}
          </div>

          <p className={circleSectionContextHintClass}>
            {circleMemberThreadDescription(activeThread)}
          </p>
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
                {circleMemberThreadLabel(activeThread)}
              </p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto [@media(max-height:740px)]:mt-1 [@media(max-height:740px)]:text-xs">
                No messages yet. Say hello — everyone in this thread will see your note.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <ThreadPostCard key={post.id} post={post} isOwn={post.authorUid === user.uid} />
            ))
          )}
        </div>

        <div className={circleSectionComposerClass}>
          <CircleAiGuidancePanel
            threadLabel={circleMemberThreadLabel(activeThread)}
            memberRole={memberRole}
            recentContext={recentContext || undefined}
          />

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={`Message the ${activeThread === 'open' ? 'circle' : 'care team'}…`}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm max-h-28 [@media(max-height:740px)]:px-3 [@media(max-height:740px)]:py-2 [@media(max-height:740px)]:max-h-20"
            disabled={sending}
            maxLength={5000}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft('')}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200"
              disabled={sending}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              className="px-5 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50 [@media(max-height:740px)]:px-4 [@media(max-height:740px)]:py-1.5 [@media(max-height:740px)]:text-xs"
              disabled={sending || !draft.trim()}
            >
              {sending ? 'Sending…' : 'Send to everyone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
