/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Briefcase,
  HeartHandshake,
  IdCard,
  Link2,
  Pencil,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import type { CirclePatientProfileSnapshot, CircleProfileMedItem } from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleProfileAiBadge, isAiDiscoveredField } from '../lib/circleProfileAiDiscovery';
import { useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import {
  alcoholFreqLabelI18n,
  fitnessLevelLabelI18n,
  yesNoLabelI18n,
} from '../lib/adminScreenI18n';
import { treatmentPhaseLabelT } from '../lib/dashboardI18n';
import {
  treatmentPhaseAccentTextClass,
  treatmentPhaseBadgeClass,
  treatmentPhaseCardClass,
} from '../lib/appModeUi';
import {
  CirclePatientProfileSectionNav,
  type CirclePatientProfileNavSection,
} from './CirclePatientProfileSectionNav';

type ProfileSection = {
  id: string;
  title: string;
  shortTitle: string;
  icon: CirclePatientProfileNavSection['icon'];
  items: { label: string; value: ReactNode; aiDiscovered?: boolean; fullWidth?: boolean }[];
};

const EDITABLE_SECTION_IDS = new Set([
  'identity',
  'extended',
  'engagement',
  'lifestyle',
  'functional',
  'clinical',
]);

function listValue(items: string[], empty: string) {
  if (!items.length) return empty;
  return items.join(', ');
}

function textValue(value: string, empty: string) {
  return value.trim() || empty;
}

function medListValue(items: CircleProfileMedItem[], empty: string) {
  if (!items.length) return empty;
  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`} className="text-sm text-slate-700">
          <span className="font-semibold">{item.name}</span>
          {(item.dosage || item.schedule) && (
            <span className="text-slate-500">
              {item.dosage ? ` · ${item.dosage}` : ''}
              {item.schedule ? ` · ${item.schedule}` : ''}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function substanceUseSummary(t: CircleTranslator, snapshot: CirclePatientProfileSnapshot) {
  const empty = t('admin.profile.emptyValue');
  const su = snapshot.lifestyle.substanceUse;
  const lines: string[] = [];
  if (su.smoking) {
    lines.push(t('admin.profile.substanceSmoking', { value: yesNoLabelI18n(t, su.smoking) }));
  }
  if (su.smoking === 'yes' && su.cigarettesPerDay) {
    lines.push(t('admin.profile.substanceCigarettesPerDay', { value: su.cigarettesPerDay }));
  }
  if (su.vaping) {
    lines.push(t('admin.profile.substanceVaping', { value: yesNoLabelI18n(t, su.vaping) }));
  }
  if (su.alcoholFreq) {
    lines.push(
      t('admin.profile.substanceAlcohol', { value: alcoholFreqLabelI18n(t, su.alcoholFreq) }),
    );
  }
  if (su.recreationalDrugs) {
    lines.push(t('admin.profile.substanceRecreationalDrugs', { value: su.recreationalDrugs }));
  }
  if (!lines.length) return empty;
  return (
    <div className="space-y-0.5">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function isAiField(snapshot: CirclePatientProfileSnapshot, key: string, values?: string[]) {
  return isAiDiscoveredField(snapshot, key, values);
}

function buildSections(
  t: CircleTranslator,
  snapshot: CirclePatientProfileSnapshot,
  showClinical: boolean,
  showReferences: boolean,
): ProfileSection[] {
  const empty = t('admin.profile.emptyValue');

  const sections: ProfileSection[] = [
    {
      id: 'identity',
      title: t('admin.profile.sectionIdentity'),
      shortTitle: t('admin.profile.sectionIdentityShort'),
      icon: IdCard,
      items: [
        {
          label: t('admin.profile.fieldName'),
          value: textValue(`${snapshot.identity.firstName} ${snapshot.identity.lastName}`.trim(), empty),
        },
        {
          label: t('admin.profile.fieldNickname'),
          value: textValue(snapshot.identity.nickName, empty),
          aiDiscovered: isAiField(snapshot, 'nick_name'),
        },
        { label: t('admin.profile.fieldEmail'), value: textValue(snapshot.identity.email, empty) },
        { label: t('admin.profile.fieldDob'), value: textValue(snapshot.identity.dob, empty) },
        { label: t('admin.profile.fieldLanguage'), value: textValue(snapshot.identity.language, empty) },
        {
          label: t('admin.profile.fieldLocation'),
          value: textValue(
            [snapshot.identity.city, snapshot.identity.country].filter(Boolean).join(', '),
            empty,
          ),
        },
      ],
    },
    {
      id: 'extended',
      title: t('admin.profile.sectionExtended'),
      shortTitle: t('admin.profile.sectionExtendedShort'),
      icon: UserRound,
      items: [
        { label: t('admin.profile.fieldSex'), value: textValue(snapshot.extended.sex, empty) },
        { label: t('admin.profile.fieldHandedness'), value: textValue(snapshot.extended.handedness, empty) },
        {
          label: t('admin.profile.fieldHeight'),
          value: textValue(`${snapshot.extended.height} ${snapshot.extended.heightUnit}`.trim(), empty),
        },
        {
          label: t('admin.profile.fieldWeight'),
          value: textValue(`${snapshot.extended.weight} ${snapshot.extended.weightUnit}`.trim(), empty),
        },
        { label: t('admin.profile.fieldRace'), value: textValue(snapshot.extended.race, empty) },
        {
          label: t('admin.profile.fieldLanguagesSpoken'),
          value: listValue(snapshot.extended.languagesSpoken, empty),
          aiDiscovered: isAiField(snapshot, 'language', snapshot.extended.languagesSpoken),
        },
      ],
    },
    {
      id: 'engagement',
      title: t('admin.profile.sectionEngagement'),
      shortTitle: t('admin.profile.sectionEngagementShort'),
      icon: HeartHandshake,
      items: [
        {
          label: t('admin.profile.fieldActiveHobbies'),
          value: listValue(snapshot.engagement.activeHobbies, empty),
          aiDiscovered: isAiField(snapshot, 'hobby_active', snapshot.engagement.activeHobbies),
        },
        {
          label: t('admin.profile.fieldPassiveHobbies'),
          value: listValue(snapshot.engagement.passiveHobbies, empty),
          aiDiscovered: isAiField(snapshot, 'hobby_passive', snapshot.engagement.passiveHobbies),
        },
        {
          label: t('admin.profile.fieldSocialAnchors'),
          value: listValue(snapshot.engagement.socialAnchors, empty),
          aiDiscovered: isAiField(snapshot, 'social_anchors', snapshot.engagement.socialAnchors),
        },
        {
          label: t('admin.profile.fieldTopicTriggers'),
          value: listValue(snapshot.engagement.topicTriggers, empty),
          aiDiscovered: isAiField(snapshot, 'topic_triggers', snapshot.engagement.topicTriggers),
        },
        {
          label: t('admin.profile.fieldPersonalGoals'),
          value: listValue(snapshot.engagement.personalGoals, empty),
          aiDiscovered: isAiField(snapshot, 'personal_goals', snapshot.engagement.personalGoals),
        },
        {
          label: t('admin.profile.fieldDailyRituals'),
          value: listValue(snapshot.engagement.dailyRituals, empty),
          aiDiscovered: isAiField(snapshot, 'daily_rituals', snapshot.engagement.dailyRituals),
        },
        {
          label: t('admin.profile.fieldFitnessLevel'),
          value: fitnessLevelLabelI18n(t, snapshot.engagement.fitnessLevel),
          aiDiscovered: isAiField(
            snapshot,
            'fitness_level',
            snapshot.engagement.fitnessLevel ? [snapshot.engagement.fitnessLevel] : [],
          ),
        },
      ],
    },
    {
      id: 'lifestyle',
      title: t('admin.profile.sectionLifestyle'),
      shortTitle: t('admin.profile.sectionLifestyleShort'),
      icon: Briefcase,
      items: [
        {
          label: t('admin.profile.fieldOccupation'),
          value: textValue(snapshot.lifestyle.occupation, empty),
          aiDiscovered: isAiField(
            snapshot,
            'occupation',
            snapshot.lifestyle.occupation ? [snapshot.lifestyle.occupation] : [],
          ),
        },
        {
          label: t('admin.profile.fieldLivingSituation'),
          value: textValue(snapshot.lifestyle.livingSituation, empty),
          aiDiscovered: isAiField(
            snapshot,
            'living_situation',
            snapshot.lifestyle.livingSituation ? [snapshot.lifestyle.livingSituation] : [],
          ),
        },
        {
          label: t('admin.profile.fieldSleepProfile'),
          value: textValue(snapshot.lifestyle.sleepProfile, empty),
          aiDiscovered: isAiField(
            snapshot,
            'sleep_profile',
            snapshot.lifestyle.sleepProfile ? [snapshot.lifestyle.sleepProfile] : [],
          ),
        },
        {
          label: t('admin.profile.fieldAssistiveDevices'),
          value: listValue(snapshot.lifestyle.assistiveDevices, empty),
          aiDiscovered: isAiField(snapshot, 'assistive_devices', snapshot.lifestyle.assistiveDevices),
        },
        {
          label: t('admin.profile.fieldSubstanceUse'),
          value: substanceUseSummary(t, snapshot),
          fullWidth: true,
        },
      ],
    },
    {
      id: 'functional',
      title: t('admin.profile.sectionFunctional'),
      shortTitle: t('admin.profile.sectionFunctionalShort'),
      icon: Activity,
      items: [
        { label: t('admin.profile.fieldVisualStatus'), value: textValue(snapshot.functional.visualStatus, empty) },
        { label: t('admin.profile.fieldHearingProfile'), value: textValue(snapshot.functional.hearingProfile, empty) },
        {
          label: t('admin.profile.fieldCognitiveBaseline'),
          value: textValue(snapshot.functional.cognitiveBaseline, empty),
        },
        {
          label: t('admin.profile.fieldFineMotorBaseline'),
          value: textValue(snapshot.functional.fineMotorBaseline, empty),
        },
      ],
    },
  ];

  if (showClinical) {
    sections.push({
      id: 'clinical',
      title: t('admin.profile.sectionClinical'),
      shortTitle: t('admin.profile.sectionClinicalShort'),
      icon: Stethoscope,
      items: [
        {
          label: t('admin.profile.fieldPrimaryDiagnosis'),
          value: textValue(snapshot.clinical.primaryDiagnosis, empty),
          aiDiscovered: isAiField(
            snapshot,
            'primary_diagnosis',
            snapshot.clinical.primaryDiagnosis ? [snapshot.clinical.primaryDiagnosis] : [],
          ),
        },
        { label: t('admin.profile.fieldDateOfOnset'), value: textValue(snapshot.clinical.dateOfOnset, empty) },
        {
          label: t('admin.profile.fieldSurgicalHistory'),
          value: textValue(snapshot.clinical.surgicalHistory, empty),
          fullWidth: true,
        },
        {
          label: t('admin.profile.fieldComorbidities'),
          value: textValue(snapshot.clinical.comorbidities, empty),
          fullWidth: true,
        },
        {
          label: t('admin.profile.fieldMedications'),
          value: medListValue(snapshot.clinical.medications, empty),
          fullWidth: true,
        },
        {
          label: t('admin.profile.fieldSupplements'),
          value: medListValue(snapshot.clinical.supplements, empty),
          fullWidth: true,
        },
        {
          label: t('admin.profile.fieldAllergies'),
          value: textValue(snapshot.clinical.allergies, empty),
          fullWidth: true,
          aiDiscovered: isAiField(
            snapshot,
            'allergies',
            snapshot.clinical.allergies ? [snapshot.clinical.allergies] : [],
          ),
        },
      ],
    });
  }

  if (showReferences) {
    sections.push({
      id: 'references',
      title: t('admin.profile.sectionReferences'),
      shortTitle: t('admin.profile.sectionReferencesShort'),
      icon: Link2,
      items: [],
    });
  }

  // Align with Patient app: clinical block (Clinical → References) before lifestyle/engagement.
  const order = [
    'identity',
    'extended',
    'clinical',
    'references',
    'functional',
    'lifestyle',
    'engagement',
  ];
  return [...sections].sort(
    (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
  );
}

interface CirclePatientProfileReviewProps {
  snapshot: CirclePatientProfileSnapshot;
  showClinical?: boolean;
  canEdit?: boolean;
  onEditSection?: (sectionId: string) => void;
  referencesContent?: ReactNode;
  showReferences?: boolean;
  initialSectionId?: string;
}

export function CirclePatientProfileReview({
  snapshot,
  showClinical = false,
  canEdit = false,
  onEditSection,
  referencesContent,
  showReferences = false,
  initialSectionId,
}: CirclePatientProfileReviewProps) {
  const t = useCircleT();
  const sections = useMemo(
    () => buildSections(t, snapshot, showClinical, showReferences),
    [t, snapshot, showClinical, showReferences],
  );

  const [sectionId, setSectionId] = useState(
    () => initialSectionId && sections.some((s) => s.id === initialSectionId)
      ? initialSectionId
      : sections[0]?.id ?? 'identity',
  );

  useEffect(() => {
    if (!sections.some((s) => s.id === sectionId)) {
      setSectionId(sections[0]?.id ?? 'identity');
    }
  }, [sectionId, sections]);

  const currentIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === sectionId),
  );
  const current = sections[currentIndex];

  const editableIds = new Set(EDITABLE_SECTION_IDS);
  if (!showClinical) editableIds.delete('clinical');

  if (!current) return null;

  const navSections: CirclePatientProfileNavSection[] = sections.map((section) => ({
    id: section.id,
    title: section.title,
    shortTitle: section.shortTitle,
    icon: section.icon,
  }));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 sm:px-5 border-b border-slate-100">
        <CirclePatientProfileSectionNav
          sections={navSections}
          currentIndex={currentIndex}
          onSelect={setSectionId}
          onPrev={() => {
            if (currentIndex > 0) setSectionId(sections[currentIndex - 1].id);
          }}
          onNext={() => {
            if (currentIndex < sections.length - 1) setSectionId(sections[currentIndex + 1].id);
          }}
          stepOfLabel={t('admin.profile.stepOf', {
            current: currentIndex + 1,
            total: sections.length,
          })}
        />
      </div>

      <section className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800">{current.title}</h4>
          {canEdit && onEditSection && editableIds.has(current.id) ? (
            <button
              type="button"
              onClick={() => onEditSection(current.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
              aria-label={t('admin.profile.editSectionAria', { section: current.title })}
            >
              <Pencil size={14} />
              {t('admin.profile.editSection')}
            </button>
          ) : null}
        </div>

        {current.id === 'references' ? (
          referencesContent
        ) : (
          <div className="space-y-3">
            {current.id === 'clinical' ? (
              <div
                className={cn(
                  'rounded-2xl border px-3.5 py-3.5 sm:px-4 sm:py-4',
                  treatmentPhaseCardClass(snapshot.clinical.treatmentPhase, true),
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {t('admin.profile.fieldTreatmentPhase')}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {snapshot.clinical.treatmentPhase ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                            treatmentPhaseBadgeClass(snapshot.clinical.treatmentPhase),
                          )}
                        >
                          {treatmentPhaseLabelT(t, snapshot.clinical.treatmentPhase)}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'text-sm font-bold',
                            treatmentPhaseAccentTextClass(snapshot.clinical.treatmentPhase),
                          )}
                        >
                          {t('admin.profile.emptyValue')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {t('admin.profile.treatmentPhaseDrivesAppHint')}
                    </p>
                  </div>
                  {canEdit && onEditSection ? (
                    <button
                      type="button"
                      onClick={() => onEditSection('clinical')}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white"
                    >
                      <Pencil size={14} />
                      {t('admin.profile.treatmentPhaseChange')}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.items.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    'rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3 space-y-1',
                    item.fullWidth && 'sm:col-span-2',
                  )}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {item.label}
                  </p>
                  <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                    <span>{item.value}</span>
                    {item.aiDiscovered ? <CircleProfileAiBadge /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
