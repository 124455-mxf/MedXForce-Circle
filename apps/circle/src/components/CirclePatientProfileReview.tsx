import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import type { CirclePatientProfileSnapshot, CircleProfileMedItem } from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleProfileAiBadge, isAiDiscoveredField } from '../lib/circleProfileAiDiscovery';

type ProfileSection = {
  id: string;
  title: string;
  items: { label: string; value: ReactNode; aiDiscovered?: boolean; fullWidth?: boolean }[];
};

const EDITABLE_SECTION_IDS = new Set(['identity', 'extended', 'engagement', 'lifestyle', 'clinical']);

function listValue(items: string[], empty = '—') {
  if (!items.length) return empty;
  return items.join(', ');
}

function textValue(value: string, empty = '—') {
  return value.trim() || empty;
}

const FITNESS_LEVEL_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
  extra_active: 'Extra active',
};

function fitnessLevelValue(value: string) {
  return FITNESS_LEVEL_LABELS[value.trim()] || textValue(value);
}

function medListValue(items: CircleProfileMedItem[], empty = '—') {
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

function yesNoLabel(value: string) {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return '—';
}

function substanceUseSummary(snapshot: CirclePatientProfileSnapshot) {
  const su = snapshot.lifestyle.substanceUse;
  const lines: string[] = [];
  if (su.smoking) lines.push(`Smoking: ${yesNoLabel(su.smoking)}`);
  if (su.smoking === 'yes' && su.cigarettesPerDay) {
    lines.push(`Cigarettes/day: ${su.cigarettesPerDay}`);
  }
  if (su.vaping) lines.push(`Vaping: ${yesNoLabel(su.vaping)}`);
  if (su.alcoholFreq) lines.push(`Alcohol: ${su.alcoholFreq}`);
  if (su.recreationalDrugs) lines.push(`Recreational drugs: ${su.recreationalDrugs}`);
  if (!lines.length) return '—';
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
  const sections: ProfileSection[] = [
    {
      id: 'identity',
      title: 'Identity',
      items: [
        { label: 'Name', value: textValue(`${snapshot.identity.firstName} ${snapshot.identity.lastName}`.trim()) },
        { label: 'Nickname', value: textValue(snapshot.identity.nickName), aiDiscovered: isAiField(snapshot, 'nick_name') },
        { label: 'Email', value: textValue(snapshot.identity.email) },
        { label: 'Date of birth', value: textValue(snapshot.identity.dob) },
        { label: 'Language', value: textValue(snapshot.identity.language) },
        { label: 'Location', value: textValue([snapshot.identity.city, snapshot.identity.country].filter(Boolean).join(', ')) },
      ],
    },
    {
      id: 'extended',
      title: 'Extended',
      items: [
        { label: 'Sex', value: textValue(snapshot.extended.sex) },
        { label: 'Handedness', value: textValue(snapshot.extended.handedness) },
        { label: 'Height', value: textValue(`${snapshot.extended.height} ${snapshot.extended.heightUnit}`.trim()) },
        { label: 'Weight', value: textValue(`${snapshot.extended.weight} ${snapshot.extended.weightUnit}`.trim()) },
        { label: 'Race / ethnicity', value: textValue(snapshot.extended.race) },
        { label: 'Languages spoken', value: listValue(snapshot.extended.languagesSpoken), aiDiscovered: isAiField(snapshot, 'language', snapshot.extended.languagesSpoken) },
      ],
    },
    {
      id: 'engagement',
      title: 'Engagement',
      items: [
        { label: 'Active hobbies', value: listValue(snapshot.engagement.activeHobbies), aiDiscovered: isAiField(snapshot, 'hobby_active', snapshot.engagement.activeHobbies) },
        { label: 'Passive hobbies', value: listValue(snapshot.engagement.passiveHobbies), aiDiscovered: isAiField(snapshot, 'hobby_passive', snapshot.engagement.passiveHobbies) },
        { label: 'Social anchors', value: listValue(snapshot.engagement.socialAnchors), aiDiscovered: isAiField(snapshot, 'social_anchors', snapshot.engagement.socialAnchors) },
        { label: 'Topic triggers', value: listValue(snapshot.engagement.topicTriggers), aiDiscovered: isAiField(snapshot, 'topic_triggers', snapshot.engagement.topicTriggers) },
        { label: 'Personal goals', value: listValue(snapshot.engagement.personalGoals), aiDiscovered: isAiField(snapshot, 'personal_goals', snapshot.engagement.personalGoals) },
        { label: 'Daily rituals', value: listValue(snapshot.engagement.dailyRituals), aiDiscovered: isAiField(snapshot, 'daily_rituals', snapshot.engagement.dailyRituals) },
        { label: 'Fitness level', value: fitnessLevelValue(snapshot.engagement.fitnessLevel), aiDiscovered: isAiField(snapshot, 'fitness_level', snapshot.engagement.fitnessLevel ? [snapshot.engagement.fitnessLevel] : []) },
      ],
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      items: [
        { label: 'Occupation', value: textValue(snapshot.lifestyle.occupation), aiDiscovered: isAiField(snapshot, 'occupation', snapshot.lifestyle.occupation ? [snapshot.lifestyle.occupation] : []) },
        { label: 'Living situation', value: textValue(snapshot.lifestyle.livingSituation), aiDiscovered: isAiField(snapshot, 'living_situation', snapshot.lifestyle.livingSituation ? [snapshot.lifestyle.livingSituation] : []) },
        { label: 'Sleep profile', value: textValue(snapshot.lifestyle.sleepProfile), aiDiscovered: isAiField(snapshot, 'sleep_profile', snapshot.lifestyle.sleepProfile ? [snapshot.lifestyle.sleepProfile] : []) },
        { label: 'Assistive devices', value: listValue(snapshot.lifestyle.assistiveDevices), aiDiscovered: isAiField(snapshot, 'assistive_devices', snapshot.lifestyle.assistiveDevices) },
        { label: 'Substance use', value: substanceUseSummary(snapshot), fullWidth: true },
      ],
    },
    {
      id: 'functional',
      title: 'Functional',
      items: [
        { label: 'Visual status', value: textValue(snapshot.functional.visualStatus) },
        { label: 'Hearing profile', value: textValue(snapshot.functional.hearingProfile) },
        { label: 'Cognitive baseline', value: textValue(snapshot.functional.cognitiveBaseline) },
        { label: 'Fine motor baseline', value: textValue(snapshot.functional.fineMotorBaseline) },
      ],
    },
  ];

  if (showClinical) {
    sections.push({
      id: 'clinical',
      title: 'Clinical',
      items: [
        { label: 'Primary diagnosis', value: textValue(snapshot.clinical.primaryDiagnosis), aiDiscovered: isAiField(snapshot, 'primary_diagnosis', snapshot.clinical.primaryDiagnosis ? [snapshot.clinical.primaryDiagnosis] : []) },
        { label: 'Date of onset', value: textValue(snapshot.clinical.dateOfOnset) },
        { label: 'Treatment phase', value: textValue(snapshot.clinical.treatmentPhase) },
        { label: 'Surgical history', value: textValue(snapshot.clinical.surgicalHistory), fullWidth: true },
        { label: 'Comorbidities', value: textValue(snapshot.clinical.comorbidities), fullWidth: true },
        { label: 'Medications', value: medListValue(snapshot.clinical.medications), fullWidth: true },
        { label: 'Supplements', value: medListValue(snapshot.clinical.supplements), fullWidth: true },
        { label: 'Allergies', value: textValue(snapshot.clinical.allergies), fullWidth: true, aiDiscovered: isAiField(snapshot, 'allergies', snapshot.clinical.allergies ? [snapshot.clinical.allergies] : []) },
      ],
    });
  }

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
                aria-label={`Edit ${section.title}`}
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
