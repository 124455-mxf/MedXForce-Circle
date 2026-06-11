import type { CircleMemberRole, CircleMemberThreadKind } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';

export function formatCirclePostTime(t: CircleTranslator, ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) {
    return t('circle.postTimeToday', { time });
  }
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

export function circleThreadDescriptionI18n(
  t: CircleTranslator,
  kind: CircleMemberThreadKind,
): string {
  return kind === 'open'
    ? t('circle.threadDescriptionOpen')
    : t('circle.threadDescriptionRestricted');
}

export function circleThreadLabelI18n(
  t: CircleTranslator,
  kind: CircleMemberThreadKind,
): string {
  return kind === 'open' ? t('circle.threadLabelOpen') : t('circle.threadLabelRestricted');
}

export function translateCircleMemberRole(
  t: CircleTranslator,
  role: CircleMemberRole,
): string {
  switch (role) {
    case 'proxy':
      return t('circle.roleProxy');
    case 'caregiver':
      return t('circle.roleCaregiver');
    case 'professional_caregiver':
      return t('circle.roleProfessionalCaregiver');
    case 'family':
      return t('circle.roleFamily');
    case 'friend':
      return t('circle.roleFriend');
    case 'facility_staff':
      return t('circle.roleFacilityStaff');
    default:
      return t('circle.roleMember');
  }
}

export function formatCircleThreadActionError(
  t: CircleTranslator,
  err: unknown,
  fallbackKey: 'circle.hideFailed' | 'circle.deleteFailed',
): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code || '')
      : '';
  if (code === 'permission-denied') {
    return t('circle.deletePermissionDenied');
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return t(fallbackKey);
}
