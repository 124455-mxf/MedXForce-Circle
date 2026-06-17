import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import type { CirclePatientProfileSnapshot, CircleProfileMedItem } from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleProfileAiBadge, isAiDiscoveredField } from '../lib/circleProfileAiDiscovery';
import { useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import {
  fitnessLevelLabelI18n,
  yesNoLabelI18n,
} from '../lib/adminScreenI18n';

type ProfileSection = {
  id: string;
  title: string;
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
  if (su.alcoholFreq) lines.push(t('admin.profile.substanceAlcohol', { value: su.alcoholFreq }));
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
): ProfileSection[] {
  const empty = t('admin.profile.emptyValue');

  const sections: ProfileSection[] = [
    {
      id: 'identity',
      title: t('admin.profile.sectionIdentity'),
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
        { label: t('admin.profile.fieldTreatmentPhase'), value: textValue(snapshot.clinical.treatmentPhase, empty) },
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

  return sections;
}

interface CirclePatientProfileReviewProps {
  snapshot: CirclePatientProfileSnapshot;
  showClinical?: boolean;
  canEdit?: boolean;
  onEditSection?: (sectionId: string) => void;
}

export function CirclePatientProfileReview({
  snapshot,
  showClinical = false,
  canEdit = false,
  onEditSection,
}: CirclePatientProfileReviewProps) {
  const t = useCircleT();
  const sections = buildSections(t, snapshot, showClinical);

  const editableIds = new Set(EDITABLE_SECTION_IDS);
  if (!showClinical) editableIds.delete('clinical');

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.id}
          className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{section.title}</h4>
            {canEdit && onEditSection && editableIds.has(section.id) && (
              <button
                type="button"
                onClick={() => onEditSection(section.id)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                aria-label={t('admin.profile.editSectionAria', { section: section.title })}
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.items.map((item) => (
              <div
                key={item.label}
                className={cn('space-y-1', item.fullWidth && 'sm:col-span-2')}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
                <div className={cn('text-sm text-slate-700 flex items-center gap-2 flex-wrap')}>
                  <span>{item.value}</span>
                  {item.aiDiscovered && <CircleProfileAiBadge />}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
