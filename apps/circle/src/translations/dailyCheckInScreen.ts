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

const dailyCheckInSpanish = {
  settingsQuestionsDesc:
    'Configure hasta 5 preguntas. Edite el texto, el tipo de respuesta o desactive preguntas individuales.',
  questionLabel: 'Pregunta {{number}}',
  conditionalVitality: 'se muestra cuando juegos, Vitalidad o galería están activos',
  customQuestionText: 'Texto de la pregunta (opcional)',
  answerType: 'Tipo de respuesta',
  answerTypes: {
    mood: 'Ánimo (Bien / OK / Mal)',
    scale: 'Escala (1–10)',
    yesNo: 'Sí / No',
    sleep: 'Sueño (Bien / OK / Mal)',
  },
  defaultQuestions: {
    feelToday: '¿Cómo se siente hoy?',
    painToday: '¿Cómo está su nivel de dolor hoy?',
    sleep: '¿Cómo durmió anoche?',
    vitalityOffer: '¿Quiere jugar, hacer ejercicios o ver fotos?',
    custom: 'Pregunta personalizada',
  },
};

const dailyCheckInPolish = {
  settingsQuestionsDesc:
    'Skonfiguruj do 5 pytań. Edytuj treść, typ odpowiedzi lub wyłącz poszczególne pytania.',
  questionLabel: 'Pytanie {{number}}',
  conditionalVitality: 'widoczne, gdy włączone są gry, Vitality lub galeria',
  customQuestionText: 'Treść pytania (opcjonalna)',
  answerType: 'Typ odpowiedzi',
  answerTypes: {
    mood: 'Nastrój (Dobry / OK / Słaby)',
    scale: 'Skala (1–10)',
    yesNo: 'Tak / Nie',
    sleep: 'Sen (Dobry / OK / Słaby)',
  },
  defaultQuestions: {
    feelToday: 'Jak się dziś czujesz?',
    painToday: 'Jaki jest dziś poziom bólu?',
    sleep: 'Jak spałeś/aś ostatniej nocy?',
    vitalityOffer: 'Czy chcesz pograć, ćwiczyć lub oglądać zdjęcia?',
    custom: 'Własne pytanie',
  },
};

export const dailyCheckInScreenEnglish = dailyCheckInEnglish;
export const dailyCheckInScreenGerman = dailyCheckInGerman;
export const dailyCheckInScreenSpanish = dailyCheckInSpanish;
export const dailyCheckInScreenPolish = dailyCheckInPolish;
