import type { ReactNode } from 'react';
import { Sparkles, Pencil } from 'lucide-react';
import type { CirclePatientProfileSnapshot } from '@medxforce/shared';
import { cn } from '../lib/utils';

type ProfileSection = {
  id: string;
  title: string;
  items: { label: string; value: ReactNode; aiDiscovered?: boolean }[];
};

function listValue(items: string[], empty = '—') {
  if (!items.length) return empty;
  return items.join(', ');
}

function textValue(value: string, empty = '—') {
  return value.trim() || empty;
}

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase tracking-wider">
      <Sparkles size={8} />
      MedIsOn
    </span>
  );
}

function isAiField(snapshot: CirclePatientProfileSnapshot, key: string, item?: string) {
  const fields = snapshot.metadata?.discoveredFields || [];
  if (fields.includes(key)) return true;
  if (item && snapshot.metadata?.discoveredItems?.[key]?.includes(item)) return true;
  return false;
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
        { label: 'Languages spoken', value: listValue(snapshot.extended.languagesSpoken) },
      ],
    },
    {
      id: 'engagement',
      title: 'Engagement',
      items: [
        { label: 'Active hobbies', value: listValue(snapshot.engagement.activeHobbies), aiDiscovered: isAiField(snapshot, 'hobby_active') },
        { label: 'Passive hobbies', value: listValue(snapshot.engagement.passiveHobbies), aiDiscovered: isAiField(snapshot, 'hobby_passive') },
        { label: 'Social anchors', value: listValue(snapshot.engagement.socialAnchors), aiDiscovered: isAiField(snapshot, 'social_anchors') },
        { label: 'Personal goals', value: listValue(snapshot.engagement.personalGoals) },
        { label: 'Daily rituals', value: listValue(snapshot.engagement.dailyRituals) },
        { label: 'Fitness level', value: textValue(snapshot.engagement.fitnessLevel) },
      ],
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      items: [
        { label: 'Occupation', value: textValue(snapshot.lifestyle.occupation), aiDiscovered: isAiField(snapshot, 'occupation') },
        { label: 'Living situation', value: textValue(snapshot.lifestyle.livingSituation) },
        { label: 'Sleep profile', value: textValue(snapshot.lifestyle.sleepProfile), aiDiscovered: isAiField(snapshot, 'sleep_profile') },
        { label: 'Assistive devices', value: listValue(snapshot.lifestyle.assistiveDevices) },
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
        { label: 'Primary diagnosis', value: textValue(snapshot.clinical.primaryDiagnosis) },
        { label: 'Date of onset', value: textValue(snapshot.clinical.dateOfOnset) },
        { label: 'Treatment phase', value: textValue(snapshot.clinical.treatmentPhase) },
        { label: 'Allergies', value: textValue(snapshot.clinical.allergies) },
      ],
    });
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.id}
          className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{section.title}</h4>
            {canEdit && onEditSection && (
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
              <div key={item.label} className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
                <div className={cn('text-sm text-slate-700 flex items-center gap-2 flex-wrap')}>
                  <span>{item.value}</span>
                  {item.aiDiscovered && <AiBadge />}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
