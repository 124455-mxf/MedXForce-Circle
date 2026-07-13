/** @license SPDX-License-Identifier: Apache-2.0 */

export const careTransitionContentEnglish = {
  announcementOpenHint:
    'Open Care transition readiness on Home or under Circle → checklist to mark items done or dismiss what does not apply.',
  packs: {
    'crisis-icu': {
      title: 'Sudden ICU admission',
      subtitle:
        'Crisis entry — unexpected, unprepared. Orient the circle in the first 24–72 hours.',
      fromLabel: 'Ordinary life',
      toLabel: 'ICU',
    },
    'icu-to-ward': {
      title: 'ICU → hospital floor',
      subtitle: 'Step-down to a normal hospital floor. Monitoring drops; circle coverage must rise.',
      fromLabel: 'ICU',
      toLabel: 'Hospital floor',
    },
    'ward-to-acute': {
      title: 'Hospital → acute care / skilled nursing / care facility',
      subtitle:
        'In the US especially: a facility often must be found — usually by the caregiver.',
      fromLabel: 'Hospital',
      toLabel: 'Acute care / skilled nursing / care facility',
    },
    'acute-to-rehab': {
      title: 'Acute → active rehab',
      subtitle:
        'Therapy becomes the job. Circle shifts from crisis logistics to participation support.',
      fromLabel: 'Acute / facility',
      toLabel: 'Active recovery / rehab',
    },
    'rehab-to-home': {
      title: 'Rehab / hospital → home',
      subtitle: 'Discharge is where things get dropped — wheelchair, transport, meds, follow-ups.',
      fromLabel: 'Rehab / hospital',
      toLabel: 'Home',
    },
    'home-settle': {
      title: 'First weeks at home',
      subtitle: 'The crisis ends; the marathon starts. Keep the circle from disappearing.',
      fromLabel: 'Discharge day',
      toLabel: 'Settled at home',
    },
  },
  items: {
    c1: {
      title: 'Name one primary coordinator',
      why: 'Avoid conflicting asks to nurses and duplicated updates in the family chat.',
      when: 'First 24 hours',
    },
    c2: {
      title: 'Confirm who can receive clinical updates',
      why: 'Hospitals limit who they talk to. Know the named contacts before the next rounds.',
      when: 'First 24 hours',
    },
    c3: {
      title: 'Capture baseline facts once',
      why: 'Diagnosis working name, unit/bed, attending team, allergies, current devices.',
      when: 'First 24 hours',
    },
    c4: {
      title: 'Set a family communication rhythm',
      why: 'One daily summary beats constant pinging. Decide channel + timing.',
      when: 'First 48 hours',
    },
    c5: {
      title: 'Ask what decisions may come this week',
      why: 'Procedures, sedation, transfer out of ICU — reduce surprise.',
      when: 'First 72 hours',
    },
    c6: {
      title: 'Practical logistics for visitors',
      why: 'Hours, parking, badge, overnight stay, food near the unit.',
      when: 'First 48 hours',
    },
    c7: {
      title: 'US: ask about HIPAA / authorized contacts',
      why: 'Without authorization, staff may not share details with relatives.',
      when: 'First 24 hours',
    },
    c8: {
      title: 'DE: clarify Betreuer / Vorsorgevollmacht status',
      why: 'If decision capacity is unclear, know who is legally allowed to decide.',
      when: 'First 72 hours',
    },
    c9: {
      title: 'Turn on Circle Intensive care essentials',
      why: 'Patient tablet should stay calm and minimal while the circle carries logistics.',
      when: 'When Circle is connected',
    },
    w1: {
      title: 'Confirm transfer timing and new unit',
      why: 'Families often learn after the move. Ask for the window and destination bed.',
      when: 'Before transfer',
    },
    w2: {
      title: 'Who covers nights and weekends now?',
      why: 'Hospital floor staffing is thinner than ICU. Decide who the family calls first.',
      when: 'Day of transfer',
    },
    w3: {
      title: 'Review what still needs monitoring',
      why: 'Breathing, swallowing, confusion, falls — know the new watch-outs.',
      when: 'First hospital-floor day',
    },
    w4: {
      title: 'Update Circle recovery stage if appropriate',
      why: 'Keeps tablet layout and circle expectations aligned with the new setting.',
      when: 'After transfer settles',
    },
    a1: {
      title: 'Ask case management for the discharge target date',
      why: 'Facility hunt only works with a real timeline.',
      when: 'As soon as transfer is likely',
    },
    a2: {
      title: 'US: start facility shortlist with insurance fit',
      why: 'Coverage, open bed, therapy intensity, and geography all constrain options.',
      when: '3–7 days before target',
    },
    a3: {
      title: 'US: confirm prior auth / insurance approval path',
      why: 'A bed offer is useless if authorization lags.',
      when: 'Before accepting a facility',
    },
    a4: {
      title: 'DE: clarify Anschlussheilbehandlung / Pflegeheim path',
      why: 'Rehab vs nursing facility routes differ; ask Sozialdienst early.',
      when: 'As soon as transfer is likely',
    },
    a5: {
      title: 'Tour or video-call top 2 facilities',
      why: 'Therapy quality and staffing matter more than brochure photos.',
      when: 'Before deciding',
    },
    a6: {
      title: 'Pack list + meds reconciliation for transfer day',
      why: 'Devices, glasses, chargers, advance directives, current med list.',
      when: 'Day before transfer',
    },
    a7: {
      title: 'Name the receiving facility contact',
      why: 'One phone number for admissions / nursing for the first 48 hours.',
      when: 'Transfer day',
    },
    r1: {
      title: 'Confirm therapy schedule expectations',
      why: 'Know how many sessions/day and what family can join.',
      when: 'First rehab week',
    },
    r2: {
      title: 'Align MedXForce assessments + check-ins',
      why: 'Avoid overload: match tablet asks to rehab energy.',
      when: 'First rehab week',
    },
    r3: {
      title: 'Plan weekend coverage',
      why: 'Motivation and loneliness dip when therapy slows.',
      when: 'Ongoing',
    },
    r4: {
      title: 'Start home-readiness notes early',
      why: 'Stairs, bathroom, who lives at home — discharge planning starts before discharge.',
      when: 'Mid rehab',
    },
    h1: {
      title: 'Confirm discharge date and ride home',
      why: 'Transport is often the forgotten blocker on the day.',
      when: '48–72h before discharge',
    },
    h2: {
      title: 'Wheelchair / walker / hospital bed ordered',
      why: 'Hospitals sometimes forget DME. Caregiver should verify, not assume.',
      when: 'Before discharge',
    },
    h3: {
      title: 'US: DME supplier + insurance confirmation',
      why: 'Delivery timing and co-pay surprises delay safe home return.',
      when: 'Before discharge',
    },
    h4: {
      title: 'DE: Hilfsmittelverordnung / Pflegegrad check',
      why: 'Prescriptions and Pflegekasse processes can lag discharge.',
      when: 'Before discharge',
    },
    h5: {
      title: 'Meds list + who fills the first prescriptions',
      why: 'Day-one gaps cause bounce-backs.',
      when: 'Discharge day',
    },
    h6: {
      title: 'First follow-up appointment scheduled',
      why: 'Do not leave with “someone will call you.”',
      when: 'Before leaving',
    },
    h7: {
      title: 'Home safety walk-through',
      why: 'Rugs, bathroom grab bars, bed height, night lights.',
      when: 'Before or day of return',
    },
    h8: {
      title: 'Who to call in the first 72 hours',
      why: 'Primary contact + after-hours number written in one place.',
      when: 'Discharge day',
    },
    s1: {
      title: 'Agree a week-1 check-in cadence',
      why: 'Prevent silent struggles in the first lonely week.',
      when: 'First 7 days',
    },
    s2: {
      title: 'Confirm home therapy / nursing visits',
      why: 'No-shows happen; verify the calendar.',
      when: 'First 7 days',
    },
    s3: {
      title: 'Tune MedXForce to daily-life mode',
      why: 'Less ICU urgency, more participation, photos, diary, schedule.',
      when: 'First week home',
    },
    s4: {
      title: 'Watch for caregiver burnout signals',
      why: 'Rotate coverage before someone collapses.',
      when: 'Ongoing',
    },
  },
  know: {
    'know-icu-first72': {
      title: 'First 72 hours in the ICU — what families need to know',
      audience: 'Family & caregivers',
    },
    'know-circle-coordinator': {
      title: 'Being the circle coordinator without burning out',
      audience: 'Proxy & caregivers',
    },
    'know-stepdown': {
      title: 'Leaving the ICU: what changes on the ward',
      audience: 'Whole circle',
    },
    'know-facility-hunt-us': {
      title: 'Finding a skilled nursing / acute facility (US)',
      audience: 'Proxy & caregivers',
    },
    'know-transfer-day': {
      title: 'Transfer day checklist — what to pack and ask',
      audience: 'Family & caregivers',
    },
    'know-rehab-partner': {
      title: 'How to support rehab without taking over',
      audience: 'Family & caregivers',
    },
    'know-home-discharge': {
      title: 'Home discharge: wheelchair, meds, and the first 72 hours',
      audience: 'Proxy & caregivers',
    },
    'know-home-safety': {
      title: 'Home safety walk-through for stroke / TBI return',
      audience: 'Family',
    },
    'know-first-weeks-home': {
      title: 'The first weeks at home — keeping the circle engaged',
      audience: 'Whole circle',
    },
    'know-caregiver-burnout': {
      title: 'Spotting caregiver burnout early',
      audience: 'Proxy & family',
    },
  },
};

export const careTransitionContentGerman = {
  announcementOpenHint:
    'Öffnen Sie Care-Transition-Bereitschaft auf Start oder unter Circle → Checkliste, um Punkte als erledigt zu markieren oder Unpassendes auszublenden.',
  packs: {
    'crisis-icu': {
      title: 'Plötzliche Aufnahme auf die Intensivstation',
      subtitle:
        'Kriseneinstieg — unerwartet, unvorbereitet. Den Circle in den ersten 24–72 Stunden orientieren.',
      fromLabel: 'Alltag',
      toLabel: 'Intensivstation',
    },
    'icu-to-ward': {
      title: 'Intensivstation → Normalstation',
      subtitle:
        'Verlegung auf eine normale Station. Die Überwachung nimmt ab; die Circle-Abdeckung muss steigen.',
      fromLabel: 'Intensivstation',
      toLabel: 'Normalstation',
    },
    'ward-to-acute': {
      title: 'Krankenhaus → Akutversorgung / Pflegeheim / Einrichtung',
      subtitle:
        'Besonders in den USA: Oft muss eine Einrichtung gefunden werden — meist durch die Betreuungsperson.',
      fromLabel: 'Krankenhaus',
      toLabel: 'Akutversorgung / Pflegeheim / Einrichtung',
    },
    'acute-to-rehab': {
      title: 'Akut → aktive Reha',
      subtitle:
        'Therapie wird zur Aufgabe. Der Circle wechselt von Krisenlogistik zu Unterstützung bei der Teilnahme.',
      fromLabel: 'Akut / Einrichtung',
      toLabel: 'Aktive Erholung / Reha',
    },
    'rehab-to-home': {
      title: 'Reha / Krankenhaus → Zuhause',
      subtitle:
        'Bei der Entlassung gehen Dinge verloren — Rollstuhl, Transport, Medikamente, Nachsorgetermine.',
      fromLabel: 'Reha / Krankenhaus',
      toLabel: 'Zuhause',
    },
    'home-settle': {
      title: 'Erste Wochen zu Hause',
      subtitle:
        'Die Krise endet; der Marathon beginnt. Verhindern, dass der Circle verschwindet.',
      fromLabel: 'Entlassungstag',
      toLabel: 'Zuhause angekommen',
    },
  },
  items: {
    c1: {
      title: 'Eine Hauptkoordination benennen',
      why: 'Widersprüchliche Anfragen an Pflegekräfte und doppelte Updates im Familienchat vermeiden.',
      when: 'Erste 24 Stunden',
    },
    c2: {
      title: 'Klären, wer klinische Updates erhalten darf',
      why: 'Krankenhäuser sprechen nur mit bestimmten Personen. Benannte Kontakte vor der nächsten Visite kennen.',
      when: 'Erste 24 Stunden',
    },
    c3: {
      title: 'Basisdaten einmal festhalten',
      why: 'Arbeitsdiagnose, Station/Bett, behandelndes Team, Allergien, aktuelle Geräte.',
      when: 'Erste 24 Stunden',
    },
    c4: {
      title: 'Familien-Kommunikationsrhythmus festlegen',
      why: 'Eine tägliche Zusammenfassung ist besser als ständiges Nachfragen. Kanal und Zeitpunkt festlegen.',
      when: 'Erste 48 Stunden',
    },
    c5: {
      title: 'Fragen, welche Entscheidungen diese Woche anstehen',
      why: 'Eingriffe, Sedierung, Verlegung von der Intensivstation — Überraschungen reduzieren.',
      when: 'Erste 72 Stunden',
    },
    c6: {
      title: 'Praktische Logistik für Besuchende',
      why: 'Besuchszeiten, Parken, Ausweis, Übernachtung, Essen in Stationsnähe.',
      when: 'Erste 48 Stunden',
    },
    c7: {
      title: 'US: nach HIPAA / autorisierten Kontakten fragen',
      why: 'Ohne Freigabe dürfen Mitarbeitende Details oft nicht an Angehörige weitergeben.',
      when: 'Erste 24 Stunden',
    },
    c8: {
      title: 'DE: Status von Betreuer / Vorsorgevollmacht klären',
      why: 'Wenn die Entscheidungsfähigkeit unklar ist, wissen, wer rechtlich entscheiden darf.',
      when: 'Erste 72 Stunden',
    },
    c9: {
      title: 'Circle Intensive-care-Essentials einschalten',
      why: 'Das Patiententablet soll ruhig und schlicht bleiben, während der Circle die Logistik trägt.',
      when: 'Wenn Circle verbunden ist',
    },
    w1: {
      title: 'Verlegungszeitpunkt und neue Station bestätigen',
      why: 'Familien erfahren oft erst danach davon. Zeitfenster und Zielbett erfragen.',
      when: 'Vor der Verlegung',
    },
    w2: {
      title: 'Wer übernimmt jetzt Nächte und Wochenenden?',
      why: 'Auf der Normalstation ist weniger Personal als auf der Intensivstation. Festlegen, wen die Familie zuerst anruft.',
      when: 'Am Verlegungstag',
    },
    w3: {
      title: 'Prüfen, was weiterhin beobachtet werden muss',
      why: 'Atmung, Schlucken, Verwirrtheit, Stürze — die neuen Warnsignale kennen.',
      when: 'Erster Tag auf der Normalstation',
    },
    w4: {
      title: 'Circle-Erholungsphase bei Bedarf aktualisieren',
      why: 'Hält Tablet-Layout und Circle-Erwartungen im Einklang mit dem neuen Setting.',
      when: 'Nachdem die Verlegung sich eingespielt hat',
    },
    a1: {
      title: 'Case Management nach dem Entlassungs-Zieldatum fragen',
      why: 'Die Suche nach einer Einrichtung funktioniert nur mit einem realen Zeitplan.',
      when: 'Sobald eine Verlegung wahrscheinlich ist',
    },
    a2: {
      title: 'US: Einrichtungs-Shortlist mit Versicherungs-Passung starten',
      why: 'Deckung, freies Bett, Therapieintensität und Entfernung schränken die Optionen ein.',
      when: '3–7 Tage vor dem Zieldatum',
    },
    a3: {
      title: 'US: Prior-Auth- / Versicherungsgenehmigungsweg klären',
      why: 'Ein Bettangebot nützt nichts, wenn die Genehmigung hinterherhinkt.',
      when: 'Bevor eine Einrichtung angenommen wird',
    },
    a4: {
      title: 'DE: Weg Anschlussheilbehandlung / Pflegeheim klären',
      why: 'Reha- und Pflegeheimwege unterscheiden sich; früh beim Sozialdienst nachfragen.',
      when: 'Sobald eine Verlegung wahrscheinlich ist',
    },
    a5: {
      title: 'Die Top-2-Einrichtungen besichtigen oder per Videoanruf prüfen',
      why: 'Therapiequalität und Personal zählen mehr als Broschürenfotos.',
      when: 'Vor der Entscheidung',
    },
    a6: {
      title: 'Packliste + Medikamentenabgleich für den Verlegungstag',
      why: 'Geräte, Brille, Ladegeräte, Patientenverfügung, aktuelle Medikamentenliste.',
      when: 'Tag vor der Verlegung',
    },
    a7: {
      title: 'Kontakt der aufnehmenden Einrichtung benennen',
      why: 'Eine Telefonnummer für Aufnahme / Pflege für die ersten 48 Stunden.',
      when: 'Verlegungstag',
    },
    r1: {
      title: 'Erwartungen an den Therapieplan bestätigen',
      why: 'Wissen, wie viele Einheiten pro Tag und woran die Familie teilnehmen kann.',
      when: 'Erste Reha-Woche',
    },
    r2: {
      title: 'MedXForce-Assessments und Check-ins abstimmen',
      why: 'Überlastung vermeiden: Tablet-Anfragen an die Reha-Energie anpassen.',
      when: 'Erste Reha-Woche',
    },
    r3: {
      title: 'Wochenendabdeckung planen',
      why: 'Motivation und Einsamkeit sinken, wenn die Therapie langsamer wird.',
      when: 'Laufend',
    },
    r4: {
      title: 'Notizen zur Heim-Bereitschaft früh beginnen',
      why: 'Treppen, Bad, wer zu Hause wohnt — Entlassungsplanung beginnt vor der Entlassung.',
      when: 'Mitte der Reha',
    },
    h1: {
      title: 'Entlassungsdatum und Heimfahrt bestätigen',
      why: 'Transport ist oft der vergessene Blockierer am Tag selbst.',
      when: '48–72 Std. vor der Entlassung',
    },
    h2: {
      title: 'Rollstuhl / Rollator / Pflegebett bestellt',
      why: 'Krankenhäuser vergessen Hilfsmittel manchmal. Die Betreuungsperson sollte prüfen, nicht annehmen.',
      when: 'Vor der Entlassung',
    },
    h3: {
      title: 'US: DME-Lieferant + Versicherungsbestätigung',
      why: 'Lieferzeiten und Zuzahlungs-Überraschungen verzögern die sichere Rückkehr nach Hause.',
      when: 'Vor der Entlassung',
    },
    h4: {
      title: 'DE: Hilfsmittelverordnung / Pflegegrad prüfen',
      why: 'Rezepte und Prozesse der Pflegekasse können hinter der Entlassung zurückbleiben.',
      when: 'Vor der Entlassung',
    },
    h5: {
      title: 'Medikamentenliste + wer die ersten Rezepte einlöst',
      why: 'Lücken am ersten Tag führen zu Rücküberweisungen.',
      when: 'Entlassungstag',
    },
    h6: {
      title: 'Ersten Nachsorgetermin vereinbaren',
      why: 'Nicht mit „jemand ruft Sie an“ gehen.',
      when: 'Vor dem Gehen',
    },
    h7: {
      title: 'Sicherheitsrundgang zu Hause',
      why: 'Teppiche, Haltegriffe im Bad, Betthöhe, Nachtlichter.',
      when: 'Vor oder am Tag der Rückkehr',
    },
    h8: {
      title: 'Wen in den ersten 72 Stunden anrufen',
      why: 'Hauptkontakt + Notfallnummer außerhalb der Zeiten an einem Ort notiert.',
      when: 'Entlassungstag',
    },
    s1: {
      title: 'Check-in-Rhythmus für Woche 1 vereinbaren',
      why: 'Stille Überforderung in der ersten einsamen Woche verhindern.',
      when: 'Erste 7 Tage',
    },
    s2: {
      title: 'Hausbesuche von Therapie / Pflege bestätigen',
      why: 'Ausfälle kommen vor; den Kalender prüfen.',
      when: 'Erste 7 Tage',
    },
    s3: {
      title: 'MedXForce auf Alltagsmodus einstellen',
      why: 'Weniger Intensiv-Dringlichkeit, mehr Teilnahme, Fotos, Tagebuch, Tagesplan.',
      when: 'Erste Woche zu Hause',
    },
    s4: {
      title: 'Auf Burnout-Zeichen bei Betreuungspersonen achten',
      why: 'Abdeckung rotieren, bevor jemand zusammenbricht.',
      when: 'Laufend',
    },
  },
  know: {
    'know-icu-first72': {
      title: 'Erste 72 Stunden auf der Intensivstation — was Familien wissen müssen',
      audience: 'Familie & Betreuungspersonen',
    },
    'know-circle-coordinator': {
      title: 'Circle-Koordination ohne Ausbrennen',
      audience: 'Proxy & Betreuungspersonen',
    },
    'know-stepdown': {
      title: 'Weg von der Intensivstation: was sich auf der Station ändert',
      audience: 'Gesamter Circle',
    },
    'know-facility-hunt-us': {
      title: 'Pflegeheim / Akuteinrichtung finden (USA)',
      audience: 'Proxy & Betreuungspersonen',
    },
    'know-transfer-day': {
      title: 'Checkliste Verlegungstag — was einpacken und fragen',
      audience: 'Familie & Betreuungspersonen',
    },
    'know-rehab-partner': {
      title: 'Reha unterstützen, ohne zu übernehmen',
      audience: 'Familie & Betreuungspersonen',
    },
    'know-home-discharge': {
      title: 'Entlassung nach Hause: Rollstuhl, Medikamente und die ersten 72 Stunden',
      audience: 'Proxy & Betreuungspersonen',
    },
    'know-home-safety': {
      title: 'Sicherheitsrundgang zu Hause nach Schlaganfall / Schädel-Hirn-Trauma',
      audience: 'Familie',
    },
    'know-first-weeks-home': {
      title: 'Die ersten Wochen zu Hause — den Circle eingebunden halten',
      audience: 'Gesamter Circle',
    },
    'know-caregiver-burnout': {
      title: 'Burnout bei Betreuungspersonen früh erkennen',
      audience: 'Proxy & Familie',
    },
  },
};

export const careTransitionContentSpanish = {
  announcementOpenHint:
    'Abra Preparación para la transición de cuidados en Inicio o en Circle → lista para marcar ítems hechos o descartar lo que no aplique.',
  packs: {
    'crisis-icu': {
      title: 'Ingreso repentino a la UCI',
      subtitle:
        'Entrada en crisis — inesperada, sin preparación. Oriente al círculo en las primeras 24–72 horas.',
      fromLabel: 'Vida cotidiana',
      toLabel: 'UCI',
    },
    'icu-to-ward': {
      title: 'UCI → planta hospitalaria',
      subtitle:
        'Paso a una planta hospitalaria normal. La monitorización baja; la cobertura del círculo debe subir.',
      fromLabel: 'UCI',
      toLabel: 'Planta hospitalaria',
    },
    'ward-to-acute': {
      title: 'Hospital → cuidados agudos / enfermería especializada / centro de cuidados',
      subtitle:
        'En EE. UU. sobre todo: a menudo hay que encontrar un centro — normalmente lo hace el cuidador.',
      fromLabel: 'Hospital',
      toLabel: 'Cuidados agudos / enfermería especializada / centro de cuidados',
    },
    'acute-to-rehab': {
      title: 'Agudos → rehabilitación activa',
      subtitle:
        'La terapia pasa a ser el trabajo. El círculo pasa de la logística de crisis al apoyo a la participación.',
      fromLabel: 'Agudos / centro',
      toLabel: 'Recuperación activa / rehabilitación',
    },
    'rehab-to-home': {
      title: 'Rehabilitación / hospital → casa',
      subtitle:
        'En el alta es donde se pierden cosas — silla de ruedas, transporte, medicamentos, seguimientos.',
      fromLabel: 'Rehabilitación / hospital',
      toLabel: 'Casa',
    },
    'home-settle': {
      title: 'Primeras semanas en casa',
      subtitle:
        'La crisis termina; empieza el maratón. Evite que el círculo desaparezca.',
      fromLabel: 'Día del alta',
      toLabel: 'Asentado en casa',
    },
  },
  items: {
    c1: {
      title: 'Nombrar un coordinador principal',
      why: 'Evitar pedidos contradictorios a enfermería y actualizaciones duplicadas en el chat familiar.',
      when: 'Primeras 24 horas',
    },
    c2: {
      title: 'Confirmar quién puede recibir actualizaciones clínicas',
      why: 'Los hospitales limitan con quién hablan. Conozca los contactos nombrados antes de la siguiente visita.',
      when: 'Primeras 24 horas',
    },
    c3: {
      title: 'Registrar los datos básicos una sola vez',
      why: 'Nombre provisional del diagnóstico, unidad/cama, equipo médico, alergias, dispositivos actuales.',
      when: 'Primeras 24 horas',
    },
    c4: {
      title: 'Establecer un ritmo de comunicación familiar',
      why: 'Un resumen diario vale más que mensajes constantes. Decida canal y horario.',
      when: 'Primeras 48 horas',
    },
    c5: {
      title: 'Preguntar qué decisiones pueden venir esta semana',
      why: 'Procedimientos, sedación, traslado fuera de la UCI — reducir sorpresas.',
      when: 'Primeras 72 horas',
    },
    c6: {
      title: 'Logística práctica para visitantes',
      why: 'Horarios, aparcamiento, credencial, pernocta, comida cerca de la unidad.',
      when: 'Primeras 48 horas',
    },
    c7: {
      title: 'EE. UU.: preguntar por HIPAA / contactos autorizados',
      why: 'Sin autorización, el personal puede no compartir detalles con familiares.',
      when: 'Primeras 24 horas',
    },
    c8: {
      title: 'DE: aclarar el estado de Betreuer / Vorsorgevollmacht',
      why: 'Si la capacidad de decisión no está clara, sepa quién puede decidir legalmente.',
      when: 'Primeras 72 horas',
    },
    c9: {
      title: 'Activar Circle Intensive care essentials',
      why: 'La tableta del paciente debe permanecer calmada y mínima mientras el círculo lleva la logística.',
      when: 'Cuando Circle está conectado',
    },
    w1: {
      title: 'Confirmar el momento del traslado y la nueva unidad',
      why: 'Las familias a menudo se enteran después del traslado. Pregunte la ventana y la cama de destino.',
      when: 'Antes del traslado',
    },
    w2: {
      title: '¿Quién cubre ahora noches y fines de semana?',
      why: 'En planta hay menos personal que en la UCI. Decida a quién llama primero la familia.',
      when: 'Día del traslado',
    },
    w3: {
      title: 'Revisar qué sigue necesitando vigilancia',
      why: 'Respiración, deglución, confusión, caídas — conozca las nuevas alertas.',
      when: 'Primer día en planta',
    },
    w4: {
      title: 'Actualizar la etapa de recuperación de Circle si corresponde',
      why: 'Mantiene el diseño de la tableta y las expectativas del círculo alineados con el nuevo entorno.',
      when: 'Cuando el traslado se estabiliza',
    },
    a1: {
      title: 'Pedir a gestión de casos la fecha objetivo de alta',
      why: 'Buscar un centro solo funciona con un calendario real.',
      when: 'En cuanto el traslado sea probable',
    },
    a2: {
      title: 'EE. UU.: empezar una lista corta de centros con encaje de seguro',
      why: 'Cobertura, cama libre, intensidad de terapia y geografía limitan las opciones.',
      when: '3–7 días antes de la fecha objetivo',
    },
    a3: {
      title: 'EE. UU.: confirmar la vía de autorización previa / aprobación del seguro',
      why: 'Una oferta de cama no sirve si la autorización se retrasa.',
      when: 'Antes de aceptar un centro',
    },
    a4: {
      title: 'DE: aclarar la vía Anschlussheilbehandlung / Pflegeheim',
      why: 'Las rutas de rehabilitación y residencia de cuidados difieren; pregunte pronto al Sozialdienst.',
      when: 'En cuanto el traslado sea probable',
    },
    a5: {
      title: 'Visitar o videollamar a los 2 centros principales',
      why: 'La calidad de la terapia y el personal importan más que las fotos del folleto.',
      when: 'Antes de decidir',
    },
    a6: {
      title: 'Lista de equipaje + conciliación de medicamentos para el día del traslado',
      why: 'Dispositivos, gafas, cargadores, directrices anticipadas, lista actual de medicamentos.',
      when: 'Día antes del traslado',
    },
    a7: {
      title: 'Nombrar el contacto del centro receptor',
      why: 'Un número de teléfono para admisiones / enfermería para las primeras 48 horas.',
      when: 'Día del traslado',
    },
    r1: {
      title: 'Confirmar las expectativas del horario de terapia',
      why: 'Sepa cuántas sesiones al día y en cuáles puede participar la familia.',
      when: 'Primera semana de rehabilitación',
    },
    r2: {
      title: 'Alinear evaluaciones y check-ins de MedXForce',
      why: 'Evitar sobrecarga: adaptar las peticiones de la tableta a la energía de rehabilitación.',
      when: 'Primera semana de rehabilitación',
    },
    r3: {
      title: 'Planificar la cobertura del fin de semana',
      why: 'La motivación y la soledad bajan cuando la terapia se ralentiza.',
      when: 'Continuo',
    },
    r4: {
      title: 'Empezar pronto las notas de preparación para casa',
      why: 'Escaleras, baño, quién vive en casa — la planificación del alta empieza antes del alta.',
      when: 'Mitad de la rehabilitación',
    },
    h1: {
      title: 'Confirmar la fecha de alta y el transporte a casa',
      why: 'El transporte suele ser el bloqueo olvidado del día.',
      when: '48–72 h antes del alta',
    },
    h2: {
      title: 'Silla de ruedas / andador / cama hospitalaria pedidos',
      why: 'A veces los hospitales olvidan el equipo médico duradero. El cuidador debe verificar, no asumir.',
      when: 'Antes del alta',
    },
    h3: {
      title: 'EE. UU.: proveedor de DME + confirmación del seguro',
      why: 'Los plazos de entrega y sorpresas de copago retrasan un regreso seguro a casa.',
      when: 'Antes del alta',
    },
    h4: {
      title: 'DE: comprobar Hilfsmittelverordnung / Pflegegrad',
      why: 'Las recetas y los procesos de la Pflegekasse pueden retrasarse respecto al alta.',
      when: 'Antes del alta',
    },
    h5: {
      title: 'Lista de medicamentos + quién retira las primeras recetas',
      why: 'Los huecos del primer día provocan reingresos.',
      when: 'Día del alta',
    },
    h6: {
      title: 'Primera cita de seguimiento programada',
      why: 'No se vaya con un “alguien le llamará”.',
      when: 'Antes de irse',
    },
    h7: {
      title: 'Recorrido de seguridad en casa',
      why: 'Alfombras, barras en el baño, altura de la cama, luces nocturnas.',
      when: 'Antes o el día del regreso',
    },
    h8: {
      title: 'A quién llamar en las primeras 72 horas',
      why: 'Contacto principal + número fuera de horario escrito en un solo lugar.',
      when: 'Día del alta',
    },
    s1: {
      title: 'Acordar un ritmo de check-in en la semana 1',
      why: 'Evitar luchas silenciosas en la primera semana solitaria.',
      when: 'Primeros 7 días',
    },
    s2: {
      title: 'Confirmar visitas de terapia / enfermería a domicilio',
      why: 'Hay inasistencias; verifique el calendario.',
      when: 'Primeros 7 días',
    },
    s3: {
      title: 'Ajustar MedXForce al modo de vida diaria',
      why: 'Menos urgencia de UCI, más participación, fotos, diario, agenda.',
      when: 'Primera semana en casa',
    },
    s4: {
      title: 'Vigilar señales de agotamiento del cuidador',
      why: 'Rotar la cobertura antes de que alguien se derrumbe.',
      when: 'Continuo',
    },
  },
  know: {
    'know-icu-first72': {
      title: 'Primeras 72 horas en la UCI — lo que las familias necesitan saber',
      audience: 'Familia y cuidadores',
    },
    'know-circle-coordinator': {
      title: 'Ser el coordinador del círculo sin agotarse',
      audience: 'Proxy y cuidadores',
    },
    'know-stepdown': {
      title: 'Salir de la UCI: qué cambia en la planta',
      audience: 'Todo el círculo',
    },
    'know-facility-hunt-us': {
      title: 'Encontrar un centro de enfermería especializada / agudos (EE. UU.)',
      audience: 'Proxy y cuidadores',
    },
    'know-transfer-day': {
      title: 'Lista del día de traslado — qué empacar y preguntar',
      audience: 'Familia y cuidadores',
    },
    'know-rehab-partner': {
      title: 'Cómo apoyar la rehabilitación sin tomar el control',
      audience: 'Familia y cuidadores',
    },
    'know-home-discharge': {
      title: 'Alta a casa: silla de ruedas, medicamentos y las primeras 72 horas',
      audience: 'Proxy y cuidadores',
    },
    'know-home-safety': {
      title: 'Recorrido de seguridad en casa tras un ictus / TCE',
      audience: 'Familia',
    },
    'know-first-weeks-home': {
      title: 'Las primeras semanas en casa — mantener el círculo involucrado',
      audience: 'Todo el círculo',
    },
    'know-caregiver-burnout': {
      title: 'Detectar a tiempo el agotamiento del cuidador',
      audience: 'Proxy y familia',
    },
  },
};

export const careTransitionContentPolish = {
  announcementOpenHint:
    'Otwórz Gotowość do przejścia opieki na Ekranie głównym lub w Circle → lista kontrolna, aby oznaczyć pozycje jako zrobione lub odrzucić to, co nie dotyczy.',
  packs: {
    'crisis-icu': {
      title: 'Nagłe przyjęcie na OIOM',
      subtitle:
        'Wejście w kryzys — niespodziewane, bez przygotowania. Ustaw krąg w pierwszych 24–72 godzinach.',
      fromLabel: 'Zwykłe życie',
      toLabel: 'OIOM',
    },
    'icu-to-ward': {
      title: 'OIOM → oddział szpitalny',
      subtitle:
        'Przejście na zwykły oddział szpitalny. Monitorowanie spada; pokrycie kręgu musi wzrosnąć.',
      fromLabel: 'OIOM',
      toLabel: 'Oddział szpitalny',
    },
    'ward-to-acute': {
      title: 'Szpital → opieka ostra / pielęgniarska specjalistyczna / placówka opiekuńcza',
      subtitle:
        'Szczególnie w USA: często trzeba znaleźć placówkę — zwykle robi to opiekun.',
      fromLabel: 'Szpital',
      toLabel: 'Opieka ostra / pielęgniarska specjalistyczna / placówka opiekuńcza',
    },
    'acute-to-rehab': {
      title: 'Ostra → aktywna rehabilitacja',
      subtitle:
        'Terapia staje się zadaniem. Krąg przechodzi od logistyki kryzysowej do wsparcia uczestnictwa.',
      fromLabel: 'Ostra / placówka',
      toLabel: 'Aktywna regeneracja / rehabilitacja',
    },
    'rehab-to-home': {
      title: 'Rehabilitacja / szpital → dom',
      subtitle:
        'Przy wypisie gubią się rzeczy — wózek, transport, leki, wizyty kontrolne.',
      fromLabel: 'Rehabilitacja / szpital',
      toLabel: 'Dom',
    },
    'home-settle': {
      title: 'Pierwsze tygodnie w domu',
      subtitle:
        'Kryzys się kończy; zaczyna się maraton. Nie pozwól, by krąg zniknął.',
      fromLabel: 'Dzień wypisu',
      toLabel: 'Ustabilizowanie w domu',
    },
  },
  items: {
    c1: {
      title: 'Wyznaczyć jednego głównego koordynatora',
      why: 'Unikać sprzecznych próśb do pielęgniarek i podwójnych aktualizacji na czacie rodzinnym.',
      when: 'Pierwsze 24 godziny',
    },
    c2: {
      title: 'Potwierdzić, kto może otrzymywać informacje kliniczne',
      why: 'Szpitale ograniczają, z kim rozmawiają. Znać wskazane kontakty przed kolejnymi obchodami.',
      when: 'Pierwsze 24 godziny',
    },
    c3: {
      title: 'Raz zapisać fakty wyjściowe',
      why: 'Robocza nazwa rozpoznania, oddział/łóżko, zespół leczący, alergie, obecne urządzenia.',
      when: 'Pierwsze 24 godziny',
    },
    c4: {
      title: 'Ustalić rytm komunikacji rodzinnej',
      why: 'Jedno codzienne podsumowanie jest lepsze niż ciągłe pingowanie. Ustalić kanał i godzinę.',
      when: 'Pierwsze 48 godzin',
    },
    c5: {
      title: 'Zapytać, jakie decyzje mogą paść w tym tygodniu',
      why: 'Zabiegi, sedacja, przeniesienie z OIOM-u — mniej niespodzianek.',
      when: 'Pierwsze 72 godziny',
    },
    c6: {
      title: 'Praktyczna logistyka dla odwiedzających',
      why: 'Godziny, parking, identyfikator, nocleg, jedzenie w pobliżu oddziału.',
      when: 'Pierwsze 48 godzin',
    },
    c7: {
      title: 'USA: zapytać o HIPAA / upoważnione kontakty',
      why: 'Bez upoważnienia personel może nie dzielić się szczegółami z krewnymi.',
      when: 'Pierwsze 24 godziny',
    },
    c8: {
      title: 'DE: wyjaśnić status Betreuer / Vorsorgevollmacht',
      why: 'Jeśli zdolność do decyzji jest niejasna, wiedzieć, kto ma prawo decydować.',
      when: 'Pierwsze 72 godziny',
    },
    c9: {
      title: 'Włączyć Circle Intensive care essentials',
      why: 'Tablet pacjenta powinien pozostać spokojny i minimalny, podczas gdy krąg prowadzi logistykę.',
      when: 'Gdy Circle jest połączony',
    },
    w1: {
      title: 'Potwierdzić termin przeniesienia i nowy oddział',
      why: 'Rodziny często dowiadują się po przeniesieniu. Zapytać o okno czasowe i łóżko docelowe.',
      when: 'Przed przeniesieniem',
    },
    w2: {
      title: 'Kto teraz pokrywa noce i weekendy?',
      why: 'Na oddziale jest mniej personelu niż na OIOM-ie. Ustalić, do kogo rodzina dzwoni pierwsza.',
      when: 'Dzień przeniesienia',
    },
    w3: {
      title: 'Przejrzeć, co nadal wymaga monitorowania',
      why: 'Oddychanie, połykanie, splątanie, upadki — znać nowe sygnały ostrzegawcze.',
      when: 'Pierwszy dzień na oddziale',
    },
    w4: {
      title: 'W razie potrzeby zaktualizować etap regeneracji w Circle',
      why: 'Utrzymuje układ tabletu i oczekiwania kręgu zgodne z nowym miejscem.',
      when: 'Gdy przeniesienie się ustabilizuje',
    },
    a1: {
      title: 'Zapytać case management o docelową datę wypisu',
      why: 'Szukanie placówki działa tylko przy realnym harmonogramie.',
      when: 'Gdy tylko przeniesienie jest prawdopodobne',
    },
    a2: {
      title: 'USA: zacząć krótką listę placówek z dopasowaniem ubezpieczenia',
      why: 'Pokrycie, wolne łóżko, intensywność terapii i lokalizacja ograniczają opcje.',
      when: '3–7 dni przed datą docelową',
    },
    a3: {
      title: 'USA: potwierdzić ścieżkę prior auth / zatwierdzenia ubezpieczenia',
      why: 'Oferta łóżka na nic, jeśli autoryzacja się opóźnia.',
      when: 'Przed przyjęciem placówki',
    },
    a4: {
      title: 'DE: wyjaśnić ścieżkę Anschlussheilbehandlung / Pflegeheim',
      why: 'Ścieżki rehabilitacji i domu opieki się różnią; wcześnie zapytać Sozialdienst.',
      when: 'Gdy tylko przeniesienie jest prawdopodobne',
    },
    a5: {
      title: 'Odwiedzić lub zadzwonić wideo do 2 najlepszych placówek',
      why: 'Jakość terapii i personel znaczą więcej niż zdjęcia z broszury.',
      when: 'Przed decyzją',
    },
    a6: {
      title: 'Lista pakowania + uzgodnienie leków na dzień przeniesienia',
      why: 'Urządzenia, okulary, ładowarki, oświadczenia woli, aktualna lista leków.',
      when: 'Dzień przed przeniesieniem',
    },
    a7: {
      title: 'Wskazać kontakt placówki przyjmującej',
      why: 'Jeden numer telefonu do przyjęć / pielęgniarstwa na pierwsze 48 godzin.',
      when: 'Dzień przeniesienia',
    },
    r1: {
      title: 'Potwierdzić oczekiwania wobec harmonogramu terapii',
      why: 'Wiedzieć, ile sesji dziennie i w czym może uczestniczyć rodzina.',
      when: 'Pierwszy tydzień rehabilitacji',
    },
    r2: {
      title: 'Dopasować oceny i check-iny MedXForce',
      why: 'Unikać przeciążenia: dopasować prośby z tabletu do energii rehabilitacyjnej.',
      when: 'Pierwszy tydzień rehabilitacji',
    },
    r3: {
      title: 'Zaplanować pokrycie weekendu',
      why: 'Motywacja i samotność spadają, gdy terapia zwalnia.',
      when: 'Na bieżąco',
    },
    r4: {
      title: 'Wcześnie zacząć notatki o gotowości domu',
      why: 'Schody, łazienka, kto mieszka w domu — planowanie wypisu zaczyna się przed wypisem.',
      when: 'W połowie rehabilitacji',
    },
    h1: {
      title: 'Potwierdzić datę wypisu i dojazd do domu',
      why: 'Transport to często zapomniana przeszkoda w dniu wypisu.',
      when: '48–72 h przed wypisem',
    },
    h2: {
      title: 'Zamówiony wózek / balkonik / łóżko szpitalne',
      why: 'Szpitale czasem zapominają o sprzęcie. Opiekun powinien sprawdzić, a nie zakładać.',
      when: 'Przed wypisem',
    },
    h3: {
      title: 'USA: dostawca DME + potwierdzenie ubezpieczenia',
      why: 'Terminy dostawy i niespodzianki z dopłatami opóźniają bezpieczny powrót do domu.',
      when: 'Przed wypisem',
    },
    h4: {
      title: 'DE: sprawdzić Hilfsmittelverordnung / Pflegegrad',
      why: 'Recepty i procesy Pflegekasse mogą spóźniać się względem wypisu.',
      when: 'Przed wypisem',
    },
    h5: {
      title: 'Lista leków + kto realizuje pierwsze recepty',
      why: 'Luki pierwszego dnia powodują powroty do szpitala.',
      when: 'Dzień wypisu',
    },
    h6: {
      title: 'Umówiona pierwsza wizyta kontrolna',
      why: 'Nie wychodzić z „ktoś do Państwa zadzwoni”.',
      when: 'Przed wyjściem',
    },
    h7: {
      title: 'Przegląd bezpieczeństwa w domu',
      why: 'Dywany, uchwyty w łazience, wysokość łóżka, lampki nocne.',
      when: 'Przed powrotem lub w dniu powrotu',
    },
    h8: {
      title: 'Do kogo dzwonić w pierwszych 72 godzinach',
      why: 'Główny kontakt + numer poza godzinami pracy zapisane w jednym miejscu.',
      when: 'Dzień wypisu',
    },
    s1: {
      title: 'Uzgodnić rytm check-inów w tygodniu 1',
      why: 'Zapobiegać cichemu zmaganiu się w pierwszym samotnym tygodniu.',
      when: 'Pierwsze 7 dni',
    },
    s2: {
      title: 'Potwierdzić wizyty terapii / pielęgniarstwa w domu',
      why: 'Nieobecności się zdarzają; sprawdzić kalendarz.',
      when: 'Pierwsze 7 dni',
    },
    s3: {
      title: 'Ustawić MedXForce w tryb codziennego życia',
      why: 'Mniej pilności OIOM-u, więcej uczestnictwa, zdjęć, dziennika, planu dnia.',
      when: 'Pierwszy tydzień w domu',
    },
    s4: {
      title: 'Obserwować sygnały wypalenia opiekuna',
      why: 'Rotować pokrycie, zanim ktoś się załamie.',
      when: 'Na bieżąco',
    },
  },
  know: {
    'know-icu-first72': {
      title: 'Pierwsze 72 godziny na OIOM-ie — co rodziny powinny wiedzieć',
      audience: 'Rodzina i opiekunowie',
    },
    'know-circle-coordinator': {
      title: 'Bycie koordynatorem kręgu bez wypalenia',
      audience: 'Proxy i opiekunowie',
    },
    'know-stepdown': {
      title: 'Opuszczanie OIOM-u: co się zmienia na oddziale',
      audience: 'Cały krąg',
    },
    'know-facility-hunt-us': {
      title: 'Znajdowanie placówki pielęgniarskiej specjalistycznej / ostrej (USA)',
      audience: 'Proxy i opiekunowie',
    },
    'know-transfer-day': {
      title: 'Lista dnia przeniesienia — co spakować i o co zapytać',
      audience: 'Rodzina i opiekunowie',
    },
    'know-rehab-partner': {
      title: 'Jak wspierać rehabilitację bez przejmowania kontroli',
      audience: 'Rodzina i opiekunowie',
    },
    'know-home-discharge': {
      title: 'Wypis do domu: wózek, leki i pierwsze 72 godziny',
      audience: 'Proxy i opiekunowie',
    },
    'know-home-safety': {
      title: 'Przegląd bezpieczeństwa w domu po udarze / urazie mózgu',
      audience: 'Rodzina',
    },
    'know-first-weeks-home': {
      title: 'Pierwsze tygodnie w domu — utrzymanie zaangażowania kręgu',
      audience: 'Cały krąg',
    },
    'know-caregiver-burnout': {
      title: 'Wczesne rozpoznawanie wypalenia opiekuna',
      audience: 'Proxy i rodzina',
    },
  },
};
