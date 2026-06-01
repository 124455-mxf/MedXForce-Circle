/** Circle RBAC — shared with patient app (keep in sync with medxforce/src/lib/patientPermissions.ts). */

export type CircleMemberRole =
  | 'friend'
  | 'family'
  | 'caregiver'
  | 'professional_caregiver'
  | 'proxy'
  | 'facility_staff';

export interface PatientCapabilities {
  richMediaUpload: boolean;
  viewCircleMedia: boolean;
  viewPatientUploads: boolean;
  notifyOnPatientUpload: boolean;
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
  updatedAt: number;
}

export const ROLE_CAPABILITY_TEMPLATES: Record<CircleMemberRole, PatientCapabilities> = {
  friend: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: false,
    notifyOnPatientUpload: false,
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
    viewClinicalData: false,
    remoteSettings: false,
    inviteMembers: false,
    messaging: true,
  },
  professional_caregiver: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
    viewClinicalData: false,
    remoteSettings: false,
    inviteMembers: false,
    messaging: true,
  },
  proxy: {
    richMediaUpload: true,
    viewCircleMedia: true,
    viewPatientUploads: true,
    notifyOnPatientUpload: true,
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
    viewClinicalData: false,
    remoteSettings: false,
    inviteMembers: false,
    messaging: true,
  },
};

export function capabilitiesForRole(role: CircleMemberRole): PatientCapabilities {
  return { ...ROLE_CAPABILITY_TEMPLATES[role] };
}

export function canUploadRichMedia(capabilities: PatientCapabilities | undefined): boolean {
  return !!capabilities?.richMediaUpload;
}

export function canViewPatientUploads(capabilities: PatientCapabilities | undefined): boolean {
  return !!capabilities?.viewPatientUploads;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function roleFromFriendsAndFamilyContact(contact: Record<string, unknown>): CircleMemberRole {
  const type = String(contact.type || contact.relationship || '').toLowerCase();
  if (type.includes('friend')) return 'friend';
  if (type.includes('family') || type.includes('partner') || type.includes('child') || type.includes('parent')) {
    return 'family';
  }
  return 'caregiver';
}
