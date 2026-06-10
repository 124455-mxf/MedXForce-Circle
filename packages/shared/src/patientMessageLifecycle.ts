/** Shared patient ↔ Circle message thread lifecycle (In/Out, Archived, Deleted). */

export type CirclePatientMessageBucket = 'in_out' | 'archived' | 'deleted';

export type FirestorePatientThreadStatus =
  | 'draft'
  | 'note'
  | 'sent'
  | 'sending'
  | 'failed'
  | 'archived'
  | 'deleted';

const ACTIVE_THREAD_STATUSES = new Set<FirestorePatientThreadStatus>([
  'sent',
  'sending',
  'failed',
]);

export function circlePatientMessageBucket(
  status: string | undefined,
): CirclePatientMessageBucket {
  if (status === 'archived') return 'archived';
  if (status === 'deleted') return 'deleted';
  return 'in_out';
}

export function isCirclePatientMessageActive(status: string | undefined): boolean {
  return ACTIVE_THREAD_STATUSES.has(status as FirestorePatientThreadStatus);
}

export function isCirclePatientMessageArchived(status: string | undefined): boolean {
  return status === 'archived';
}

export function isCirclePatientMessageDeleted(status: string | undefined): boolean {
  return status === 'deleted';
}

export function canCircleMemberReplyToPatientMessage(status: string | undefined): boolean {
  return !isCirclePatientMessageDeleted(status);
}

export function circlePatientMessageStatusLabel(status: string | undefined): string {
  if (status === 'archived') return 'Archived on tablet';
  if (status === 'deleted') return 'Deleted on tablet';
  return 'In/Out on tablet';
}

export function circlePatientMessageStatusHint(status: string | undefined): string {
  if (status === 'archived') {
    return 'Your loved one moved this to trash on their tablet. You can still reply.';
  }
  if (status === 'deleted') {
    return 'Your loved one deleted this conversation on their tablet. Replies are closed.';
  }
  return '';
}

/** Patient trash (local status deleted) → Firestore archived — replies still allowed on Circle. */
export function firestoreStatusForPatientTrash(): FirestorePatientThreadStatus {
  return 'archived';
}

export function firestoreStatusForPatientPermanentDelete(): FirestorePatientThreadStatus {
  return 'deleted';
}
