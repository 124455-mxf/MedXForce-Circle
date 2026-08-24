import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  REMOTE_PRIMARY_LANGUAGE_OPTIONS,
  TREATMENT_PHASE_VALUES,
  canonicalizeProfileCountry,
  getCareTransitionPack,
  listProfileCountryOptions,
  normalizeCountryCode,
  recommendRemoteSettingsForTreatmentPhase,
  suggestedPackForPhaseTransition,
  type CirclePatientProfileSnapshot,
  type CircleProfileMedItem,
  type RemotePrimaryLanguage,
} from '@medxforce/shared';
import { CircleProfileFieldLabel } from '../lib/circleProfileAiDiscovery';
import {
  identityLanguageLabel,
  circleUiLanguageLabel,
  resolveIdentityPrimaryLanguage,
} from '../lib/circleLanguages';
import { CirclePatientLanguageConfirmModal } from './CirclePatientLanguageConfirmModal';
import { CirclePatientRecoveryPhaseConfirmModal } from './CirclePatientRecoveryPhaseConfirmModal';
import { useCircleI18nContext, useCircleT } from '../lib/circleI18nContext';
import { treatmentPhaseLabelT } from '../lib/dashboardI18n';
import {
  profileEditorSectionTitleI18n,
  ASSISTIVE_DEVICE_PRESETS,
  assistiveDeviceLabelI18n,
  fitnessLevelLabelI18n,
  sexLabelI18n,
  handednessLabelI18n,
  raceLabelI18n,
} from '../lib/adminScreenI18n';
import { localizeCareTransitionPack } from '../lib/localizeCareTransition';
import { cn } from '../lib/utils';
import {
  remoteSettingsAppModeLabel,
  remoteSettingsDashboardPresetLabel,
} from '../lib/remoteSettingsScreenI18n';
import {
  treatmentPhaseBadgeClass,
  treatmentPhaseCardClass,
} from '../lib/appModeUi';

type EditableSection =
  | 'identity'
  | 'extended'
  | 'engagement'
  | 'lifestyle'
  | 'functional'
  | 'clinical';

interface CirclePatientProfileEditorModalProps {
  open: boolean;
  section: EditableSection;
  snapshot: CirclePatientProfileSnapshot;
  patientDisplayName?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (
    next: CirclePatientProfileSnapshot,
    options?: { applyRecommendedTabletLayout?: boolean; startCareTransitionPack?: boolean },
  ) => void;
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
  presets,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  snapshot: CirclePatientProfileSnapshot;
  discoveryKey: string;
  presets?: readonly string[];
}) {
  const t = useCircleT();
  return (
    <label className="block space-y-1">
      <CircleProfileFieldLabel
        label={label}
        snapshot={snapshot}
        discoveryKey={discoveryKey}
        values={value}
      />
      {presets?.length ? (
        <div className="flex flex-wrap gap-2 pb-1">
          {presets.map((device) => {
            const selected = value.includes(device);
            return (
              <button
                key={device}
                type="button"
                onClick={() =>
                  onChange(
                    selected ? value.filter((item) => item !== device) : [...value, device],
                  )
                }
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2',
                  selected
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-100',
                )}
              >
                {assistiveDeviceLabelI18n(t, device)}
              </button>
            );
          })}
        </div>
      ) : null}
      <textarea
        className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[72px]"
        value={listInput(value)}
        onChange={(e) => onChange(parseListInput(e.target.value))}
      />
      <span className="text-[10px] text-slate-400">{t('admin.profile.listSeparateHint')}</span>
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
  const t = useCircleT();
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
          {t('admin.profile.medAdd')}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{t('admin.profile.medEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${label}-${index}`} className="p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {t('admin.profile.medEntry', { n: index + 1 })}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t('admin.profile.medRemoveAria', { label })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder={t('admin.profile.medName')}
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder={t('admin.profile.medDosage')}
                value={item.dosage}
                onChange={(e) => updateItem(index, 'dosage', e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder={t('admin.profile.medSchedule')}
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
  patientDisplayName,
  saving = false,
  onClose,
  onSave,
}: CirclePatientProfileEditorModalProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const [draft, setDraft] = useState(snapshot);
  const [pendingLanguage, setPendingLanguage] = useState<RemotePrimaryLanguage | null>(null);
  const [pendingRecoveryPhase, setPendingRecoveryPhase] = useState<string | null>(null);
  const countryOptions = useMemo(() => listProfileCountryOptions(language), [language]);
  const selectedCountryCode = normalizeCountryCode(draft.identity.country) ?? '';

  useEffect(() => {
    if (!open) return;
    setDraft(snapshot);
    setPendingLanguage(null);
    setPendingRecoveryPhase(null);
    // Only seed draft when the modal opens — not on every Firestore snapshot echo.
  }, [open]);

  if (!open) return null;

  const title = profileEditorSectionTitleI18n(t, section);
  const patientName =
    patientDisplayName?.trim() ||
    `${draft.identity.firstName || ''} ${draft.identity.lastName || ''}`.trim() ||
    t('admin.profile.thePatient');

  const buildDraftToSave = (): CirclePatientProfileSnapshot => {
    if (!pendingLanguage) return draft;
    return {
      ...draft,
      identity: {
        ...draft.identity,
        language: identityLanguageLabel(pendingLanguage),
      },
    };
  };

  const shouldConfirmRecoveryPhase = (draftToSave: CirclePatientProfileSnapshot): boolean => {
    const newPhase = draftToSave.clinical.treatmentPhase.trim();
    if (!newPhase) return false;
    if (String(snapshot.clinical.treatmentPhase ?? '').trim() === newPhase) return false;
    return !!recommendRemoteSettingsForTreatmentPhase(newPhase);
  };

  const commitSave = (
    draftToSave: CirclePatientProfileSnapshot,
    applyRecommendedTabletLayout = true,
    startCareTransitionPack = true,
  ) => {
    setPendingLanguage(null);
    setPendingRecoveryPhase(null);
    onSave(draftToSave, { applyRecommendedTabletLayout, startCareTransitionPack });
  };

  const attemptSave = () => {
    const draftToSave = buildDraftToSave();
    if (shouldConfirmRecoveryPhase(draftToSave)) {
      setPendingRecoveryPhase(draftToSave.clinical.treatmentPhase.trim());
      return;
    }
    commitSave(draftToSave);
  };

  const recoveryRecommendation = pendingRecoveryPhase
    ? recommendRemoteSettingsForTreatmentPhase(pendingRecoveryPhase)
    : null;
  const suggestedCareTransitionPack = pendingRecoveryPhase
    ? getCareTransitionPack(
        suggestedPackForPhaseTransition(snapshot.clinical.treatmentPhase, pendingRecoveryPhase),
      )
    : null;
  const careTransitionLabel = suggestedCareTransitionPack
    ? (() => {
        const localized = localizeCareTransitionPack(t, suggestedCareTransitionPack);
        return `${localized.fromLabel} → ${localized.toLabel}`;
      })()
    : null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label={t('admin.contact.closeAria')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {section === 'identity' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldFirstName')}</span>
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldLastName')}</span>
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
                  label={t('admin.profile.fieldNickname')}
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldEmail')}</span>
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldDob')}</span>
                <input
                  type="date"
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldLanguage')}</span>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  value={
                    pendingLanguage ?? resolveIdentityPrimaryLanguage(draft.identity.language)
                  }
                  onChange={(e) => {
                    const next = e.target.value as RemotePrimaryLanguage;
                    const current = resolveIdentityPrimaryLanguage(draft.identity.language);
                    if (next === current) return;
                    setPendingLanguage(next);
                  }}
                >
                  {REMOTE_PRIMARY_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {circleUiLanguageLabel(t, option.value)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldCity')}</span>
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
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {t('admin.profile.fieldCountry')}
                  </span>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                    value={selectedCountryCode}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        identity: {
                          ...draft.identity,
                          country: canonicalizeProfileCountry(e.target.value),
                        },
                      })
                    }
                  >
                    <option value="">{t('careTransition.countryNotSet')}</option>
                    {draft.identity.country.trim() && !selectedCountryCode ? (
                      <option value={draft.identity.country}>
                        {draft.identity.country} ({t('careTransition.countryLegacy')})
                      </option>
                    ) : null}
                    {countryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

          {section === 'extended' && (
            <>
              <OptionPills
                label={t('admin.profile.fieldSex')}
                options={SEX_OPTIONS.map((id) => ({
                  id,
                  label: sexLabelI18n(t, id),
                }))}
                value={draft.extended.sex}
                onChange={(sex) =>
                  setDraft({ ...draft, extended: { ...draft.extended, sex } })
                }
              />
              <OptionPills
                label={t('admin.profile.fieldHandedness')}
                options={HANDEDNESS_OPTIONS.map((id) => ({
                  id,
                  label: handednessLabelI18n(t, id),
                }))}
                value={draft.extended.handedness}
                onChange={(handedness) =>
                  setDraft({ ...draft, extended: { ...draft.extended, handedness } })
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldHeight')}</span>
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
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldHeightUnit')}</span>
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
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldWeight')}</span>
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
                  <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldWeightUnit')}</span>
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldRace')}</span>
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
                      {option.id ? raceLabelI18n(t, option.id) : t('admin.profile.notProvided')}
                    </option>
                  ))}
                </select>
              </label>
              <ListFieldEditor
                label={t('admin.profile.fieldLanguagesSpoken')}
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
                label={t('admin.profile.fieldActiveHobbies')}
                snapshot={draft}
                discoveryKey="hobby_active"
                value={draft.engagement.activeHobbies}
                onChange={(activeHobbies) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, activeHobbies } })
                }
              />
              <ListFieldEditor
                label={t('admin.profile.fieldPassiveHobbies')}
                snapshot={draft}
                discoveryKey="hobby_passive"
                value={draft.engagement.passiveHobbies}
                onChange={(passiveHobbies) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, passiveHobbies } })
                }
              />
              <ListFieldEditor
                label={t('admin.profile.fieldSocialAnchors')}
                snapshot={draft}
                discoveryKey="social_anchors"
                value={draft.engagement.socialAnchors}
                onChange={(socialAnchors) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, socialAnchors } })
                }
              />
              <ListFieldEditor
                label={t('admin.profile.fieldTopicTriggers')}
                snapshot={draft}
                discoveryKey="topic_triggers"
                value={draft.engagement.topicTriggers}
                onChange={(topicTriggers) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, topicTriggers } })
                }
              />
              <ListFieldEditor
                label={t('admin.profile.fieldPersonalGoals')}
                snapshot={draft}
                discoveryKey="personal_goals"
                value={draft.engagement.personalGoals}
                onChange={(personalGoals) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, personalGoals } })
                }
              />
              <ListFieldEditor
                label={t('admin.profile.fieldDailyRituals')}
                snapshot={draft}
                discoveryKey="daily_rituals"
                value={draft.engagement.dailyRituals}
                onChange={(dailyRituals) =>
                  setDraft({ ...draft, engagement: { ...draft.engagement, dailyRituals } })
                }
              />
              <label className="block space-y-1">
                <CircleProfileFieldLabel
                  label={t('admin.profile.fieldFitnessLevel')}
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
                      {level.id ? fitnessLevelLabelI18n(t, level.id) : t('admin.profile.notProvided')}
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
                  label={t('admin.profile.fieldOccupation')}
                  snapshot={draft}
                  discoveryKey="occupation"
                  values={draft.lifestyle.occupation ? [draft.lifestyle.occupation] : []}
                />
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
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
                  label={t('admin.profile.fieldLivingSituation')}
                  snapshot={draft}
                  discoveryKey="living_situation"
                  values={draft.lifestyle.livingSituation ? [draft.lifestyle.livingSituation] : []}
                />
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
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
                  label={t('admin.profile.fieldSleepProfile')}
                  snapshot={draft}
                  discoveryKey="sleep_profile"
                  values={draft.lifestyle.sleepProfile ? [draft.lifestyle.sleepProfile] : []}
                />
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
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
                label={t('admin.profile.fieldAssistiveDevices')}
                snapshot={draft}
                discoveryKey="assistive_devices"
                value={draft.lifestyle.assistiveDevices}
                onChange={(assistiveDevices) =>
                  setDraft({ ...draft, lifestyle: { ...draft.lifestyle, assistiveDevices } })
                }
                presets={ASSISTIVE_DEVICE_PRESETS}
              />
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldSubstanceUse')}</p>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{t('admin.profile.fieldSmoking')}</span>
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
                    <option value="">{t('admin.profile.notProvided')}</option>
                    <option value="yes">{t('admin.profile.yes')}</option>
                    <option value="no">{t('admin.profile.no')}</option>
                  </select>
                </label>
                {draft.lifestyle.substanceUse.smoking === 'yes' && (
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t('admin.profile.fieldCigarettesPerDay')}</span>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{t('admin.profile.fieldVaping')}</span>
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
                    <option value="">{t('admin.profile.notProvided')}</option>
                    <option value="yes">{t('admin.profile.yes')}</option>
                    <option value="no">{t('admin.profile.no')}</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{t('admin.profile.fieldAlcoholFrequency')}</span>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
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
                  >
                    <option value="">{t('admin.profile.notProvided')}</option>
                    <option value="none">{t('admin.profile.alcoholNone')}</option>
                    <option value="occasionally">{t('admin.profile.alcoholOccasionally')}</option>
                    <option value="once_a_week">{t('admin.profile.alcoholOnceAWeek')}</option>
                    <option value="every_day">{t('admin.profile.alcoholEveryDay')}</option>
                    {draft.lifestyle.substanceUse.alcoholFreq &&
                    !['none', 'occasionally', 'once_a_week', 'every_day'].includes(
                      draft.lifestyle.substanceUse.alcoholFreq,
                    ) ? (
                      <option value={draft.lifestyle.substanceUse.alcoholFreq}>
                        {draft.lifestyle.substanceUse.alcoholFreq}
                      </option>
                    ) : null}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{t('admin.profile.fieldRecreationalDrugs')}</span>
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
                  label={t('admin.profile.fieldPrimaryDiagnosis')}
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldDateOfOnset')}</span>
                <input
                  type="date"
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
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {t('admin.profile.fieldTreatmentPhase')}
                </span>
                <p className="text-[11px] text-slate-500 leading-snug -mt-1">
                  {t('admin.profile.treatmentPhaseDrivesAppHint')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TREATMENT_PHASE_VALUES.map((phase) => {
                    const active = draft.clinical.treatmentPhase === phase;
                    return (
                      <button
                        key={phase}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            clinical: { ...draft.clinical, treatmentPhase: phase },
                          })
                        }
                        className={cn(
                          'w-full text-left px-3 py-3 rounded-2xl border transition-colors',
                          treatmentPhaseCardClass(phase, active),
                        )}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              treatmentPhaseBadgeClass(phase),
                            )}
                          >
                            {treatmentPhaseLabelT(t, phase)}
                          </span>
                          {active ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {t('remoteSettings.current')}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldSurgicalHistory')}</span>
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
                <span className="text-xs font-bold text-slate-500 uppercase">{t('admin.profile.fieldComorbidities')}</span>
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
                label={t('admin.profile.fieldMedications')}
                items={draft.clinical.medications}
                onChange={(medications) =>
                  setDraft({
                    ...draft,
                    clinical: { ...draft.clinical, medications },
                  })
                }
              />
              <MedListEditor
                label={t('admin.profile.fieldSupplements')}
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
                  label={t('admin.profile.fieldAllergies')}
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

          {section === 'functional' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {t('admin.profile.fieldVisualStatus')}
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t('admin.profile.functionalVisualHelp')}
                </p>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[88px]"
                  value={draft.functional.visualStatus}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      functional: { ...draft.functional, visualStatus: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {t('admin.profile.fieldHearingProfile')}
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t('admin.profile.functionalHearingHelp')}
                </p>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[88px]"
                  value={draft.functional.hearingProfile}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      functional: { ...draft.functional, hearingProfile: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {t('admin.profile.fieldCognitiveBaseline')}
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t('admin.profile.functionalCognitiveHelp')}
                </p>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[88px]"
                  value={draft.functional.cognitiveBaseline}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      functional: { ...draft.functional, cognitiveBaseline: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {t('admin.profile.fieldFineMotorBaseline')}
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t('admin.profile.functionalFineMotorHelp')}
                </p>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[88px]"
                  value={draft.functional.fineMotorBaseline}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      functional: { ...draft.functional, fineMotorBaseline: e.target.value },
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
            {t('admin.contact.cancel')}
          </button>
          <button
            type="button"
            onClick={attemptSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? t('admin.contact.saving') : t('admin.contact.save')}
          </button>
        </div>
      </div>

      <CirclePatientLanguageConfirmModal
        open={pendingLanguage !== null}
        saving={saving}
        patientName={patientName}
        languageLabel={pendingLanguage ? circleUiLanguageLabel(t, pendingLanguage) : ''}
        onCancel={() => setPendingLanguage(null)}
        onConfirm={() => {
          if (!pendingLanguage || saving) return;
          const next: CirclePatientProfileSnapshot = {
            ...draft,
            identity: {
              ...draft.identity,
              language: identityLanguageLabel(pendingLanguage),
            },
          };
          setPendingLanguage(null);
          setDraft(next);
          if (shouldConfirmRecoveryPhase(next)) {
            setPendingRecoveryPhase(next.clinical.treatmentPhase.trim());
            return;
          }
          onSave(next);
        }}
      />

      <CirclePatientRecoveryPhaseConfirmModal
        open={pendingRecoveryPhase !== null && !!recoveryRecommendation}
        saving={saving}
        patientName={patientName}
        phaseLabel={
          pendingRecoveryPhase ? treatmentPhaseLabelT(t, pendingRecoveryPhase) : ''
        }
        appModeLabel={
          recoveryRecommendation
            ? remoteSettingsAppModeLabel(t, recoveryRecommendation.appMode)
            : ''
        }
        dashboardLabel={
          recoveryRecommendation
            ? recoveryRecommendation.dashboardEnabled
              ? remoteSettingsDashboardPresetLabel(t, recoveryRecommendation.dashboardPreset)
              : t('remoteSettings.dashboardPresets.none')
            : ''
        }
        careTransitionLabel={careTransitionLabel}
        onUpdateTablet={(startCareTransitionPack) => {
          if (!pendingRecoveryPhase || saving) return;
          commitSave(buildDraftToSave(), true, startCareTransitionPack);
        }}
        onKeepTablet={(startCareTransitionPack) => {
          if (!pendingRecoveryPhase || saving) return;
          commitSave(buildDraftToSave(), false, startCareTransitionPack);
        }}
        onCancel={() => setPendingRecoveryPhase(null)}
      />
    </div>
  );
}
