/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  activeClinicalReferences,
  createClinicalReferenceId,
  isClinicalReferenceCategory,
  isValidClinicalReferenceUrl,
  normalizeClinicalReferenceUrl,
  sortClinicalReferences,
  type ClinicalReference,
  type ClinicalReferenceAddedBy,
  type ClinicalReferenceInput,
  CLINICAL_REFERENCE_MAX_NOTE,
  CLINICAL_REFERENCE_MAX_TITLE,
} from '@medxforce/shared';

const referencesCollection = (db: Firestore, patientId: string) =>
  collection(db, 'patients', patientId, 'clinical_references');

function parseReference(id: string, data: Record<string, unknown>): ClinicalReference | null {
  const title = String(data.title ?? '').trim();
  const category = String(data.category ?? '');
  const url = String(data.url ?? '').trim();
  const storagePath = data.storagePath ? String(data.storagePath).trim() : '';
  const fileName = data.fileName ? String(data.fileName).trim() : '';
  const hasFile = Boolean(storagePath || fileName);
  if (!title || !isClinicalReferenceCategory(category)) return null;
  if (!hasFile && !url) return null;
  const addedByRaw = data.addedBy as Record<string, unknown> | undefined;
  const addedBy: ClinicalReferenceAddedBy = {
    uid: String(addedByRaw?.uid ?? ''),
    name: String(addedByRaw?.name ?? ''),
    role: (addedByRaw?.role as ClinicalReferenceAddedBy['role']) ?? 'patient',
    app: addedByRaw?.app === 'circle' ? 'circle' : 'patient',
  };
  const extractionStatus = data.extractionStatus;
  return {
    id,
    patientId: String(data.patientId ?? ''),
    title: title.slice(0, CLINICAL_REFERENCE_MAX_TITLE),
    category,
    url,
    ...(data.note ? { note: String(data.note).trim().slice(0, CLINICAL_REFERENCE_MAX_NOTE) } : {}),
    ...(data.referenceDate ? { referenceDate: String(data.referenceDate).slice(0, 10) } : {}),
    ...(storagePath ? { storagePath } : {}),
    ...(fileName ? { fileName } : {}),
    ...(data.mimeType ? { mimeType: String(data.mimeType) } : {}),
    ...(data.fileSize != null ? { fileSize: Number(data.fileSize) } : {}),
    ...(extractionStatus === 'none' ||
    extractionStatus === 'pending' ||
    extractionStatus === 'ready' ||
    extractionStatus === 'failed'
      ? { extractionStatus }
      : {}),
    ...(data.extractedText
      ? { extractedText: String(data.extractedText).trim().slice(0, 12_000) }
      : {}),
    source: data.source === 'circle' ? 'circle' : 'patient',
    addedBy,
    createdAt: Number(data.createdAt) || 0,
    updatedAt: Number(data.updatedAt) || 0,
    ...(data.archivedAt != null ? { archivedAt: Number(data.archivedAt) } : {}),
  };
}

function requireAuthUid(): string {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

export function subscribeClinicalReferences(
  db: Firestore,
  patientId: string,
  onReferences: (references: ClinicalReference[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(referencesCollection(db, patientId), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const refs = snap.docs
        .map((d) => parseReference(d.id, d.data() as Record<string, unknown>))
        .filter((ref): ref is ClinicalReference => !!ref);
      onReferences(sortClinicalReferences(refs));
    },
    (err) => onError?.(err),
  );
}

export async function createClinicalReference(
  db: Firestore,
  patientId: string,
  input: ClinicalReferenceInput,
  addedBy: ClinicalReferenceAddedBy,
): Promise<ClinicalReference> {
  requireAuthUid();
  const title = input.title.trim().slice(0, CLINICAL_REFERENCE_MAX_TITLE);
  const url = normalizeClinicalReferenceUrl(input.url ?? '');
  if (!title) throw new Error('Title is required');
  if (!isClinicalReferenceCategory(input.category)) throw new Error('Invalid category');
  if (!isValidClinicalReferenceUrl(url)) throw new Error('Invalid URL');

  const now = Date.now();
  const id = createClinicalReferenceId();
  const ref: ClinicalReference = {
    id,
    patientId,
    title,
    category: input.category,
    url,
    extractionStatus: 'none',
    ...(input.note?.trim()
      ? { note: input.note.trim().slice(0, CLINICAL_REFERENCE_MAX_NOTE) }
      : {}),
    ...(input.referenceDate?.trim() ? { referenceDate: input.referenceDate.trim().slice(0, 10) } : {}),
    source: addedBy.app === 'circle' ? 'circle' : 'patient',
    addedBy,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(referencesCollection(db, patientId), id), ref);
  return ref;
}

export async function updateClinicalReference(
  db: Firestore,
  patientId: string,
  refId: string,
  input: ClinicalReferenceInput,
): Promise<void> {
  requireAuthUid();
  const title = input.title.trim().slice(0, CLINICAL_REFERENCE_MAX_TITLE);
  const url = normalizeClinicalReferenceUrl(input.url ?? '');
  if (!title) throw new Error('Title is required');
  if (!isClinicalReferenceCategory(input.category)) throw new Error('Invalid category');
  if (url && !isValidClinicalReferenceUrl(url)) throw new Error('Invalid URL');

  await updateDoc(doc(referencesCollection(db, patientId), refId), {
    title,
    category: input.category,
    ...(url ? { url } : {}),
    note: input.note?.trim().slice(0, CLINICAL_REFERENCE_MAX_NOTE) || null,
    referenceDate: input.referenceDate?.trim().slice(0, 10) || null,
    updatedAt: Date.now(),
  });
}

export async function archiveClinicalReference(
  db: Firestore,
  patientId: string,
  refId: string,
): Promise<void> {
  requireAuthUid();
  await updateDoc(doc(referencesCollection(db, patientId), refId), {
    archivedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export { activeClinicalReferences };
