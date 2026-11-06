/** @license SPDX-License-Identifier: Apache-2.0 */

/** Active recovery-phase values shown in profile UI. */
export const TREATMENT_PHASE_VALUES = [
  'icu',
  'acute',
  'rehab',
  'maintenance',
  'palliative',
] as const;

export type TreatmentPhaseValue = (typeof TREATMENT_PHASE_VALUES)[number];

/** Legacy stored values kept for schedule + display compatibility. */
export const LEGACY_TREATMENT_PHASE_VALUES = ['preOp', 'postOp'] as const;

export type LegacyTreatmentPhaseValue = (typeof LEGACY_TREATMENT_PHASE_VALUES)[number];

export function isActiveTreatmentPhaseValue(
  phase: string | undefined | null,
): phase is TreatmentPhaseValue {
  const raw = phase?.trim();
  if (!raw) return false;
  return (TREATMENT_PHASE_VALUES as readonly string[]).includes(raw);
}

/** Map profile phase to assessment-schedule defaults (legacy surgical phases included). */
export function normalizeTreatmentPhaseForSchedule(
  phase?: string | null,
): TreatmentPhaseValue | undefined {
  const raw = phase?.trim();
  if (!raw) return undefined;
  if (raw === 'postOp') return 'acute';
  if (raw === 'preOp') return 'maintenance';
  if (raw === 'vitality') return 'rehab';
  if (isActiveTreatmentPhaseValue(raw)) return raw;
  return undefined;
}

/** English fallback labels for insights and server-side copy. */
export const TREATMENT_PHASE_LABELS_EN: Record<string, string> = {
  icu: 'ICU',
  acute: 'Acute',
  rehab: 'Active recovery',
  maintenance: 'Daily life',
  palliative: 'Palliative',
  preOp: 'Pre-op',
  postOp: 'Post-op',
  vitality: 'Active recovery',
};

export function formatTreatmentPhaseLabelEn(phase: string | undefined | null): string {
  const raw = phase?.trim() ?? '';
  if (!raw) return '';
  return TREATMENT_PHASE_LABELS_EN[raw] ?? TREATMENT_PHASE_LABELS_EN[raw.toLowerCase()] ?? raw;
}

export type TreatmentPhaseRemoteRecommendation = {
  appMode: 'intensive_care' | 'hospital' | 'user';
  /** Stored fallback layout if Dashboard is later turned on. */
  dashboardPreset: 'minimal' | 'balanced' | 'insights' | 'spark';
  /** False for Intensive care / Hospital — Dashboard tab stays off by mode. */
  dashboardEnabled: boolean;
};

function recommendationFor(
  appMode: TreatmentPhaseRemoteRecommendation['appMode'],
  dashboardPreset: TreatmentPhaseRemoteRecommendation['dashboardPreset'],
): TreatmentPhaseRemoteRecommendation {
  return {
    appMode,
    dashboardPreset,
    // Only Daily Life mode enables the patient Dashboard tab by default.
    dashboardEnabled: appMode === 'user',
  };
}

/** Suggested application mode + dashboard preset when a proxy updates recovery phase from Circle. */
export function recommendRemoteSettingsForTreatmentPhase(
  phase?: string | null,
): TreatmentPhaseRemoteRecommendation | null {
  const normalized = normalizeTreatmentPhaseForSchedule(phase);
  if (!normalized) return null;
  switch (normalized) {
    case 'icu':
      return recommendationFor('intensive_care', 'minimal');
    case 'acute':
      return recommendationFor('hospital', 'minimal');
    case 'rehab':
      return recommendationFor('hospital', 'spark');
    case 'maintenance':
      return recommendationFor('user', 'balanced');
    case 'palliative':
      return recommendationFor('user', 'minimal');
    default:
      return null;
  }
}
