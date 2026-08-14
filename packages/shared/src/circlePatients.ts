import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { CircleInviteRecord } from './circleInvites';
import {
  canUploadRichMedia,
  mergeMemberCapabilities,
  normalizeMemberRole,
  type CircleMemberRole,
  type PatientCapabilities,
} from './patientPermissions';
import { resolveCircleAccessForInviteEmail } from './circleMemberRoles';
import { parseCircleProfileSnapshot } from './circlePatientProfile';
import { listPendingProvisionsForProxy, pendingProvisionToCircleSummary } from './patientProvisions';

/** True when Circle can render the URL in an `<img>` (not blob/data/local paths). */
export function isCircleDisplayablePhotoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false;
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

/** Prefer the first loadable patient photo among snapshot + patients/{id}.photoUrl. */
export function resolveCirclePatientPhotoUrl(
  ...candidates: Array<string | undefined | null>
): string | undefined {
  for (const candidate of candidates) {
    if (isCircleDisplayablePhotoUrl(candidate)) return candidate.trim();
  }
  return undefined;
}

export interface CirclePatientSummary {
  patientId: string;
  displayName: string;
  /** Profile identity first name when known (used for A–Z sort). */
  firstName?: string;
  /** Profile identity last name when known (used for A–Z sort). */
  lastName?: string;
  role: string;
  proxyTier?: 'primary' | 'backup';
  canUpload: boolean;
  capabilities: PatientCapabilities;
  /** Patient profile photo from the patient app (Firestore patients/{id}.photoUrl). */
  photoUrl?: string;
  /** Proxy-led setup not yet linked on a patient iPad. */
  isPendingProvision?: boolean;
  provisionStatus?: 'pending' | 'claimed';
  /** Shown to the proxy who created the pending provision (no SMS/email needed). */
  setupCode?: string;
  /** Optional email the proxy expects on the patient iPad. */
  intendedEmail?: string;
  /** Patient app sign-in email after the iPad is linked. */
  claimedLoginEmail?: string;
}

/** Split a display name into first / remaining last for A–Z sorting. */
export function patientNameSortParts(patient: Pick<
  CirclePatientSummary,
  'displayName' | 'firstName' | 'lastName'
>): { first: string; last: string } {
  const first = patient.firstName?.trim() ?? '';
  const last = patient.lastName?.trim() ?? '';
  if (first || last) return { first, last };
  const parts = patient.displayName.trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] ?? '',
    last: parts.slice(1).join(' '),
  };
}

/** Sort patients by first name, then last name (A–Z). */
export function compareCirclePatientsByName(
  a: CirclePatientSummary,
  b: CirclePatientSummary,
): number {
  const aParts = patientNameSortParts(a);
  const bParts = patientNameSortParts(b);
  const byFirst = aParts.first.localeCompare(bParts.first, undefined, { sensitivity: 'base' });
  if (byFirst !== 0) return byFirst;
  const byLast = aParts.last.localeCompare(bParts.last, undefined, { sensitivity: 'base' });
  if (byLast !== 0) return byLast;
  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
}

export function sortCirclePatientsByName(
  patients: readonly CirclePatientSummary[],
): CirclePatientSummary[] {
  return [...patients].sort(compareCirclePatientsByName);
}

/** Patients this circle user may access (accepted invites + active member doc). */
export async function listCirclePatientsForUser(
  db: Firestore,
  uid: string,
): Promise<CirclePatientSummary[]> {
  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );

  const summaries: CirclePatientSummary[] = [];

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId =
      typeof invite.patientId === 'string' ? invite.patientId.trim() : '';
    if (!patientId) {
      console.warn('[Circle] Skipping accepted invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberSnap = await getDoc(doc(db, 'patients', patientId, 'members', uid));
    if (!memberSnap.exists()) continue;
    const member = memberSnap.data();

    let patientData: Record<string, unknown> | null = null;
    try {
      const patientSnap = await getDoc(doc(db, 'patients', patientId));
      patientData = patientSnap.exists() ? patientSnap.data() : null;
    } catch (err) {
      console.warn('[Circle] Skipping patient in list — insufficient permissions:', patientId, err);
      continue;
    }
    const patientName =
      (patientData && String(patientData.displayName || '')) ||
      invite.displayName ||
      'Patient';

    const resolved = resolveCircleAccessForInviteEmail(
      patientData as {
        caregivers?: Record<string, unknown>[];
        friendsAndFamily?: Record<string, unknown>[];
        circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
      },
      invite.invitedEmail,
      {
        memberRole: typeof member?.role === 'string' ? member.role : undefined,
        memberProxyTier:
          member?.proxyTier === 'backup' || member?.proxyTier === 'primary'
            ? member.proxyTier
            : undefined,
        inviteRole: invite.role,
        inviteProxyTier:
          invite.proxyTier === 'backup' || invite.proxyTier === 'primary'
            ? invite.proxyTier
            : undefined,
      },
    );
    const role = normalizeMemberRole(resolved.role) as CircleMemberRole;
    const proxyTier =
      role === 'proxy' &&
      (resolved.proxyTier === 'backup' || resolved.proxyTier === 'primary')
        ? resolved.proxyTier
        : undefined;
    const capabilities = mergeMemberCapabilities(
      role,
      (member?.capabilities as Partial<PatientCapabilities> | undefined) ??
        invite.capabilities,
    );

    const snapshot = patientData
      ? parseCircleProfileSnapshot(patientData.profileSnapshot)
      : null;
    const photoUrl = resolveCirclePatientPhotoUrl(
      snapshot?.identity.profilePicture,
      patientData ? String(patientData.photoUrl || '') : undefined,
    );
    const claimedLoginEmail = patientData
      ? String(patientData.claimedLoginEmail || '').trim() || undefined
      : undefined;
    const firstName = snapshot?.identity.firstName?.trim() || undefined;
    const lastName = snapshot?.identity.lastName?.trim() || undefined;

    summaries.push({
      patientId,
      displayName: patientName,
      firstName,
      lastName,
      role,
      proxyTier,
      canUpload: canUploadRichMedia(capabilities),
      capabilities,
      photoUrl,
      claimedLoginEmail,
    });
  }

  return sortCirclePatientsByName(summaries);
}

/** Active patients plus proxy-created provisions waiting for iPad setup. */
export async function listCirclePatientsAndProvisionsForUser(
  db: Firestore,
  uid: string,
): Promise<CirclePatientSummary[]> {
  const active = await listCirclePatientsForUser(db, uid);
  const pending = await listPendingProvisionsForProxy(db, uid);
  const activeIds = new Set(active.map((p) => p.patientId));
  const pendingSummaries = pending
    .filter((p) => !activeIds.has(p.provisionId))
    .map(pendingProvisionToCircleSummary);
  return sortCirclePatientsByName([...active, ...pendingSummaries]);
}
