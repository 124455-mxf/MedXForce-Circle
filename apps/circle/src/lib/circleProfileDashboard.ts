import type { CirclePatientProfileSnapshot } from '@medxforce/shared';
import { formatTreatmentPhaseLabelEn } from '@medxforce/shared';

import type { AlertAttentionRecencyUrgency } from './circleDashboardStats';

function hasText(value: string | undefined | null): boolean {
  return !!value?.trim();
}

export type CoreCircleProfileField =
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'language'
  | 'sex';

const CORE_CIRCLE_PROFILE_FIELDS: CoreCircleProfileField[] = [
  'firstName',
  'lastName',
  'dob',
  'language',
  'sex',
];

/** Minimum fields needed to operate well with the patient. */
export function isCoreCircleProfileComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  return getMissingCoreCircleProfileFields(snapshot).length === 0;
}

/** Core identity fields still empty (name, DOB, language, sex). */
export function getMissingCoreCircleProfileFields(
  snapshot: CirclePatientProfileSnapshot | null | undefined,
): CoreCircleProfileField[] {
  if (!snapshot) return [...CORE_CIRCLE_PROFILE_FIELDS];
  const missing: CoreCircleProfileField[] = [];
  if (!hasText(snapshot.identity.firstName)) missing.push('firstName');
  if (!hasText(snapshot.identity.lastName)) missing.push('lastName');
  if (!hasText(snapshot.identity.dob)) missing.push('dob');
  if (!hasText(snapshot.identity.language)) missing.push('language');
  if (!hasText(snapshot.extended.sex)) missing.push('sex');
  return missing;
}

function isIdentityComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  return isCoreCircleProfileComplete(snapshot);
}

function hasNeutralProfileExtras(snapshot: CirclePatientProfileSnapshot): boolean {
  return (
    hasText(snapshot.clinical.dateOfOnset) ||
    hasText(snapshot.clinical.treatmentPhase) ||
    hasText(snapshot.clinical.primaryDiagnosis) ||
    (snapshot.lifestyle.assistiveDevices ?? []).some((device) => hasText(device))
  );
}

function hasGreenProfileExtras(snapshot: CirclePatientProfileSnapshot): boolean {
  const { engagement, lifestyle } = snapshot;
  const hasHobbies =
    engagement.activeHobbies.length > 0 || engagement.passiveHobbies.length > 0;
  const hasOccupation = hasText(lifestyle.occupation);
  const hasTopicTriggers = engagement.topicTriggers.length > 0;
  return hasHobbies || hasOccupation || hasTopicTriggers;
}

/** Tint for User Profile card from core, clinical, and engagement completeness. */
export function getUserProfileRecencyUrgency(
  snapshot: CirclePatientProfileSnapshot | null,
): AlertAttentionRecencyUrgency {
  if (!snapshot) return 'neutral';
  if (!isCoreCircleProfileComplete(snapshot)) return 'red';
  if (hasGreenProfileExtras(snapshot)) return 'green';
  if (hasNeutralProfileExtras(snapshot)) return 'neutral';
  return 'orange';
}

function isClinicalComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  return (
    hasText(snapshot.clinical.primaryDiagnosis) && hasText(snapshot.clinical.treatmentPhase)
  );
}

function isFunctionalComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  const f = snapshot.functional;
  return (
    hasText(f.visualStatus) &&
    hasText(f.hearingProfile) &&
    hasText(f.cognitiveBaseline) &&
    hasText(f.fineMotorBaseline)
  );
}

function isLifestyleComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  const l = snapshot.lifestyle;
  return hasText(l.occupation) && hasText(l.livingSituation);
}

function isEngagementComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  const e = snapshot.engagement;
  return (
    e.activeHobbies.length > 0 &&
    e.passiveHobbies.length > 0 &&
    e.personalGoals.length > 0
  );
}

export function isCircleProfileDataComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  return (
    isIdentityComplete(snapshot) &&
    isClinicalComplete(snapshot) &&
    isFunctionalComplete(snapshot) &&
    isLifestyleComplete(snapshot) &&
    isEngagementComplete(snapshot)
  );
}

export function getCircleProfileCompletenessLabel(
  snapshot: CirclePatientProfileSnapshot | null,
  loading: boolean,
): string {
  if (loading) return 'Loading…';
  if (!snapshot) return 'Data Incomplete';
  return isCircleProfileDataComplete(snapshot) ? 'Data Complete' : 'Data Incomplete';
}

export function formatTreatmentPhaseLabel(phase: string | undefined | null): string {
  const raw = phase?.trim() ?? '';
  if (!raw) return 'Not set';
  return formatTreatmentPhaseLabelEn(raw) || raw;
}

export function formatAssistiveDeviceLabel(devices: string[] | undefined | null): string {
  const list = (devices ?? []).map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return 'None';
  return list.join(', ');
}
