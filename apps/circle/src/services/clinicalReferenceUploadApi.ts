/** @license SPDX-License-Identifier: Apache-2.0 */

import { getAuth } from 'firebase/auth';
import type { ClinicalReference, ClinicalReferenceCategory } from '@medxforce/shared';
import type { PatientAiSummary } from '../lib/patientAiSummary';

export type { PatientAiSummary } from '../lib/patientAiSummary';

async function getAuthToken(): Promise<string> {
  const token = await getAuth().currentUser?.getIdToken(true);
  if (!token) throw new Error('Not signed in');
  return token;
}

function apiBase(): string {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return '';
}

function resolveApiBase(): string {
  const base = apiBase();
  if (!base) throw new Error('Patient API is not configured (VITE_MEDXFORCE_API_URL).');
  return base;
}

function parseErrorPayload(raw: string, status: number): string {
  try {
    const data = JSON.parse(raw) as { message?: string; error?: string };
    return data.message || data.error || `Request failed (${status})`;
  } catch {
    return `Request failed (${status})`;
  }
}

export async function uploadClinicalReferenceDocument(params: {
  patientId: string;
  title: string;
  category: ClinicalReferenceCategory;
  note?: string;
  referenceDate?: string;
  file: File;
  addedByName: string;
  addedByRole?: string;
  onProgress?: (percent: number) => void;
}): Promise<ClinicalReference> {
  const token = await getAuthToken();
  const form = new FormData();
  form.append('patientId', params.patientId);
  form.append('title', params.title);
  form.append('category', params.category);
  if (params.note) form.append('note', params.note);
  if (params.referenceDate) form.append('referenceDate', params.referenceDate);
  form.append('addedByName', params.addedByName);
  form.append('addedByRole', params.addedByRole ?? 'caregiver');
  form.append('addedByApp', 'circle');
  form.append('file', params.file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${resolveApiBase()}/api/clinical-references/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      params.onProgress?.(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            success: boolean;
            reference: ClinicalReference;
          };
          params.onProgress?.(100);
          resolve(data.reference);
        } catch {
          reject(new Error('Invalid server response'));
        }
        return;
      }
      reject(new Error(parseErrorPayload(xhr.responseText, xhr.status)));
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(form);
  });
}

export async function generatePatientAiSummary(patientId: string): Promise<PatientAiSummary> {
  const token = await getAuthToken();
  const res = await fetch(`${resolveApiBase()}/api/patient-summary/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patientId }),
  });
  let data: { success?: boolean; summary?: PatientAiSummary; message?: string; error?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Request failed (${res.status})`);
  }
  if (!res.ok || !data.summary) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data.summary;
}
