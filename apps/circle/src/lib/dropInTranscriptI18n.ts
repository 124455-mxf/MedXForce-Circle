import type { DropInTranscriptLabels } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
export { circleUiLanguageToLocale } from './circleLanguages';

export function buildDropInTranscriptLabels(t: CircleTranslator): DropInTranscriptLabels {
  return {
    conversationTitle: t('remotePromptsModal.dropInTranscriptConversationTitle'),
    patientLabel: t('remotePromptsModal.patientLabel'),
    startedByLabel: t('remotePromptsModal.dropInTranscriptStartedBy'),
    endedLabel: t('remotePromptsModal.dropInTranscriptEnded'),
    endedByLabel: t('remotePromptsModal.dropInTranscriptEndedBy'),
    footer: t('remotePromptsModal.dropInTranscriptFooter'),
    careTeam: t('remotePromptsModal.dropInTranscriptCareTeam'),
    unknown: t('remotePromptsModal.dropInTranscriptUnknown'),
    unknownTime: t('remotePromptsModal.dropInTranscriptUnknownTime'),
  };
}
