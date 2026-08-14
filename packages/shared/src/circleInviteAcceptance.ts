import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  mergeMemberCapabilities,
  normalizeInviteEmail,
  normalizeMemberRole,
  capabilitiesForRole,
  type CircleMemberRole,
  type PatientCapabilities,
} from './patientPermissions';
import type { CircleInviteRecord } from './circleInvites';
import { memberRecordFromInvite } from './circleInvites';
import {
  type ProxyTier,
  publishCircleAccessIndexFromPatientDoc,
  resolveCircleAccessForInviteEmail,
} from './circleMemberRoles';
import {
  findManagedContactByEmail,
  listPatientManagedContacts,
  upsertPatientManagedContact,
  type CircleContactKind,
} from './circleContactManagement';
import {
  hasRepairedMemberCapabilitiesThisSession,
  isFirestoreQuotaError,
  markMemberCapabilitiesRepairedThisSession,
} from './firestoreQuota';

function validInvitePatientId(invite: Partial<CircleInviteRecord>): string | null {
  const patientId =
    typeof invite.patientId === 'string' ? invite.patientId.trim() : '';
  return patientId || null;
}

function contactKindForMemberRole(role: CircleMemberRole): CircleContactKind {
  if (role === 'friend') return 'friend';
  if (role === 'family') return 'family';
  return 'caregiver';
}

function displayNameForEnsuredContact(email: string, displayName?: string): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  const local = email.split('@')[0]?.trim();
  return local || 'Circle member';
}

/**
 * Accepted Circle members need a patient managed-contact row for "My contact details"
 * and patient-app Circle lists. Invites can be accepted even when that row was deleted
 * or never created (re-invite / orphan invite).
 */
export async function ensureManagedContactForAcceptedMember(
  db: Firestore,
  patientId: string,
  params: {
    email: string;
    role: CircleMemberRole | string;
    proxyTier?: ProxyTier;
    displayName?: string;
    contactId?: string;
  },
): Promise<boolean> {
  const email = normalizeInviteEmail(params.email);
  if (!email) return false;

  const existing = findManagedContactByEmail(
    await listPatientManagedContacts(db, patientId),
    email,
  );
  if (existing) return false;

  const role = normalizeMemberRole(String(params.role || 'caregiver'));
  const kind = contactKindForMemberRole(role);
  const notify =
    kind === 'contact'
      ? { message: true, sms: false, alert: false, attention: false }
      : { message: true, sms: true, alert: true, attention: true };

  await upsertPatientManagedContact(
    db,
    patientId,
    {
      id: params.contactId?.trim() || undefined,
      name: displayNameForEnsuredContact(email, params.displayName),
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email,
      mobile: '',
      relationship: '',
      kind,
      language: 'English',
      ...notify,
      circleRole: role,
      ...(role === 'proxy' && params.proxyTier ? { proxyTier: params.proxyTier } : {}),
    },
    {
      // Invite is already accepted — do not re-sync status/role from this heal.
      syncInvite: false,
      // Own-contact rules omit circleAccessByEmail; proxies may still refresh index below.
      updateAccessIndex: false,
    },
  );

  try {
    const patientSnap = await getDoc(doc(db, 'patients', patientId));
    if (patientSnap.exists()) {
      await publishCircleAccessIndexFromPatientDoc(
        db,
        patientId,
        patientSnap.data() as PatientContactArrays,
      );
    }
  } catch (err) {
    console.warn('[Circle] Access index refresh after contact ensure skipped —', err);
  }

  return true;
}

/** Backfill missing patient contacts for all accepted invites of this member. */
export async function ensureManagedContactsForAcceptedMembersForUser(
  db: Firestore,
  uid: string,
  actorEmail: string,
): Promise<number> {
  const email = normalizeInviteEmail(actorEmail);
  if (!email) return 0;

  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) return 0;

  let created = 0;
  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId = validInvitePatientId(invite);
    if (!patientId) {
      console.warn('[Circle] Skipping accepted invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberSnap = await getDoc(doc(db, 'patients', patientId, 'members', uid));
    if (!memberSnap.exists()) continue;
    const memberData = memberSnap.data() as {
      role?: string;
      proxyTier?: string;
      displayName?: string;
      status?: string;
    };
    if (String(memberData.status || 'active') !== 'active') continue;

    const role = normalizeMemberRole(String(memberData.role || invite.role || 'caregiver'));
    const proxyTier =
      role === 'proxy'
        ? memberData.proxyTier === 'backup' || invite.proxyTier === 'backup'
          ? 'backup'
          : 'primary'
        : undefined;

    try {
      const didCreate = await ensureManagedContactForAcceptedMember(db, patientId, {
        email: invite.invitedEmail || email,
        role,
        proxyTier,
        displayName:
          (typeof memberData.displayName === 'string' && memberData.displayName.trim()) ||
          invite.displayName,
        contactId: invite.contactId,
      });
      if (didCreate) created += 1;
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        console.warn('[Circle] Contact ensure skipped — Firestore daily write quota exceeded.');
        break;
      }
      console.warn('[Circle] Could not ensure contact for patient', patientId, err);
    }
  }

  return created;
}

function memberDocNeedsCapabilityRepair(
  stored: Partial<PatientCapabilities> | undefined,
  role: string,
  inviteCaps?: PatientCapabilities,
): boolean {
  if (stored?.messaging === true) return false;
  const merged = mergeMemberCapabilities(role, inviteCaps);
  return merged.messaging === true;
}

export type AcceptedCircleInviteSummary = {
  patientId: string;
  role: string;
  proxyTier?: 'primary' | 'backup';
  invitedEmail: string;
  contactDisplayName?: string;
  /** True when the invite was proxy but the slot was already taken. */
  proxySlotDemoted?: boolean;
  /** Role after demotion (caregiver or family). */
  demotedToRole?: 'caregiver' | 'family';
  requestedProxyTier?: 'primary' | 'backup';
  slotHolderEmail?: string;
  slotHolderName?: string;
};

type PatientContactArrays = {
  caregivers?: Record<string, unknown>[];
  friendsAndFamily?: Record<string, unknown>[];
  circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
};

function contactEmail(contact: Record<string, unknown>): string {
  const raw = contact.email ?? contact.emailVerify;
  return typeof raw === 'string' ? normalizeInviteEmail(raw) : '';
}

function inviteProxyTier(invite: CircleInviteRecord): ProxyTier | null {
  if (invite.role !== 'proxy') return null;
  return invite.proxyTier === 'backup' ? 'backup' : 'primary';
}

/** Prefer caregiver list → caregiver; Friends & Family → family. */
export function demotedRoleForProxyOverflow(
  patientData: PatientContactArrays | null | undefined,
  invitedEmail: string,
): 'caregiver' | 'family' {
  const email = normalizeInviteEmail(invitedEmail);
  if (!email || !patientData) return 'caregiver';

  for (const contact of patientData.caregivers || []) {
    if (contactEmail(contact) === email) return 'caregiver';
  }
  for (const contact of patientData.friendsAndFamily || []) {
    if (contactEmail(contact) === email) return 'family';
  }
  return 'caregiver';
}

async function findAcceptedProxySlotHolder(
  db: Firestore,
  patientId: string,
  tier: ProxyTier,
  excludeEmail: string,
): Promise<{ uid: string; email: string; displayName?: string } | null> {
  const membersSnap = await getDocs(collection(db, 'patients', patientId, 'members'));
  for (const memberDoc of membersSnap.docs) {
    const data = memberDoc.data() as {
      role?: string;
      proxyTier?: string;
      status?: string;
      invitedEmail?: string;
      displayName?: string;
    };
    if (String(data.status || 'active') !== 'active') continue;
    if (normalizeMemberRole(String(data.role || '')) !== 'proxy') continue;
    const memberTier = data.proxyTier === 'backup' ? 'backup' : 'primary';
    if (memberTier !== tier) continue;
    const memberEmail = normalizeInviteEmail(String(data.invitedEmail || ''));
    if (memberEmail && memberEmail === excludeEmail) continue;
    return {
      uid: memberDoc.id,
      email: memberEmail,
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : undefined,
    };
  }
  return null;
}

function applyDemotedRoleToContact(
  contact: Record<string, unknown>,
  demotedRole: 'caregiver' | 'family',
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...contact, circleRole: demotedRole };
  delete next.proxyTier;
  return next;
}

async function syncDemotedContactOnPatientDoc(
  db: Firestore,
  patientId: string,
  invitedEmail: string,
  demotedRole: 'caregiver' | 'family',
): Promise<void> {
  const email = normalizeInviteEmail(invitedEmail);
  if (!email) return;

  const patientRef = doc(db, 'patients', patientId);
  const patientSnap = await getDoc(patientRef);
  if (!patientSnap.exists()) return;

  const patientData = patientSnap.data() as PatientContactArrays;
  const caregivers = (patientData.caregivers || []).map((c) => ({ ...c }));
  const friendsAndFamily = (patientData.friendsAndFamily || []).map((c) => ({ ...c }));
  let changed = false;

  for (let i = 0; i < caregivers.length; i++) {
    if (contactEmail(caregivers[i]) !== email) continue;
    caregivers[i] = applyDemotedRoleToContact(caregivers[i], 'caregiver');
    changed = true;
  }
  for (let i = 0; i < friendsAndFamily.length; i++) {
    if (contactEmail(friendsAndFamily[i]) !== email) continue;
    friendsAndFamily[i] = applyDemotedRoleToContact(
      friendsAndFamily[i],
      demotedRole === 'caregiver' ? 'family' : demotedRole,
    );
    changed = true;
  }

  if (!changed) return;

  await setDoc(
    patientRef,
    {
      caregivers,
      friendsAndFamily,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  await publishCircleAccessIndexFromPatientDoc(db, patientId, {
    caregivers,
    friendsAndFamily,
    circleAccessByEmail: patientData.circleAccessByEmail,
  });
}

/** After sign-in: link pending invites to members/{uid} for upload rules. */
export async function acceptPendingCircleInvites(
  db: Firestore,
  user: User,
): Promise<AcceptedCircleInviteSummary[]> {
  const email = user.email ? normalizeInviteEmail(user.email) : '';
  if (!email) return [];

  const pending = query(
    collection(db, 'circle_invites'),
    where('invitedEmail', '==', email),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(pending);
  if (snap.empty) return [];

  const accepted: AcceptedCircleInviteSummary[] = [];

  for (const inviteDoc of snap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId = validInvitePatientId(invite);
    if (!patientId) {
      console.warn('[Circle] Skipping pending invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberRef = doc(db, 'patients', patientId, 'members', user.uid);
    const memberSnap = await getDoc(memberRef);

    let patientData: PatientContactArrays | null = null;
    try {
      const patientSnap = await getDoc(doc(db, 'patients', patientId));
      patientData = patientSnap.exists() ? (patientSnap.data() as PatientContactArrays) : null;
    } catch (err) {
      console.warn('[Circle] Patient read skipped during invite accept —', err);
    }

    const requestedTier = inviteProxyTier(invite);
    let effectiveRole: CircleMemberRole = normalizeMemberRole(invite.role);
    let effectiveTier: ProxyTier | undefined =
      effectiveRole === 'proxy' ? requestedTier || 'primary' : undefined;
    let demotion: AcceptedCircleInviteSummary | null = null;

    if (requestedTier) {
      try {
        const holder = await findAcceptedProxySlotHolder(
          db,
          patientId,
          requestedTier,
          email,
        );
        if (holder) {
          const demotedToRole = demotedRoleForProxyOverflow(patientData, email);
          effectiveRole = demotedToRole;
          effectiveTier = undefined;
          demotion = {
            patientId,
            role: demotedToRole,
            invitedEmail: invite.invitedEmail,
            contactDisplayName: invite.displayName,
            proxySlotDemoted: true,
            demotedToRole,
            requestedProxyTier: requestedTier,
            slotHolderEmail: holder.email || undefined,
            slotHolderName: holder.displayName,
          };
        }
      } catch (err) {
        console.warn('[Circle] Proxy slot check skipped —', err);
      }
    }

    const capabilities = mergeMemberCapabilities(
      effectiveRole,
      demotion ? capabilitiesForRole(effectiveRole) : invite.capabilities,
    );

    const memberBase = demotion
      ? {
          role: effectiveRole,
          capabilities,
          status: 'active' as const,
          invitedEmail: invite.invitedEmail,
          updatedAt: Date.now(),
          ...(invite.displayName?.trim() ? { displayName: invite.displayName.trim() } : {}),
          ...(invite.contactId?.trim() ? { contactId: invite.contactId.trim() } : {}),
        }
      : memberRecordFromInvite(invite, user.uid);

    let memberPayload: Record<string, unknown> | null = null;
    if (!memberSnap.exists()) {
      memberPayload = {
        ...memberBase,
        inviteRef: inviteDoc.id,
      };
      if (effectiveTier) {
        memberPayload.proxyTier = effectiveTier;
      }
    }

    const inviteUpdate: Record<string, unknown> = {
      status: 'accepted',
      acceptedByUid: user.uid,
      updatedAt: Date.now(),
    };
    if (demotion) {
      inviteUpdate.role = effectiveRole;
      inviteUpdate.capabilities = capabilities;
      inviteUpdate.proxyTier = deleteField();
      inviteUpdate.proxySlotDemotedAt = Date.now();
      inviteUpdate.proxySlotDemotedTo = effectiveRole;
      inviteUpdate.requestedProxyTier = requestedTier;
      if (demotion.slotHolderEmail) {
        inviteUpdate.proxySlotHeldByEmail = demotion.slotHolderEmail;
      }
    }

    try {
      // Keep these writes separate. Member-create rules validate the invite while it is
      // still pending; invite-update rules then validate the accepting account. A batch
      // can make those rule reads observe incompatible before/after states.
      if (memberPayload) {
        await setDoc(memberRef, memberPayload, { merge: true });
      }
      await setDoc(inviteDoc.ref, inviteUpdate, { merge: true });

      if (demotion) {
        try {
          await syncDemotedContactOnPatientDoc(
            db,
            patientId,
            email,
            demotion.demotedToRole!,
          );
        } catch (err) {
          console.warn('[Circle] Contact demotion sync skipped —', err);
        }
      }

      try {
        await ensureManagedContactForAcceptedMember(db, patientId, {
          email,
          role: effectiveRole,
          proxyTier: effectiveTier,
          displayName: invite.displayName,
          contactId: invite.contactId,
        });
      } catch (err) {
        console.warn('[Circle] Contact ensure after accept skipped —', err);
      }

      accepted.push(
        demotion || {
          patientId,
          role: effectiveRole,
          proxyTier: effectiveTier,
          invitedEmail: invite.invitedEmail,
          contactDisplayName: invite.displayName,
        },
      );
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        console.warn('[Circle] Invite acceptance skipped — Firestore daily write quota exceeded.');
        break;
      }
      console.warn('[Circle] Could not accept invite for patient', patientId, err);
    }
  }

  return accepted;
}

/** Repair accepted invites that never got a members/{uid} doc (legacy / partial writes). */
export async function repairOrphanAcceptedInvitesForUser(
  db: Firestore,
  uid: string,
): Promise<number> {
  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) return 0;

  let repairs = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId = validInvitePatientId(invite);
    if (!patientId) {
      console.warn('[Circle] Skipping orphan repair for invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberRef = doc(db, 'patients', patientId, 'members', uid);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) continue;

    try {
      const batch = writeBatch(db);
      batch.set(
        memberRef,
        {
          ...memberRecordFromInvite(invite, uid),
          inviteRef: inviteDoc.id,
        },
        { merge: true },
      );
      await batch.commit();
      repairs += 1;
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        console.warn('[Circle] Orphan invite repair skipped — Firestore daily write quota exceeded.');
        break;
      }
      console.warn('[Circle] Could not repair orphan invite for patient', patientId, err);
    }
  }

  return repairs;
}

/** Reactivate member docs stuck on a non-active status despite an accepted invite. */
export async function repairInactiveAcceptedMemberDocsForUser(
  db: Firestore,
  uid: string,
): Promise<number> {
  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) return 0;

  let repairs = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId = validInvitePatientId(invite);
    if (!patientId) {
      console.warn('[Circle] Skipping inactive-member repair for invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberRef = doc(db, 'patients', patientId, 'members', uid);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) continue;

    const status = String(memberSnap.data()?.status ?? 'active');
    if (status === 'active') continue;

    try {
      await setDoc(
        memberRef,
        {
          status: 'active',
          inviteRef: inviteDoc.id,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      repairs += 1;
    } catch (err) {
      if (isFirestoreQuotaError(err)) {
        console.warn('[Circle] Inactive member repair skipped — Firestore daily write quota exceeded.');
        break;
      }
      console.warn('[Circle] Could not reactivate member doc for patient', patientId, err);
    }
  }

  return repairs;
}

/**
 * One-time backfill for legacy member docs missing `capabilities.messaging`.
 * Reads first and skips writes when already OK (avoids burning free-tier quota).
 */
export async function ensureMemberCapabilitiesForUser(
  db: Firestore,
  uid: string,
): Promise<void> {
  if (hasRepairedMemberCapabilitiesThisSession(uid)) return;

  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) {
    markMemberCapabilitiesRepairedThisSession(uid);
    return;
  }

  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId = validInvitePatientId(invite);
    if (!patientId) {
      console.warn('[Circle] Skipping capability repair for invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberRef = doc(db, 'patients', patientId, 'members', uid);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) continue;

    const stored = memberSnap.data()?.capabilities as Partial<PatientCapabilities> | undefined;

    if (!memberDocNeedsCapabilityRepair(stored, invite.role, invite.capabilities)) {
      continue;
    }

    const capabilities = mergeMemberCapabilities(invite.role, invite.capabilities);
    batch.set(
      memberRef,
      {
        role: invite.role,
        capabilities,
        invitedEmail: invite.invitedEmail,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    pendingWrites += 1;
  }

  if (pendingWrites === 0) {
    markMemberCapabilitiesRepairedThisSession(uid);
    return;
  }

  try {
    await batch.commit();
    markMemberCapabilitiesRepairedThisSession(uid);
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      console.warn(
        '[Circle] Capability backfill skipped — Firestore daily write quota exceeded. Reload after midnight Pacific.',
      );
      return;
    }
    console.warn('[Circle] Capability backfill skipped —', err);
  }
}

function memberRoleNeedsRepair(
  memberRole: string | undefined,
  memberProxyTier: ProxyTier | undefined,
  memberCaps: Partial<PatientCapabilities> | undefined,
  expectedRole: ReturnType<typeof normalizeMemberRole>,
  expectedProxyTier: ProxyTier | undefined,
  expectedCaps: PatientCapabilities,
): boolean {
  if (normalizeMemberRole(String(memberRole || '')) !== expectedRole) return true;
  if (expectedProxyTier && memberProxyTier !== expectedProxyTier) return true;
  if (memberCaps?.inviteMembers !== expectedCaps.inviteMembers) return true;
  if (memberCaps?.remoteSettings !== expectedCaps.remoteSettings) return true;
  return memberDocNeedsCapabilityRepair(memberCaps, expectedRole, expectedCaps);
}

/**
 * Align member doc with accepted invite (patient-app sync updates invites; member may lag).
 * Circle members may only update their own member doc — not invites.
 */
export async function reconcileAcceptedMemberRolesForUser(
  db: Firestore,
  uid: string,
): Promise<void> {
  const invitesSnap = await getDocs(
    query(
      collection(db, 'circle_invites'),
      where('acceptedByUid', '==', uid),
      where('status', '==', 'accepted'),
    ),
  );
  if (invitesSnap.empty) return;

  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const inviteDoc of invitesSnap.docs) {
    const invite = inviteDoc.data() as CircleInviteRecord;
    const patientId = validInvitePatientId(invite);
    if (!patientId) {
      console.warn('[Circle] Skipping role reconciliation for invite with no patientId', inviteDoc.id);
      continue;
    }
    const memberRef = doc(db, 'patients', patientId, 'members', uid);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) continue;

    let patientData: Record<string, unknown> | null = null;
    try {
      const patientSnap = await getDoc(doc(db, 'patients', patientId));
      patientData = patientSnap.exists() ? patientSnap.data() : null;
    } catch (err) {
      console.warn('[Circle] Patient read skipped during role reconcile —', err);
      continue;
    }

    try {
      await publishCircleAccessIndexFromPatientDoc(
        db,
        patientId,
        patientData as {
          caregivers?: Record<string, unknown>[];
          friendsAndFamily?: Record<string, unknown>[];
          circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
        },
      );
    } catch (err) {
      if (!isFirestoreQuotaError(err)) {
        console.warn('[Circle] Access index publish skipped —', err);
      }
    }

    const memberData = memberSnap.data();
    const memberCaps = memberData?.capabilities as Partial<PatientCapabilities> | undefined;
    const memberProxyTier = memberData?.proxyTier as ProxyTier | undefined;

    const inviteDemoted =
      typeof (invite as { proxySlotDemotedAt?: unknown }).proxySlotDemotedAt === 'number' ||
      (invite.role !== 'proxy' &&
        ((invite as { requestedProxyTier?: unknown }).requestedProxyTier === 'primary' ||
          (invite as { requestedProxyTier?: unknown }).requestedProxyTier === 'backup'));

    // Slot-demotion on accept wins over stale contact rows that still say proxy.
    let role: ReturnType<typeof normalizeMemberRole>;
    let proxyTier: ProxyTier | undefined;
    let capabilities: PatientCapabilities;

    if (inviteDemoted) {
      role = normalizeMemberRole(invite.role);
      proxyTier = undefined;
      capabilities = mergeMemberCapabilities(role, capabilitiesForRole(role));
    } else {
      const resolved = resolveCircleAccessForInviteEmail(
        patientData as {
          caregivers?: Record<string, unknown>[];
          friendsAndFamily?: Record<string, unknown>[];
          circleAccessByEmail?: Record<string, { role?: string; proxyTier?: string }>;
        },
        invite.invitedEmail,
        {
          memberRole: String(memberData?.role || ''),
          memberProxyTier,
          inviteRole: invite.role,
          inviteProxyTier:
            invite.proxyTier === 'backup' || invite.proxyTier === 'primary'
              ? invite.proxyTier
              : undefined,
        },
      );

      role = normalizeMemberRole(resolved.role);
      capabilities = mergeMemberCapabilities(role, capabilitiesForRole(role));
      proxyTier =
        role === 'proxy' &&
        (resolved.proxyTier === 'backup' || resolved.proxyTier === 'primary')
          ? resolved.proxyTier
          : undefined;
    }

    // Never downgrade a member to caregiver when patient contacts still list them as proxy
    // — unless this invite was intentionally demoted because the proxy slot was full.
    const currentRole = normalizeMemberRole(String(memberData?.role || ''));
    if (
      !inviteDemoted &&
      currentRole === 'proxy' &&
      role !== 'proxy' &&
      patientData &&
      resolveCircleAccessForInviteEmail(
        patientData as {
          caregivers?: Record<string, unknown>[];
          friendsAndFamily?: Record<string, unknown>[];
        },
        invite.invitedEmail,
      )?.role === 'proxy'
    ) {
      continue;
    }

    const memberNeedsUpdate = memberRoleNeedsRepair(
      String(memberData?.role || ''),
      memberProxyTier,
      memberCaps,
      role,
      proxyTier,
      capabilities,
    );

    if (!memberNeedsUpdate) continue;

    batch.set(
      memberRef,
      {
        role,
        capabilities,
        ...(proxyTier ? { proxyTier } : { proxyTier: deleteField() }),
        invitedEmail: invite.invitedEmail,
        inviteRef: memberData?.inviteRef || inviteDoc.id,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    pendingWrites += 1;
  }

  if (pendingWrites === 0) return;

  try {
    await batch.commit();
  } catch (err) {
    if (isFirestoreQuotaError(err)) {
      console.warn('[Circle] Role reconcile skipped — Firestore daily write quota exceeded.');
      return;
    }
    console.warn('[Circle] Role reconcile skipped —', err);
  }
}
