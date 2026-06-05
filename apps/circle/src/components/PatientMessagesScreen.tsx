import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { User } from 'firebase/auth';
import { ChevronLeft, ChevronDown, ChevronUp, ClipboardList, Mail, Mic, Save, User as UserIcon } from 'lucide-react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { normalizeInviteEmail, type CirclePatientSummary } from '@medxforce/shared';
import { cn } from '../lib/utils';

import type {
  CircleThreadMessage,
  CircleThreadReply,
} from '../hooks/useCirclePatientThreads';
import {
  getThreadLastReadAt,
  inboxUnreadKind,
  markThreadRead,
  threadHasUnreadPatientReply,
} from '../lib/circleMessageRead';
import {
  CIRCLE_REPLY_SORT_CHANGED,
  getCircleReplySortOrder,
  type CircleReplySortOrder,
} from '../lib/circleMessagePreferences';
import type { UnsavedReplyDraftGuard } from '../lib/unsavedReplyDraft';
import { CircleDiscardDraftModal } from './CircleDiscardDraftModal';
import {
  circleSectionEmptyCardClass,
  circleSectionPanelClass,
  circleSectionTitleClass,
} from '../lib/circleSectionStyles';
import {
  isIcuDailySummary,
  orderedSummaryEntries,
  splitCircleInbox,
  summaryDateLabel,
  summaryUtteranceCount,
  type IcuSummaryEntry,
} from '../lib/circleCommunicationLog';

const REPLY_COLLAPSE_THRESHOLD = 4;
const REPLY_TAIL_VISIBLE = 2;

/** Thread title in the combined header + message block. */
function threadHeaderTitle(msg: CircleThreadMessage): string {
  if (isIcuDailySummary(msg)) {
    return `Communication log — ${summaryDateLabel(msg)}`;
  }
  const subject = msg.subject?.trim();
  if (subject) return subject;
  return 'Patient message';
}

function IcuUtteranceCard({ entry }: { entry: IcuSummaryEntry }) {
  const sourceLabel =
    entry.source === 'speak' ? 'Spoken' : entry.source === 'save' ? 'Saved' : null;
  const SourceIcon = entry.source === 'speak' ? Mic : Save;

  return (
    <div className="border rounded-2xl p-4 relative overflow-hidden bg-emerald-50/50 border-emerald-100">
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400" aria-hidden />
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-100">
            <Mail size={12} className="text-emerald-600" />
          </div>
          <span className="text-xs font-bold uppercase tracking-tight text-emerald-700">
            Patient
          </span>
          {sourceLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <SourceIcon size={10} />
              {sourceLabel}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium tabular-nums shrink-0 text-emerald-600/60">
          {new Date(entry.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap">
        {entry.text}
      </p>
    </div>
  );
}

function formatThreadTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today) return `Today, ${time}`;
  return `${d.toLocaleDateString()}, ${time}`;
}

/** Matches patient app MessagesTab reply cards (blue = you, emerald = patient). */
function CircleReplyCard({
  reply,
  highlightAsUnread = false,
}: {
  reply: CircleThreadReply;
  highlightAsUnread?: boolean;
}) {
  const fromPatient = reply.isPatient;
  const isOwnReply = !fromPatient;

  return (
    <div
      className={cn(
        'border rounded-2xl p-4 relative overflow-hidden',
        highlightAsUnread
          ? 'bg-red-50/40 border-red-200'
          : isOwnReply
            ? 'bg-blue-50/50 border-blue-100'
            : 'bg-emerald-50/50 border-emerald-100',
      )}
    >
      <div
        className={cn(
          'absolute top-0 left-0 w-1 h-full',
          highlightAsUnread
            ? 'bg-red-500'
            : isOwnReply
              ? 'bg-blue-400'
              : 'bg-emerald-400',
        )}
        aria-hidden
      />
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
              isOwnReply ? 'bg-blue-100' : 'bg-emerald-100',
            )}
          >
            {isOwnReply ? (
              <UserIcon size={12} className="text-blue-600" />
            ) : (
              <Mail size={12} className="text-emerald-600" />
            )}
          </div>
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-tight truncate',
              isOwnReply ? 'text-blue-700' : 'text-emerald-700',
            )}
          >
            {isOwnReply ? 'Your response' : `Reply from ${reply.senderName}`}
          </span>
        </div>
        <span
          className={cn(
            'text-[10px] font-medium tabular-nums shrink-0',
            isOwnReply ? 'text-blue-600/60' : 'text-emerald-600/60',
          )}
        >
          {new Date(reply.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap">
        {reply.text}
      </p>
    </div>
  );
}

export function PatientMessagesScreen({
  user,
  patient,
  db,
  loading,
  error,
  messages,
  repliesByMessageId,
  unreadCount,
  draftGuardRef,
}: {
  user: User;
  patient: CirclePatientSummary;
  db: Firestore;
  loading: boolean;
  error: string | null;
  messages: CircleThreadMessage[];
  repliesByMessageId: Record<string, CircleThreadReply[]>;
  unreadCount: number;
  draftGuardRef?: MutableRefObject<UnsavedReplyDraftGuard | null>;
}) {
  const normalizedEmail = useMemo(
    () => (user.email ? normalizeInviteEmail(user.email) : ''),
    [user.email],
  );
  const senderName = useMemo(
    () => user.displayName || user.email || 'Family Member',
    [user.displayName, user.email],
  );

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedMiddle, setExpandedMiddle] = useState(false);
  const [replySort, setReplySort] = useState<CircleReplySortOrder>(() =>
    getCircleReplySortOrder(),
  );
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [communicationLogOpen, setCommunicationLogOpen] = useState(true);

  const { communicationLog, directMessages } = useMemo(
    () => splitCircleInbox(messages),
    [messages],
  );

  useEffect(() => {
    const syncReplySort = () => setReplySort(getCircleReplySortOrder());
    window.addEventListener(CIRCLE_REPLY_SORT_CHANGED, syncReplySort);
    window.addEventListener('storage', syncReplySort);
    return () => {
      window.removeEventListener(CIRCLE_REPLY_SORT_CHANGED, syncReplySort);
      window.removeEventListener('storage', syncReplySort);
    };
  }, []);
  const pendingNavigateRef = useRef<(() => void) | null>(null);

  const hasUnsavedDraft = useCallback(
    () => !!selectedMessageId && replyText.trim().length > 0,
    [replyText, selectedMessageId],
  );

  const confirmNavigate = useCallback(
    (proceed: () => void) => {
      if (!hasUnsavedDraft()) {
        proceed();
        return;
      }
      pendingNavigateRef.current = proceed;
      setShowDiscardModal(true);
    },
    [hasUnsavedDraft],
  );

  useEffect(() => {
    if (!draftGuardRef) return;
    draftGuardRef.current = { hasUnsavedDraft, confirmNavigate };
    return () => {
      draftGuardRef.current = null;
    };
  }, [confirmNavigate, draftGuardRef, hasUnsavedDraft]);

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );

  const replies = selectedMessageId ? repliesByMessageId[selectedMessageId] || [] : [];

  const openThread = useCallback(
    (messageId: string) => {
      if (messageId === selectedMessageId) return;
      confirmNavigate(() => {
        setSelectedMessageId(messageId);
        setReplyText('');
        setExpandedMiddle(false);
      });
    },
    [confirmNavigate, patient.patientId, selectedMessageId],
  );

  const leaveThread = useCallback(() => {
    confirmNavigate(() => {
      if (selectedMessageId) {
        markThreadRead(patient.patientId, selectedMessageId);
      }
      setSelectedMessageId(null);
      setReplyText('');
      setExpandedMiddle(false);
    });
  }, [confirmNavigate, patient.patientId, selectedMessageId]);

  const handleDiscardDraft = useCallback(() => {
    setShowDiscardModal(false);
    setReplyText('');
    const proceed = pendingNavigateRef.current;
    pendingNavigateRef.current = null;
    proceed?.();
  }, []);

  const handleContinueEditing = useCallback(() => {
    setShowDiscardModal(false);
    pendingNavigateRef.current = null;
  }, []);

  useEffect(() => {
    setExpandedMiddle(false);
  }, [replySort]);

  const handleSendReply = useCallback(async () => {
    if (!selectedMessageId) return;
    const text = replyText.trim();
    if (!text) return;

    setSending(true);
    try {
      const now = Date.now();
      const replyId = `reply_${now}_${Math.random().toString(36).slice(2, 8)}`;

      const replyDoc = {
        id: replyId,
        patientId: patient.patientId,
        messageId: selectedMessageId,
        senderUid: user.uid,
        senderName,
        senderEmail: normalizedEmail || undefined,
        text,
        isPatient: false,
        channel: 'app' as const,
        externalId: replyId,
        timestamp: now,
      };

      await setDoc(
        doc(
          db,
          'patients',
          patient.patientId,
          'messages',
          selectedMessageId,
          'replies',
          replyId,
        ),
        replyDoc,
        { merge: true },
      );

      await updateDoc(
        doc(db, 'patients', patient.patientId, 'messages', selectedMessageId),
        { hasNewReply: true, updatedAt: now },
      );

      setReplyText('');
      markThreadRead(patient.patientId, selectedMessageId, now);
    } finally {
      setSending(false);
    }
  }, [
    db,
    normalizedEmail,
    patient.patientId,
    replyText,
    selectedMessageId,
    senderName,
    user.uid,
  ]);

  const isInboxThreadUnread = (msg: CircleThreadMessage) =>
    threadHasUnreadPatientReply(
      repliesByMessageId[msg.id] || [],
      patient.patientId,
      msg.id,
      msg,
    );

  const latestPatientReplyId = useMemo(() => {
    for (let i = replies.length - 1; i >= 0; i--) {
      if (replies[i].isPatient) return replies[i].id;
    }
    return null;
  }, [replies]);

  const selectedThreadLastRead = selectedMessage
    ? getThreadLastReadAt(patient.patientId, selectedMessage.id)
    : 0;

  const selectedThreadHasUnread =
    !!selectedMessage &&
    threadHasUnreadPatientReply(
      replies,
      patient.patientId,
      selectedMessage.id,
      selectedMessage,
    );

  const selectedInitialMessageUnread =
    !!selectedMessage &&
    (selectedMessage.createdAt || 0) > selectedThreadLastRead;

  const orderedReplies = useMemo(() => {
    const copy = [...replies].sort((a, b) => a.timestamp - b.timestamp);
    return replySort === 'newest' ? copy.reverse() : copy;
  }, [replies, replySort]);

  const totalReplies = orderedReplies.length;
  const shouldCollapse = totalReplies >= REPLY_COLLAPSE_THRESHOLD;

  const { earlierReplies, recentReplies } = useMemo(() => {
    if (!shouldCollapse) {
      return { earlierReplies: [] as CircleThreadReply[], recentReplies: orderedReplies };
    }
    if (replySort === 'newest') {
      return {
        recentReplies: orderedReplies.slice(0, REPLY_TAIL_VISIBLE),
        earlierReplies: orderedReplies.slice(REPLY_TAIL_VISIBLE),
      };
    }
    return {
      earlierReplies: orderedReplies.slice(0, totalReplies - REPLY_TAIL_VISIBLE),
      recentReplies: orderedReplies.slice(-REPLY_TAIL_VISIBLE),
    };
  }, [orderedReplies, replySort, shouldCollapse, totalReplies]);

  if (loading) {
    return (
      <div className={circleSectionEmptyCardClass}>
        <p className="text-sm text-slate-500">Loading messages…</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={circleSectionEmptyCardClass}>
        <h3 className={cn(circleSectionTitleClass, 'mb-2')}>Messages</h3>
        {error ? (
          <p className="text-sm text-red-600 leading-relaxed mb-2">{error}</p>
        ) : null}
        <p className="text-sm text-slate-500 leading-relaxed">
          {error
            ? 'We could not load messages. Try refreshing the page.'
            : 'No messages yet. When your loved one sends you something in MedXForce, it will appear here.'}
        </p>
      </div>
    );
  }

  const renderInboxRow = (msg: CircleThreadMessage, options?: { summaryRow?: boolean }) => {
    const threadReplies = repliesByMessageId[msg.id] || [];
    const unread = isInboxThreadUnread(msg);
    const unreadKind = inboxUnreadKind(
      msg,
      threadReplies,
      patient.patientId,
      msg.id,
    );
    const replyCount = threadReplies.length;
    const summaryRow = options?.summaryRow === true;
    const title = summaryRow
      ? summaryDateLabel(msg)
      : (msg.subject && msg.subject.trim()) || msg.text?.slice(0, 80) || 'Message';
    const snippet = summaryRow
      ? `${summaryUtteranceCount(msg)} ${summaryUtteranceCount(msg) === 1 ? 'utterance' : 'utterances'}`
      : msg.text?.slice(0, 80) || '';

    return (
      <li key={msg.id}>
        <button
          type="button"
          onClick={() => openThread(msg.id)}
          className={cn(
            'w-full text-left p-4 transition-colors relative overflow-hidden',
            unread
              ? 'bg-red-50/40 hover:bg-red-50/60 border-l-0'
              : 'hover:bg-slate-50',
          )}
        >
          {unread && (
            <span
              className="absolute left-0 top-4 bottom-4 w-1.5 rounded-full bg-red-500 shadow-sm shadow-red-200/80"
              aria-hidden
            />
          )}
          <div className="flex items-start justify-between gap-2 pl-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {unread && (
                  <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                    {summaryRow ? 'New summary' : unreadKind === 'reply' ? 'New reply' : 'New message'}
                  </span>
                )}
                {!summaryRow && replyCount > 0 && !unread && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-800 truncate">{title}</p>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{snippet}</p>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
              {formatThreadTime(msg.updatedAt || msg.createdAt)}
            </span>
          </div>
        </button>
      </li>
    );
  };

  if (!selectedMessageId || !selectedMessage) {
    return (
      <div className="bg-[#F8FAFC] rounded-[32px] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="shrink-0 p-4 border-b border-slate-100 bg-white/80">
          <h3 className="font-bold text-slate-800">Messages</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tap a conversation to read and reply
            {unreadCount > 0
              ? ` · ${unreadCount} unread`
              : ''}
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {communicationLog.length > 0 && (
            <div className="border-b border-slate-100">
              <button
                type="button"
                onClick={() => setCommunicationLogOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-indigo-50/60 hover:bg-indigo-50 text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ClipboardList size={16} className="text-indigo-600 shrink-0" />
                  <span className="font-bold text-sm text-indigo-900 truncate">
                    Communication log
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 shrink-0">
                    {communicationLog.length} {communicationLog.length === 1 ? 'day' : 'days'}
                  </span>
                </span>
                {communicationLogOpen ? (
                  <ChevronUp size={16} className="text-indigo-500 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-indigo-500 shrink-0" />
                )}
              </button>
              {communicationLogOpen && (
                <ul className="divide-y divide-slate-100">
                  {communicationLog.map((msg) => renderInboxRow(msg, { summaryRow: true }))}
                </ul>
              )}
            </div>
          )}
          {directMessages.length > 0 && (
            <>
              {communicationLog.length > 0 && (
                <div className="px-4 py-2 bg-white border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Direct messages
                  </p>
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {directMessages.map((msg) => renderInboxRow(msg))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  const renderNewDivider = (key: string) => (
    <div key={key} className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-red-200" />
      <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-2">
        New
      </span>
      <div className="h-px flex-1 bg-red-200" />
    </div>
  );

  let renderedNewDivider = false;
  const renderReply = (r: CircleThreadReply) => {
    const showDivider =
      !renderedNewDivider &&
      r.isPatient &&
      (r.timestamp || 0) > selectedThreadLastRead;
    if (showDivider) renderedNewDivider = true;
    return (
      <div key={r.id}>
        {showDivider ? renderNewDivider(`new-${r.id}`) : null}
        <CircleReplyCard
          reply={r}
          highlightAsUnread={
            selectedThreadHasUnread && r.isPatient && r.id === latestPatientReplyId
          }
        />
      </div>
    );
  };

  if (isIcuDailySummary(selectedMessage)) {
    const utterances = orderedSummaryEntries(selectedMessage);
    return (
      <div className={cn(circleSectionPanelClass, 'max-h-full')}>
        <div className="shrink-0 border-b bg-indigo-50/40 border-indigo-100">
          <div className="flex items-start gap-2 px-4 pt-4 pb-4">
            <button
              type="button"
              onClick={leaveThread}
              className="p-2 rounded-xl text-slate-500 hover:bg-white/80 shrink-0"
              aria-label="Back to inbox"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800 line-clamp-2 leading-snug">
                {threadHeaderTitle(selectedMessage)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {utterances.length} {utterances.length === 1 ? 'utterance' : 'utterances'} · read-only log
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {utterances.map((entry, index) => (
            <IcuUtteranceCard key={`${entry.timestamp}-${index}`} entry={entry} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={cn(circleSectionPanelClass, 'max-h-full')}>
      <div
        className={cn(
          'shrink-0 border-b',
          selectedInitialMessageUnread
            ? 'bg-red-50/40 border-red-200'
            : 'bg-white/90 border-slate-100',
        )}
      >
        <div className="flex items-start gap-2 px-4 pt-4">
          <button
            type="button"
            onClick={leaveThread}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
            aria-label="Back to inbox"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1 pb-1">
            <p className="font-bold text-slate-800 line-clamp-2 leading-snug">
              {threadHeaderTitle(selectedMessage)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {formatThreadTime(selectedMessage.updatedAt || selectedMessage.createdAt)}
            </p>
          </div>
        </div>
        {selectedInitialMessageUnread ? (
          <div className="px-4 pt-1">{renderNewDivider('new-initial')}</div>
        ) : null}
        <p className="px-4 pb-4 pt-1 pl-14 text-slate-800 leading-relaxed text-sm whitespace-pre-wrap">
          {selectedMessage.text}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {totalReplies > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            {!shouldCollapse ? (
              orderedReplies.map(renderReply)
            ) : replySort === 'oldest' ? (
              <>
                {!expandedMiddle && earlierReplies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedMiddle(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <ChevronDown size={14} />
                    Show {earlierReplies.length} earlier replies
                  </button>
                )}
                {expandedMiddle && earlierReplies.map(renderReply)}
                {recentReplies.map(renderReply)}
              </>
            ) : (
              <>
                {recentReplies.map(renderReply)}
                {!expandedMiddle && earlierReplies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedMiddle(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  >
                    <ChevronDown size={14} />
                    Show {earlierReplies.length} older replies
                  </button>
                )}
                {expandedMiddle && earlierReplies.map(renderReply)}
              </>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.06)] space-y-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={2}
          placeholder="Type your reply…"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm max-h-28"
          disabled={sending}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setReplyText('')}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200"
            disabled={sending}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => void handleSendReply()}
            className="px-5 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
            disabled={sending || !replyText.trim()}
          >
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
    <CircleDiscardDraftModal
      open={showDiscardModal}
      onDiscard={handleDiscardDraft}
      onContinueEditing={handleContinueEditing}
    />
    </>
  );
}
