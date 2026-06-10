import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { normalizeMemberRole, type CircleMemberRole } from './patientPermissions';

/** Single live doc: patients/{patientId}/patient_commands/live */
export const PATIENT_REMOTE_COMMAND_DOC_ID = 'live';

export const PATIENT_REMOTE_COMMAND_TTL_MS = 5 * 60 * 1000;

export type PatientRemoteCommandType = 'open_daily_check_in' | 'open_doctor_visit';

export type PatientRemoteCommandStatus = 'pending' | 'acknowledged' | 'declined' | 'expired';

const REMOTE_PROMPT_ROLES = new Set<CircleMemberRole>([
  'proxy',
  'caregiver',
  'professional_caregiver',
]);

/** Proxy and caregivers only — not family, friends, or facility staff. */
export function canSendPatientRemoteCommands(role: string): boolean {
  return REMOTE_PROMPT_ROLES.has(normalizeMemberRole(role));
}

export interface PatientRemoteCommandDoc {
  patientId: string;
  commandId: string;
  type: PatientRemoteCommandType;
  status: PatientRemoteCommandStatus;
  requestedAt: number;
  expiresAt: number;
  requestedByUid: string;
  requestedByName: string;
  requestedByRole?: string;
  acknowledgedAt?: number;
}

export function patientRemoteCommandDocRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'patient_commands', PATIENT_REMOTE_COMMAND_DOC_ID);
}

export function newPatientRemoteCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parsePatientRemoteCommand(
  patientId: string,
  data: Record<string, unknown> | undefined,
): PatientRemoteCommandDoc | null {
  if (!data) return null;
  const type = data.type;
  if (type !== 'open_daily_check_in' && type !== 'open_doctor_visit') return null;
  const status = data.status;
  if (
    status !== 'pending' &&
    status !== 'acknowledged' &&
    status !== 'declined' &&
    status !== 'expired'
  ) {
    return null;
  }
  const requestedAt = typeof data.requestedAt === 'number' ? data.requestedAt : 0;
  const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : 0;
  const commandId = typeof data.commandId === 'string' ? data.commandId : '';
  if (!commandId || !requestedAt) return null;

  return {
    patientId,
    commandId,
    type,
    status,
    requestedAt,
    expiresAt,
    requestedByUid: String(data.requestedByUid ?? ''),
    requestedByName: String(data.requestedByName ?? 'Care team'),
    requestedByRole:
      typeof data.requestedByRole === 'string' ? data.requestedByRole : undefined,
    acknowledgedAt:
      typeof data.acknowledgedAt === 'number' ? data.acknowledgedAt : undefined,
  };
}

export function isPatientRemoteCommandPending(
  command: PatientRemoteCommandDoc | null,
  now = Date.now(),
): boolean {
  if (!command) return false;
  if (command.status !== 'pending') return false;
  return command.expiresAt > now;
}

export function patientRemoteCommandLabel(type: PatientRemoteCommandType): string {
  switch (type) {
    case 'open_daily_check_in':
      return 'Daily check-in';
    case 'open_doctor_visit':
      return 'Doctor visit capture';
    default:
      return 'Patient app action';
  }
}

export function patientRemoteCommandCircleConfirmTitle(type: PatientRemoteCommandType): string {
  switch (type) {
    case 'open_daily_check_in':
      return 'Prompt daily check-in on patient tablet?';
    case 'open_doctor_visit':
      return 'Open doctor visit capture on patient tablet?';
    default:
      return 'Send command to patient app?';
  }
}

export function patientRemoteCommandCircleConfirmBody(type: PatientRemoteCommandType): string {
  switch (type) {
    case 'open_daily_check_in':
      return 'The patient will see a prompt on their tablet to open the daily check-in. They can accept or dismiss it.';
    case 'open_doctor_visit':
      return 'The patient will see a prompt to start doctor visit recording on their tablet. They can accept or dismiss it.';
    default:
      return 'This sends a one-time prompt to the patient app while they are online.';
  }
}

export function patientRemoteCommandPatientBannerText(
  command: PatientRemoteCommandDoc,
): string {
  const who = command.requestedByName?.trim() || 'Your care team';
  switch (command.type) {
    case 'open_daily_check_in':
      return `${who} is asking you to complete your daily check-in.`;
    case 'open_doctor_visit':
      return `${who} is asking you to start doctor visit capture.`;
    default:
      return `${who} sent a request to your tablet.`;
  }
}

export type PatientRemoteCommandPatientResponse = 'acknowledged' | 'declined';

export function patientRemoteCommandCircleResponseTitle(
  status: PatientRemoteCommandPatientResponse,
): string {
  return status === 'acknowledged' ? 'Patient chose Open now' : 'Patient chose Not now';
}

export function patientRemoteCommandCircleResponseBody(
  status: PatientRemoteCommandPatientResponse,
  type: PatientRemoteCommandType,
  patientName: string,
): string {
  const action = patientRemoteCommandLabel(type).toLowerCase();
  if (status === 'acknowledged') {
    return `${patientName} accepted your request to open ${action} on their tablet.`;
  }
  return `${patientName} declined your request to open ${action} on their tablet.`;
}

function circleAwaitingRemoteCommandStorageKey(patientId: string): string {
  return `medx_circle_awaiting_remote_cmd_${patientId}`;
}

function circleNotifiedRemoteCommandStorageKey(
  patientId: string,
  commandId: string,
  status: PatientRemoteCommandPatientResponse,
): string {
  return `medx_circle_remote_cmd_notice_${patientId}_${commandId}_${status}`;
}

/** Call after Circle sends a remote prompt — used to show a response modal after navigation. */
export function writeCircleAwaitingRemoteCommandResponse(
  patientId: string,
  commandId: string,
): void {
  try {
    localStorage.setItem(circleAwaitingRemoteCommandStorageKey(patientId), commandId);
  } catch {
    /* ignore */
  }
}

export function readCircleAwaitingRemoteCommandResponse(patientId: string): string {
  try {
    return localStorage.getItem(circleAwaitingRemoteCommandStorageKey(patientId)) ?? '';
  } catch {
    return '';
  }
}

export function clearCircleAwaitingRemoteCommandResponse(patientId: string): void {
  try {
    localStorage.removeItem(circleAwaitingRemoteCommandStorageKey(patientId));
  } catch {
    /* ignore */
  }
}

export function hasCircleNotifiedRemoteCommandResponse(
  patientId: string,
  commandId: string,
  status: PatientRemoteCommandPatientResponse,
): boolean {
  try {
    return (
      localStorage.getItem(
        circleNotifiedRemoteCommandStorageKey(patientId, commandId, status),
      ) === '1'
    );
  } catch {
    return false;
  }
}

export function writeCircleNotifiedRemoteCommandResponse(
  patientId: string,
  commandId: string,
  status: PatientRemoteCommandPatientResponse,
): void {
  try {
    localStorage.setItem(
      circleNotifiedRemoteCommandStorageKey(patientId, commandId, status),
      '1',
    );
  } catch {
    /* ignore */
  }
}

export async function sendPatientRemoteCommand(
  db: Firestore,
  params: {
    patientId: string;
    type: PatientRemoteCommandType;
    requestedByUid: string;
    requestedByName: string;
    requestedByRole?: string;
  },
): Promise<PatientRemoteCommandDoc> {
  const now = Date.now();
  const docBody: PatientRemoteCommandDoc = {
    patientId: params.patientId,
    commandId: newPatientRemoteCommandId(),
    type: params.type,
    status: 'pending',
    requestedAt: now,
    expiresAt: now + PATIENT_REMOTE_COMMAND_TTL_MS,
    requestedByUid: params.requestedByUid,
    requestedByName: params.requestedByName.trim() || 'Care team',
    requestedByRole: params.requestedByRole,
  };
  await setDoc(patientRemoteCommandDocRef(db, params.patientId), docBody);
  return docBody;
}

export async function respondToPatientRemoteCommand(
  db: Firestore,
  command: PatientRemoteCommandDoc,
  response: 'acknowledged' | 'declined' | 'expired',
): Promise<void> {
  await updateDoc(patientRemoteCommandDocRef(db, command.patientId), {
    status: response,
    acknowledgedAt: Date.now(),
  });
}

export function subscribePatientRemoteCommand(
  db: Firestore,
  patientId: string,
  onChange: (command: PatientRemoteCommandDoc | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    patientRemoteCommandDocRef(db, patientId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(parsePatientRemoteCommand(patientId, snap.data() as Record<string, unknown>));
    },
    (err) => onError?.(err.message),
  );
}

export function readLastHandledRemoteCommandId(patientId: string): string {
  try {
    return localStorage.getItem(`medx_last_remote_cmd_${patientId}`) ?? '';
  } catch {
    return '';
  }
}

export function writeLastHandledRemoteCommandId(patientId: string, commandId: string): void {
  try {
    localStorage.setItem(`medx_last_remote_cmd_${patientId}`, commandId);
  } catch {
    /* ignore */
  }
}
