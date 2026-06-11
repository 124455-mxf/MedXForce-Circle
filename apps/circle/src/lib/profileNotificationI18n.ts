import {
  circleProfileNotificationResolvedFields,
  isGenericProfileSummary,
  lookupProfileFieldPathByLabel,
  meaningfulProfileChangedLabels,
  type CirclePatientInsightKey,
  type CirclePatientProfileMeta,
  type CircleProfileNotificationType,
} from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
import type { CircleUiLanguage } from './circleLanguages';
import { formatDashboardTimestamp, insightLabelT } from './dashboardI18n';

const INSIGHT_KEY_BY_FIELD_PATH: Partial<Record<string, CirclePatientInsightKey>> = {
  'engagement.activeHobbies': 'activeHobbies',
  'engagement.passiveHobbies': 'passiveHobbies',
  'engagement.topicTriggers': 'topicTriggers',
  'engagement.personalGoals': 'personalGoals',
  'engagement.socialAnchors': 'socialAnchors',
  'extended.languagesSpoken': 'languagesSpoken',
  'clinical.primaryDiagnosis': 'primaryDiagnosis',
  'clinical.dateOfOnset': 'dateOfOnset',
  'lifestyle.occupation': 'occupation',
  'clinical.treatmentPhase': 'treatmentPhase',
};

function pathToTranslationKey(path: string): string {
  return path.replace(/\./g, '_');
}

function translateProfileFieldPath(t: CircleTranslator, fieldPath: string, fallback: string): string {
  if (fieldPath.startsWith('discovery.')) {
    const discoveryKey = fieldPath.slice('discovery.'.length);
    const path = `profileNotifications.discovery.${discoveryKey}`;
    const translated = t(path);
    return translated === path ? fallback : translated;
  }

  const insightKey = INSIGHT_KEY_BY_FIELD_PATH[fieldPath];
  if (insightKey) return insightLabelT(t, insightKey);

  const path = `profileNotifications.fields.${pathToTranslationKey(fieldPath)}`;
  const translated = t(path);
  return translated === path ? fallback : translated;
}

export function profileNotificationFieldLabelT(
  t: CircleTranslator,
  storedLabel: string,
): string {
  const lookup = lookupProfileFieldPathByLabel(storedLabel);
  if (!lookup) return storedLabel;

  const plusItems = lookup.match(/^(.+):plusItems:(\d+)$/);
  if (plusItems) {
    const base = translateProfileFieldPath(t, plusItems[1], storedLabel);
    return t('profileNotifications.fieldPlusItems', {
      field: base,
      count: Number(plusItems[2]),
    });
  }

  return translateProfileFieldPath(t, lookup, storedLabel);
}

export function formatProfileChangedFieldsT(
  t: CircleTranslator,
  changedLabels: string[],
  maxFields = 8,
): string {
  const meaningful = meaningfulProfileChangedLabels(changedLabels);
  if (meaningful.length === 0) return '';

  const translated = meaningful.map((label) => profileNotificationFieldLabelT(t, label));
  const slice = translated.slice(0, maxFields).join(', ');
  const suffix =
    meaningful.length > maxFields
      ? t('profileNotifications.moreFields', { count: meaningful.length - maxFields })
      : '';
  return `${slice}${suffix}`;
}

export function profileNotificationTitleT(
  t: CircleTranslator,
  type: CircleProfileNotificationType,
  summary?: string,
): string {
  if (type === 'ai_discovery') return t('profileNotifications.titleCompanion');
  if (summary?.toLowerCase().startsWith('profile updated:')) {
    return t('profileNotifications.titleCircleApp');
  }
  return t('profileNotifications.titlePatientApp');
}

export function profileNotificationChangesT(
  t: CircleTranslator,
  changedLabels: string[],
  type?: CircleProfileNotificationType,
  summary?: string,
  profileMeta?: CirclePatientProfileMeta | null,
): string {
  const resolved = circleProfileNotificationResolvedFields(changedLabels, summary, profileMeta);
  const fields = formatProfileChangedFieldsT(
    t,
    resolved.length > 0 ? resolved : changedLabels,
  );

  if (fields) {
    if (type === 'ai_discovery') {
      return t('profileNotifications.companionAddedUpdated', { fields });
    }
    if (type === 'patient_edit') {
      if (summary?.toLowerCase().startsWith('profile updated:')) {
        return t('profileNotifications.circleProfileUpdate', { fields });
      }
      return t('profileNotifications.patientAppUpdated', { fields });
    }
    return t('profileNotifications.changed', { fields });
  }

  if (summary && !isGenericProfileSummary(summary)) {
    const detail = summaryDetailFromStoredSummary(summary);
    if (detail) {
      const detailFields = detail
        .split(/,\s*/)
        .map((part) => profileNotificationFieldLabelT(t, part.trim()))
        .filter(Boolean)
        .join(', ');
      if (type === 'ai_discovery') {
        return t('profileNotifications.companionUpdate', { fields: detailFields });
      }
      if (type === 'patient_edit') {
        if (summary.toLowerCase().startsWith('profile updated:')) {
          return t('profileNotifications.circleProfileUpdate', { fields: detailFields });
        }
        return t('profileNotifications.patientAppUpdate', { fields: detailFields });
      }
      return detailFields;
    }
  }

  if (type === 'ai_discovery') {
    return t('profileNotifications.companionSyncedGeneric');
  }
  return t('profileNotifications.profileUpdatedGeneric');
}

function summaryDetailFromStoredSummary(summary: string): string {
  const trimmed = summary.trim();
  const prefixes = [
    /^MedIsOn Companion:\s*/i,
    /^Profile updated:\s*/i,
    /^Patient updated:\s*/i,
    /^MedIsOn Companion updated:\s*/i,
  ];
  let detail = trimmed;
  for (const prefix of prefixes) {
    if (prefix.test(detail)) {
      detail = detail.replace(prefix, '');
      break;
    }
  }
  return detail.trim();
}

export function profileNotificationFieldListT(
  t: CircleTranslator,
  changedLabels: string[],
  summary?: string,
  profileMeta?: CirclePatientProfileMeta | null,
): string[] {
  return circleProfileNotificationResolvedFields(changedLabels, summary, profileMeta).map((label) =>
    profileNotificationFieldLabelT(t, label),
  );
}

export function formatProfileNotificationTimeT(
  t: CircleTranslator,
  language: CircleUiLanguage,
  ts: number,
): string {
  return formatDashboardTimestamp(t, language, ts);
}
