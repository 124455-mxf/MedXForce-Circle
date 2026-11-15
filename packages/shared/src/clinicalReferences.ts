/** @license SPDX-License-Identifier: Apache-2.0 */

import type { CircleMemberRole } from './patientPermissions';

export type ClinicalReferenceCategory =
  | 'discharge_summary'
  | 'imaging'
  | 'lab_results'
  | 'medication_list'
  | 'care_plan'
  | 'portal_link'
  | 'therapy_plan'
  | 'insurance'
  | 'other';

export const CLINICAL_REFERENCE_CATEGORIES: ClinicalReferenceCategory[] = [
  'discharge_summary',
  'imaging',
  'lab_results',
  'medication_list',
  'care_plan',
  'portal_link',
  'therapy_plan',
  'insurance',
  'other',
];

export type ClinicalReferenceSource = 'patient' | 'circle';

export type ClinicalReferenceAddedBy = {
  uid: string;
  name: string;
  role: CircleMemberRole | 'patient';
  app: 'patient' | 'circle';
};

export type ClinicalReferenceExtractionStatus = 'none' | 'pending' | 'ready' | 'failed';

export interface ClinicalReference {
  id: string;
  patientId: string;
  title: string;
  category: ClinicalReferenceCategory;
  url: string;
  note?: string;
  referenceDate?: string;
  storagePath?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  extractionStatus?: ClinicalReferenceExtractionStatus;
  extractedText?: string;
  source: ClinicalReferenceSource;
  addedBy: ClinicalReferenceAddedBy;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

export type ClinicalReferenceInput = {
  title: string;
  category: ClinicalReferenceCategory;
  url?: string;
  note?: string;
  referenceDate?: string;
};

export const CLINICAL_REFERENCE_MAX_TITLE = 200;
export const CLINICAL_REFERENCE_MAX_NOTE = 2000;
export const CLINICAL_REFERENCE_MAX_URL = 2048;
export const CLINICAL_REFERENCE_MAX_PER_APPOINTMENT = 20;
export const CLINICAL_REFERENCE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const CLINICAL_REFERENCE_MAX_EXTRACTED_TEXT = 12_000;
export const CLINICAL_REFERENCE_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const;

export function createClinicalReferenceId(): string {
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isClinicalReferenceCategory(value: string): value is ClinicalReferenceCategory {
  return (CLINICAL_REFERENCE_CATEGORIES as string[]).includes(value);
}

export function isValidClinicalReferenceUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > CLINICAL_REFERENCE_MAX_URL) return false;
  try {
    return new URL(trimmed).protocol === 'https:';
  } catch {
    return false;
  }
}

export function clinicalReferenceHasFile(
  ref: Pick<ClinicalReference, 'storagePath' | 'fileName'>,
): boolean {
  return Boolean(ref.storagePath?.trim() || ref.fileName?.trim());
}

export function clinicalReferenceHasOpenableUrl(ref: Pick<ClinicalReference, 'url'>): boolean {
  return isValidClinicalReferenceUrl(ref.url || '');
}

export function isAllowedClinicalReferenceUploadMime(mimeType: string): boolean {
  return (CLINICAL_REFERENCE_UPLOAD_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function normalizeClinicalReferenceUrl(url: string): string {
  return url.trim();
}

export function parseClinicalReferenceIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((id) => id.length > 0 && id.length <= 80);
  if (!ids.length) return undefined;
  return [...new Set(ids)].slice(0, CLINICAL_REFERENCE_MAX_PER_APPOINTMENT);
}

export function sanitizeClinicalReferenceIds(ids: string[] | undefined): string[] {
  if (!ids?.length) return [];
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    CLINICAL_REFERENCE_MAX_PER_APPOINTMENT,
  );
}

export function sortClinicalReferences(refs: ClinicalReference[]): ClinicalReference[] {
  return [...refs].sort((a, b) => {
    const dateA = a.referenceDate ?? '';
    const dateB = b.referenceDate ?? '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return b.updatedAt - a.updatedAt;
  });
}

export function activeClinicalReferences(refs: ClinicalReference[]): ClinicalReference[] {
  return sortClinicalReferences(refs.filter((ref) => !ref.archivedAt));
}

export function resolveClinicalReferencesById(
  refs: ClinicalReference[],
  ids: string[] | undefined,
): ClinicalReference[] {
  if (!ids?.length) return [];
  const byId = new Map(refs.map((ref) => [ref.id, ref]));
  return ids
    .map((id) => byId.get(id))
    .filter((ref): ref is ClinicalReference => !!ref && !ref.archivedAt);
}
