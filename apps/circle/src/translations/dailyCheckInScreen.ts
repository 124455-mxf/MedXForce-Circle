/** Daily check-in question editor — merged into CIRCLE_TRANSLATIONS per language. */

const dailyCheckInEnglish = {
  settingsQuestionsDesc: 'Configure up to 5 questions. Edit wording, answer type, or turn individual questions off.',
  questionLabel: 'Question {{number}}',
  conditionalVitality: 'shown when games, Vitality, or gallery is enabled',
  customQuestionText: 'Question text (optional override)',
  answerType: 'Answer type',
  answerTypes: {
    mood: 'Mood (Good / OK / Bad)',
    scale: 'Scale (1–10)',
    yesNo: 'Yes / No',
    sleep: 'Sleep (Well / OK / Poorly)',
  },
  defaultQuestions: {
    feelToday: 'How do you feel today?',
    painToday: 'How is your pain level today?',
    sleep: 'How did you sleep last night?',
    vitalityOffer: 'Do you want to do some games, exercises, or watch pictures?',
    custom: 'Custom question',
  },
};

const dailyCheckInGerman = {
  settingsQuestionsDesc:
    'Bis zu 5 Fragen konfigurieren. Formulierung und Antworttyp anpassen oder einzelne Fragen deaktivieren.',
  questionLabel: 'Frage {{number}}',
  conditionalVitality: 'wird angezeigt, wenn Spiele, Vitalität oder Galerie aktiv sind',
  customQuestionText: 'Fragentext (optionale Anpassung)',
  answerType: 'Antworttyp',
  answerTypes: {
    mood: 'Stimmung (Gut / OK / Schlecht)',
    scale: 'Skala (1–10)',
    yesNo: 'Ja / Nein',
    sleep: 'Schlaf (Gut / OK / Schlecht)',
  },
  defaultQuestions: {
    feelToday: 'Wie fühlen Sie sich heute?',
    painToday: 'Wie ist Ihr Schmerzlevel heute?',
    sleep: 'Wie haben Sie letzte Nacht geschlafen?',
    vitalityOffer: 'Möchten Sie Spiele spielen, Übungen machen oder Bilder ansehen?',
    custom: 'Eigene Frage',
  },
};

export const dailyCheckInScreenEnglish = dailyCheckInEnglish;
export const dailyCheckInScreenGerman = dailyCheckInGerman;
export const dailyCheckInScreenSpanish = dailyCheckInEnglish;
export const dailyCheckInScreenPolish = dailyCheckInEnglish;
