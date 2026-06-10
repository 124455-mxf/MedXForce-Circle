import { normalizeInviteEmail } from './patientPermissions';

export type MessageReplyAudience = {
  recipientEmails?: string[];
  circleMemberUids?: string[];
};

function normalizedRecipientEmails(emails: unknown): string[] {
  if (!Array.isArray(emails)) return [];
  return [
    ...new Set(
      emails
        .map((value) => normalizeInviteEmail(String(value ?? '')))
        .filter(Boolean),
    ),
  ];
}

function normalizedRecipientUids(uids: unknown): string[] {
  if (!Array.isArray(uids)) return [];
  return [...new Set(uids.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

/** Missing/empty audience = broadcast to everyone on the thread (legacy + reply-to-all). */
export function isPatientReplyBroadcast(reply: MessageReplyAudience): boolean {
  return (
    normalizedRecipientEmails(reply.recipientEmails).length === 0 &&
    normalizedRecipientUids(reply.circleMemberUids).length === 0
  );
}

export function isPatientReplyVisibleToCircleMember(
  reply: MessageReplyAudience & { isPatient?: boolean },
  member: { uid: string; email?: string },
): boolean {
  if (!reply.isPatient) return true;
  if (isPatientReplyBroadcast(reply)) return true;

  const emails = normalizedRecipientEmails(reply.recipientEmails);
  const uids = normalizedRecipientUids(reply.circleMemberUids);
  const memberEmail = normalizeInviteEmail(member.email || '');
  if (memberEmail && emails.includes(memberEmail)) return true;
  if (member.uid && uids.includes(member.uid)) return true;
  return false;
}
