/** @license SPDX-License-Identifier: Apache-2.0 */

import type { RemoteAppMode } from '@medxforce/shared';

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
