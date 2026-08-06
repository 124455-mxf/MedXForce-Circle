import type { PatientRemoteSettingsDoc } from './remoteSettings';
import { getRemoteSettingValue } from './remoteSettings';
import {
  isParticipationReminderSnoozed,
  type CircleParticipationReminderSnoozes,
} from './circleParticipationReminders';

export type IcuProgressionReminderKind =
  | 'modeStepUpStandard'
  | 'modeStepUpHospital'
  | 'icuSoulMusic'
  | 'icuSoulMediaLibrary';

export const ICU_PROGRESSION_REMINDER_KINDS: readonly IcuProgressionReminderKind[] = [
  'modeStepUpStandard',
  'modeStepUpHospital',
  'icuSoulMusic',
  'icuSoulMediaLibrary',
] as const;

export function isIcuProgressionReminderKind(
  kind: string,
): kind is IcuProgressionReminderKind {
  return (ICU_PROGRESSION_REMINDER_KINDS as readonly string[]).includes(kind);
}

function hasFirstEngagement(firstEngagementAt: number | null): boolean {
  return firstEngagementAt != null && firstEngagementAt > 0;
}

/** Resolve ICU layout: prefer explicit field; else infer Minimal when both alert buttons are off. */
export function resolveRemoteIntensiveCareExperience(
  settings: PatientRemoteSettingsDoc | null | undefined,
): 'standard' | 'minimal_focus' {
  const explicit = settings?.intensiveCareExperience;
  if (explicit === 'minimal_focus' || explicit === 'standard') return explicit;
  if (settings?.showAlertButton === false && settings?.showAttentionButton === false) {
    return 'minimal_focus';
  }
  return 'standard';
}

export function shouldShowModeStepUpStandardReminder(input: {
  enabled: boolean;
  settings: PatientRemoteSettingsDoc | null | undefined;
  firstEngagementAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled || !input.settings) return false;
  if (input.settings.appMode !== 'intensive_care') return false;
  if (resolveRemoteIntensiveCareExperience(input.settings) !== 'minimal_focus') return false;
  if (!hasFirstEngagement(input.firstEngagementAt)) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('modeStepUpStandard', input.snoozes, now)) return false;
  return true;
}

export function shouldShowModeStepUpHospitalReminder(input: {
  enabled: boolean;
  appMode: string | null | undefined;
  firstEngagementAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled) return false;
  if (input.appMode !== 'intensive_care') return false;
  if (!hasFirstEngagement(input.firstEngagementAt)) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('modeStepUpHospital', input.snoozes, now)) return false;
  return true;
}

export function shouldShowIcuSoulMusicReminder(input: {
  enabled: boolean;
  settings: PatientRemoteSettingsDoc | null | undefined;
  firstEngagementAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled || !input.settings) return false;
  if (input.settings.appMode !== 'intensive_care') return false;
  if (getRemoteSettingValue(input.settings, 'featuresVisibility.intensiveCareSoulMusic') === true) {
    return false;
  }
  if (!hasFirstEngagement(input.firstEngagementAt)) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('icuSoulMusic', input.snoozes, now)) return false;
  return true;
}

export function shouldShowIcuSoulMediaLibraryReminder(input: {
  enabled: boolean;
  settings: PatientRemoteSettingsDoc | null | undefined;
  firstEngagementAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled || !input.settings) return false;
  if (input.settings.appMode !== 'intensive_care') return false;
  if (
    getRemoteSettingValue(input.settings, 'featuresVisibility.intensiveCareSoulMediaLibrary') ===
    true
  ) {
    return false;
  }
  if (!hasFirstEngagement(input.firstEngagementAt)) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('icuSoulMediaLibrary', input.snoozes, now)) return false;
  return true;
}

export function listIcuProgressionRemindersToShow(input: {
  enabled: boolean;
  settings: PatientRemoteSettingsDoc | null | undefined;
  settingsReady: boolean;
  firstEngagementAt: number | null;
  firstEngagementLoading: boolean;
  snoozes: CircleParticipationReminderSnoozes;
  snoozeLoading: boolean;
  now?: number;
}): IcuProgressionReminderKind[] {
  if (!input.enabled || !input.settingsReady || input.firstEngagementLoading || input.snoozeLoading) {
    return [];
  }
  const kinds: IcuProgressionReminderKind[] = [];
  if (
    shouldShowModeStepUpStandardReminder({
      enabled: true,
      settings: input.settings,
      firstEngagementAt: input.firstEngagementAt,
      snoozes: input.snoozes,
      now: input.now,
    })
  ) {
    kinds.push('modeStepUpStandard');
  }
  if (
    shouldShowModeStepUpHospitalReminder({
      enabled: true,
      appMode: input.settings?.appMode,
      firstEngagementAt: input.firstEngagementAt,
      snoozes: input.snoozes,
      now: input.now,
    })
  ) {
    kinds.push('modeStepUpHospital');
  }
  if (
    shouldShowIcuSoulMusicReminder({
      enabled: true,
      settings: input.settings,
      firstEngagementAt: input.firstEngagementAt,
      snoozes: input.snoozes,
      now: input.now,
    })
  ) {
    kinds.push('icuSoulMusic');
  }
  if (
    shouldShowIcuSoulMediaLibraryReminder({
      enabled: true,
      settings: input.settings,
      firstEngagementAt: input.firstEngagementAt,
      snoozes: input.snoozes,
      now: input.now,
    })
  ) {
    kinds.push('icuSoulMediaLibrary');
  }
  return kinds;
}
