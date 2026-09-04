import type { PatientRemoteSettingsDoc } from './remoteSettings';
import { getRemoteSettingValue } from './remoteSettings';
import {
  isParticipationReminderSnoozed,
  type CircleParticipationReminderKind,
  type CircleParticipationReminderSnoozes,
} from './circleParticipationReminders';

/** Hospital optional areas Circle can enable via Remote Settings → Features. */
export type HospitalFeatureReminderKind =
  | 'hospitalFeatureMessaging'
  | 'hospitalFeatureDashboard'
  | 'hospitalFeatureVitality'
  | 'hospitalFeatureAssessments';

export const HOSPITAL_FEATURE_REMINDER_KINDS: readonly HospitalFeatureReminderKind[] = [
  'hospitalFeatureMessaging',
  'hospitalFeatureDashboard',
  'hospitalFeatureVitality',
  'hospitalFeatureAssessments',
] as const;

const FEATURE_PATH_BY_KIND: Record<HospitalFeatureReminderKind, string> = {
  hospitalFeatureMessaging: 'featuresVisibility.messaging',
  hospitalFeatureDashboard: 'featuresVisibility.dashboard',
  hospitalFeatureVitality: 'featuresVisibility.activity.enabled',
  hospitalFeatureAssessments: 'featuresVisibility.healthAssessments',
};

export function isHospitalFeatureReminderKind(
  kind: string,
): kind is HospitalFeatureReminderKind {
  return (HOSPITAL_FEATURE_REMINDER_KINDS as readonly string[]).includes(kind);
}

export function hospitalFeatureRemotePath(kind: HospitalFeatureReminderKind): string {
  return FEATURE_PATH_BY_KIND[kind];
}

export function isHospitalFeatureEnabledInRemoteSettings(
  settings: PatientRemoteSettingsDoc | null | undefined,
  kind: HospitalFeatureReminderKind,
): boolean {
  if (!settings) return false;
  return getRemoteSettingValue(settings, FEATURE_PATH_BY_KIND[kind]) === true;
}

/**
 * Show when patient is in Hospital mode, the area is still off, the patient has
 * engaged at least once, and the care-team member has not snoozed the nudge.
 */
export function shouldShowHospitalFeatureReminder(input: {
  enabled: boolean;
  appMode: string | null | undefined;
  featureEnabled: boolean;
  firstEngagementAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  kind: HospitalFeatureReminderKind;
  now?: number;
}): boolean {
  if (!input.enabled) return false;
  if (input.appMode !== 'hospital') return false;
  if (input.featureEnabled) return false;
  if (input.firstEngagementAt == null || input.firstEngagementAt <= 0) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed(input.kind, input.snoozes, now)) return false;
  return true;
}

export function listHospitalFeatureRemindersToShow(input: {
  enabled: boolean;
  settings: PatientRemoteSettingsDoc | null | undefined;
  settingsReady: boolean;
  firstEngagementAt: number | null;
  firstEngagementLoading: boolean;
  snoozes: CircleParticipationReminderSnoozes;
  snoozeLoading: boolean;
  now?: number;
}): HospitalFeatureReminderKind[] {
  if (!input.enabled || !input.settingsReady || input.firstEngagementLoading || input.snoozeLoading) {
    return [];
  }
  const appMode = input.settings?.appMode;
  return HOSPITAL_FEATURE_REMINDER_KINDS.filter((kind) =>
    shouldShowHospitalFeatureReminder({
      enabled: true,
      appMode,
      featureEnabled: isHospitalFeatureEnabledInRemoteSettings(input.settings, kind),
      firstEngagementAt: input.firstEngagementAt,
      snoozes: input.snoozes,
      kind,
      now: input.now,
    }),
  );
}

/** Type guard helper for snooze duration routing. */
export function isCareActionStyleReminderKind(kind: CircleParticipationReminderKind): boolean {
  return (
    kind === 'teamCoverage' ||
    kind === 'profileIncomplete' ||
    kind === 'circleInitiateMessages' ||
    kind === 'circleDropIn' ||
    isHospitalFeatureReminderKind(kind)
  );
}
