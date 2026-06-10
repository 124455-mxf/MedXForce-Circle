/** Circle-visible patient profile slice — synced from the patient app to patients/{patientId}. */

export type CircleProfileChangeSource = 'patient' | 'ai' | 'proxy';

export interface CirclePatientProfileSnapshot {
  identity: {
    firstName: string;
    lastName: string;
    nickName: string;
    language: string;
    dob: string;
    city: string;
    country: string;
  };
  extended: {
    sex: string;
    handedness: string;
    race: string;
    height: string;
    heightUnit: string;
    weight: string;
    weightUnit: string;
    languagesSpoken: string[];
  };
  clinical: {
    primaryDiagnosis: string;
    dateOfOnset: string;
    treatmentPhase: string;
    allergies: string;
  };
  functional: {
    visualStatus: string;
    hearingProfile: string;
    cognitiveBaseline: string;
    fineMotorBaseline: string;
  };
  lifestyle: {
    occupation: string;
    livingSituation: string;
    sleepProfile: string;
    assistiveDevices: string[];
  };
  engagement: {
    activeHobbies: string[];
    passiveHobbies: string[];
    socialAnchors: string[];
    fitnessLevel: string;
    topicTriggers: string[];
    dailyRituals: string[];
    personalGoals: string[];
  };
  metadata?: {
    discoveredFields?: string[];
    discoveredItems?: Record<string, string[]>;
  };
}

export interface CirclePatientProfileMeta {
  updatedAt: number;
  updatedBy: CircleProfileChangeSource;
  updatedByUid?: string;
  summary?: string;
  changedLabels?: string[];
}

export type CircleProfileNotificationType = 'patient_edit' | 'ai_discovery';

export interface CircleProfileNotification {
  type: CircleProfileNotificationType;
  timestamp: number;
  summary: string;
  changedLabels: string[];
  readBy?: Record<string, number>;
}

export const EMPTY_CIRCLE_PROFILE_SNAPSHOT: CirclePatientProfileSnapshot = {
  identity: {
    firstName: '',
    lastName: '',
    nickName: '',
    language: '',
    dob: '',
    city: '',
    country: '',
  },
  extended: {
    sex: '',
    handedness: '',
    race: '',
    height: '',
    heightUnit: '',
    weight: '',
    weightUnit: '',
    languagesSpoken: [],
  },
  clinical: {
    primaryDiagnosis: '',
    dateOfOnset: '',
    treatmentPhase: '',
    allergies: '',
  },
  functional: {
    visualStatus: '',
    hearingProfile: '',
    cognitiveBaseline: '',
    fineMotorBaseline: '',
  },
  lifestyle: {
    occupation: '',
    livingSituation: '',
    sleepProfile: '',
    assistiveDevices: [],
  },
  engagement: {
    activeHobbies: [],
    passiveHobbies: [],
    socialAnchors: [],
    fitnessLevel: '',
    topicTriggers: [],
    dailyRituals: [],
    personalGoals: [],
  },
};

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => str(item)).filter(Boolean);
}

/** Build a circle-readable snapshot from patient-app UserDetails-shaped data. */
export function buildCircleProfileSnapshot(
  details: Record<string, unknown> | null | undefined,
): CirclePatientProfileSnapshot {
  if (!details) return { ...EMPTY_CIRCLE_PROFILE_SNAPSHOT };

  const identity = (details.identity as Record<string, unknown>) || {};
  const extended = (details.extended as Record<string, unknown>) || {};
  const clinical = (details.clinical as Record<string, unknown>) || {};
  const functional = (details.functional as Record<string, unknown>) || {};
  const lifestyle = (details.lifestyle as Record<string, unknown>) || {};
  const engagement = (details.engagement as Record<string, unknown>) || {};
  const metadata = (details.metadata as Record<string, unknown>) || {};

  return {
    identity: {
      firstName: str(identity.firstName),
      lastName: str(identity.lastName),
      nickName: str(identity.nickName),
      language: str(identity.language),
      dob: str(identity.dob),
      city: str(identity.city),
      country: str(identity.country),
    },
    extended: {
      sex: str(extended.sex),
      handedness: str(extended.handedness),
      race: str(extended.race),
      height: str(extended.height),
      heightUnit: str(extended.heightUnit),
      weight: str(extended.weight),
      weightUnit: str(extended.weightUnit),
      languagesSpoken: strList(extended.languagesSpoken),
    },
    clinical: {
      primaryDiagnosis: str(clinical.primaryDiagnosis),
      dateOfOnset: str(clinical.dateOfOnset),
      treatmentPhase: str(clinical.treatmentPhase),
      allergies: str(clinical.allergies),
    },
    functional: {
      visualStatus: str(functional.visualStatus),
      hearingProfile: str(functional.hearingProfile),
      cognitiveBaseline: str(functional.cognitiveBaseline),
      fineMotorBaseline: str(functional.fineMotorBaseline),
    },
    lifestyle: {
      occupation: str(lifestyle.occupation),
      livingSituation: str(lifestyle.livingSituation),
      sleepProfile: str(lifestyle.sleepProfile),
      assistiveDevices: strList(lifestyle.assistiveDevices),
    },
    engagement: {
      activeHobbies: strList(engagement.activeHobbies),
      passiveHobbies: strList(engagement.passiveHobbies),
      socialAnchors: strList(engagement.socialAnchors),
      fitnessLevel: str(engagement.fitnessLevel),
      topicTriggers: strList(engagement.topicTriggers),
      dailyRituals: strList(engagement.dailyRituals),
      personalGoals: strList(engagement.personalGoals),
    },
    metadata: {
      discoveredFields: strList(metadata.discoveredFields),
      discoveredItems:
        metadata.discoveredItems && typeof metadata.discoveredItems === 'object'
          ? (metadata.discoveredItems as Record<string, string[]>)
          : undefined,
    },
  };
}

export function parseCircleProfileSnapshot(raw: unknown): CirclePatientProfileSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  return buildCircleProfileSnapshot(raw as Record<string, unknown>);
}

export function parseCircleProfileMeta(raw: unknown): CirclePatientProfileMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const updatedAt = Number(data.updatedAt);
  if (!Number.isFinite(updatedAt)) return null;
  const updatedBy = data.updatedBy as CircleProfileChangeSource;
  if (updatedBy !== 'patient' && updatedBy !== 'ai' && updatedBy !== 'proxy') return null;
  return {
    updatedAt,
    updatedBy,
    updatedByUid: str(data.updatedByUid) || undefined,
    summary: str(data.summary) || undefined,
    changedLabels: strList(data.changedLabels),
  };
}

export function profileSnapshotFingerprint(snapshot: CirclePatientProfileSnapshot): string {
  return JSON.stringify(snapshot);
}

const FIELD_LABELS: Record<string, string> = {
  'identity.firstName': 'First name',
  'identity.lastName': 'Last name',
  'identity.nickName': 'Nickname',
  'identity.language': 'Primary language',
  'identity.dob': 'Date of birth',
  'identity.city': 'City',
  'identity.country': 'Country',
  'extended.sex': 'Sex',
  'extended.handedness': 'Handedness',
  'extended.race': 'Race / ethnicity',
  'extended.height': 'Height',
  'extended.weight': 'Weight',
  'extended.languagesSpoken': 'Languages spoken',
  'clinical.primaryDiagnosis': 'Primary diagnosis',
  'clinical.dateOfOnset': 'Date of onset',
  'clinical.treatmentPhase': 'Treatment phase',
  'clinical.allergies': 'Allergies',
  'functional.visualStatus': 'Vision',
  'functional.hearingProfile': 'Hearing',
  'functional.cognitiveBaseline': 'Cognition',
  'functional.fineMotorBaseline': 'Fine motor skills',
  'lifestyle.occupation': 'Occupation',
  'lifestyle.livingSituation': 'Living situation',
  'lifestyle.sleepProfile': 'Sleep profile',
  'lifestyle.assistiveDevices': 'Assistive devices',
  'engagement.activeHobbies': 'Active hobbies',
  'engagement.passiveHobbies': 'Passive hobbies',
  'engagement.socialAnchors': 'Social anchors',
  'engagement.topicTriggers': 'Topic triggers',
  'engagement.personalGoals': 'Personal goals',
  'engagement.dailyRituals': 'Daily rituals',
  'engagement.fitnessLevel': 'Fitness level',
};

/** MedIsOn AI discovery categories → readable labels. */
const DISCOVERED_CATEGORY_LABELS: Record<string, string> = {
  language: 'Languages spoken',
  occupation: 'Occupation',
  living_situation: 'Living situation',
  assistive_devices: 'Assistive devices',
  sleep_profile: 'Sleep profile',
  hobby_active: 'Active hobbies',
  hobby_passive: 'Passive hobbies',
  social_anchors: 'Social anchors',
  topic_triggers: 'Topic triggers',
  daily_rituals: 'Daily rituals',
  personal_goals: 'Personal goals',
  fitness_level: 'Fitness level',
  primary_diagnosis: 'Primary diagnosis',
  allergies: 'Allergies',
  nick_name: 'Nickname',
  first_name: 'First name',
  last_name: 'Last name',
};

function listChanged(a: string[], b: string[]): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function labelForDiscoveredCategory(key: string): string {
  const normalized = key.trim().toLowerCase();
  return DISCOVERED_CATEGORY_LABELS[normalized] || normalized.replace(/_/g, ' ');
}

function describeNewAiDiscoveries(
  previous: CirclePatientProfileSnapshot | null,
  next: CirclePatientProfileSnapshot,
): string[] {
  const labels: string[] = [];
  const prevFields = new Set(previous?.metadata?.discoveredFields || []);

  for (const field of next.metadata?.discoveredFields || []) {
    if (!prevFields.has(field)) {
      labels.push(labelForDiscoveredCategory(field));
    }
  }

  const prevItems = previous?.metadata?.discoveredItems || {};
  const nextItems = next.metadata?.discoveredItems || {};

  for (const key of Object.keys(nextItems)) {
    const prevList = new Set(prevItems[key] || []);
    const newItems = (nextItems[key] || []).filter((item) => !prevList.has(item));
    if (newItems.length === 0) continue;

    const categoryLabel = labelForDiscoveredCategory(key);
    if (labels.includes(categoryLabel)) {
      if (newItems.length === 1) {
        const idx = labels.indexOf(categoryLabel);
        labels[idx] = `${categoryLabel} (${newItems[0]})`;
      }
      continue;
    }

    labels.push(
      newItems.length === 1
        ? `${categoryLabel} (${newItems[0]})`
        : `${categoryLabel} (+${newItems.length} items)`,
    );
  }

  return labels;
}

/** Human-readable labels for fields that changed between snapshots. */
export function describeProfileSnapshotChanges(
  previous: CirclePatientProfileSnapshot | null,
  next: CirclePatientProfileSnapshot,
): string[] {
  if (!previous) return [];

  const labels: string[] = [];
  const check = (path: string, before: unknown, after: unknown) => {
    const changed = Array.isArray(before) && Array.isArray(after)
      ? listChanged(before as string[], after as string[])
      : str(before) !== str(after);
    if (changed) labels.push(FIELD_LABELS[path] || path);
  };

  check('identity.firstName', previous.identity.firstName, next.identity.firstName);
  check('identity.lastName', previous.identity.lastName, next.identity.lastName);
  check('identity.nickName', previous.identity.nickName, next.identity.nickName);
  check('identity.language', previous.identity.language, next.identity.language);
  check('identity.dob', previous.identity.dob, next.identity.dob);
  check('identity.city', previous.identity.city, next.identity.city);
  check('identity.country', previous.identity.country, next.identity.country);

  check('extended.sex', previous.extended.sex, next.extended.sex);
  check('extended.handedness', previous.extended.handedness, next.extended.handedness);
  check('extended.race', previous.extended.race, next.extended.race);
  check('extended.height', previous.extended.height, next.extended.height);
  check('extended.weight', previous.extended.weight, next.extended.weight);
  check('extended.languagesSpoken', previous.extended.languagesSpoken, next.extended.languagesSpoken);

  check('clinical.primaryDiagnosis', previous.clinical.primaryDiagnosis, next.clinical.primaryDiagnosis);
  check('clinical.dateOfOnset', previous.clinical.dateOfOnset, next.clinical.dateOfOnset);
  check('clinical.treatmentPhase', previous.clinical.treatmentPhase, next.clinical.treatmentPhase);
  check('clinical.allergies', previous.clinical.allergies, next.clinical.allergies);

  check('functional.visualStatus', previous.functional.visualStatus, next.functional.visualStatus);
  check('functional.hearingProfile', previous.functional.hearingProfile, next.functional.hearingProfile);
  check('functional.cognitiveBaseline', previous.functional.cognitiveBaseline, next.functional.cognitiveBaseline);
  check('functional.fineMotorBaseline', previous.functional.fineMotorBaseline, next.functional.fineMotorBaseline);

  check('lifestyle.occupation', previous.lifestyle.occupation, next.lifestyle.occupation);
  check('lifestyle.livingSituation', previous.lifestyle.livingSituation, next.lifestyle.livingSituation);
  check('lifestyle.sleepProfile', previous.lifestyle.sleepProfile, next.lifestyle.sleepProfile);
  check('lifestyle.assistiveDevices', previous.lifestyle.assistiveDevices, next.lifestyle.assistiveDevices);

  check('engagement.activeHobbies', previous.engagement.activeHobbies, next.engagement.activeHobbies);
  check('engagement.passiveHobbies', previous.engagement.passiveHobbies, next.engagement.passiveHobbies);
  check('engagement.socialAnchors', previous.engagement.socialAnchors, next.engagement.socialAnchors);
  check('engagement.topicTriggers', previous.engagement.topicTriggers, next.engagement.topicTriggers);
  check('engagement.personalGoals', previous.engagement.personalGoals, next.engagement.personalGoals);
  check('engagement.dailyRituals', previous.engagement.dailyRituals, next.engagement.dailyRituals);
  check('engagement.fitnessLevel', previous.engagement.fitnessLevel, next.engagement.fitnessLevel);

  const discoveryLabels = describeNewAiDiscoveries(previous, next);
  const merged = Array.from(new Set([...labels, ...discoveryLabels]));

  return merged;
}

const GENERIC_PROFILE_CHANGE_LABEL = 'Profile updated';

export function meaningfulProfileChangedLabels(changedLabels: string[]): string[] {
  return changedLabels.filter((label) => label !== GENERIC_PROFILE_CHANGE_LABEL);
}

/** Comma-separated field names, omitting generic fallback labels. */
export function formatProfileChangedFields(changedLabels: string[], maxFields = 8): string {
  const meaningful = meaningfulProfileChangedLabels(changedLabels);
  if (meaningful.length === 0) return '';
  const slice = meaningful.slice(0, maxFields).join(', ');
  const suffix = meaningful.length > maxFields ? ` (+${meaningful.length - maxFields} more)` : '';
  return `${slice}${suffix}`;
}

/** Short banner title — patient name omitted (Circle header already shows who you care for). */
export function circleProfileNotificationTitle(
  type: CircleProfileNotificationType,
  summary?: string,
): string {
  if (type === 'ai_discovery') return 'MedIsOn Companion';
  if (summary?.toLowerCase().startsWith('profile updated:')) return 'Circle app';
  return 'Patient app';
}

const GENERIC_PROFILE_SUMMARY_PATTERNS = [
  /^MedIsOn Companion updated the profile\.?$/i,
  /^Patient updated their profile\.?$/i,
  /^Profile updated\.?$/i,
  /^MedIsOn Companion updated\.?$/i,
];

function isGenericProfileSummaryDetail(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'the profile' ||
    normalized === 'their profile' ||
    normalized === 'profile' ||
    normalized === 'profile details'
  );
}

export function isGenericProfileSummary(summary: string): boolean {
  const trimmed = summary.trim();
  if (!trimmed) return true;
  return GENERIC_PROFILE_SUMMARY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function summaryDetailText(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed || isGenericProfileSummary(trimmed)) return '';

  const parsed = trimmed
    .replace(/^MedIsOn Companion:\s*/i, '')
    .replace(/^MedIsOn Companion updated\s+/i, '')
    .replace(/^Patient updated:\s*/i, '')
    .replace(/^Profile updated:\s*/i, '')
    .trim();

  return isGenericProfileSummaryDetail(parsed) ? '' : parsed;
}

/** Labels from a single AI discovery payload (the partial update, not merged profile state). */
export function describeDiscoveryMetadataLabels(
  metadata?: { discoveredFields?: string[]; discoveredItems?: Record<string, string[]> } | null,
): string[] {
  if (!metadata) return [];

  const labels: string[] = [];
  for (const field of metadata.discoveredFields || []) {
    labels.push(labelForDiscoveredCategory(field));
  }

  for (const [key, items] of Object.entries(metadata.discoveredItems || {})) {
    const categoryLabel = labelForDiscoveredCategory(key);
    const validItems = (items || []).map((item) => str(item)).filter(Boolean);
    const existingIdx = labels.indexOf(categoryLabel);

    if (existingIdx >= 0) {
      if (validItems.length === 1) labels[existingIdx] = `${categoryLabel} (${validItems[0]})`;
      continue;
    }

    if (validItems.length === 1) labels.push(`${categoryLabel} (${validItems[0]})`);
    else if (validItems.length > 1) labels.push(`${categoryLabel} (+${validItems.length} items)`);
    else labels.push(categoryLabel);
  }

  return Array.from(new Set(labels));
}

/** Parse comma-separated field labels from a stored notification summary. */
export function parseFieldLabelsFromSummary(summary: string): string[] {
  const detail = summaryDetailText(summary);
  if (!detail) return [];
  return detail.split(/,\s*/).map((part) => part.trim()).filter(Boolean);
}

/** Field list for expanded Circle banner layout. */
export function circleProfileNotificationFieldList(changedLabels: string[]): string[] {
  return meaningfulProfileChangedLabels(changedLabels);
}

/** Resolve display fields from stored labels and/or summary text. */
export function circleProfileNotificationResolvedFields(
  changedLabels: string[],
  summary?: string,
  profileMeta?: CirclePatientProfileMeta | null,
): string[] {
  const fromLabels = meaningfulProfileChangedLabels(changedLabels);
  if (fromLabels.length > 0) return fromLabels;

  if (summary) {
    const fromSummary = parseFieldLabelsFromSummary(summary);
    if (fromSummary.length > 0) return fromSummary;
  }

  const metaFields = meaningfulProfileChangedLabels(profileMeta?.changedLabels || []);
  if (metaFields.length > 0) return metaFields;

  if (profileMeta?.summary) {
    return parseFieldLabelsFromSummary(profileMeta.summary);
  }

  return [];
}

/** What changed — headline in the Circle proxy banner. */
export function circleProfileNotificationChanges(
  changedLabels: string[],
  type?: CircleProfileNotificationType,
  summary?: string,
  profileMeta?: CirclePatientProfileMeta | null,
): string {
  const resolved = circleProfileNotificationResolvedFields(changedLabels, summary, profileMeta);
  const fields = formatProfileChangedFields(resolved.length > 0 ? resolved : changedLabels);
  if (fields) {
    if (type === 'ai_discovery') return `Companion added or updated: ${fields}`;
    if (type === 'patient_edit') {
      if (summary?.toLowerCase().startsWith('profile updated:')) {
        return `Circle profile update: ${fields}`;
      }
      return `Patient app updated: ${fields}`;
    }
    return `Changed: ${fields}`;
  }

  if (summary) {
    const summaryFields = summaryDetailText(summary);
    if (summaryFields) {
      if (type === 'ai_discovery') return `Companion update: ${summaryFields}`;
      if (type === 'patient_edit') {
        if (summary.toLowerCase().startsWith('profile updated:')) {
          return `Circle profile update: ${summaryFields}`;
        }
        return `Patient app update: ${summaryFields}`;
      }
      return summaryFields;
    }
  }

  if (type === 'ai_discovery') {
    return 'Companion synced profile details (specific fields were not recorded for this alert).';
  }
  return 'Profile details were updated (specific fields were not recorded for this alert).';
}

export function buildProfileChangeSummary(
  source: CircleProfileChangeSource,
  _patientName: string,
  changedLabels: string[],
): string {
  const fields = formatProfileChangedFields(changedLabels);
  if (source === 'ai') {
    return fields ? `MedIsOn Companion: ${fields}` : 'MedIsOn Companion updated the profile';
  }
  if (source === 'proxy') {
    return fields ? `Profile updated: ${fields}` : 'Profile updated';
  }
  return fields ? `Patient updated: ${fields}` : 'Patient updated their profile';
}

export function displayProfileName(snapshot: CirclePatientProfileSnapshot, fallback = 'Patient'): string {
  const full = `${snapshot.identity.firstName} ${snapshot.identity.lastName}`.trim();
  return full || snapshot.identity.nickName || fallback;
}
