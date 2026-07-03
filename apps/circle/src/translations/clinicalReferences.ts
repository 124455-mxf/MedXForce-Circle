/** Clinical reference library strings — merged into CIRCLE_TRANSLATIONS per language. */

const clinicalReferencesEnglish = {
  sectionTitle: 'Clinical references',
  sectionHint:
    'Save links to MyChart, discharge summaries, imaging portals, and other clinical documents for visit prep.',
  add: 'Add reference',
  addTitle: 'Add clinical reference',
  editTitle: 'Edit clinical reference',
  emptyTitle: 'No clinical references yet',
  emptyHint: 'Add portal links or document URLs to keep handy for appointments.',
  openLink: 'Open link',
  archive: 'Archive',
  prepareTitle: 'Clinical references for this visit',
  prepareEmpty: 'Add references in the patient profile first, then pick them here.',
  prepareSelected: '{{count}} selected for this visit',
  manageLibrary: 'Manage library',
  fields: {
    title: 'Title',
    category: 'Category',
    url: 'Link (https)',
    referenceDate: 'Document or visit date',
    note: 'Note',
  },
  categories: {
    discharge_summary: 'Discharge summary',
    imaging: 'Imaging',
    lab_results: 'Lab results',
    medication_list: 'Medication list',
    care_plan: 'Care plan',
    portal_link: 'Patient portal',
    therapy_plan: 'Therapy plan',
    insurance: 'Insurance',
    other: 'Other',
  },
  errors: {
    titleRequired: 'Please enter a title.',
    invalidUrl: 'Enter a valid https link.',
    saveFailed: 'Could not save this reference.',
    permissions:
      'Missing or insufficient permissions. Ask your admin to deploy the latest Firestore rules, then try again.',
  },
  reviewCount: '{{count}} active reference(s)',
  reviewEmpty: 'None added yet',
};

const clinicalReferencesGerman = {
  sectionTitle: 'Klinische Referenzen',
  sectionHint:
    'Speichern Sie Links zu MyChart, Entlassungsberichten, Bildgebungsportalen und anderen klinischen Dokumenten für die Terminvorbereitung.',
  add: 'Referenz hinzufügen',
  addTitle: 'Klinische Referenz hinzufügen',
  editTitle: 'Klinische Referenz bearbeiten',
  emptyTitle: 'Noch keine klinischen Referenzen',
  emptyHint: 'Fügen Sie Portal-Links oder Dokument-URLs für Termine hinzu.',
  openLink: 'Link öffnen',
  archive: 'Archivieren',
  prepareTitle: 'Klinische Referenzen für diesen Besuch',
  prepareEmpty: 'Fügen Sie zuerst Referenzen im Patientenprofil hinzu und wählen Sie sie hier aus.',
  prepareSelected: '{{count}} für diesen Besuch ausgewählt',
  manageLibrary: 'Bibliothek verwalten',
  fields: {
    title: 'Titel',
    category: 'Kategorie',
    url: 'Link (https)',
    referenceDate: 'Dokument- oder Besuchsdatum',
    note: 'Notiz',
  },
  categories: {
    discharge_summary: 'Entlassungsbericht',
    imaging: 'Bildgebung',
    lab_results: 'Laborergebnisse',
    medication_list: 'Medikamentenliste',
    care_plan: 'Pflegeplan',
    portal_link: 'Patientenportal',
    therapy_plan: 'Therapieplan',
    insurance: 'Versicherung',
    other: 'Sonstiges',
  },
  errors: {
    titleRequired: 'Bitte geben Sie einen Titel ein.',
    invalidUrl: 'Geben Sie einen gültigen https-Link ein.',
    saveFailed: 'Referenz konnte nicht gespeichert werden.',
    permissions:
      'Fehlende oder unzureichende Berechtigungen. Bitten Sie Ihren Administrator, die neuesten Firestore-Regeln bereitzustellen, und versuchen Sie es erneut.',
  },
  reviewCount: '{{count}} aktive Referenz(en)',
  reviewEmpty: 'Noch keine hinzugefügt',
};

const clinicalReferencesSpanish = {
  sectionTitle: 'Referencias clínicas',
  sectionHint:
    'Guarde enlaces a MyChart, resúmenes de alta, portales de imágenes y otros documentos clínicos para preparar visitas.',
  add: 'Añadir referencia',
  addTitle: 'Añadir referencia clínica',
  editTitle: 'Editar referencia clínica',
  emptyTitle: 'Aún no hay referencias clínicas',
  emptyHint: 'Añada enlaces de portales o URLs de documentos para las citas.',
  openLink: 'Abrir enlace',
  archive: 'Archivar',
  prepareTitle: 'Referencias clínicas para esta visita',
  prepareEmpty: 'Añada referencias en el perfil del paciente primero y selecciónelas aquí.',
  prepareSelected: '{{count}} seleccionadas para esta visita',
  manageLibrary: 'Gestionar biblioteca',
  fields: {
    title: 'Título',
    category: 'Categoría',
    url: 'Enlace (https)',
    referenceDate: 'Fecha del documento o visita',
    note: 'Nota',
  },
  categories: {
    discharge_summary: 'Resumen de alta',
    imaging: 'Imágenes',
    lab_results: 'Resultados de laboratorio',
    medication_list: 'Lista de medicamentos',
    care_plan: 'Plan de cuidados',
    portal_link: 'Portal del paciente',
    therapy_plan: 'Plan de terapia',
    insurance: 'Seguro',
    other: 'Otro',
  },
  errors: {
    titleRequired: 'Introduzca un título.',
    invalidUrl: 'Introduzca un enlace https válido.',
    saveFailed: 'No se pudo guardar esta referencia.',
    permissions:
      'Permisos insuficientes. Pida a su administrador que implemente las reglas de Firestore más recientes e inténtelo de nuevo.',
  },
  reviewCount: '{{count}} referencia(s) activa(s)',
  reviewEmpty: 'Ninguna añadida aún',
};

const clinicalReferencesPolish = {
  sectionTitle: 'Odniesienia kliniczne',
  sectionHint:
    'Zapisuj linki do MyChart, wypisów, portali obrazowania i innych dokumentów klinicznych na potrzeby wizyt.',
  add: 'Dodaj odniesienie',
  addTitle: 'Dodaj odniesienie kliniczne',
  editTitle: 'Edytuj odniesienie kliniczne',
  emptyTitle: 'Brak odniesień klinicznych',
  emptyHint: 'Dodaj linki do portali lub dokumentów przydatnych przy wizytach.',
  openLink: 'Otwórz link',
  archive: 'Archiwizuj',
  prepareTitle: 'Odniesienia kliniczne na tę wizytę',
  prepareEmpty: 'Najpierw dodaj odniesienia w profilu pacjenta, a potem wybierz je tutaj.',
  prepareSelected: '{{count}} wybranych na tę wizytę',
  manageLibrary: 'Zarządzaj biblioteką',
  fields: {
    title: 'Tytuł',
    category: 'Kategoria',
    url: 'Link (https)',
    referenceDate: 'Data dokumentu lub wizyty',
    note: 'Notatka',
  },
  categories: {
    discharge_summary: 'Wypis',
    imaging: 'Obrazowanie',
    lab_results: 'Wyniki badań',
    medication_list: 'Lista leków',
    care_plan: 'Plan opieki',
    portal_link: 'Portal pacjenta',
    therapy_plan: 'Plan terapii',
    insurance: 'Ubezpieczenie',
    other: 'Inne',
  },
  errors: {
    titleRequired: 'Wprowadź tytuł.',
    invalidUrl: 'Wprowadź prawidłowy link https.',
    saveFailed: 'Nie udało się zapisać tego odniesienia.',
    permissions:
      'Brak uprawnień. Poproś administratora o wdrożenie najnowszych reguł Firestore i spróbuj ponownie.',
  },
  reviewCount: '{{count}} aktywnych odniesień',
  reviewEmpty: 'Jeszcze nie dodano',
};

export const clinicalReferencesScreenEnglish = { clinicalReferences: clinicalReferencesEnglish };
export const clinicalReferencesScreenGerman = { clinicalReferences: clinicalReferencesGerman };
export const clinicalReferencesScreenSpanish = { clinicalReferences: clinicalReferencesSpanish };
export const clinicalReferencesScreenPolish = { clinicalReferences: clinicalReferencesPolish };
