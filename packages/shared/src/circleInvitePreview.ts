import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { circleInviteDocId, type CircleInviteStatus } from './circleInvites';
import type { CircleContactKind, CircleManagedContact } from './circleContactManagement';
import { normalizeInviteEmail } from './patientPermissions';

export type CircleInvitePreviewAction = 'invite' | 'reinvite' | 'revoke';

export type CircleInvitePreviewItem = {
  name: string;
  email: string;
  role: string;
  action: CircleInvitePreviewAction;
};

function isValidInviteEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function roleFromKind(kind: CircleContactKind): string | null {
  if (kind === 'caregiver') return 'caregiver';
  if (kind === 'family') return 'family';
  if (kind === 'friend') return 'friend';
  return null;
}

/** Preview Circle invite grant/revoke before proxy saves a managed contact. */
export async function previewManagedContactInviteChange(
  db: Firestore,
  patientId: string,
  contact: Pick<CircleManagedContact, 'id' | 'name' | 'email' | 'kind'>,
  options: { previousEmail?: string } = {},
): Promise<CircleInvitePreviewItem[]> {
  const items: CircleInvitePreviewItem[] = [];
  const email = normalizeInviteEmail(contact.email || '');
  const previousEmail = normalizeInviteEmail(options.previousEmail || '');
  const displayName = contact.name.trim() || email;

  const pushRevokeIfActive = async (targetEmail: string, name: string) => {
    if (!targetEmail) return;
    const inviteRef = doc(db, 'circle_invites', circleInviteDocId(patientId, targetEmail));
    const existing = await getDoc(inviteRef);
    if (!existing.exists()) return;
    const status = existing.data()?.status as CircleInviteStatus | undefined;
    if (status === 'revoked') return;
    items.push({
      name: name || targetEmail,
      email: targetEmail,
      role: String(existing.data()?.role ?? 'member'),
      action: 'revoke',
    });
  };

  const pushInviteIfNeeded = async (targetEmail: string, name: string, kind: CircleContactKind) => {
    const role = roleFromKind(kind);
    if (!role || !isValidInviteEmail(targetEmail)) return;

    const inviteRef = doc(db, 'circle_invites', circleInviteDocId(patientId, targetEmail));
    const existing = await getDoc(inviteRef);
    const status = existing.exists()
      ? (existing.data()?.status as CircleInviteStatus | undefined)
      : undefined;

    if (!existing.exists()) {
      items.push({ name, email: targetEmail, role, action: 'invite' });
      return;
    }
    if (status === 'revoked') {
      items.push({ name, email: targetEmail, role, action: 'reinvite' });
    }
  };

  if (contact.kind === 'contact') {
    if (email) await pushRevokeIfActive(email, displayName);
    if (previousEmail && previousEmail !== email) {
      await pushRevokeIfActive(previousEmail, displayName);
    }
    return items;
  }

  if (previousEmail && previousEmail !== email) {
    await pushRevokeIfActive(previousEmail, displayName);
  }

  if (email) {
    await pushInviteIfNeeded(email, displayName, contact.kind);
  }

  return items;
}

/** Preview Circle invite revoke when removing a person from the patient list. */
export async function previewManagedContactDeleteInviteChange(
  db: Firestore,
  patientId: string,
  contact: Pick<CircleManagedContact, 'name' | 'email' | 'kind'>,
): Promise<CircleInvitePreviewItem[]> {
  const email = normalizeInviteEmail(contact.email || '');
  if (!email || contact.kind === 'contact') return [];

  const inviteRef = doc(db, 'circle_invites', circleInviteDocId(patientId, email));
  const existing = await getDoc(inviteRef);
  if (!existing.exists()) return [];

  const status = existing.data()?.status as CircleInviteStatus | undefined;
  if (status === 'revoked') return [];

  const displayName = contact.name.trim() || email;
  return [
    {
      name: displayName,
      email,
      role: String(existing.data()?.role ?? 'member'),
      action: 'revoke',
    },
  ];
}

/** Preview revoke for Circle access tab (by invite email). */
export async function previewCircleAccessRevoke(
  db: Firestore,
  patientId: string,
  invitedEmail: string,
  displayName?: string,
): Promise<CircleInvitePreviewItem[]> {
  const email = normalizeInviteEmail(invitedEmail);
  if (!email) return [];

  const inviteRef = doc(db, 'circle_invites', circleInviteDocId(patientId, email));
  const existing = await getDoc(inviteRef);
  if (!existing.exists()) return [];

  const status = existing.data()?.status as CircleInviteStatus | undefined;
  if (status === 'revoked') return [];

  return [
    {
      name: displayName?.trim() || email,
      email,
      role: String(existing.data()?.role ?? 'member'),
      action: 'revoke',
    },
  ];
}

/** Emails that should keep active invites after a full contact list sync. */
export async function listActiveInviteEmailsForPatient(
  db: Firestore,
  patientId: string,
): Promise<Set<string>> {
  const snap = await getDocs(
    query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
  );
  const emails = new Set<string>();
  for (const inviteDoc of snap.docs) {
    const data = inviteDoc.data();
    const email = normalizeInviteEmail(String(data.invitedEmail ?? ''));
    const status = data.status as CircleInviteStatus | undefined;
    if (email && status !== 'revoked') emails.add(email);
  }
  return emails;
}
