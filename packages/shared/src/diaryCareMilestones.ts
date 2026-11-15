/** @license SPDX-License-Identifier: Apache-2.0 */

import { normalizeTreatmentPhaseForSchedule } from './treatmentPhase';

export type CareDiaryMilestoneKind = 'appMode' | 'treatmentPhase';

export type CareDiaryMilestoneCopy = {
  title: string;
  body: string;
};

type MilestoneLanguage = 'English' | 'German' | 'Spanish' | 'Polish';

type MilestoneLanguageBucket = {
  genericTransition: Record<CareDiaryMilestoneKind, CareDiaryMilestoneCopy>;
  appMode: {
    enter: Record<string, CareDiaryMilestoneCopy>;
    transition: Record<string, CareDiaryMilestoneCopy>;
  };
  treatmentPhase: {
    enter: Record<string, CareDiaryMilestoneCopy>;
    transition: Record<string, CareDiaryMilestoneCopy>;
  };
};

type MilestoneCopyTable = Record<MilestoneLanguage, MilestoneLanguageBucket>;

export function normalizeCareDiaryMilestoneLanguage(
  language: string | undefined | null,
): MilestoneLanguage {
  const raw = String(language || '').trim().toLowerCase();
  if (raw.startsWith('de') || raw.includes('german') || raw.includes('deutsch')) return 'German';
  if (raw.startsWith('es') || raw.includes('spanish') || raw.includes('español')) return 'Spanish';
  if (raw.startsWith('pl') || raw.includes('polish') || raw.includes('polski')) return 'Polish';
  return 'English';
}

export function normalizeAppModeForMilestone(mode: string | undefined | null): string {
  const raw = String(mode || '').trim();
  if (raw === 'intensive_care' || raw === 'hospital' || raw === 'user') return raw;
  return '';
}

export function normalizeTreatmentPhaseForMilestone(phase: string | undefined | null): string {
  const raw = String(phase || '').trim();
  if (!raw) return '';
  return normalizeTreatmentPhaseForSchedule(raw) ?? raw;
}

export function careDiaryMilestoneSourceRef(
  kind: CareDiaryMilestoneKind,
  from: string,
  to: string,
  at = Date.now(),
): string {
  const day = new Date(at).toISOString().slice(0, 10);
  const fromKey = from || '_';
  return `milestone/${kind}/${fromKey}->${to}/${day}`;
}

const COPY: MilestoneCopyTable = {
  English: {
    genericTransition: {
      appMode: {
        title: 'Care has changed course',
        body: 'How support is organized has shifted for where things are now. Your circle is here for this chapter — whatever direction it takes.',
      },
      treatmentPhase: {
        title: 'A new chapter in the journey',
        body: 'Where things stand has changed. Your circle stays with you — through setbacks, turns, and steps forward alike.',
      },
    },
    appMode: {
      enter: {
        intensive_care: {
          title: 'Close monitoring',
          body: 'Every moment counts right now. The app stays simple so your circle can stay close and respond quickly.',
        },
        hospital: {
          title: 'Hospital recovery',
          body: 'You are past the most critical stretch. There is more room now for everyday routines, visits, and small wins.',
        },
        user: {
          title: 'Life at home',
          body: 'Recovery continues beyond the hospital — staying connected with your circle and noticing daily progress.',
        },
      },
      transition: {
        'intensive_care__hospital': {
          title: 'A step out of intensive care',
          body: 'A meaningful shift — less crisis focus, more space for healing routines and time with loved ones.',
        },
        'hospital__user': {
          title: 'On the way home',
          body: 'Leaving the hospital is a milestone in itself. The journey moves to daily life, with your circle nearby.',
        },
        'user__hospital': {
          title: 'Back in hospital care',
          body: 'Care has moved closer again for a hospital stay — your circle is here while you focus on getting steadier.',
        },
        'hospital__intensive_care': {
          title: 'Closer monitoring again',
          body: 'Care has intensified for a while. Your circle is staying close while you get the support you need.',
        },
        'intensive_care__user': {
          title: 'Heading home from critical care',
          body: 'A big leap — from the most intensive support toward daily life at home, with your circle alongside you.',
        },
        'user__intensive_care': {
          title: 'Intensive support again',
          body: 'Care has stepped up for a time. Your circle is staying close while you receive closer monitoring.',
        },
      },
    },
    treatmentPhase: {
      enter: {
        icu: {
          title: 'In the ICU',
          body: 'You are in the most intensive phase of recovery. Your circle is staying close.',
        },
        acute: {
          title: 'Acute recovery',
          body: 'The focus turns to stabilizing and healing after the most critical days.',
        },
        rehab: {
          title: 'Active recovery',
          body: 'Strength and independence are building. Rehabilitation and everyday progress take center stage.',
        },
        maintenance: {
          title: 'Daily life',
          body: 'Care centers on living well day to day — maintaining health, connection, and what matters most.',
        },
        palliative: {
          title: 'Comfort and togetherness',
          body: 'The focus is comfort, dignity, and being present with the people who matter.',
        },
      },
      transition: {
        'icu__acute': {
          title: 'Moving to acute care',
          body: 'A step forward — stabilizing and healing as the most intensive monitoring eases.',
        },
        'acute__rehab': {
          title: 'Into active recovery',
          body: 'Healing shifts toward rebuilding strength, skills, and independence.',
        },
        'rehab__maintenance': {
          title: 'Back to everyday life',
          body: 'Recovery settles into a rhythm of daily living — progress measured in moments as well as milestones.',
        },
        'icu__rehab': {
          title: 'Building strength again',
          body: 'A long step forward — from the most critical days toward active rehabilitation.',
        },
        'acute__maintenance': {
          title: 'Settling into daily life',
          body: 'Healing moves toward the routines and connections of everyday living.',
        },
        'maintenance__rehab': {
          title: 'Active recovery again',
          body: 'The focus returns to rebuilding strength and skills with structured support.',
        },
        'rehab__acute': {
          title: 'Closer care for a time',
          body: 'Recovery needs a bit more support right now — your circle is staying involved.',
        },
        'icu__maintenance': {
          title: 'A long road forward',
          body: 'From the most intensive days toward the rhythms of daily life — one chapter at a time.',
        },
        'maintenance__acute': {
          title: 'Closer medical care again',
          body: 'Daily life has shifted — more hands-on medical support is needed for a while. Your circle is staying with you.',
        },
        'maintenance__palliative': {
          title: 'A focus on comfort',
          body: 'Care is turning toward comfort, dignity, and time together. Your circle is here for presence and support.',
        },
        'rehab__palliative': {
          title: 'Comfort and togetherness',
          body: 'The priority is ease, dignity, and being with the people who matter. Your circle walks this path with you.',
        },
        'acute__palliative': {
          title: 'Surrounded by care',
          body: 'The focus moves to comfort and presence. Your circle is near — for quiet support and togetherness.',
        },
        'icu__palliative': {
          title: 'Held in comfort and care',
          body: 'Those closest are focusing on comfort, dignity, and being present. Your circle is here.',
        },
        'rehab__icu': {
          title: 'Stepping up to intensive care',
          body: 'Care has intensified significantly. Your circle is staying near while you receive close support.',
        },
        'maintenance__icu': {
          title: 'Intensive care again',
          body: 'From everyday life, care has moved to the most intensive level. Your circle is staying close.',
        },
        'palliative__maintenance': {
          title: 'Back toward daily life',
          body: 'Care is opening toward everyday living again — a new chapter, with your circle still nearby.',
        },
        'palliative__rehab': {
          title: 'Building strength again',
          body: 'There is room again for active recovery and rehabilitation. Your circle cheers each step forward.',
        },
        'palliative__acute': {
          title: 'Closer medical care again',
          body: 'Care has shifted toward more hands-on medical support. Your circle stays involved.',
        },
        'palliative__icu': {
          title: 'Intensive support again',
          body: 'Care has become more intensive. Your circle is close through this change.',
        },
        'acute__icu': {
          title: 'Intensive support needed again',
          body: 'Healing needs closer monitoring and support right now. Your circle remains near.',
        },
      },
    },
  },
  German: {
    genericTransition: {
      appMode: {
        title: 'Die Versorgung hat eine neue Richtung',
        body: 'Die Unterstützung wurde an die aktuelle Situation angepasst. Ihr Circle begleitet Sie in diesem Kapitel — welchen Weg es auch nimmt.',
      },
      treatmentPhase: {
        title: 'Ein neues Kapitel auf dem Weg',
        body: 'Die Situation hat sich verändert. Ihr Circle bleibt bei Ihnen — bei Rückschlägen, Wendungen und Schritten nach vorn.',
      },
    },
    appMode: {
      enter: {
        intensive_care: {
          title: 'Engmaschige Überwachung',
          body: 'Jeder Moment zählt gerade. Die App bleibt einfach, damit Ihr Circle nah bleiben und schnell reagieren kann.',
        },
        hospital: {
          title: 'Krankenhausreha',
          body: 'Die kritischste Phase liegt hinter Ihnen. Es gibt mehr Raum für Alltagsroutinen, Besuche und kleine Erfolge.',
        },
        user: {
          title: 'Leben zu Hause',
          body: 'Die Genesung geht über das Krankenhaus hinaus — verbunden mit Ihrem Circle und dem Blick auf den Alltag.',
        },
      },
      transition: {
        'intensive_care__hospital': {
          title: 'Ein Schritt aus der Intensivstation',
          body: 'Ein bedeutsamer Wandel — weniger Krisenfokus, mehr Raum für Heilungsroutinen und Zeit mit Angehörigen.',
        },
        'hospital__user': {
          title: 'Auf dem Weg nach Hause',
          body: 'Das Krankenhaus zu verlassen ist selbst ein Meilenstein. Der Weg führt in den Alltag — Ihr Circle ist dabei.',
        },
        'user__hospital': {
          title: 'Wieder stationäre Versorgung',
          body: 'Die Versorgung ist wieder näher am Krankenhaus — Ihr Circle begleitet Sie, während Sie sich erholen.',
        },
        'hospital__intensive_care': {
          title: 'Wieder engmaschigere Überwachung',
          body: 'Die Versorgung ist für eine Zeit intensiver. Ihr Circle bleibt nah, während Sie Unterstützung erhalten.',
        },
        'intensive_care__user': {
          title: 'Nach Hause aus der Intensivversorgung',
          body: 'Ein großer Schritt — von intensivster Unterstützung hin zum Leben zu Hause, mit Ihrem Circle an Ihrer Seite.',
        },
        'user__intensive_care': {
          title: 'Wieder intensive Unterstützung',
          body: 'Die Versorgung wurde verstärkt. Ihr Circle bleibt nah bei engmaschigerer Überwachung.',
        },
      },
    },
    treatmentPhase: {
      enter: {
        icu: {
          title: 'Auf der Intensivstation',
          body: 'Sie sind in der intensivsten Phase der Genesung. Ihr Circle bleibt nah.',
        },
        acute: {
          title: 'Akute Genesung',
          body: 'Der Fokus liegt auf Stabilisierung und Heilung nach den kritischsten Tagen.',
        },
        rehab: {
          title: 'Aktive Genesung',
          body: 'Kraft und Selbstständigkeit wachsen. Rehabilitation und Alltagsfortschritte stehen im Mittelpunkt.',
        },
        maintenance: {
          title: 'Alltag',
          body: 'Die Versorgung konzentriert sich auf ein gutes Leben im Alltag — Gesundheit, Verbundenheit und das Wesentliche.',
        },
        palliative: {
          title: 'Geborgenheit und Gemeinschaft',
          body: 'Im Mittelpunkt stehen Komfort, Würde und die Zeit mit den Menschen, die zählen.',
        },
      },
      transition: {
        'icu__acute': {
          title: 'Wechsel in die akute Versorgung',
          body: 'Ein Schritt vorwärts — Stabilisierung und Heilung, während die intensivste Überwachung nachlässt.',
        },
        'acute__rehab': {
          title: 'In die aktive Genesung',
          body: 'Die Heilung richtet sich auf Kraft, Fähigkeiten und Selbstständigkeit.',
        },
        'rehab__maintenance': {
          title: 'Zurück in den Alltag',
          body: 'Die Genesung findet ihren Alltagsrhythmus — Fortschritt in Momenten und Meilensteinen.',
        },
        'icu__rehab': {
          title: 'Wieder Kraft aufbauen',
          body: 'Ein langer Schritt — von den kritischsten Tagen zur aktiven Rehabilitation.',
        },
        'acute__maintenance': {
          title: 'Alltag findet Halt',
          body: 'Die Heilung bewegt sich zu den Routinen und Verbindungen des täglichen Lebens.',
        },
        'maintenance__rehab': {
          title: 'Wieder aktive Genesung',
          body: 'Der Fokus kehrt zu Kraftaufbau und strukturierter Unterstützung zurück.',
        },
        'rehab__acute': {
          title: 'Für eine Zeit engere Versorgung',
          body: 'Die Genesung braucht gerade etwas mehr Unterstützung — Ihr Circle bleibt beteiligt.',
        },
        'icu__maintenance': {
          title: 'Ein langer Weg nach vorn',
          body: 'Von den intensivsten Tagen zu den Rhythmen des Alltags — Kapitel für Kapitel.',
        },
      },
    },
  },
  Spanish: {
    genericTransition: {
      appMode: {
        title: 'La atención ha cambiado de rumbo',
        body: 'El apoyo se ha adaptado a donde están las cosas ahora. Su círculo está aquí en este capítulo — sea cual sea la dirección.',
      },
      treatmentPhase: {
        title: 'Un nuevo capítulo en el camino',
        body: 'La situación ha cambiado. Su círculo permanece con usted — en retrocesos, giros y pasos adelante por igual.',
      },
    },
    appMode: {
      enter: {
        intensive_care: {
          title: 'Vigilancia estrecha',
          body: 'Cada momento cuenta ahora. La app se mantiene simple para que su círculo pueda estar cerca y responder con rapidez.',
        },
        hospital: {
          title: 'Recuperación hospitalaria',
          body: 'Ya pasó el tramo más crítico. Hay más espacio para rutinas cotidianas, visitas y pequeños logros.',
        },
        user: {
          title: 'Vida en casa',
          body: 'La recuperación continúa más allá del hospital — conectado con su círculo y atento al progreso diario.',
        },
      },
      transition: {
        'intensive_care__hospital': {
          title: 'Un paso fuera de cuidados intensivos',
          body: 'Un cambio significativo — menos enfoque en la crisis, más espacio para rutinas de sanación y tiempo con sus seres queridos.',
        },
        'hospital__user': {
          title: 'De camino a casa',
          body: 'Salir del hospital es un hito en sí mismo. El camino pasa a la vida diaria, con su círculo cerca.',
        },
        'user__hospital': {
          title: 'De vuelta a cuidados hospitalarios',
          body: 'La atención vuelve a acercarse durante una estancia hospitalaria — su círculo está aquí mientras se recupera.',
        },
        'hospital__intensive_care': {
          title: 'Vigilancia más estrecha de nuevo',
          body: 'La atención se ha intensificado por un tiempo. Su círculo permanece cerca mientras recibe el apoyo necesario.',
        },
        'intensive_care__user': {
          title: 'Hacia casa desde cuidados críticos',
          body: 'Un gran salto — del apoyo más intensivo hacia la vida diaria en casa, con su círculo a su lado.',
        },
        'user__intensive_care': {
          title: 'Apoyo intensivo de nuevo',
          body: 'La atención se ha reforzado por un tiempo. Su círculo permanece cerca con una vigilancia más estrecha.',
        },
      },
    },
    treatmentPhase: {
      enter: {
        icu: {
          title: 'En la UCI',
          body: 'Está en la fase más intensiva de la recuperación. Su círculo permanece cerca.',
        },
        acute: {
          title: 'Recuperación aguda',
          body: 'El enfoque pasa a estabilizar y sanar después de los días más críticos.',
        },
        rehab: {
          title: 'Recuperación activa',
          body: 'La fuerza y la independencia van creciendo. La rehabilitación y el progreso cotidiano toman el centro.',
        },
        maintenance: {
          title: 'Vida cotidiana',
          body: 'La atención se centra en vivir bien día a día — salud, conexión y lo que más importa.',
        },
        palliative: {
          title: 'Confort y compañía',
          body: 'El enfoque está en el confort, la dignidad y estar presente con quienes importan.',
        },
      },
      transition: {
        'icu__acute': {
          title: 'Paso a cuidados agudos',
          body: 'Un paso adelante — estabilizar y sanar mientras la vigilancia más intensiva disminuye.',
        },
        'acute__rehab': {
          title: 'Hacia la recuperación activa',
          body: 'La sanación se orienta a reconstruir fuerza, habilidades e independencia.',
        },
        'rehab__maintenance': {
          title: 'De vuelta al día a día',
          body: 'La recuperación encuentra su ritmo cotidiano — progreso en momentos y en hitos.',
        },
        'icu__rehab': {
          title: 'Recuperando fuerzas',
          body: 'Un largo paso — de los días más críticos hacia la rehabilitación activa.',
        },
        'acute__maintenance': {
          title: 'Asentándose en la vida diaria',
          body: 'La sanación avanza hacia las rutinas y conexiones de la vida cotidiana.',
        },
        'maintenance__rehab': {
          title: 'Recuperación activa de nuevo',
          body: 'El enfoque vuelve a ganar fuerza y habilidades con apoyo estructurado.',
        },
        'rehab__acute': {
          title: 'Atención más cercana por un tiempo',
          body: 'La recuperación necesita un poco más de apoyo ahora — su círculo sigue involucrado.',
        },
        'icu__maintenance': {
          title: 'Un largo camino por delante',
          body: 'De los días más intensivos a los ritmos de la vida diaria — capítulo a capítulo.',
        },
      },
    },
  },
  Polish: {
    genericTransition: {
      appMode: {
        title: 'Opieka zmieniła kierunek',
        body: 'Wsparcie zostało dostosowane do tego, gdzie jesteście teraz. Twój krąg jest przy tym rozdziale — bez względu na kierunek.',
      },
      treatmentPhase: {
        title: 'Nowy rozdział na drodze',
        body: 'Sytuacja się zmieniła. Twój krąg zostaje z Tobą — przy cofnięciach, zwrotach i krokach naprzód.',
      },
    },
    appMode: {
      enter: {
        intensive_care: {
          title: 'Ścisły monitoring',
          body: 'Teraz liczy się każda chwila. Aplikacja pozostaje prosta, aby Twój krąg mógł być blisko i szybko reagować.',
        },
        hospital: {
          title: 'Rekonwalescencja szpitalna',
          body: 'Najbardziej krytyczny etap jest za Tobą. Jest więcej miejsca na codzienne rutyny, wizyty i małe sukcesy.',
        },
        user: {
          title: 'Życie w domu',
          body: 'Rekonwalescencja trwa poza szpitalem — w kontakcie z kręgiem i z codziennym postępem.',
        },
      },
      transition: {
        'intensive_care__hospital': {
          title: 'Krok z oddziału intensywnej terapii',
          body: 'Znacząca zmiana — mniej nacisku na kryzys, więcej miejsca na rutyny gojenia i czas z bliskimi.',
        },
        'hospital__user': {
          title: 'W drodze do domu',
          body: 'Wyjście ze szpitala to samo w sobie kamień milowy. Droga prowadzi do codziennego życia z kręgiem obok.',
        },
        'user__hospital': {
          title: 'Ponownie opieka szpitalna',
          body: 'Opieka znów jest bliżej podczas pobytu w szpitalu — Twój krąg jest przy Tobie, gdy wracasz do równowagi.',
        },
        'hospital__intensive_care': {
          title: 'Znów ściślejszy monitoring',
          body: 'Opieka na jakiś czas się zaostrzyła. Twój krąg pozostaje blisko, gdy otrzymujesz potrzebne wsparcie.',
        },
        'intensive_care__user': {
          title: 'Do domu po intensywnej opiece',
          body: 'Wielki krok — od najintensywniejszego wsparcia do codziennego życia w domu, z kręgiem u boku.',
        },
        'user__intensive_care': {
          title: 'Znów intensywne wsparcie',
          body: 'Opieka została wzmocniona na jakiś czas. Twój krąg pozostaje blisko przy ściślejszym monitoringu.',
        },
      },
    },
    treatmentPhase: {
      enter: {
        icu: {
          title: 'Na OIT',
          body: 'Jesteś w najintensywniejszej fazie rekonwalescencji. Twój krąg pozostaje blisko.',
        },
        acute: {
          title: 'Ostra rekonwalescencja',
          body: 'Nacisk przechodzi na stabilizację i gojenie po najbardziej krytycznych dniach.',
        },
        rehab: {
          title: 'Aktywna rekonwalescencja',
          body: 'Siła i samodzielność rosną. Rehabilitacja i codzienny postęp są w centrum.',
        },
        maintenance: {
          title: 'Codzienne życie',
          body: 'Opieka koncentruje się na dobrym życiu na co dzień — zdrowiu, więzi i tym, co najważniejsze.',
        },
        palliative: {
          title: 'Komfort i wspólny czas',
          body: 'Nacisk jest na komforcie, godności i obecności z ludźmi, którzy się liczą.',
        },
      },
      transition: {
        'icu__acute': {
          title: 'Przejście do ostrej opieki',
          body: 'Krok naprzód — stabilizacja i gojenie, gdy najintensywniejszy monitoring słabnie.',
        },
        'acute__rehab': {
          title: 'W aktywną rekonwalescencję',
          body: 'Gojenie zmierza ku odbudowie siły, umiejętności i samodzielności.',
        },
        'rehab__maintenance': {
          title: 'Powrót do codzienności',
          body: 'Rekonwalescencja wchodzi w codzienny rytm — postęp w chwilach i kamieniach milowych.',
        },
        'icu__rehab': {
          title: 'Znów budowanie siły',
          body: 'Długi krok — od najbardziej krytycznych dni do aktywnej rehabilitacji.',
        },
        'acute__maintenance': {
          title: 'Osadzenie w codziennym życiu',
          body: 'Gojenie zmierza ku rutynom i więziom codziennego życia.',
        },
        'maintenance__rehab': {
          title: 'Znów aktywna rekonwalescencja',
          body: 'Nacisk wraca na budowanie siły i umiejętności ze strukturalnym wsparciem.',
        },
        'rehab__acute': {
          title: 'Na jakiś czas bliższa opieka',
          body: 'Rekonwalescencja potrzebuje teraz trochę więcej wsparcia — Twój krąg pozostaje zaangażowany.',
        },
        'icu__maintenance': {
          title: 'Długa droga naprzód',
          body: 'Od najintensywniejszych dni do rytmów codziennego życia — rozdział po rozdziale.',
        },
      },
    },
  },
};

export function resolveCareDiaryMilestoneCopy(
  kind: CareDiaryMilestoneKind,
  from: string,
  to: string,
  language: string | undefined | null,
): CareDiaryMilestoneCopy | null {
  if (!to) return null;
  const lang = normalizeCareDiaryMilestoneLanguage(language);
  const table = COPY[lang] ?? COPY.English;
  const bucket = table[kind];
  const fromKey = from || '';

  if (!fromKey) {
    return bucket.enter[to] ?? null;
  }

  const transitionKey = `${fromKey}__${to}`;
  const transitionCopy = bucket.transition[transitionKey];
  if (transitionCopy) return transitionCopy;

  return table.genericTransition[kind];
}

export function shouldRecordCareDiaryMilestone(from: string, to: string): boolean {
  return !!to && from !== to;
}
