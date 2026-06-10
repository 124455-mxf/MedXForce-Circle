import { useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  clearCircleAwaitingRemoteCommandResponse,
  hasCircleNotifiedRemoteCommandResponse,
  readCircleAwaitingRemoteCommandResponse,
  subscribePatientRemoteCommand,
  writeCircleNotifiedRemoteCommandResponse,
  type PatientRemoteCommandDoc,
  type PatientRemoteCommandPatientResponse,
  type PatientRemoteCommandType,
} from '@medxforce/shared';

export type CirclePatientRemoteCommandResponseNotice = {
  commandId: string;
  type: PatientRemoteCommandType;
  status: PatientRemoteCommandPatientResponse;
};

function isPatientResponse(
  status: PatientRemoteCommandDoc['status'],
): status is PatientRemoteCommandPatientResponse {
  return status === 'acknowledged' || status === 'declined';
}

function shouldNotifySender(
  command: PatientRemoteCommandDoc,
  userId: string,
  prev: PatientRemoteCommandDoc | null,
): boolean {
  if (command.requestedByUid !== userId) return false;
  if (!isPatientResponse(command.status)) return false;
  if (
    hasCircleNotifiedRemoteCommandResponse(
      command.patientId,
      command.commandId,
      command.status,
    )
  ) {
    return false;
  }

  const sawPendingTransition =
    prev?.commandId === command.commandId && prev.status === 'pending';
  const awaitingCommandId = readCircleAwaitingRemoteCommandResponse(command.patientId);
  const matchesAwaiting = awaitingCommandId === command.commandId;

  return sawPendingTransition || matchesAwaiting;
}

export function useCirclePatientRemoteCommandResponse(
  db: Firestore,
  patientId: string | undefined,
  userId: string | undefined,
  enabled: boolean,
): {
  notice: CirclePatientRemoteCommandResponseNotice | null;
  dismissNotice: () => void;
} {
  const [notice, setNotice] = useState<CirclePatientRemoteCommandResponseNotice | null>(null);
  const prevCommandRef = useRef<PatientRemoteCommandDoc | null>(null);

  useEffect(() => {
    if (!enabled || !patientId || !userId) {
      prevCommandRef.current = null;
      setNotice(null);
      return;
    }

    return subscribePatientRemoteCommand(db, patientId, (command) => {
      const prev = prevCommandRef.current;
      prevCommandRef.current = command;

      if (!command || !shouldNotifySender(command, userId, prev)) return;
      const status = command.status;
      if (!isPatientResponse(status)) return;

      setNotice({
        commandId: command.commandId,
        type: command.type,
        status,
      });
      clearCircleAwaitingRemoteCommandResponse(command.patientId);
    });
  }, [db, enabled, patientId, userId]);

  const dismissNotice = () => {
    if (!notice || !patientId) {
      setNotice(null);
      return;
    }
    writeCircleNotifiedRemoteCommandResponse(patientId, notice.commandId, notice.status);
    clearCircleAwaitingRemoteCommandResponse(patientId);
    setNotice(null);
  };

  return { notice, dismissNotice };
}
