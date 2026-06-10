/** Circle RBAC — shared with patient app (keep in sync with medxforce/src/lib/patientPermissions.ts). */

export type CircleMemberRole =
  | 'friend'
  | 'family'
  | 'caregiver'
  | 'professional_caregiver'
  | 'proxy'
  | 'facility_staff';

/** How a Circle member receives patient messages — app is default. */
export type CircleMessageDeliveryPreference = 'app' | 'email';

export const DEFAULT_CIRCLE_MESSAGE_DELIVERY: CircleMessageDeliveryPreference = 'app';

export interface PatientCapabilities {
  richMediaUpload: boolean;
  viewCircleMedia: boolean;
  viewPatientUploads: boolean;
  notifyOnPatientUpload: boolean;
  viewEngagementTrends: boolean;
  viewCareTrends: boolean;
  viewClinicalData: boolean;
  remoteSettings: boolean;
  inviteMembers: boolean;
  messaging: boolean;
}

export interface PatientMemberRecord {
  role: CircleMemberRole;
  capabilities: PatientCapabilities;
  status: 'invited' | 'active';
  displayName?: string;
  invitedEmail?: string;
  contactId?: string;
  inviteRef?: string;
  proxyTier?: 'primary' | 'backup';
  updatedAt: number;
}

export const ROLE_CAPABILITY_TEMPLATES: Record<CircleMemberRole, PatientCapabilities> = {
  friend: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: false,
    notifyOnPatientUpload: false,
    viewEngagementTrends: true,
    viewCareTrends: false,
    viewClinicalData: false,
    remoteSettings: false,
    inviteMembers: false,
    messaging: true,
  },
  family: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
    viewEngagementTrends: true,
    viewCareTrends: false,
    viewClinicalData: false,
    remoteSettings: false,
    inviteMembers: false,
    messaging: true,
  },
  caregiver: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
    viewEngagementTrends: true,
    viewCareTrends: true,
    viewClinicalData: false,
    remoteSettings: true,
    inviteMembers: false,
    messaging: true,
  },
  professional_caregiver: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
    viewEngagementTrends: true,
    viewCareTrends: true,
    viewClinicalData: false,
    remoteSettings: true,
    inviteMembers: false,
    messaging: true,
  },
  proxy: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
    viewEngagementTrends: true,
    viewCareTrends: true,
    viewClinicalData: true,
    remoteSettings: true,
    inviteMembers: true,
    messaging: true,
  },
  facility_staff: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
    viewEngagementTrends: true,
    viewCareTrends: true,
    viewClinicalData: false,
    remoteSettings: false,
    inviteMembers: false,
    messaging: true,
  },
};

export function capabilitiesForRole(role: CircleMemberRole): PatientCapabilities {
  return { ...(ROLE_CAPABILITY_TEMPLATES[role] ?? ROLE_CAPABILITY_TEMPLATES.caregiver) };
}

/** Legacy Firestore roles — map to current capability templates. */
export function normalizeMemberRole(role: string): CircleMemberRole {
  // Legacy mapping: professional_caregiver behaves like caregiver.
  // IMPORTANT: facility_staff must keep its own capability template (including `remoteSettings: false`).
  if (role === 'professional_caregiver') return 'caregiver';
  if (role in ROLE_CAPABILITY_TEMPLATES) return role as CircleMemberRole;
  return 'caregiver';
}

export function mergeMemberCapabilities(
  role: string,
  stored?: Partial<PatientCapabilities> | null,
): PatientCapabilities {
  const normalizedRole = normalizeMemberRole(role);
  const base = capabilitiesForRole(normalizedRole);
  return {
    ...base,
    ...(stored ?? {}),
    // Always prefer the role template for RBAC toggles.
    remoteSettings: base.remoteSettings,
    inviteMembers: base.inviteMembers,
    viewClinicalData: base.viewClinicalData,
  };
}

export function canUploadRichMedia(capabilities: PatientCapabilities | undefined): boolean {
  return !!capabilities?.richMediaUpload;
}

export function canViewPatientUploads(capabilities: PatientCapabilities | undefined): boolean {
  return !!capabilities?.viewPatientUploads;
}

export function canInviteMembers(capabilities: PatientCapabilities | undefined): boolean {
  return !!capabilities?.inviteMembers;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}
