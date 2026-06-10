import {
  collection,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

export interface CircleMessageHiddenRecord {
  messageId: string;
  hiddenAt: number;
}

export type CircleReplyLike = {
  isPatient: boolean;
  timestamp: number;
};

function hiddenMessagesCollection(db: Firestore, patientId: string, uid: string) {
  return collection(db, 'patients', patientId, 'message_inbox', uid, 'hidden');
}

export async function listHiddenCircleMessages(
  db: Firestore,
  patientId: string,
  uid: string,
): Promise<Record<string, CircleMessageHiddenRecord>> {
  const snap = await getDocs(hiddenMessagesCollection(db, patientId, uid));
  const map: Record<string, CircleMessageHiddenRecord> = {};
  for (const row of snap.docs) {
    const data = row.data();
    const hiddenAt = typeof data.hiddenAt === 'number' ? data.hiddenAt : 0;
    if (hiddenAt <= 0) continue;
    map[row.id] = {
      messageId: row.id,
      hiddenAt,
    };
  }
  return map;
}

/** Per-user inbox hide — does not delete the shared thread for the patient or others. */
export async function hideCircleMessageForUser(
  db: Firestore,
  patientId: string,
  uid: string,
  messageId: string,
): Promise<void> {
  const hiddenAt = Date.now();
  await setDoc(
    doc(db, 'patients', patientId, 'message_inbox', uid, 'hidden', messageId),
    {
      messageId,
      hiddenAt,
    },
    { merge: true },
  );
}

export function latestPatientReplyTimestamp(replies: CircleReplyLike[]): number {
  let latest = 0;
  for (const reply of replies) {
    if (!reply.isPatient) continue;
    if (reply.timestamp > latest) latest = reply.timestamp;
  }
  return latest;
}

/** Thread returns to inbox when the patient replies after the member hid it. */
export function isCircleThreadResurrected(
  hiddenAt: number | undefined,
  replies: CircleReplyLike[],
): boolean {
  if (!hiddenAt) return false;
  return latestPatientReplyTimestamp(replies) > hiddenAt;
}

export function shouldShowCircleThreadInInbox(
  hiddenAt: number | undefined,
  replies: CircleReplyLike[],
): boolean {
  if (!hiddenAt) return true;
  return isCircleThreadResurrected(hiddenAt, replies);
}

export function circleRepliesAfterInboxHide<T extends CircleReplyLike>(
  hiddenAt: number | undefined,
  replies: T[],
): T[] {
  if (!hiddenAt) return replies;
  if (!isCircleThreadResurrected(hiddenAt, replies)) return replies;
  return replies.filter((reply) => reply.timestamp > hiddenAt);
}

export function shouldShowCircleThreadInitialMessage(
  hiddenAt: number | undefined,
  messageCreatedAt: number,
  replies: CircleReplyLike[],
): boolean {
  if (!hiddenAt) return true;
  if (!isCircleThreadResurrected(hiddenAt, replies)) return true;
  return messageCreatedAt > hiddenAt;
}
