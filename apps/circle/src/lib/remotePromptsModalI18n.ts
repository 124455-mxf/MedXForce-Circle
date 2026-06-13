import type { PatientRemoteCommandType } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';

export function remotePromptAwaitingCountdownLabel(
  t: CircleTranslator,
  secondsRemaining: number,
): string {
  const seconds = Math.max(0, secondsRemaining);
  return seconds === 1
    ? t('remotePromptsModal.countdownSecond')
    : t('remotePromptsModal.countdownSeconds', { seconds });
}

export function remoteCommandConfirmTitleI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  return type === 'open_doctor_visit'
    ? t('remotePromptsModal.remoteDoctorVisitConfirmTitle')
    : t('remotePromptsModal.remoteCheckInConfirmTitle');
}

export function remoteCommandConfirmBodyI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  return type === 'open_doctor_visit'
    ? t('remotePromptsModal.remoteDoctorVisitConfirmBody')
    : t('remotePromptsModal.remoteCheckInConfirmBody');
}

export function remoteCommandAwaitingBodyI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  return type === 'open_doctor_visit'
    ? t('remotePromptsModal.remoteDoctorVisitAwaitingBody')
    : t('remotePromptsModal.remoteCheckInAwaitingBody');
}

export function remoteCommandLabelI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  return type === 'open_doctor_visit'
    ? t('remotePromptsModal.remoteLabelDoctorVisit')
    : t('remotePromptsModal.remoteLabelDailyCheckIn');
}

export function remoteCommandResponseBodyI18n(
  t: CircleTranslator,
  status: 'acknowledged' | 'declined',
  type: PatientRemoteCommandType,
  patientName: string,
): string {
  if (type === 'open_doctor_visit') {
    return status === 'acknowledged'
      ? t('remotePromptsModal.remoteAcceptedDoctorVisit', { name: patientName })
      : t('remotePromptsModal.remoteDeclinedDoctorVisit', { name: patientName });
  }
  return status === 'acknowledged'
    ? t('remotePromptsModal.remoteAcceptedCheckIn', { name: patientName })
    : t('remotePromptsModal.remoteDeclinedCheckIn', { name: patientName });
}
