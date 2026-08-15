import { normalizeInviteEmail } from '@medxforce/shared';
import type { CircleMemberDisplayNameMaps } from '../hooks/useCirclePatientMemberDisplayNames';
import type { CircleThreadMessage } from '../hooks/circlePatientMessagingTypes';

export type CircleMessageRecipient = {
  key: string;
  name: string;
};

export function resolveCircleMessageRecipients(
  message: Pick<CircleThreadMessage, 'recipientEmails' | 'circleMemberUids'>,
  names: CircleMemberDisplayNameMaps,
): CircleMessageRecipient[] {
  const seen = new Set<string>();
  const recipients: CircleMessageRecipient[] = [];

  for (const raw of message.recipientEmails ?? []) {
    const email = normalizeInviteEmail(raw);
    if (!email || seen.has(`e:${email}`)) continue;
    seen.add(`e:${email}`);
    recipients.push({
      key: email,
      name: names.byEmail[email] || email,
    });
  }

  for (const raw of message.circleMemberUids ?? []) {
    const uid = raw.trim();
    if (!uid || seen.has(`u:${uid}`)) continue;
    const name = names.byUid[uid];
    if (name && recipients.some((recipient) => recipient.name === name)) continue;
    seen.add(`u:${uid}`);
    recipients.push({
      key: uid,
      name: name || uid,
    });
  }

  return recipients;
}

export function isMultiRecipientCircleMessage(
  message: Pick<CircleThreadMessage, 'recipientEmails' | 'circleMemberUids'>,
  names: CircleMemberDisplayNameMaps,
): boolean {
  return resolveCircleMessageRecipients(message, names).length > 1;
}

export function formatCircleRecipientPreviewNames(
  names: string[],
  visible = 2,
): string {
  if (names.length <= visible) return names.join(', ');
  return `${names.slice(0, visible).join(', ')}…`;
}
