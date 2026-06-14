import {
  collection,
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
  buildCircleInviteRecord,
  circleInviteDocId,
  type CircleInviteRecord,
} from './circleInvites';
import {
  capabilitiesForRole,
  normalizeInviteEmail,
  type PatientMemberRecord,
} from './patientPermissions';
import type { CirclePatientSummary } from './circlePatients';

export type PatientProvisionStatus = 'pending' | 'claimed';

export interface PatientProvisionProfileDraft {
  firstName?: string;
  lastName?: string;
  dob?: string;
  language?: string;
  sex?: string;
}

export interface PatientProvisionRecord {
  provisionId: string;
  setupCode: string;
  displayName: string;
  intendedEmail?: string;
  status: PatientProvisionStatus;
  claimedByUid?: string;
  createdByUid: string;
  createdByEmail: string;
  createdByDisplayName?: string;
  provisioningPath: 'proxy_led';
  profileDraft?: PatientProvisionProfileDraft;
  createdAt: number;
  updatedAt: number;
  claimedAt?: number;
}

export interface PatientEmailAvailability {
  registeredPatientId?: string;
  pendingProvisionId?: string;
  available: boolean;
}

const SETUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeSetupCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function normalizePatientEmailKey(email: string): string {
  return normalizeInviteEmail(email).replace(/[@.]/g, '_');
}

function generateSetupCode(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SETUP_CODE_ALPHABET[Math.floor(Math.random() * SETUP_CODE_ALPHABET.length)];
  }
  return out;
}

function provisionMemberRecord(
  proxyUser: User,
  proxyDisplayName: string,
): PatientMemberRecord {
  return {
    role: 'proxy',
    capabilities: capabilitiesForRole('proxy'),
    status: 'active',
    displayName: proxyDisplayName.trim() || proxyUser.displayName || 'Proxy',
    invitedEmail: proxyUser.email ? normalizeInviteEmail(proxyUser.email) : undefined,
    proxyTier: 'primary',
    updatedAt: Date.now(),
  };
}

export async function checkPatientEmailAvailability(
  db: Firestore,
  emailRaw: string,
): Promise<PatientEmailAvailability> {
  const email = normalizeInviteEmail(emailRaw);
  if (!email) return { available: true };

  const indexSnap = await getDoc(doc(db, 'patient_email_index', normalizePatientEmailKey(email)));
  if (indexSnap.exists()) {
    const patientId = String(indexSnap.data()?.patientId || '').trim();
    if (patientId) {
      return { available: false, registeredPatientId: patientId };
    }
  }

  const pendingSnap = await getDocs(
    query(
      collection(db, 'patient_provisions'),
      where('intendedEmail', '==', email),
      where('status', '==', 'pending'),
    ),
  );
  if (!pendingSnap.empty) {
    return { available: false, pendingProvisionId: pendingSnap.docs[0].id };
  }

  return { available: true };
}

export async function createPatientProvisionForProxy(
  db: Firestore,
  proxyUser: User,
  input: {
    displayName: string;
    intendedEmail?: string;
    profileDraft?: PatientProvisionProfileDraft;
    proxyDisplayName?: string;
  },
): Promise<PatientProvisionRecord> {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Patient display name is required.');

  const intendedEmail = input.intendedEmail?.trim()
    ? normalizeInviteEmail(input.intendedEmail)
    : undefined;

  if (intendedEmail) {
    const availability = await checkPatientEmailAvailability(db, intendedEmail);
    if (!availability.available) {
      if (availability.registeredPatientId) {
        throw new Error('A patient account already exists for this email.');
      }
      throw new Error('A pending setup already exists for this email.');
    }
  }

  const provisionRef = doc(collection(db, 'patient_provisions'));
  let setupCode = generateSetupCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const codeRef = doc(db, 'patient_setup_codes', setupCode);
    const existingCode = await getDoc(codeRef);
    if (!existingCode.exists()) break;
    setupCode = generateSetupCode();
  }

  const now = Date.now();
  const record: PatientProvisionRecord = {
    provisionId: provisionRef.id,
    setupCode,
    displayName,
    status: 'pending',
    createdByUid: proxyUser.uid,
    createdByEmail: proxyUser.email ? normalizeInviteEmail(proxyUser.email) : '',
    createdByDisplayName: input.proxyDisplayName?.trim() || proxyUser.displayName || '',
    provisioningPath: 'proxy_led',
    createdAt: now,
    updatedAt: now,
  };
  if (intendedEmail) record.intendedEmail = intendedEmail;
  if (input.profileDraft && Object.keys(input.profileDraft).length > 0) {
    record.profileDraft = input.profileDraft;
  }

  const batch = writeBatch(db);
  batch.set(provisionRef, record);
  batch.set(doc(db, 'patient_setup_codes', setupCode), {
    provisionId: provisionRef.id,
    createdAt: now,
  });
  batch.set(
    doc(db, 'patient_provisions', provisionRef.id, 'members', proxyUser.uid),
    provisionMemberRecord(proxyUser, input.proxyDisplayName || proxyUser.displayName || 'Proxy'),
  );
  await batch.commit();
  return record;
}

export async function lookupPendingProvisionBySetupCode(
  db: Firestore,
  setupCodeRaw: string,
): Promise<PatientProvisionRecord | null> {
  const setupCode = normalizeSetupCode(setupCodeRaw);
  if (setupCode.length < 6) return null;

  const codeSnap = await getDoc(doc(db, 'patient_setup_codes', setupCode));
  if (!codeSnap.exists()) return null;

  const provisionId = String(codeSnap.data()?.provisionId || '').trim();
  if (!provisionId) return null;

  const provisionSnap = await getDoc(doc(db, 'patient_provisions', provisionId));
  if (!provisionSnap.exists()) return null;

  const data = provisionSnap.data() as PatientProvisionRecord;
  if (data.status !== 'pending') return null;
  return { ...data, provisionId: provisionSnap.id };
}

export async function lookupPendingProvisionByEmail(
  db: Firestore,
  emailRaw: string,
): Promise<PatientProvisionRecord | null> {
  const email = normalizeInviteEmail(emailRaw);
  if (!email) return null;

  const snap = await getDocs(
    query(
      collection(db, 'patient_provisions'),
      where('intendedEmail', '==', email),
      where('status', '==', 'pending'),
    ),
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { ...(docSnap.data() as PatientProvisionRecord), provisionId: docSnap.id };
}

export async function listPendingProvisionsForProxy(
  db: Firestore,
  uid: string,
): Promise<PatientProvisionRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patient_provisions'),
      where('createdByUid', '==', uid),
      where('status', '==', 'pending'),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as PatientProvisionRecord), provisionId: d.id }));
}

export function pendingProvisionToCircleSummary(
  provision: PatientProvisionRecord,
): CirclePatientSummary {
  const caps = capabilitiesForRole('proxy');
  return {
    patientId: provision.provisionId,
    displayName: provision.displayName,
    role: 'proxy',
    proxyTier: 'primary',
    canUpload: true,
    capabilities: caps,
    provisionStatus: 'pending',
    setupCode: provision.setupCode,
    isPendingProvision: true,
  };
}

export async function claimPatientProvision(
  db: Firestore,
  user: User,
  setupCodeRaw: string,
): Promise<{ patientId: string; provision: PatientProvisionRecord }> {
  const provision = await lookupPendingProvisionBySetupCode(db, setupCodeRaw);
  if (!provision) throw new Error('Setup code not found or already used.');

  return finalizePatientProvisionClaim(db, user, provision);
}

export async function claimPatientProvisionByEmailMatch(
  db: Firestore,
  user: User,
): Promise<{ patientId: string; provision: PatientProvisionRecord } | null> {
  if (!user.email) return null;
  const provision = await lookupPendingProvisionByEmail(db, user.email);
  if (!provision) return null;
  return finalizePatientProvisionClaim(db, user, provision);
}

async function finalizePatientProvisionClaim(
  db: Firestore,
  user: User,
  provision: PatientProvisionRecord,
): Promise<{ patientId: string; provision: PatientProvisionRecord }> {
  const patientId = user.uid;
  const now = Date.now();

  const patientSnap = await getDoc(doc(db, 'patients', patientId));
  if (patientSnap.exists()) {
    throw new Error('This account is already linked to a patient profile.');
  }

  const membersSnap = await getDocs(
    collection(db, 'patient_provisions', provision.provisionId, 'members'),
  );

  const batch = writeBatch(db);

  batch.set(doc(db, 'patients', patientId), {
    patientId,
    displayName: provision.displayName,
    provisioningPath: provision.provisioningPath,
    createdByRole: 'proxy',
    createdByProvisionId: provision.provisionId,
    caregivers: [],
    friendsAndFamily: [],
    contacts: [],
    circleAccessByEmail: {},
    updatedAt: now,
  });

  const caregivers: Record<string, unknown>[] = [];

  membersSnap.forEach((memberDoc) => {
    const member = memberDoc.data() as PatientMemberRecord;
    batch.set(doc(db, 'patients', patientId, 'members', memberDoc.id), {
      ...member,
      status: 'active',
      updatedAt: now,
    });

    if (member.role === 'proxy' && member.invitedEmail) {
      const invite: CircleInviteRecord = buildCircleInviteRecord({
        patientId,
        invitedEmail: member.invitedEmail,
        role: 'proxy',
        capabilities: member.capabilities,
        displayName: member.displayName,
        proxyTier: member.proxyTier === 'backup' ? 'backup' : 'primary',
      });
      const inviteId = circleInviteDocId(patientId, member.invitedEmail);
      batch.set(doc(db, 'circle_invites', inviteId), {
        ...invite,
        status: 'accepted',
        acceptedByUid: memberDoc.id,
        updatedAt: now,
      });
      batch.update(doc(db, 'patients', patientId, 'members', memberDoc.id), {
        inviteRef: inviteId,
      });

      caregivers.push({
        id: member.contactId || memberDoc.id.slice(0, 8),
        name: member.displayName || 'Proxy',
        email: member.invitedEmail,
        emailVerify: member.invitedEmail,
        isEmailVerified: true,
        phone: '',
        mobile: '',
        mobileVerify: '',
        relationship: 'Other',
        role: 'Admin',
        alert: true,
        attention: true,
        message: true,
        sms: false,
        language: 'English',
        avatarUrl: '',
        circleRole: 'proxy',
        proxyTier: member.proxyTier === 'backup' ? 'backup' : 'primary',
      });
    }
  });

  if (caregivers.length > 0) {
    const accessMap: Record<string, { role: string; proxyTier?: string }> = {};
    for (const c of caregivers) {
      const email = normalizeInviteEmail(String(c.email || ''));
      if (!email) continue;
      accessMap[email] = {
        role: 'proxy',
        proxyTier: c.proxyTier === 'backup' ? 'backup' : 'primary',
      };
    }
    batch.update(doc(db, 'patients', patientId), {
      caregivers,
      circleAccessByEmail: accessMap,
    });
  }

  batch.update(doc(db, 'patient_provisions', provision.provisionId), {
    status: 'claimed',
    claimedByUid: patientId,
    claimedAt: now,
    updatedAt: now,
  });

  if (user.email) {
    batch.set(doc(db, 'patient_email_index', normalizePatientEmailKey(user.email)), {
      patientId,
      email: normalizeInviteEmail(user.email),
      updatedAt: now,
    });
  }

  batch.delete(doc(db, 'patient_setup_codes', provision.setupCode));

  await batch.commit();

  return {
    patientId,
    provision: { ...provision, status: 'claimed', claimedByUid: patientId, claimedAt: now },
  };
}

export function buildPreferencesFromProvision(
  provision: PatientProvisionRecord,
  user: User,
): Record<string, unknown> {
  const draft = provision.profileDraft || {};
  const firstName = draft.firstName?.trim() || provision.displayName.split(' ')[0] || '';
  const lastName =
    draft.lastName?.trim() || provision.displayName.split(' ').slice(1).join(' ') || '';

  return {
    userName: provision.displayName,
    provisioning: {
      provisioningPath: 'proxy_led',
      createdByRole: 'proxy',
      provisionId: provision.provisionId,
    },
    fullUserDetails: {
      identity: {
        firstName,
        lastName,
        nickName: '',
        email: user.email || provision.intendedEmail || '',
        isEmailVerified: !!user.email,
        profilePicture: user.photoURL || '',
        language: draft.language || '',
        city: '',
        country: '',
        dob: draft.dob || '',
      },
      extended: {
        sex: draft.sex || '',
      },
    },
  };
}
