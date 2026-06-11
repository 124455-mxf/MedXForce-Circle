import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { User } from 'firebase/auth';
import { ChevronLeft, ChevronDown, ClipboardList, Mail, MessageSquare, Mic, Save, Trash2, User as UserIcon, Users, AlertCircle, Bell } from 'lucide-react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  canCircleMemberReplyToPatientMessage,
  circlePatientMessageBucket,
  circlePatientMessageStatusHint,
  circlePatientMessageStatusLabel,
  circleRepliesAfterInboxHide,
  hideCircleMessageForUser,
  isCircleThreadResurrected,
  isPatientReplyVisibleToCircleMember,
  normalizeInviteEmail,
  shouldShowCircleThreadInitialMessage,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleMessageBodyPreview } from './CircleMessageBodyPreview';
import { useCirclePatientMemberDisplayNames } from '../hooks/useCirclePatientMemberDisplayNames';
import { resolveCircleReplySenderLabel } from '../lib/circleReplySenderDisplay';

import type {
  CircleThreadMessage,
  CircleThreadReply,
} from '../hooks/useCirclePatientThreads';
import {
  CIRCLE_MSG_READ_CHANGED,
  getThreadLastReadAt,
  inboxUnreadKind,
  isCommunicationLogSummaryUnread,
  markAllCommunicationLogRead,
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
import { CircleExpandableMessageComposer } from './CircleExpandableMessageComposer';
import { CircleMessageDeleteConfirmModal } from './CircleMessageDeleteConfirmModal';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { CircleFolderCountBadge, formatCircleBadgeCount } from './CircleCountBadge';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import {
  circleSectionEmptyCardClass,
  circleSectionPanelClass,
  circleSectionTitleClass,
  circleTabButtonClass,
  circleTabListClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import {
  isIcuDailySummary,
  isSummaryDeliveredOnDifferentDay,
  orderedSummaryEntries,
  splitCircleInbox,
  summaryDateLabel,
  summaryDeliveredAt,
  summaryUtteranceCount,
  type IcuSummaryEntry,
} from '../lib/circleCommunicationLog';
import {
  alertAttentionKindLabel,
  circleAlertAttentionReadOnlyHint,
  circleMessageAlertAttentionKind,
  isUrgentUnreadAlertAttentionMessage,
} from '../lib/circleAlertAttentionUrgency';
import {
  countUnreadAlertsInInbox,
  countUnreadAttentionsInInbox,
  countAlertsInInbox,
  countAttentionsInInbox,
  countDirectMessagesForInboxView,
  filterDirectMessagesForInboxView,
  messageMatchesInboxView,
  type CircleMessagesInboxView,
} from '../lib/circleMessageInboxViews';
import {
  circleUrgencyInboxRowClass,
  circleUrgencyLeftAccentClass,
  circleUrgencyStatusBadgeClass,
} from '../lib/circleUrgencyStyles';

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

function communicationLogInboxTime(msg: CircleThreadMessage): string | null {
  if (!isSummaryDeliveredOnDifferentDay(msg)) return null;
  return `Sent ${formatThreadTime(summaryDeliveredAt(msg))}`;
}

function communicationLogThreadSubtitle(msg: CircleThreadMessage): string {
  if (!isSummaryDeliveredOnDifferentDay(msg)) {
    return 'Read-only log';
  }
  return `Sent to Circle ${formatThreadTime(summaryDeliveredAt(msg))}`;
}

type CircleReplySenderKind = 'patient' | 'self' | 'member';

function circleReplySenderKind(
  reply: CircleThreadReply,
  userUid: string,
  normalizedEmail: string,
): CircleReplySenderKind {
  if (reply.isPatient) return 'patient';
  if (reply.senderUid && reply.senderUid === userUid) return 'self';
  if (
    normalizedEmail &&
    reply.senderEmail &&
    normalizeInviteEmail(reply.senderEmail) === normalizedEmail
  ) {
    return 'self';
  }
  return 'member';
}

/** Blue = your reply, violet = another circle member, emerald = patient. */
function CircleReplyCard({
  reply,
  currentUserUid,
  normalizedEmail,
  memberDisplayNames,
  patientDisplayName,
  highlightAsUnread = false,
}: {
  reply: CircleThreadReply;
  currentUserUid: string;
  normalizedEmail: string;
  memberDisplayNames: { byUid: Record<string, string>; byEmail: Record<string, string> };
  patientDisplayName: string;
  highlightAsUnread?: boolean;
}) {
  const senderKind = circleReplySenderKind(reply, currentUserUid, normalizedEmail);
  const isOwnReply = senderKind === 'self';
  const fromPatient = senderKind === 'patient';

  const senderLabel = isOwnReply
    ? 'Your response'
    : `Reply from ${resolveCircleReplySenderLabel(reply, memberDisplayNames, patientDisplayName)}`;

  return (
    <div
      className={cn(
        'border rounded-2xl p-4 relative overflow-hidden',
        highlightAsUnread
          ? 'bg-red-50/40 border-red-200'
          : isOwnReply
            ? 'bg-blue-50/50 border-blue-100'
            : fromPatient
              ? 'bg-emerald-50/50 border-emerald-100'
              : 'bg-violet-50/50 border-violet-100',
      )}
    >
      <div
        className={cn(
          'absolute top-0 left-0 w-1 h-full',
          highlightAsUnread
            ? 'bg-red-500'
            : isOwnReply
              ? 'bg-blue-400'
              : fromPatient
                ? 'bg-emerald-400'
                : 'bg-violet-400',
        )}
        aria-hidden
      />
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
              isOwnReply
                ? 'bg-blue-100'
                : fromPatient
                  ? 'bg-emerald-100'
                  : 'bg-violet-100',
            )}
          >
            {isOwnReply ? (
              <UserIcon size={12} className="text-blue-600" />
            ) : fromPatient ? (
              <Mail size={12} className="text-emerald-600" />
            ) : (
              <Users size={12} className="text-violet-600" />
            )}
          </div>
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-tight truncate',
              isOwnReply
                ? 'text-blue-700'
                : fromPatient
                  ? 'text-emerald-700'
                  : 'text-violet-700',
            )}
          >
            {senderLabel}
          </span>
        </div>
        <span
          className={cn(
            'text-[10px] font-medium tabular-nums shrink-0',
            isOwnReply
              ? 'text-blue-600/60'
              : fromPatient
                ? 'text-emerald-600/60'
                : 'text-violet-600/60',
          )}
        >
          {new Date(reply.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <CircleMessageBodyPreview
        text={reply.text}
        className="text-slate-700 font-medium"
      />
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
  hiddenAtByMessageId,
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
  hiddenAtByMessageId: Record<string, number>;
  unreadCount: number;
  draftGuardRef?: MutableRefObject<UnsavedReplyDraftGuard | null>;
}) {
  const normalizedEmail = useMemo(
    () => (user.email ? normalizeInviteEmail(user.email) : ''),
    [user.email],
  );
  const memberDisplayNames = useCirclePatientMemberDisplayNames(db, patient.patientId);
  const senderName = useMemo(() => {
    const fromPatientSettings =
      memberDisplayNames.byUid[user.uid] ||
      (normalizedEmail ? memberDisplayNames.byEmail[normalizedEmail] : '');
    return (
      fromPatientSettings ||
      user.displayName?.trim() ||
      user.email ||
      'Family Member'
    );
  }, [
    memberDisplayNames.byEmail,
    memberDisplayNames.byUid,
    normalizedEmail,
    user.displayName,
    user.email,
    user.uid,
  ]);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedMiddle, setExpandedMiddle] = useState(false);
  const [replySort, setReplySort] = useState<CircleReplySortOrder>(() =>
    getCircleReplySortOrder(),
  );
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inboxView, setInboxView] = useState<CircleMessagesInboxView>('in_out');
  const [readTick, setReadTick] = useState(0);
  const compactChrome = useCircleCompactChrome();

  const memberAudience = useMemo(
    () => ({ uid: user.uid, email: normalizedEmail }),
    [normalizedEmail, user.uid],
  );

  const { communicationLog, directMessages } = useMemo(
    () => splitCircleInbox(messages),
    [messages],
  );

  const unreadCommunicationLog = useMemo(
    () =>
      communicationLog.filter((msg) =>
        isCommunicationLogSummaryUnread(msg, patient.patientId, msg.id),
      ),
    [communicationLog, patient.patientId, readTick],
  );

  const inboxTabCounts = useMemo(() => {
    const countUnreadInView = (view: CircleMessagesInboxView) =>
      filterDirectMessagesForInboxView(
        directMessages,
        view,
        repliesByMessageId,
        patient.patientId,
      ).filter((msg) => {
        const memberReplies = (repliesByMessageId[msg.id] || []).filter((reply) =>
          isPatientReplyVisibleToCircleMember(reply, memberAudience),
        );
        return threadHasUnreadPatientReply(
          memberReplies,
          patient.patientId,
          msg.id,
          msg,
        );
      }).length;

    const countTotalInView = (view: CircleMessagesInboxView) =>
      countDirectMessagesForInboxView(
        directMessages,
        view,
        repliesByMessageId,
        patient.patientId,
      );

    return {
      communication_log: {
        unread: unreadCommunicationLog.length,
        total: communicationLog.length,
      },
      in_out: {
        unread: countUnreadInView('in_out'),
        total: countTotalInView('in_out'),
      },
      archived: {
        unread: countUnreadInView('archived'),
        total: countTotalInView('archived'),
      },
      deleted: {
        unread: countUnreadInView('deleted'),
        total: countTotalInView('deleted'),
      },
      alert: {
        unread: countUnreadAlertsInInbox(
          directMessages,
          repliesByMessageId,
          patient.patientId,
        ),
        total: countAlertsInInbox(directMessages),
      },
      attention: {
        unread: countUnreadAttentionsInInbox(
          directMessages,
          repliesByMessageId,
          patient.patientId,
        ),
        total: countAttentionsInInbox(directMessages),
      },
    };
  }, [
    communicationLog.length,
    directMessages,
    memberAudience,
    patient.patientId,
    repliesByMessageId,
    readTick,
    unreadCommunicationLog.length,
  ]);

  const bucketDirectMessages = useMemo(
    () =>
      filterDirectMessagesForInboxView(
        directMessages,
        inboxView,
        repliesByMessageId,
        patient.patientId,
      ),
    [directMessages, inboxView, patient.patientId, repliesByMessageId, readTick],
  );

  useEffect(() => {
    if (!selectedMessageId) return;
    const selectedDirect = directMessages.find((msg) => msg.id === selectedMessageId);
    const selectedSummary = communicationLog.find((msg) => msg.id === selectedMessageId);
    const selected = selectedDirect ?? selectedSummary;
    if (!selected) {
      setSelectedMessageId(null);
      return;
    }
    if (isIcuDailySummary(selected)) {
      if (inboxView !== 'communication_log') {
        setSelectedMessageId(null);
      }
      return;
    }
    const replies = repliesByMessageId[selected.id] || [];
    if (!messageMatchesInboxView(selected, inboxView, replies, patient.patientId)) {
      setSelectedMessageId(null);
    }
  }, [communicationLog, directMessages, inboxView, patient.patientId, repliesByMessageId, selectedMessageId]);

  useEffect(() => {
    const onReadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (!detail?.patientId || detail.patientId === patient.patientId) {
        setReadTick((v) => v + 1);
      }
    };
    window.addEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
    return () => window.removeEventListener(CIRCLE_MSG_READ_CHANGED, onReadChanged);
  }, [patient.patientId]);

  const handleMarkAllCommunicationLogRead = useCallback(() => {
    markAllCommunicationLogRead(patient.patientId, communicationLog);
  }, [communicationLog, patient.patientId]);

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

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );

  useEffect(() => {
    if (!selectedMessageId || !selectedMessage) return;
    if (circleMessageAlertAttentionKind(selectedMessage)) {
      markThreadRead(patient.patientId, selectedMessageId);
    }
  }, [patient.patientId, selectedMessage, selectedMessageId]);

  const replies = selectedMessageId ? repliesByMessageId[selectedMessageId] || [] : [];
  const selectedHiddenAt = selectedMessageId ? hiddenAtByMessageId[selectedMessageId] : undefined;
  const selectedThreadResurrected = selectedHiddenAt
    ? isCircleThreadResurrected(selectedHiddenAt, replies)
    : false;
  const visibleReplies = useMemo(() => {
    const afterHide = circleRepliesAfterInboxHide(selectedHiddenAt, replies);
    return afterHide.filter((reply) =>
      isPatientReplyVisibleToCircleMember(reply, memberAudience),
    );
  }, [memberAudience, replies, selectedHiddenAt]);
  const showSelectedInitialMessage =
    !!selectedMessage &&
    shouldShowCircleThreadInitialMessage(
      selectedHiddenAt,
      selectedMessage.createdAt || 0,
      replies,
    );

  const requestRemoveFromInbox = useCallback((messageId: string) => {
    setDeleteTargetId(messageId);
  }, []);

  const confirmRemoveFromInbox = useCallback(async () => {
    if (!deleteTargetId || isDeleting) return;
    setIsDeleting(true);
    try {
      await hideCircleMessageForUser(db, patient.patientId, user.uid, deleteTargetId);
      if (selectedMessageId === deleteTargetId) {
        setSelectedMessageId(null);
        setReplyText('');
        setExpandedMiddle(false);
      }
      setDeleteTargetId(null);
    } catch (err) {
      console.warn('[PatientMessagesScreen] hide message', err);
    } finally {
      setIsDeleting(false);
    }
  }, [db, deleteTargetId, isDeleting, patient.patientId, selectedMessageId, user.uid]);

  const openThread = useCallback(
    (messageId: string) => {
      if (messageId === selectedMessageId) return;
      confirmNavigate(() => {
        setSelectedMessageId(messageId);
        setReplyText('');
        setExpandedMiddle(false);
      });
    },
    [confirmNavigate, selectedMessageId],
  );

  const acknowledgeAlertAttention = useCallback(
    (messageId: string) => {
      markThreadRead(patient.patientId, messageId);
    },
    [patient.patientId],
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

  const isThreadOpen = useCallback(() => !!selectedMessageId, [selectedMessageId]);

  useEffect(() => {
    if (!draftGuardRef) return;
    draftGuardRef.current = {
      hasUnsavedDraft,
      confirmNavigate,
      isThreadOpen,
      popToInbox: leaveThread,
    };
    return () => {
      draftGuardRef.current = null;
    };
  }, [confirmNavigate, draftGuardRef, hasUnsavedDraft, isThreadOpen, leaveThread]);

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
    if (!selectedMessageId || !selectedMessage) return;
    if (circleMessageAlertAttentionKind(selectedMessage)) return;
    if (!canCircleMemberReplyToPatientMessage(selectedMessage.status)) return;
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
    selectedMessage,
    selectedMessageId,
    senderName,
    user.uid,
  ]);

  const isInboxThreadUnread = (msg: CircleThreadMessage, summaryRow?: boolean) => {
    if (summaryRow || isIcuDailySummary(msg)) {
      return isCommunicationLogSummaryUnread(msg, patient.patientId, msg.id);
    }
    const memberReplies = (repliesByMessageId[msg.id] || []).filter((reply) =>
      isPatientReplyVisibleToCircleMember(reply, memberAudience),
    );
    return threadHasUnreadPatientReply(
      memberReplies,
      patient.patientId,
      msg.id,
      msg,
    );
  };

  const sortedDirectMessages = useMemo(() => {
    return [...bucketDirectMessages].sort((a, b) => {
      const aUnread = isInboxThreadUnread(a);
      const bUnread = isInboxThreadUnread(b);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
    });
  }, [bucketDirectMessages, patient.patientId, repliesByMessageId, readTick]);

  const latestPatientReplyId = useMemo(() => {
    for (let i = visibleReplies.length - 1; i >= 0; i--) {
      if (visibleReplies[i].isPatient) return visibleReplies[i].id;
    }
    return null;
  }, [visibleReplies]);

  const selectedThreadLastRead = selectedMessage
    ? getThreadLastReadAt(patient.patientId, selectedMessage.id)
    : 0;

  const selectedThreadHasUnread =
    !!selectedMessage &&
    threadHasUnreadPatientReply(
      visibleReplies,
      patient.patientId,
      selectedMessage.id,
      selectedMessage,
    );

  const selectedInitialMessageUnread =
    showSelectedInitialMessage &&
    !!selectedMessage &&
    (selectedMessage.createdAt || 0) > selectedThreadLastRead;

  const orderedReplies = useMemo(() => {
    const copy = [...visibleReplies].sort((a, b) => a.timestamp - b.timestamp);
    return replySort === 'newest' ? copy.reverse() : copy;
  }, [visibleReplies, replySort]);

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

  const messageModals = (
    <>
      <CircleDiscardDraftModal
        open={showDiscardModal}
        onDiscard={handleDiscardDraft}
        onContinueEditing={handleContinueEditing}
      />
      <CircleMessageDeleteConfirmModal
        open={!!deleteTargetId}
        onClose={() => {
          if (!isDeleting) setDeleteTargetId(null);
        }}
        onConfirm={() => void confirmRemoveFromInbox()}
        isDeleting={isDeleting}
      />
    </>
  );

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
        <CircleWorkTabSectionIntro
          icon={MessageSquare}
          iconClassName="text-blue-600"
          title="Messages"
          subtitle={
            error
              ? 'We could not load messages. Try refreshing the page.'
              : 'When your loved one sends you something in MedXForce, it will appear here.'
          }
        />
        {error ? (
          <p className="text-sm text-red-600 leading-relaxed mt-3">{error}</p>
        ) : null}
      </div>
    );
  }

  const renderInboxRow = (msg: CircleThreadMessage, options?: { summaryRow?: boolean }) => {
    const summaryRow = options?.summaryRow === true;
    const threadReplies = repliesByMessageId[msg.id] || [];
    const unread = isInboxThreadUnread(msg, summaryRow);
    const unreadKind = inboxUnreadKind(
      msg,
      threadReplies,
      patient.patientId,
      msg.id,
    );
    const replyCount = threadReplies.length;
    const hiddenAt = hiddenAtByMessageId[msg.id];
    const resurrected = hiddenAt ? isCircleThreadResurrected(hiddenAt, threadReplies) : false;
    const visibleRowReplies = circleRepliesAfterInboxHide(hiddenAt, threadReplies);
    const latestVisiblePatientReply = [...visibleRowReplies]
      .reverse()
      .find((reply) => reply.isPatient);
    const title = summaryRow
      ? summaryDateLabel(msg)
      : (msg.subject && msg.subject.trim()) || msg.text?.slice(0, 80) || 'Message';
    const alertKind = summaryRow ? null : circleMessageAlertAttentionKind(msg);
    const urgentAlertAttention =
      alertKind &&
      isUrgentUnreadAlertAttentionMessage(
        msg,
        patient.patientId,
        msg.id,
        threadReplies,
      );
    let snippet = summaryRow
      ? `${summaryUtteranceCount(msg)} ${summaryUtteranceCount(msg) === 1 ? 'utterance' : 'utterances'}`
      : msg.text?.slice(0, 80) || '';
    if (!summaryRow && resurrected && latestVisiblePatientReply?.text) {
      snippet = latestVisiblePatientReply.text.slice(0, 80);
    }

    return (
      <li key={msg.id} className={summaryRow ? 'list-none' : undefined}>
        <div
          className={cn(
            'flex items-stretch transition-colors relative overflow-hidden',
            summaryRow
              ? cn('rounded-xl border', circleUrgencyInboxRowClass(null, false, unread, true))
              : circleUrgencyInboxRowClass(alertKind, !!urgentAlertAttention, unread, false),
          )}
        >
          {(() => {
            const accentClass = circleUrgencyLeftAccentClass(
              alertKind,
              !!urgentAlertAttention,
              unread,
              summaryRow,
            );
            return accentClass ? <span className={accentClass} aria-hidden /> : null;
          })()}
          <div
            className={cn(
              'flex flex-1 min-w-0 items-center gap-2',
              compactChrome ? 'py-2.5 px-3' : 'py-3 px-3',
              unread ? 'pl-3' : undefined,
            )}
          >
            {!summaryRow && alertKind && unread && (
              <button
                type="button"
                onClick={() => acknowledgeAlertAttention(msg.id)}
                className={cn(
                  circleUrgencyStatusBadgeClass(alertKind),
                  'cursor-pointer hover:brightness-95 active:scale-[0.98] transition-transform shrink-0 self-center',
                )}
                aria-label={`Acknowledge ${alertAttentionKindLabel(alertKind).toLowerCase()}`}
                title={`Acknowledge ${alertAttentionKindLabel(alertKind).toLowerCase()}`}
              >
                {alertAttentionKindLabel(alertKind)}
              </button>
            )}
            <button
              type="button"
              onClick={() => openThread(msg.id)}
              className="flex-1 min-w-0 text-left"
            >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                {unread && !urgentAlertAttention && !alertKind && (
                  <span
                    className={circleUrgencyStatusBadgeClass(
                      summaryRow
                        ? 'new-summary'
                        : unreadKind === 'reply'
                          ? 'new-reply'
                          : 'new-message',
                    )}
                  >
                    {summaryRow ? 'New summary' : unreadKind === 'reply' ? 'New reply' : 'New message'}
                  </span>
                )}
                {!summaryRow && replyCount > 0 && !unread && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                )}
                {!summaryRow && msg.status === 'failed' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ring-1 ring-inset bg-rose-50 text-rose-700 ring-rose-200/70">
                    Failed
                  </span>
                )}
                {!summaryRow && msg.status && msg.status !== 'sent' && msg.status !== 'sending' && msg.status !== 'failed' && (
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      msg.status === 'deleted'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {circlePatientMessageStatusLabel(msg.status)}
                  </span>
                )}
              </div>
              <p className={cn('font-bold truncate leading-snug', summaryRow ? 'text-indigo-950' : 'text-slate-800')}>
                {title}
              </p>
              <p className={cn('text-[11px] mt-0.5 line-clamp-2 leading-relaxed', summaryRow ? 'text-indigo-700/80' : 'text-slate-500')}>
                {snippet}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap text-right leading-snug pt-0.5">
              {summaryRow
                ? communicationLogInboxTime(msg)
                : formatThreadTime(msg.updatedAt || msg.createdAt)}
            </span>
          </div>
            </button>
          </div>
          {!summaryRow && circlePatientMessageBucket(msg.status) === 'in_out' && (
            <button
              type="button"
              onClick={() => requestRemoveFromInbox(msg.id)}
              className="shrink-0 self-center px-2 text-slate-400 hover:text-red-600 hover:bg-red-50/80 transition-colors"
              aria-label="Remove from your inbox"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </li>
    );
  };

  if (!selectedMessageId || !selectedMessage) {
    return (
      <>
      <div className={circleWorkTabPanelClass(compactChrome)}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), 'space-y-2')}>
          <CircleWorkTabSectionIntro
            icon={MessageSquare}
            iconClassName="text-blue-600"
            title="Messages"
            subtitle={
              inboxView === 'communication_log'
                ? 'Daily spoken and saved notes from Intensive Care mode — read only.'
                : inboxView === 'archived'
                ? 'Archived on the patient tablet — you can still reply.'
                : inboxView === 'deleted'
                  ? 'Deleted on the patient tablet — read only, no replies.'
                  : inboxView === 'alert'
                    ? 'Unread alerts also appear in In/Out until you acknowledge them.'
                    : inboxView === 'attention'
                      ? 'Unread attention requests also appear in In/Out until you acknowledge them.'
                      : 'Tap a conversation to read and reply. Tap Alert or Attention to acknowledge.'
            }
            titleExtra={
              unreadCount > 0 && inboxView === 'in_out' ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                  {formatCircleBadgeCount(unreadCount)} unread
                </span>
              ) : undefined
            }
          />
          <div
            className={cn(
              circleTabListClass,
              'flex-nowrap items-center gap-0.5 p-1',
              'overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            )}
            role="tablist"
            aria-label="Message buckets"
          >
            <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={inboxView === 'communication_log'}
              aria-label="Communication log"
              onClick={() => setInboxView('communication_log')}
              className={circleTabButtonClass(
                inboxView === 'communication_log',
                'shrink-0 flex-none justify-center min-w-[2.125rem] px-2 py-2',
              )}
            >
              <span className="relative inline-flex items-center justify-center pr-1 pt-0.5">
                <ClipboardList
                  size={16}
                  className={inboxView === 'communication_log' ? 'text-indigo-600' : 'text-slate-500'}
                  aria-hidden
                />
                <CircleFolderCountBadge
                  {...inboxTabCounts.communication_log}
                  placement="overlay"
                />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inboxView === 'alert'}
              aria-label="Alerts"
              onClick={() => setInboxView('alert')}
              className={circleTabButtonClass(
                inboxView === 'alert',
                'shrink-0 flex-none justify-center min-w-[2.125rem] px-2 py-2',
              )}
            >
              <span className="relative inline-flex items-center justify-center pr-1 pt-0.5">
                <AlertCircle
                  size={16}
                  className={inboxView === 'alert' ? 'text-red-600' : 'text-slate-500'}
                  aria-hidden
                />
                <CircleFolderCountBadge {...inboxTabCounts.alert} placement="overlay" />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inboxView === 'attention'}
              aria-label="Attention"
              onClick={() => setInboxView('attention')}
              className={circleTabButtonClass(
                inboxView === 'attention',
                'shrink-0 flex-none justify-center min-w-[2.125rem] px-2 py-2',
              )}
            >
              <span className="relative inline-flex items-center justify-center pr-1 pt-0.5">
                <Bell
                  size={16}
                  className={inboxView === 'attention' ? 'text-blue-600' : 'text-slate-500'}
                  aria-hidden
                />
                <CircleFolderCountBadge {...inboxTabCounts.attention} placement="overlay" />
              </span>
            </button>
            </div>
            <span className="w-px h-5 bg-slate-200/90 shrink-0 mx-0.5 self-center" aria-hidden />
            <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={inboxView === 'in_out'}
              onClick={() => setInboxView('in_out')}
              className={circleTabButtonClass(
                inboxView === 'in_out',
                'shrink-0 flex-none justify-center px-2.5 py-2',
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                In/Out
                <CircleFolderCountBadge {...inboxTabCounts.in_out} />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inboxView === 'archived'}
              onClick={() => setInboxView('archived')}
              className={circleTabButtonClass(
                inboxView === 'archived',
                'shrink-0 flex-none justify-center px-2.5 py-2',
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                Archived
                <CircleFolderCountBadge {...inboxTabCounts.archived} />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inboxView === 'deleted'}
              onClick={() => setInboxView('deleted')}
              className={circleTabButtonClass(
                inboxView === 'deleted',
                'shrink-0 flex-none justify-center px-2.5 py-2',
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                Deleted
                <CircleFolderCountBadge {...inboxTabCounts.deleted} />
              </span>
            </button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {inboxView === 'communication_log' ? (
            communicationLog.length > 0 ? (
              <>
                <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50/60 border-b border-indigo-100">
                  <span className="flex flex-1 items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-indigo-900 truncate">
                      Communication log
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 shrink-0">
                      {communicationLog.length}{' '}
                      {communicationLog.length === 1 ? 'day' : 'days'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleMarkAllCommunicationLogRead}
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded-lg hover:bg-indigo-100/80"
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="px-3 py-3 space-y-2 bg-indigo-50/40">
                  {communicationLog.map((msg) => renderInboxRow(msg, { summaryRow: true }))}
                </ul>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
                No communication summaries yet. These appear when your loved one uses Intensive
                Care mode with auto-send enabled and speaks or saves notes during the day.
              </div>
            )
          ) : bucketDirectMessages.length > 0 ? (
            <>
              {inboxView === 'alert' || inboxView === 'attention' || inboxView === 'in_out' ? (
                <div className="px-3 py-1.5 bg-white border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {inboxView === 'alert'
                      ? 'Alerts'
                      : inboxView === 'attention'
                        ? 'Attention'
                        : 'Direct messages'}
                  </p>
                </div>
              ) : null}
              <ul className="divide-y divide-slate-200 bg-white">
                {sortedDirectMessages.map((msg) => renderInboxRow(msg))}
              </ul>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              {inboxView === 'archived'
                ? 'No archived conversations.'
                : inboxView === 'deleted'
                  ? 'No deleted conversations.'
                  : inboxView === 'alert'
                    ? 'No alerts yet. New alerts appear in In/Out until you acknowledge them.'
                    : inboxView === 'attention'
                      ? 'No attention requests yet. New ones appear in In/Out until you acknowledge them.'
                      : 'No messages in In/Out.'}
            </div>
          )}
        </div>
      </div>
      {messageModals}
      </>
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
          currentUserUid={user.uid}
          normalizedEmail={normalizedEmail}
          memberDisplayNames={memberDisplayNames}
          patientDisplayName={patient.displayName}
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
      <>
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
      {messageModals}
      </>
    );
  }

  const selectedStatusHint = circlePatientMessageStatusHint(selectedMessage.status);
  const selectedAlertKind = circleMessageAlertAttentionKind(selectedMessage);
  const canReplyToThread =
    canCircleMemberReplyToPatientMessage(selectedMessage.status) && !selectedAlertKind;

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
              {isIcuDailySummary(selectedMessage)
                ? communicationLogThreadSubtitle(selectedMessage)
                : formatThreadTime(selectedMessage.updatedAt || selectedMessage.createdAt)}
            </p>
          </div>
          {circlePatientMessageBucket(selectedMessage.status) === 'in_out' ? (
          <button
            type="button"
            onClick={() => requestRemoveFromInbox(selectedMessage.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
            aria-label="Remove from your inbox"
          >
            <Trash2 size={18} />
          </button>
          ) : null}
        </div>
        {selectedStatusHint ? (
          <div
            className={cn(
              'mx-4 mb-3 px-3 py-2 rounded-xl text-xs leading-relaxed',
              selectedMessage.status === 'deleted'
                ? 'bg-red-50 text-red-800 border border-red-100'
                : 'bg-amber-50 text-amber-900 border border-amber-100',
            )}
          >
            {selectedStatusHint}
          </div>
        ) : null}
        {showSelectedInitialMessage && selectedInitialMessageUnread ? (
          <div className="px-4 pt-1">{renderNewDivider('new-initial')}</div>
        ) : null}
        {showSelectedInitialMessage ? (
          <div className="px-4 pb-4 pt-1 pl-14">
            <CircleMessageBodyPreview text={selectedMessage.text} />
          </div>
        ) : selectedThreadResurrected ? (
          <p className="px-4 pb-4 pt-1 pl-14 text-[11px] text-slate-400 leading-relaxed">
            Earlier messages in this conversation are hidden from your inbox.
          </p>
        ) : null}
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

      {canReplyToThread ? (
      <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
        <CircleExpandableMessageComposer
          value={replyText}
          onChange={setReplyText}
          placeholder="Type your reply…"
          disabled={sending}
          sending={sending}
          onClear={() => setReplyText('')}
          onSend={handleSendReply}
          clearLabel="Clear"
          sendLabel="Send reply"
          sendingLabel="Sending…"
          expandTitle="Reply to patient message"
        />
      </div>
      ) : selectedAlertKind ? (
        <div
          className={cn(
            'shrink-0 p-4 border-t text-center text-sm leading-relaxed',
            selectedAlertKind === 'alert'
              ? 'border-red-100 bg-red-50/60 text-red-900'
              : 'border-blue-100 bg-blue-50/60 text-blue-900',
          )}
        >
          {circleAlertAttentionReadOnlyHint()}
        </div>
      ) : (
        <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
          Replies are closed — the patient deleted this conversation on their tablet.
        </div>
      )}
    </div>
    {messageModals}
    </>
  );
}
