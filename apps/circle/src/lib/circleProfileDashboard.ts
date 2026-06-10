import type { CirclePatientProfileSnapshot } from '@medxforce/shared';

import type { AlertAttentionRecencyUrgency } from './circleDashboardStats';

const TREATMENT_PHASE_LABELS: Record<string, string> = {
  icu: 'ICU',
  acute: 'Acute',
  vitality: 'Vitality',
  maintenance: 'Maintenance',
  palliative: 'Palliative',
  'pre-op': 'Pre-op',
  'post-op': 'Post-op',
};

function hasText(value: string | undefined | null): boolean {
  return !!value?.trim();
}

/** Minimum fields needed to operate well with the patient. */
function isCoreProfileComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  const { firstName, lastName, dob, language } = snapshot.identity;
  return (
    hasText(firstName) &&
    hasText(lastName) &&
    hasText(dob) &&
    hasText(language) &&
    hasText(snapshot.extended.sex)
  );
}

function isIdentityComplete(snapshot: CirclePatientProfileSnapshot): boolean {
  return isCoreProfileComplete(snapshot);
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
  if (!isCoreProfileComplete(snapshot)) return 'red';
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
  const key = raw.toLowerCase();
  return TREATMENT_PHASE_LABELS[key] ?? raw;
}

export function formatAssistiveDeviceLabel(devices: string[] | undefined | null): string {
  const list = (devices ?? []).map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return 'None';
  return list.join(', ');
}
