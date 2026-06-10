import { normalizeInviteEmail } from '@medxforce/shared';
import type { CircleThreadReply } from '../hooks/useCirclePatientThreads';

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function humanizeEmailLocalPart(email: string): string {
  const local = email.split('@')[0]?.trim() || email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return local;
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function replyEmails(reply: CircleThreadReply): string[] {
  const seen = new Set<string>();
  const values = [reply.senderEmail, reply.senderName];
  const emails: string[] = [];
  for (const raw of values) {
    const normalized = normalizeInviteEmail(String(raw ?? ''));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    emails.push(normalized);
  }
  return emails;
}

export function resolveCircleReplySenderLabel(
  reply: CircleThreadReply,
  maps: { byUid: Record<string, string>; byEmail: Record<string, string> },
  patientDisplayName: string,
): string {
  if (reply.isPatient) {
    return patientDisplayName.trim() || 'Patient';
  }

  const uid = String(reply.senderUid ?? '').trim();
  if (uid && maps.byUid[uid]) return maps.byUid[uid];

  for (const email of replyEmails(reply)) {
    if (maps.byEmail[email]) return maps.byEmail[email];
  }

  const rawName = String(reply.senderName ?? '').trim();
  if (rawName && !isLikelyEmail(rawName)) return rawName;

  if (rawName && isLikelyEmail(rawName)) {
    return humanizeEmailLocalPart(rawName);
  }

  for (const email of replyEmails(reply)) {
    return humanizeEmailLocalPart(email);
  }

  return 'Circle member';
}
