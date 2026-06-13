import type { DropInTranscriptLabels } from '@medxforce/shared';
import type { CircleTranslator } from './circleI18nContext';
import type { CircleUiLanguage } from './circleLanguages';

export function circleUiLanguageToLocale(language: CircleUiLanguage): string {
  switch (language) {
    case 'German':
      return 'de';
    case 'Spanish':
      return 'es';
    case 'Polish':
      return 'pl';
    default:
      return 'en';
  }
}

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
