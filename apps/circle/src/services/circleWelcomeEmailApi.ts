import type { AcceptedCircleInviteSummary, CirclePatientSummary } from '@medxforce/shared';
import type { User } from 'firebase/auth';

function patientApiBaseUrl(): string | null {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  return explicit ? explicit.replace(/\/$/, '') : null;
}

function welcomeEmailStorageKey(patientId: string, email: string): string {
  return `mxWelcomeEmailSent:${patientId}:${email.toLowerCase()}`;
}

function joinNotifyStorageKey(patientId: string, email: string): string {
  return `mxJoinNotifySent:${patientId}:${email.toLowerCase()}`;
}

function proxyDemotionNotifyStorageKey(
  patientId: string,
  audience: string,
  email: string,
): string {
  return `mxProxyDemotionNotify:${patientId}:${audience}:${email.toLowerCase()}`;
}

function formatRoleLabel(role: string, proxyTier?: string): string {
  if (role === 'proxy') {
    return proxyTier === 'backup' ? 'Backup proxy' : 'Primary proxy';
  }
  const labels: Record<string, string> = {
    caregiver: 'Caregiver',
    friend: 'Friend',
    family: 'Family',
    facility_staff: 'Facility staff',
    admin: 'Care team admin',
  };
  return labels[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

function formatRequestedProxyLabel(tier?: 'primary' | 'backup'): string {
  return tier === 'backup' ? 'Backup proxy' : 'Primary proxy';
}

export async function sendCircleWelcomeEmail(params: {
  email: string;
  memberName?: string;
  patientName?: string;
  roleLabel?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  proxySlotDemotionNote?: string;
}): Promise<{ success: boolean; message?: string }> {
  const base = patientApiBaseUrl();
  if (!base) {
    return { success: false, message: 'Patient API URL not configured.' };
  }

  const res = await fetch(`${base}/api/send-circle-welcome-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<{ success: boolean; message?: string }>;
}

export async function notifyCircleMemberJoined(params: {
  memberEmail: string;
  memberName?: string;
  patientName?: string;
  patientId?: string;
  roleLabel?: string;
}): Promise<{ success: boolean; message?: string }> {
  const base = patientApiBaseUrl();
  if (!base) {
    return { success: false, message: 'Patient API URL not configured.' };
  }

  const res = await fetch(`${base}/api/notify-circle-member-joined`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<{ success: boolean; message?: string }>;
}

export async function notifyCircleProxySlotDemotion(params: {
  recipientEmail: string;
  recipientName?: string;
  memberEmail: string;
  memberName?: string;
  patientName?: string;
  requestedProxyLabel: string;
  demotedRoleLabel: string;
  audience: 'newcomer' | 'slot_holder';
}): Promise<{ success: boolean; message?: string }> {
  const base = patientApiBaseUrl();
  if (!base) {
    return { success: false, message: 'Patient API URL not configured.' };
  }

  const res = await fetch(`${base}/api/notify-circle-proxy-slot-demotion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<{ success: boolean; message?: string }>;
}

export function proxySlotDemotionToastMessage(
  invite: AcceptedCircleInviteSummary,
): string | null {
  if (!invite.proxySlotDemoted || !invite.demotedToRole || !invite.requestedProxyTier) {
    return null;
  }
  const requested = formatRequestedProxyLabel(invite.requestedProxyTier);
  const demoted = formatRoleLabel(invite.demotedToRole);
  return `The ${requested.toLowerCase()} spot was already taken, so you joined as ${demoted}.`;
}

export async function sendWelcomeEmailsForAcceptedInvites(
  user: User,
  accepted: AcceptedCircleInviteSummary[],
  patients: CirclePatientSummary[],
): Promise<void> {
  const email = user.email?.trim();
  if (!email || accepted.length === 0) return;

  const memberName =
    user.displayName?.trim()
    || accepted.find((invite) => invite.contactDisplayName?.trim())?.contactDisplayName?.trim()
    || undefined;

  await Promise.all(
    accepted.map(async (invite) => {
      const storageKey = welcomeEmailStorageKey(invite.patientId, email);
      const notifyKey = joinNotifyStorageKey(invite.patientId, email);
      const patient = patients.find((entry) => entry.patientId === invite.patientId);
      const patientName = patient?.displayName || 'your patient';
      const roleLabel = formatRoleLabel(invite.role, invite.proxyTier);
      const demotionNote = invite.proxySlotDemoted
        ? `You were invited as ${formatRequestedProxyLabel(invite.requestedProxyTier)}, but that spot was already taken. You joined as ${roleLabel} instead.`
        : undefined;

      if (localStorage.getItem(storageKey) !== '1') {
        const result = await sendCircleWelcomeEmail({
          email,
          memberName,
          patientName,
          roleLabel,
          invitedByName: patientName,
          ...(demotionNote ? { proxySlotDemotionNote: demotionNote } : {}),
        });

        if (result.success) {
          localStorage.setItem(storageKey, '1');
        } else {
          console.warn('[Circle] Welcome email not sent:', result.message || invite.patientId);
        }
      }

      if (localStorage.getItem(notifyKey) !== '1') {
        const notify = await notifyCircleMemberJoined({
          memberEmail: email,
          memberName,
          patientName,
          patientId: invite.patientId,
          roleLabel,
        });
        if (notify.success) {
          localStorage.setItem(notifyKey, '1');
        } else {
          console.warn('[Circle] Join notify email not sent:', notify.message || invite.patientId);
        }
      }

      if (invite.proxySlotDemoted && invite.demotedToRole && invite.requestedProxyTier) {
        const requestedProxyLabel = formatRequestedProxyLabel(invite.requestedProxyTier);
        const demotedRoleLabel = formatRoleLabel(invite.demotedToRole);
        const newcomerKey = proxyDemotionNotifyStorageKey(invite.patientId, 'newcomer', email);
        if (localStorage.getItem(newcomerKey) !== '1') {
          const newcomerNotify = await notifyCircleProxySlotDemotion({
            recipientEmail: email,
            recipientName: memberName,
            memberEmail: email,
            memberName,
            patientName,
            requestedProxyLabel,
            demotedRoleLabel,
            audience: 'newcomer',
          });
          if (newcomerNotify.success) {
            localStorage.setItem(newcomerKey, '1');
          } else {
            console.warn(
              '[Circle] Newcomer demotion email not sent:',
              newcomerNotify.message || invite.patientId,
            );
          }
        }

        const holderEmail = invite.slotHolderEmail?.trim();
        if (holderEmail) {
          const holderKey = proxyDemotionNotifyStorageKey(
            invite.patientId,
            'slot_holder',
            holderEmail,
          );
          if (localStorage.getItem(holderKey) !== '1') {
            const holderNotify = await notifyCircleProxySlotDemotion({
              recipientEmail: holderEmail,
              recipientName: invite.slotHolderName,
              memberEmail: email,
              memberName,
              patientName,
              requestedProxyLabel,
              demotedRoleLabel,
              audience: 'slot_holder',
            });
            if (holderNotify.success) {
              localStorage.setItem(holderKey, '1');
            } else {
              console.warn(
                '[Circle] Slot-holder demotion email not sent:',
                holderNotify.message || invite.patientId,
              );
            }
          }
        }
      }
    }),
  );
}
