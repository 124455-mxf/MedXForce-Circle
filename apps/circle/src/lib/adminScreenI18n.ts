import type {
  CircleContactKind,
  CircleInviteListItem,
  CircleMemberRole,
  ProxyTier,
} from '@medxforce/shared';
import { ContactConflictError, DuplicateContactEmailError } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
import { translateCircleMemberRole } from './circleScreenI18n';

const KNOWN_MEMBER_ROLES = new Set<CircleMemberRole>([
  'proxy',
  'caregiver',
  'professional_caregiver',
  'family',
  'friend',
  'facility_staff',
]);

const RELATIONSHIP_KEYS: Record<string, string> = {
  Spouse: 'admin.contact.relationshipSpouse',
  Partner: 'admin.contact.relationshipPartner',
  Child: 'admin.contact.relationshipChild',
  Parent: 'admin.contact.relationshipParent',
  Family: 'admin.contact.relationshipFamily',
  Friend: 'admin.contact.relationshipFriend',
  Other: 'admin.contact.relationshipOther',
};

const FITNESS_LEVEL_KEYS: Record<string, string> = {
  sedentary: 'admin.profile.fitnessSedentary',
  lightly_active: 'admin.profile.fitnessLightlyActive',
  moderately_active: 'admin.profile.fitnessModeratelyActive',
  very_active: 'admin.profile.fitnessVeryActive',
  extra_active: 'admin.profile.fitnessExtraActive',
};

export function translateCircleMemberAccessLabel(
  t: CircleTranslator,
  role: string,
  proxyTier?: ProxyTier | null,
): string {
  if (role === 'proxy') {
    if (proxyTier === 'backup') return t('circle.roleBackupProxy');
    if (proxyTier === 'primary') return t('circle.rolePrimaryProxy');
    return t('circle.roleProxy');
  }
  if (KNOWN_MEMBER_ROLES.has(role as CircleMemberRole)) {
    return translateCircleMemberRole(t, role as CircleMemberRole);
  }
  return role.replace(/_/g, ' ');
}

export function contactKindLabelI18n(t: CircleTranslator, kind: CircleContactKind): string {
  switch (kind) {
    case 'caregiver':
      return t('admin.contact.kindCaregiver');
    case 'family':
      return t('admin.contact.kindFamily');
    case 'friend':
      return t('admin.contact.kindFriend');
    case 'contact':
      return t('admin.contact.kindContact');
    default:
      return kind;
  }
}

export function inviteStatusLabelI18n(
  t: CircleTranslator,
  status: CircleInviteListItem['status'],
): string {
  if (status === 'accepted') return t('admin.users.statusActive');
  if (status === 'revoked') return t('admin.users.statusRevoked');
  return t('admin.users.statusPending');
}

export function relationshipLabelI18n(t: CircleTranslator, relationship: string): string {
  const key = RELATIONSHIP_KEYS[relationship.trim()];
  return key ? t(key) : relationship;
}

export function fitnessLevelLabelI18n(t: CircleTranslator, value: string): string {
  const key = FITNESS_LEVEL_KEYS[value.trim()];
  return key ? t(key) : value.trim() || t('admin.profile.emptyValue');
}

export function yesNoLabelI18n(t: CircleTranslator, value: string): string {
  if (value === 'yes') return t('admin.profile.yes');
  if (value === 'no') return t('admin.profile.no');
  return t('admin.profile.emptyValue');
}

export function formatContactSaveErrorI18n(t: CircleTranslator, err: unknown): string {
  if (err instanceof ContactConflictError) return err.message;
  if (err instanceof DuplicateContactEmailError) {
    return t('admin.users.duplicateEmail', {
      name: err.existingContactName || t('admin.users.thisPerson'),
      email: err.email,
    });
  }
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  const message = err instanceof Error ? err.message : String(err);
  if (
    code === 'permission-denied' ||
    /permission-denied|insufficient permissions/i.test(message)
  ) {
    return t('admin.users.savePermissionDenied');
  }
  if (code === 'internal') {
    return t('admin.users.saveInternalError');
  }
  return err instanceof Error ? err.message : t('admin.users.saveFailed');
}

export function profileEditorSectionTitleI18n(
  t: CircleTranslator,
  section: 'identity' | 'extended' | 'engagement' | 'lifestyle' | 'functional' | 'clinical',
): string {
  switch (section) {
    case 'identity':
      return t('admin.profile.editIdentity');
    case 'extended':
      return t('admin.profile.editExtended');
    case 'engagement':
      return t('admin.profile.editEngagement');
    case 'clinical':
      return t('admin.profile.editClinical');
    case 'lifestyle':
      return t('admin.profile.editLifestyle');
    case 'functional':
      return t('admin.profile.editFunctional');
  }
}
