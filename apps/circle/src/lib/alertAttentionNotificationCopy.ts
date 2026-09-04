import { normalizeCircleUiLanguage, type CircleUiLanguage } from './circleLanguages';

export type AlertAttentionNotificationKind = 'emergency' | 'attention';

export type AlertAttentionCopy = {
  subject: string;
  text: string;
};

const COPY: Record<CircleUiLanguage, Record<AlertAttentionNotificationKind, AlertAttentionCopy>> = {
  English: {
    emergency: {
      subject: 'Emergency alert',
      text: 'Please check on the user immediately. An emergency alert was triggered in MedXForce.',
    },
    attention: {
      subject: 'Attention request',
      text: 'Please check on the user when you can. An attention request was triggered in MedXForce.',
    },
  },
  German: {
    emergency: {
      subject: 'Notfallalarm',
      text: 'Bitte sehen Sie umgehend nach dem Angehörigen. In MedXForce wurde ein Notfallalarm ausgelöst.',
    },
    attention: {
      subject: 'Aufmerksamkeitsanfrage',
      text: 'Bitte sehen Sie nach dem Angehörigen, sobald Sie können. In MedXForce wurde eine Aufmerksamkeitsanfrage ausgelöst.',
    },
  },
  Spanish: {
    emergency: {
      subject: 'Alerta de emergencia',
      text: 'Compruebe el estado del usuario de inmediato. Se activó una alerta de emergencia en MedXForce.',
    },
    attention: {
      subject: 'Solicitud de atención',
      text: 'Compruebe el estado del usuario cuando pueda. Se activó una solicitud de atención en MedXForce.',
    },
  },
  Polish: {
    emergency: {
      subject: 'Alert alarmowy',
      text: 'Proszę natychmiast sprawdzić stan użytkownika. W MedXForce uruchomiono alert alarmowy.',
    },
    attention: {
      subject: 'Prośba o uwagę',
      text: 'Proszę sprawdzić stan użytkownika, gdy będzie to możliwe. W MedXForce uruchomiono prośbę o uwagę.',
    },
  },
};

const LOVED_ONE: Record<CircleUiLanguage, string> = {
  English: 'your loved one',
  German: 'Ihrem Angehörigen',
  Spanish: 'su ser querido',
  Polish: 'bliskiej osoby',
};

/** In-app thread copy only — email/SMS keep the Patient templates. */
const IN_APP_COPY: Record<CircleUiLanguage, Record<AlertAttentionNotificationKind, AlertAttentionCopy>> = {
  English: {
    emergency: {
      subject: 'Emergency alert',
      text: 'Please check on {{name}} now. This is an emergency alert from MedXForce.',
    },
    attention: {
      subject: 'Attention request',
      text: 'Please check on {{name}} when you can. {{name}} asked for attention in MedXForce.',
    },
  },
  German: {
    emergency: {
      subject: 'Notfallalarm',
      text: 'Bitte sehen Sie jetzt nach {{name}}. Das ist ein Notfallalarm aus MedXForce.',
    },
    attention: {
      subject: 'Aufmerksamkeitsanfrage',
      text: 'Bitte sehen Sie nach {{name}}, sobald Sie können. Es gibt eine Aufmerksamkeitsanfrage in MedXForce.',
    },
  },
  Spanish: {
    emergency: {
      subject: 'Alerta de emergencia',
      text: 'Compruebe cómo está {{name}} ahora. Esta es una alerta de emergencia de MedXForce.',
    },
    attention: {
      subject: 'Solicitud de atención',
      text: 'Compruebe cómo está {{name}} cuando pueda. {{name}} pidió atención en MedXForce.',
    },
  },
  Polish: {
    emergency: {
      subject: 'Alert alarmowy',
      text: 'Sprawdź teraz, jak się ma {{name}}. To alert alarmowy z MedXForce.',
    },
    attention: {
      subject: 'Prośba o uwagę',
      text: 'Sprawdź, jak się ma {{name}}, gdy możesz. To prośba o uwagę z MedXForce.',
    },
  },
};

function interpolateName(template: string, name: string): string {
  return template.split('{{name}}').join(name);
}

export function alertAttentionInAppCopyForLanguage(
  language: string | undefined | null,
  kind: AlertAttentionNotificationKind,
  firstName?: string | null,
): AlertAttentionCopy {
  const lang = normalizeCircleUiLanguage(language);
  const copy = IN_APP_COPY[lang][kind];
  const name = firstName?.trim() || LOVED_ONE[lang];
  return {
    subject: copy.subject,
    text: interpolateName(copy.text, name),
  };
}

export function alertAttentionCopyForLanguage(
  language: string | undefined | null,
  kind: AlertAttentionNotificationKind,
): AlertAttentionCopy {
  const lang = normalizeCircleUiLanguage(language);
  return COPY[lang][kind];
}

export type AlertAttentionMessageTranslation = {
  language: string;
  text: string;
  subject?: string;
};

export function resolveAlertAttentionMessageDisplay(
  msg: {
    type?: string;
    subject?: string;
    text?: string;
    translations?: AlertAttentionMessageTranslation[];
  },
  viewerLanguage: CircleUiLanguage,
  firstName?: string | null,
): AlertAttentionCopy | null {
  if (msg.type !== 'emergency' && msg.type !== 'attention') return null;

  const kind: AlertAttentionNotificationKind =
    msg.type === 'emergency' ? 'emergency' : 'attention';
  return alertAttentionInAppCopyForLanguage(viewerLanguage, kind, firstName);
}
