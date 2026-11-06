/** Keep in sync with medxforce/src/lib/applicationOverviewFirestore.ts */

import {
  doc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

export const APPLICATION_OVERVIEW_DOC_ID = 'live';
export const APPLICATION_OVERVIEW_TEXT_MAX = 120_000;

export type PatientApplicationOverviewDoc = {
  patientId: string;
  text: string;
  updatedAt: number;
  updatedByUid: string;
  updatedByName: string;
  source: 'patient';
};

export function applicationOverviewDocRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'application_overview', APPLICATION_OVERVIEW_DOC_ID);
}

export function sanitizeApplicationOverviewText(text: string): string {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= APPLICATION_OVERVIEW_TEXT_MAX) return trimmed;
  return `${trimmed.slice(0, APPLICATION_OVERVIEW_TEXT_MAX)}\n\n[truncated]`;
}

export function parsePatientApplicationOverview(
  patientId: string,
  raw: Record<string, unknown>,
): PatientApplicationOverviewDoc | null {
  const text = sanitizeApplicationOverviewText(String(raw.text ?? ''));
  if (!text) return null;
  const updatedAt = Number(raw.updatedAt);
  const updatedByUid = String(raw.updatedByUid ?? '').trim();
  const updatedByName = String(raw.updatedByName ?? '').trim();
  if (!Number.isFinite(updatedAt) || !updatedByUid || !updatedByName) return null;
  return {
    patientId,
    text,
    updatedAt,
    updatedByUid,
    updatedByName,
    source: 'patient',
  };
}

export function subscribeApplicationOverview(
  db: Firestore,
  patientId: string,
  onChange: (doc: PatientApplicationOverviewDoc | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    applicationOverviewDocRef(db, patientId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(parsePatientApplicationOverview(patientId, snap.data() as Record<string, unknown>));
    },
    (err) => onError?.(err.message || 'Could not load application overview.'),
  );
}
