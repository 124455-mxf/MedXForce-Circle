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
import { listPendingProvisionsForProxy, pendingProvisionToCircleSummary } from './patientProvisions';

export interface CirclePatientSummary {
  patientId: string;
  displayName: string;
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
    const memberSnap = await getDoc(doc(db, 'patients', invite.patientId, 'members', uid));
    if (!memberSnap.exists()) continue;
    const member = memberSnap.data();

    let patientData: Record<string, unknown> | null = null;
    try {
      const patientSnap = await getDoc(doc(db, 'patients', invite.patientId));
      patientData = patientSnap.exists() ? patientSnap.data() : null;
    } catch (err) {
      console.warn('[Circle] Skipping patient in list — insufficient permissions:', invite.patientId, err);
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

    const photoUrl = patientData
      ? String(patientData.photoUrl || '').trim() || undefined
      : undefined;
    const claimedLoginEmail = patientData
      ? String(patientData.claimedLoginEmail || '').trim() || undefined
      : undefined;

    summaries.push({
      patientId: invite.patientId,
      displayName: patientName,
      role,
      proxyTier,
      canUpload: canUploadRichMedia(capabilities),
      capabilities,
      photoUrl,
      claimedLoginEmail,
    });
  }

  return summaries;
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
  return [...active, ...pendingSummaries];
}
