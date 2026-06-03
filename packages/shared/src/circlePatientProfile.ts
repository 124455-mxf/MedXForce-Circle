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
  'engagement.activeHobbies': 'Active hobbies',
  'engagement.passiveHobbies': 'Passive hobbies',
  'engagement.socialAnchors': 'Social anchors',
  'engagement.personalGoals': 'Personal goals',
  'engagement.dailyRituals': 'Daily rituals',
  'engagement.fitnessLevel': 'Fitness level',
  'identity.firstName': 'First name',
  'identity.lastName': 'Last name',
  'identity.nickName': 'Nickname',
  'lifestyle.occupation': 'Occupation',
  'clinical.primaryDiagnosis': 'Primary diagnosis',
};

function listChanged(a: string[], b: string[]): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** Human-readable labels for fields that changed between snapshots. */
export function describeProfileSnapshotChanges(
  previous: CirclePatientProfileSnapshot | null,
  next: CirclePatientProfileSnapshot,
): string[] {
  if (!previous) return ['Profile updated'];

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
  check('lifestyle.occupation', previous.lifestyle.occupation, next.lifestyle.occupation);
  check('clinical.primaryDiagnosis', previous.clinical.primaryDiagnosis, next.clinical.primaryDiagnosis);
  check('engagement.activeHobbies', previous.engagement.activeHobbies, next.engagement.activeHobbies);
  check('engagement.passiveHobbies', previous.engagement.passiveHobbies, next.engagement.passiveHobbies);
  check('engagement.socialAnchors', previous.engagement.socialAnchors, next.engagement.socialAnchors);
  check('engagement.personalGoals', previous.engagement.personalGoals, next.engagement.personalGoals);
  check('engagement.dailyRituals', previous.engagement.dailyRituals, next.engagement.dailyRituals);
  check('engagement.fitnessLevel', previous.engagement.fitnessLevel, next.engagement.fitnessLevel);

  return labels.length > 0 ? labels : ['Profile updated'];
}

export function buildProfileChangeSummary(
  source: CircleProfileChangeSource,
  patientName: string,
  changedLabels: string[],
): string {
  const fields = changedLabels.slice(0, 3).join(', ');
  const suffix = changedLabels.length > 3 ? ` (+${changedLabels.length - 3} more)` : '';
  if (source === 'ai') {
    return `MedIsOn updated ${patientName}'s profile (${fields}${suffix})`;
  }
  if (source === 'proxy') {
    return `Profile updated for ${patientName} (${fields}${suffix})`;
  }
  return `${patientName} updated their profile (${fields}${suffix})`;
}

export function displayProfileName(snapshot: CirclePatientProfileSnapshot, fallback = 'Patient'): string {
  const full = `${snapshot.identity.firstName} ${snapshot.identity.lastName}`.trim();
  return full || snapshot.identity.nickName || fallback;
}
