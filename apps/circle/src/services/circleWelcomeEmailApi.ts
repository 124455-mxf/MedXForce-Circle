import type { AcceptedCircleInviteSummary, CirclePatientSummary } from '@medxforce/shared';
import type { User } from 'firebase/auth';

function patientApiBaseUrl(): string | null {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  return explicit ? explicit.replace(/\/$/, '') : null;
}

function welcomeEmailStorageKey(patientId: string, email: string): string {
  return `mxWelcomeEmailSent:${patientId}:${email.toLowerCase()}`;
}

function formatRoleLabel(role: string, proxyTier?: string): string {
  if (role === 'proxy') {
    return proxyTier === 'backup' ? 'Backup proxy' : 'Proxy';
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

export async function sendCircleWelcomeEmail(params: {
  email: string;
  memberName?: string;
  patientName?: string;
  roleLabel?: string;
  invitedByName?: string;
  invitedByEmail?: string;
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
      if (localStorage.getItem(storageKey) === '1') return;

      const patient = patients.find((entry) => entry.patientId === invite.patientId);
      const patientName = patient?.displayName || 'your patient';
      const result = await sendCircleWelcomeEmail({
        email,
        memberName,
        patientName,
        roleLabel: formatRoleLabel(invite.role, invite.proxyTier),
        invitedByName: patientName,
      });

      if (result.success) {
        localStorage.setItem(storageKey, '1');
      } else {
        console.warn('[Circle] Welcome email not sent:', result.message || invite.patientId);
      }
    }),
  );
}
