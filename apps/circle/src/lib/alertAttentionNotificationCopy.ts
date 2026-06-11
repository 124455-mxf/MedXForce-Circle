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
): AlertAttentionCopy | null {
  if (msg.type !== 'emergency' && msg.type !== 'attention') return null;

  const kind: AlertAttentionNotificationKind =
    msg.type === 'emergency' ? 'emergency' : 'attention';
  const viewerLang = normalizeCircleUiLanguage(viewerLanguage);
  const match = (msg.translations ?? []).find(
    (entry) => normalizeCircleUiLanguage(entry.language) === viewerLang,
  );
  if (match) {
    const catalog = alertAttentionCopyForLanguage(viewerLang, kind);
    return {
      subject: match.subject?.trim() || catalog.subject,
      text: match.text?.trim() || catalog.text,
    };
  }

  return alertAttentionCopyForLanguage(viewerLang, kind);
}
