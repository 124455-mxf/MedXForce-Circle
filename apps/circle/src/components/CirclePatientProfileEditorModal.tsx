import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import type { CirclePatientProfileSnapshot, CircleProfileMedItem } from '@medxforce/shared';
import { CircleProfileFieldLabel } from '../lib/circleProfileAiDiscovery';

type EditableSection = 'identity' | 'extended' | 'engagement' | 'lifestyle' | 'clinical';

interface CirclePatientProfileEditorModalProps {
  open: boolean;
  section: EditableSection;
  snapshot: CirclePatientProfileSnapshot;
  saving?: boolean;
  onClose: () => void;
  onSave: (next: CirclePatientProfileSnapshot) => void;
}

function parseListInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listInput(items: string[]): string {
  return items.join(', ');
}

const FITNESS_LEVEL_OPTIONS = [
  { id: '', label: 'Not provided' },
  { id: 'sedentary', label: 'Sedentary' },
  { id: 'lightly_active', label: 'Lightly active' },
  { id: 'moderately_active', label: 'Moderately active' },
  { id: 'very_active', label: 'Very active' },
  { id: 'extra_active', label: 'Extra active' },
] as const;

const SEX_OPTIONS = ['male', 'female', 'other'] as const;
const HANDEDNESS_OPTIONS = ['left', 'right', 'ambidextrous'] as const;
const RACE_OPTIONS = [
  { id: '', label: 'Not provided' },
  { id: 'white', label: 'White' },
  { id: 'hispanic', label: 'Hispanic' },
  { id: 'black', label: 'Black' },
  { id: 'mena', label: 'Middle Eastern / North African' },
  { id: 'asian', label: 'Asian' },
  { id: 'native_american', label: 'Native American' },
  { id: 'native_hawaiian', label: 'Native Hawaiian' },
] as const;

function OptionPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id || 'none'}
            type="button"
            onClick={() => onChange(option.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              value === option.id
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListFieldEditor({
  label,
  value,
  onChange,
  snapshot,
  discoveryKey,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  snapshot: CirclePatientProfileSnapshot;
  discoveryKey: string;
}) {
  return (
    <label className="block space-y-1">
      <CircleProfileFieldLabel
        label={label}
        snapshot={snapshot}
        discoveryKey={discoveryKey}
        values={value}
      />
      <textarea
        className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[72px]"
        value={listInput(value)}
        onChange={(e) => onChange(parseListInput(e.target.value))}
      />
      <span className="text-[10px] text-slate-400">Separate items with commas</span>
    </label>
  );
}

function MedListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: CircleProfileMedItem[];
  onChange: (next: CircleProfileMedItem[]) => void;
}) {
  const updateItem = (index: number, field: keyof CircleProfileMedItem, value: string) => {
    onChange(
      items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        <button
          type="button"
          onClick={() => onChange([...items, { name: '', dosage: '', schedule: '' }])}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No entries yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${label}-${index}`} className="p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Entry {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${label} entry`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Name"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Dosage"
                value={item.dosage}
                onChange={(e) => updateItem(index, 'dosage', e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Schedule"
                value={item.schedule}
                onChange={(e) => updateItem(index, 'schedule', e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CirclePatientProfileEditorModal({
  open,
  section,
  snapshot,
  saving = false,
  onClose,
  onSave,
}: CirclePatientProfileEditorModalProps) {
  const [draft, setDraft] = useState(snapshot);

  useEffect(() => {
    if (open) setDraft(snapshot);
  }, [open, snapshot]);

  if (!open) return null;

  const title =
    section === 'identity'
      ? 'Edit identity'
      : section === 'extended'
        ? 'Edit extended'
        : section === 'engagement'
          ? 'Edit engagement'
          : section === 'clinical'
            ? 'Edit clinical'
            : 'Edit lifestyle';

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {section === 'identity' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">First name</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.firstName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, firstName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Last name</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.lastName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, lastName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Nickname"
                  snapshot={draft}
                  discoveryKey="nick_name"
                  values={draft.identity.nickName ? [draft.identity.nickName] : []}
                />
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.nickName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, nickName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Email</span>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.email}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, email: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Date of birth</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.dob}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, dob: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Language</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.language}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, language: e.target.value },
                    })
                  }
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">City</span>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    value={draft.identity.city}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        identity: { ...draft.identity, city: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Country</span>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    value={draft.identity.country}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        identity: { ...draft.identity, country: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {section === 'extended' && (
            <>
              <OptionPills
                label="Sex"
                options={SEX_OPTIONS.map((id) => ({
                  id,
                  label: id.charAt(0).toUpperCase() + id.slice(1),
                }))}
                value={draft.extended.sex}
                onChange={(sex) =>
                  setDraft({ ...draft, extended: { ...draft.extended, sex } })
                }
              />
              <OptionPills
                label="Handedness"
                options={HANDEDNESS_OPTIONS.map((id) => ({
                  id,
                  label: id.charAt(0).toUpperCase() + id.slice(1),
                }))}
                value={draft.extended.handedness}
                onChange={(handedness) =>
                  setDraft({ ...draft, extended: { ...draft.extended, handedness } })
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Height</span>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    value={draft.extended.height}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        extended: { ...draft.extended, height: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Height unit</span>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                    value={draft.extended.heightUnit || 'cm'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        extended: { ...draft.extended, heightUnit: e.target.value },
                      })
                    }
                  >
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Weight</span>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    value={draft.extended.weight}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        extended: { ...draft.extended, weight: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Weight unit</span>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                    value={draft.extended.weightUnit || 'kg'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        extended: { ...draft.extended, weightUnit: e.target.value },
                      })
                    }
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Race / ethnicity</span>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  value={draft.extended.race}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      extended: { ...draft.extended, race: e.target.value },
                    })
                  }
                >
                  {RACE_OPTIONS.map((option) => (
                    <option key={option.id || 'none'} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <ListFieldEditor
                label="Languages spoken"
                snapshot={draft}
                discoveryKey="language"
                value={draft.extended.languagesSpoken}
                onChange={(languagesSpoken) =>
                  setDraft({ ...draft, extended: { ...draft.extended, languagesSpoken } })
                }
              />
            </>
          )}

          {section === 'engagement' && (
            <>
              <ListFieldEditor
                label="Active hobbies"
                snapshot={draft}
                discoveryKey="hobby_active"
                value={draft.engagement.activeHobbies}
                onChange={(activeHobbies) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, activeHobbies } })
                }
              />
              <ListFieldEditor
                label="Passive hobbies"
                snapshot={draft}
                discoveryKey="hobby_passive"
                value={draft.engagement.passiveHobbies}
                onChange={(passiveHobbies) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, passiveHobbies } })
                }
              />
              <ListFieldEditor
                label="Social anchors"
                snapshot={draft}
                discoveryKey="social_anchors"
                value={draft.engagement.socialAnchors}
                onChange={(socialAnchors) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, socialAnchors } })
                }
              />
              <ListFieldEditor
                label="Topic triggers"
                snapshot={draft}
                discoveryKey="topic_triggers"
                value={draft.engagement.topicTriggers}
                onChange={(topicTriggers) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, topicTriggers } })
                }
              />
              <ListFieldEditor
                label="Personal goals"
                snapshot={draft}
                discoveryKey="personal_goals"
                value={draft.engagement.personalGoals}
                onChange={(personalGoals) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, personalGoals } })
                }
              />
              <ListFieldEditor
                label="Daily rituals"
                snapshot={draft}
                discoveryKey="daily_rituals"
                value={draft.engagement.dailyRituals}
                onChange={(dailyRituals) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, dailyRituals } })
                }
              />
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Fitness level"
                  snapshot={draft}
                  discoveryKey="fitness_level"
                  values={draft.engagement.fitnessLevel ? [draft.engagement.fitnessLevel] : []}
                />
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  value={draft.engagement.fitnessLevel}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      engagement: { ...draft.engagement, fitnessLevel: e.target.value },
                    })
                  }
                >
                  {FITNESS_LEVEL_OPTIONS.map((level) => (
                    <option key={level.id || 'none'} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {section === 'lifestyle' && (
            <>
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Occupation"
                  snapshot={draft}
                  discoveryKey="occupation"
                  values={draft.lifestyle.occupation ? [draft.lifestyle.occupation] : []}
                />
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.lifestyle.occupation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lifestyle: { ...draft.lifestyle, occupation: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Living situation"
                  snapshot={draft}
                  discoveryKey="living_situation"
                  values={draft.lifestyle.livingSituation ? [draft.lifestyle.livingSituation] : []}
                />
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.lifestyle.livingSituation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lifestyle: { ...draft.lifestyle, livingSituation: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Sleep profile"
                  snapshot={draft}
                  discoveryKey="sleep_profile"
                  values={draft.lifestyle.sleepProfile ? [draft.lifestyle.sleepProfile] : []}
                />
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.lifestyle.sleepProfile}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lifestyle: { ...draft.lifestyle, sleepProfile: e.target.value },
                    })
                  }
                />
              </label>
              <ListFieldEditor
                label="Assistive devices"
                snapshot={draft}
                discoveryKey="assistive_devices"
                value={draft.lifestyle.assistiveDevices}
                onChange={(assistiveDevices) =>
                  setDraft({ ...draft, lifestyle: { ...draft.lifestyle, assistiveDevices } })
                }
              />
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase">Substance use</p>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Smoking</span>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                    value={draft.lifestyle.substanceUse.smoking}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lifestyle: {
                          ...draft.lifestyle,
                          substanceUse: { ...draft.lifestyle.substanceUse, smoking: e.target.value },
                        },
                      })
                    }
                  >
                    <option value="">Not provided</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                {draft.lifestyle.substanceUse.smoking === 'yes' && (
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cigarettes per day</span>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200"
                      value={draft.lifestyle.substanceUse.cigarettesPerDay}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          lifestyle: {
                            ...draft.lifestyle,
                            substanceUse: {
                              ...draft.lifestyle.substanceUse,
                              cigarettesPerDay: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </label>
                )}
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Vaping</span>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                    value={draft.lifestyle.substanceUse.vaping}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lifestyle: {
                          ...draft.lifestyle,
                          substanceUse: { ...draft.lifestyle.substanceUse, vaping: e.target.value },
                        },
                      })
                    }
                  >
                    <option value="">Not provided</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Alcohol frequency</span>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    value={draft.lifestyle.substanceUse.alcoholFreq}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lifestyle: {
                          ...draft.lifestyle,
                          substanceUse: { ...draft.lifestyle.substanceUse, alcoholFreq: e.target.value },
                        },
                      })
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recreational drugs</span>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200"
                    value={draft.lifestyle.substanceUse.recreationalDrugs}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        lifestyle: {
                          ...draft.lifestyle,
                          substanceUse: {
                            ...draft.lifestyle.substanceUse,
                            recreationalDrugs: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {section === 'clinical' && (
            <>
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Primary diagnosis"
                  snapshot={draft}
                  discoveryKey="primary_diagnosis"
                  values={draft.clinical.primaryDiagnosis ? [draft.clinical.primaryDiagnosis] : []}
                />
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.clinical.primaryDiagnosis}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      clinical: { ...draft.clinical, primaryDiagnosis: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Date of onset</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.clinical.dateOfOnset}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      clinical: { ...draft.clinical, dateOfOnset: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Treatment phase</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.clinical.treatmentPhase}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      clinical: { ...draft.clinical, treatmentPhase: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Surgical history</span>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
                  value={draft.clinical.surgicalHistory}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      clinical: { ...draft.clinical, surgicalHistory: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Comorbidities</span>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
                  value={draft.clinical.comorbidities}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      clinical: { ...draft.clinical, comorbidities: e.target.value },
                    })
                  }
                />
              </label>
              <MedListEditor
                label="Medications"
                items={draft.clinical.medications}
                onChange={(medications) =>
                  setDraft({
                    ...draft,
                    clinical: { ...draft.clinical, medications },
                  })
                }
              />
              <MedListEditor
                label="Supplements"
                items={draft.clinical.supplements}
                onChange={(supplements) =>
                  setDraft({
                    ...draft,
                    clinical: { ...draft.clinical, supplements },
                  })
                }
              />
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label="Allergies"
                  snapshot={draft}
                  discoveryKey="allergies"
                  values={draft.clinical.allergies ? [draft.clinical.allergies] : []}
                />
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
                  value={draft.clinical.allergies}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      clinical: { ...draft.clinical, allergies: e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
