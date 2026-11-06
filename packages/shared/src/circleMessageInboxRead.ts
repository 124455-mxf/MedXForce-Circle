import { doc, writeBatch, type Firestore } from 'firebase/firestore';

export interface CircleMessageReadRecord {
  messageId: string;
  lastReadAt: number;
}

const WRITE_CHUNK = 400;

export function circleMessageInboxReadDocPath(
  patientId: string,
  uid: string,
  messageId: string,
): [string, string, string, string, string, string] {
  return ['patients', patientId, 'message_inbox', uid, 'read', messageId];
}

export function parseCircleMessageReadRecord(
  id: string,
  data: Record<string, unknown> | undefined,
): CircleMessageReadRecord | null {
  const messageId =
    (typeof data?.messageId === 'string' && data.messageId.trim()) || id.trim();
  const lastReadAt = typeof data?.lastReadAt === 'number' ? data.lastReadAt : 0;
  if (!messageId || lastReadAt <= 0) return null;
  return { messageId, lastReadAt };
}

/** Per-member In/Out last-read timestamps. Never decreases a stored value. */
export async function persistCircleMessageInboxReads(
  db: Firestore,
  patientId: string,
  uid: string,
  lastReadByMessageId: Record<string, number>,
): Promise<void> {
  const entries = Object.entries(lastReadByMessageId).filter(
    ([messageId, lastReadAt]) => messageId.trim().length > 0 && lastReadAt > 0,
  );
  for (let i = 0; i < entries.length; i += WRITE_CHUNK) {
    const batch = writeBatch(db);
    for (const [messageId, lastReadAt] of entries.slice(i, i + WRITE_CHUNK)) {
      batch.set(
        doc(db, ...circleMessageInboxReadDocPath(patientId, uid, messageId)),
        { messageId, lastReadAt },
        { merge: true },
      );
    }
    await batch.commit();
  }
}
