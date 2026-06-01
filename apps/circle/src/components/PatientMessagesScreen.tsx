import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { normalizeInviteEmail } from '@medxforce/shared';

import type { CirclePatientSummary } from '@medxforce/shared';

type FirestorePatientMessage = {
  id: string;
  subject?: string;
  text: string;
  senderUid: string;
  senderName: string;
  status?: string;
  type?: string;
  circleMemberUids?: string[];
  recipientEmails?: string[];
  createdAt: number;
  updatedAt: number;
  hasNewReply?: boolean;
};

type FirestorePatientReply = {
  id: string;
  patientId: string;
  messageId: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  isPatient: boolean;
  channel: 'app' | 'email';
  timestamp: number;
};

export function PatientMessagesScreen({
  user,
  patient,
  db,
}: {
  user: User;
  patient: CirclePatientSummary;
  db: Firestore;
}) {
  const normalizedEmail = useMemo(
    () => (user.email ? normalizeInviteEmail(user.email) : ''),
    [user.email],
  );
  const senderName = useMemo(
    () => user.displayName || user.email || 'Family Member',
    [user.displayName, user.email],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ messageId: string; data: FirestorePatientMessage }>>(
    [],
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Replies for the currently selected thread
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replies, setReplies] = useState<FirestorePatientReply[]>([]);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const visibleMessagesFilter = useCallback(
    (m: FirestorePatientMessage) => {
      const memberUids = Array.isArray(m.circleMemberUids) ? m.circleMemberUids : [];
      const recipientEmails = Array.isArray(m.recipientEmails) ? m.recipientEmails : [];
      return memberUids.includes(user.uid) || (normalizedEmail && recipientEmails.includes(normalizedEmail));
    },
    [normalizedEmail, user.uid],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const snap = await getDocs(collection(db, 'patients', patient.patientId, 'messages'));
        if (!active) return;

        const items = snap.docs
          .map((d) => ({ messageId: d.id, data: d.data() as FirestorePatientMessage }))
          .filter((m) => visibleMessagesFilter(m.data))
          .sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0));

        setMessages(items);
        setSelectedMessageId((prev) => prev ?? items[0]?.messageId ?? null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load messages.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [db, patient.patientId, visibleMessagesFilter]);

  useEffect(() => {
    if (!selectedMessageId) return;

    setRepliesLoading(true);
    setReplies([]);

    const q = query(
      collection(db, 'patients', patient.patientId, 'messages', selectedMessageId, 'replies'),
      orderBy('timestamp', 'asc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next: FirestorePatientReply[] = snap.docs.map(
          (d) => d.data() as FirestorePatientReply,
        );
        setReplies(next);
        setRepliesLoading(false);
      },
      (err) => {
        console.warn('Replies listener error:', err);
        setRepliesLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, patient.patientId, selectedMessageId]);

  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return messages.find((m) => m.messageId === selectedMessageId) || null;
  }, [messages, selectedMessageId]);

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

      const replyRef = doc(
        db,
        'patients',
        patient.patientId,
        'messages',
        selectedMessageId,
        'replies',
        replyId,
      );
      await setDoc(replyRef, replyDoc, { merge: true });

      // Nudge the thread "new reply" badge for the patient UI.
      // (Rules allow updates only to hasNewReply/updatedAt for non-owners.)
      await updateDoc(doc(db, 'patients', patient.patientId, 'messages', selectedMessageId), {
        hasNewReply: true,
        updatedAt: now,
      });

      setReplyText('');
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

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800">Messages</h3>
          <p className="text-xs text-slate-500">
            Reply to your loved one’s latest message.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading messages…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-slate-500 leading-relaxed">
          No messages yet. When the patient sends you something in MedXForce, it will appear here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {messages.map((m) => {
                const isSelected = m.messageId === selectedMessageId;
                const snippet = (m.data.subject && m.data.subject.trim()) ? m.data.subject : m.data.text;
                return (
                  <button
                    key={m.messageId}
                    type="button"
                    onClick={() => setSelectedMessageId(m.messageId)}
                    className={[
                      'w-full text-left p-4 rounded-2xl border transition-colors',
                      isSelected ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/40',
                    ].join(' ')}
                  >
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {snippet || 'Message'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(m.data.updatedAt || m.data.createdAt).toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {!selectedMessage ? (
                <p className="text-sm text-slate-500">Select a message thread.</p>
              ) : (
                <>
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Patient message
                    </p>
                    <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">
                      {selectedMessage.data.text}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Replies
                      </h4>
                      {repliesLoading && <p className="text-[11px] text-slate-500">Updating…</p>}
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {replies.length === 0 ? (
                        <p className="text-sm text-slate-500">No replies yet.</p>
                      ) : (
                        replies.map((r) => (
                          <div
                            key={r.id}
                            className="p-3 rounded-2xl border border-slate-100 bg-white"
                          >
                            <p className="text-[11px] font-bold text-slate-500">
                              {r.senderName} • {new Date(r.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap mt-1">
                              {r.text}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      placeholder="Type your reply…"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm"
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
                        disabled={sending || !replyText.trim() || !selectedMessageId}
                      >
                        {sending ? 'Sending…' : 'Send reply'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

