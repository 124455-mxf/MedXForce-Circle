import { useCallback, useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import {
  clearCircleAwaitingRemoteCommandResponse,
  expirePatientRemoteCommand,
  hasCircleNotifiedRemoteCommandResponse,
  PATIENT_REMOTE_COMMAND_RESPONSE_TIMEOUT_MS,
  patientRemoteCommandResponseDeadline,
  readCircleAwaitingRemoteCommandResponse,
  sendPatientRemoteCommand,
  subscribePatientRemoteCommand,
  writeCircleAwaitingRemoteCommandResponse,
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
  return sawPendingTransition || awaitingCommandId === command.commandId;
}

/** Single Firestore subscription for remote prompts — response notices + send/await UI. */
export function useCirclePatientRemoteCommand(
  db: Firestore,
  patientId: string | undefined,
  userId: string | undefined,
  enabled: boolean,
) {
  const [command, setCommand] = useState<PatientRemoteCommandDoc | null>(null);
  const [notice, setNotice] = useState<CirclePatientRemoteCommandResponseNotice | null>(null);
  const [awaitingCommandId, setAwaitingCommandId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const prevCommandRef = useRef<PatientRemoteCommandDoc | null>(null);
  const expiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !patientId || !userId) {
      prevCommandRef.current = null;
      setCommand(null);
      setNotice(null);
      setAwaitingCommandId(null);
      return;
    }

    return subscribePatientRemoteCommand(db, patientId, (nextCommand) => {
      const prev = prevCommandRef.current;
      prevCommandRef.current = nextCommand;
      setCommand(nextCommand);

      if (!nextCommand || !shouldNotifySender(nextCommand, userId, prev)) return;
      const status = nextCommand.status;
      if (!isPatientResponse(status)) return;

      setNotice({
        commandId: nextCommand.commandId,
        type: nextCommand.type,
        status,
      });
      clearCircleAwaitingRemoteCommandResponse(nextCommand.patientId);
    }, (msg) => console.warn('[circlePatientRemoteCommand]', msg));
  }, [db, enabled, patientId, userId]);

  const pendingCommand =
    command &&
    command.status === 'pending' &&
    command.requestedByUid === userId &&
    command.commandId === awaitingCommandId
      ? command
      : null;

  const awaitingPatientResponse = !!pendingCommand;
  const responseDeadline = pendingCommand
    ? patientRemoteCommandResponseDeadline(pendingCommand)
    : null;
  const responseSecondsRemaining =
    responseDeadline != null
      ? Math.max(0, Math.ceil((responseDeadline - nowTick) / 1000))
      : null;

  useEffect(() => {
    if (!command || !awaitingCommandId || command.commandId !== awaitingCommandId) return;
    if (command.status === 'pending') return;
    setAwaitingCommandId(null);
    clearCircleAwaitingRemoteCommandResponse(command.patientId);
  }, [awaitingCommandId, command]);

  useEffect(() => {
    if (!awaitingPatientResponse) return;
    const interval = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [awaitingPatientResponse, pendingCommand?.commandId]);

  useEffect(() => {
    if (!enabled || !patientId || !pendingCommand || responseDeadline == null) return;

    const msRemaining = responseDeadline - Date.now();
    const expire = () => {
      if (expiredRef.current === pendingCommand.commandId) return;
      expiredRef.current = pendingCommand.commandId;
      void expirePatientRemoteCommand(db, pendingCommand)
        .then(() => {
          clearCircleAwaitingRemoteCommandResponse(patientId);
          setAwaitingCommandId(null);
        })
        .catch((err) => console.warn('[circlePatientRemoteCommand] awaiting expire', err));
    };

    if (msRemaining <= 0) {
      expire();
      return;
    }

    const timer = window.setTimeout(expire, msRemaining);
    return () => window.clearTimeout(timer);
  }, [
    db,
    enabled,
    patientId,
    pendingCommand,
    pendingCommand?.commandId,
    responseDeadline,
  ]);

  const sendRemoteCommand = useCallback(
    async (params: {
      type: PatientRemoteCommandType;
      requestedByName: string;
      requestedByRole?: string;
    }) => {
      if (!enabled || !patientId || !userId) {
        throw new Error('Remote prompt is not available.');
      }
      setBusy(true);
      setError(null);
      try {
        const sent = await sendPatientRemoteCommand(db, {
          patientId,
          type: params.type,
          requestedByUid: userId,
          requestedByName: params.requestedByName,
          requestedByRole: params.requestedByRole,
        });
        writeCircleAwaitingRemoteCommandResponse(patientId, sent.commandId);
        expiredRef.current = null;
        setAwaitingCommandId(sent.commandId);
        setNowTick(Date.now());
        return sent;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not send prompt.';
        setError(message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [db, enabled, patientId, userId],
  );

  const cancelPendingCommand = useCallback(async () => {
    if (!patientId || !pendingCommand) return;
    setBusy(true);
    setError(null);
    try {
      await expirePatientRemoteCommand(db, pendingCommand);
      clearCircleAwaitingRemoteCommandResponse(patientId);
      setAwaitingCommandId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not cancel request.';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [db, patientId, pendingCommand]);

  const dismissNotice = useCallback(() => {
    if (!notice || !patientId) {
      setNotice(null);
      return;
    }
    writeCircleNotifiedRemoteCommandResponse(patientId, notice.commandId, notice.status);
    clearCircleAwaitingRemoteCommandResponse(patientId);
    setNotice(null);
  }, [notice, patientId]);

  return {
    notice,
    dismissNotice,
    awaitingPatientResponse,
    responseSecondsRemaining,
    responseTimeoutSeconds: PATIENT_REMOTE_COMMAND_RESPONSE_TIMEOUT_MS / 1000,
    busy,
    error,
    sendRemoteCommand,
    cancelPendingCommand,
  };
}

export type CirclePatientRemoteCommandAwaiting = Pick<
  ReturnType<typeof useCirclePatientRemoteCommand>,
  | 'awaitingPatientResponse'
  | 'responseSecondsRemaining'
  | 'responseTimeoutSeconds'
  | 'busy'
  | 'error'
  | 'sendRemoteCommand'
  | 'cancelPendingCommand'
>;
