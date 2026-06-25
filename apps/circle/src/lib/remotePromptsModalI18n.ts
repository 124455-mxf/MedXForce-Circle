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
  switch (type) {
    case 'open_doctor_visit':
      return t('remotePromptsModal.remoteDoctorVisitConfirmTitle');
    case 'open_quick_answers':
      return t('remotePromptsModal.remoteQuickAnswersConfirmTitle');
    default:
      return t('remotePromptsModal.remoteCheckInConfirmTitle');
  }
}

export function remoteCommandConfirmBodyI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  switch (type) {
    case 'open_doctor_visit':
      return t('remotePromptsModal.remoteDoctorVisitConfirmBody');
    case 'open_quick_answers':
      return t('remotePromptsModal.remoteQuickAnswersConfirmBody');
    default:
      return t('remotePromptsModal.remoteCheckInConfirmBody');
  }
}

export function remoteCommandAwaitingBodyI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  switch (type) {
    case 'open_doctor_visit':
      return t('remotePromptsModal.remoteDoctorVisitAwaitingBody');
    case 'open_quick_answers':
      return t('remotePromptsModal.remoteQuickAnswersAwaitingBody');
    default:
      return t('remotePromptsModal.remoteCheckInAwaitingBody');
  }
}

export function remoteCommandLabelI18n(
  t: CircleTranslator,
  type: PatientRemoteCommandType,
): string {
  switch (type) {
    case 'open_doctor_visit':
      return t('remotePromptsModal.remoteLabelDoctorVisit');
    case 'open_quick_answers':
      return t('remotePromptsModal.remoteLabelQuickAnswers');
    default:
      return t('remotePromptsModal.remoteLabelDailyCheckIn');
  }
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
  if (type === 'open_quick_answers') {
    return status === 'acknowledged'
      ? t('remotePromptsModal.remoteAcceptedQuickAnswers', { name: patientName })
      : t('remotePromptsModal.remoteDeclinedQuickAnswers', { name: patientName });
  }
  return status === 'acknowledged'
    ? t('remotePromptsModal.remoteAcceptedCheckIn', { name: patientName })
    : t('remotePromptsModal.remoteDeclinedCheckIn', { name: patientName });
}
