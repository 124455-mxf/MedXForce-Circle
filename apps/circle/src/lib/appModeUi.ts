/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  recommendRemoteSettingsForTreatmentPhase,
  type RemoteAppMode,
} from '@medxforce/shared';

/** Card border/background — match patient app (ICU red, Hospital amber, Daily Life emerald). */
export function remoteAppModeCardClass(mode: RemoteAppMode, selected: boolean): string {
  if (mode === 'intensive_care') {
    return selected
      ? 'border-red-500 bg-red-50 shadow-sm'
      : 'border-red-100 bg-red-50/70 hover:border-red-200';
  }
  if (mode === 'hospital') {
    return selected
      ? 'border-amber-500 bg-amber-50 shadow-sm'
      : 'border-amber-100 bg-amber-50/70 hover:border-amber-200';
  }
  return selected
    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
    : 'border-emerald-100 bg-emerald-50/70 hover:border-emerald-200';
}

export function remoteAppModeCurrentBadgeClass(mode: RemoteAppMode): string {
  if (mode === 'intensive_care') return 'bg-red-600 text-white';
  if (mode === 'hospital') return 'bg-amber-600 text-white';
  return 'bg-emerald-600 text-white';
}

export function remoteAppModeIconClass(mode: RemoteAppMode, selected: boolean): string {
  if (!selected) return 'text-slate-400';
  if (mode === 'intensive_care') return 'text-red-600';
  if (mode === 'hospital') return 'text-amber-600';
  return 'text-emerald-600';
}

/** Map recovery phase → the application mode it drives on the patient tablet. */
export function treatmentPhaseToRemoteAppMode(
  phase: string | null | undefined,
): RemoteAppMode | null {
  return recommendRemoteSettingsForTreatmentPhase(phase)?.appMode ?? null;
}

export function treatmentPhaseCardClass(
  phase: string | null | undefined,
  selected = true,
): string {
  const mode = treatmentPhaseToRemoteAppMode(phase);
  if (!mode) {
    return selected
      ? 'border-slate-300 bg-slate-50 shadow-sm'
      : 'border-slate-100 bg-slate-50/70 hover:border-slate-200';
  }
  return remoteAppModeCardClass(mode, selected);
}

export function treatmentPhaseBadgeClass(phase: string | null | undefined): string {
  const mode = treatmentPhaseToRemoteAppMode(phase);
  if (!mode) return 'bg-slate-500 text-white';
  return remoteAppModeCurrentBadgeClass(mode);
}

export function treatmentPhaseAccentTextClass(phase: string | null | undefined): string {
  const mode = treatmentPhaseToRemoteAppMode(phase);
  if (mode === 'intensive_care') return 'text-red-700';
  if (mode === 'hospital') return 'text-amber-800';
  if (mode === 'user') return 'text-emerald-800';
  return 'text-slate-700';
}
