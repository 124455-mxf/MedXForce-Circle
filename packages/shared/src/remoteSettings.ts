import {
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  sanitizeRemoteAssessmentSchedule,
  type RemoteAssessmentSchedule,
} from './assessmentSchedule';
import {
  mergeDailyCheckInQuestions,
  sanitizeDailyCheckInQuestions,
  type DailyCheckInQuestion,
} from './dailyCheckIn';
import { stripUndefinedDeep } from './firestoreSanitize';

/** Single live doc: patients/{patientId}/remote_settings/live */
export const REMOTE_SETTINGS_DOC_ID = 'live';

export type RemoteAppMode = 'intensive_care' | 'hospital' | 'user';

export type RemotePrimaryLanguage = 'English' | 'German' | 'Spanish' | 'Polish';

export const REMOTE_PRIMARY_LANGUAGE_OPTIONS: {
  value: RemotePrimaryLanguage;
  label: string;
}[] = [
  { value: 'English', label: 'English (EN)' },
  { value: 'German', label: 'German (DE)' },
  { value: 'Spanish', label: 'Spanish (ES)' },
  { value: 'Polish', label: 'Polish (PL)' },
];

export type RemoteDailyCheckInSettings = {
  enabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  questions?: DailyCheckInQuestion[];
};

export type RemoteActivityVisibility = {
  enabled?: boolean;
  mind?: boolean;
  soul?: boolean;
  body?: {
    enabled?: boolean;
    motion?: boolean;
    verbal?: boolean;
  };
};

/** Per-assessment visibility flags (Settings → Features → Health Assessments). */
export const REMOTE_ASSESSMENT_VISIBILITY_KEYS = [
  'impactAssessment',
  'painAssessment',
  'strengthReflexAssessment',
  'mobilityAssessment',
  'numbnessAssessment',
  'temperatureAssessment',
  'balanceAssessment',
  'visionAssessment',
  'speechAssessment',
  'neurologicalAssessment',
  'physiologicalAssessment',
  'psychologicalAssessment',
  'strokeSelfAssessment',
  'diaryAssessment',
] as const;

export type RemoteAssessmentVisibilityKey = (typeof REMOTE_ASSESSMENT_VISIBILITY_KEYS)[number];

export const REMOTE_ASSESSMENT_VISIBILITY_DEFAULTS: Record<RemoteAssessmentVisibilityKey, boolean> = {
  impactAssessment: true,
  painAssessment: true,
  strengthReflexAssessment: true,
  mobilityAssessment: true,
  numbnessAssessment: true,
  temperatureAssessment: true,
  balanceAssessment: false,
  visionAssessment: true,
  speechAssessment: true,
  neurologicalAssessment: true,
  physiologicalAssessment: false,
  psychologicalAssessment: true,
  strokeSelfAssessment: false,
  diaryAssessment: false,
};

export type RemoteFeaturesVisibility = {
  dashboard?: boolean;
  dropIn?: boolean;
  communication?: boolean;
  messaging?: boolean;
  aiCompanion?: boolean;
  healthAssessments?: boolean;
  schedule?: boolean;
  analytics?: boolean;
  journeyDiary?: boolean;
  activity?: RemoteActivityVisibility;
} & Partial<Record<RemoteAssessmentVisibilityKey, boolean>>;

export type RemoteVisibleAreas = {
  phrases?: boolean;
  categories?: boolean;
  emojis?: boolean;
  unicode?: boolean;
};

/** Patient dashboard layout presets Circle may set remotely (not device-local custom). */
export type RemoteDashboardPreset = 'minimal' | 'balanced' | 'insights' | 'spark';

export type RemoteDashboardLayout = {
  preset?: RemoteDashboardPreset | 'custom';
  hiddenWidgets?: string[];
  clockStyle?: 'digital' | 'analog';
  temperatureUnit?: 'celsius' | 'fahrenheit';
  use24HourClock?: boolean;
};

export const REMOTE_DASHBOARD_PRESETS: {
  key: RemoteDashboardPreset;
  label: string;
  description: string;
}[] = [
  {
    key: 'minimal',
    label: 'Essentials',
    description: 'Communication, check-in, and time — a calm, focused dashboard.',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    description: 'Everyday mix of tasks, gallery, wellness tiles, and light insights.',
  },
  {
    key: 'insights',
    label: 'Insights',
    description: 'Highlights progress, mood and sleep trends, and the care circle.',
  },
  {
    key: 'spark',
    label: 'Spark',
    description: 'Gallery, journal, games, and uplifting moments for more engagement.',
  },
];

export function sanitizeRemoteDashboardPreset(
  raw: unknown,
): RemoteDashboardPreset | 'custom' | undefined {
  if (
    raw === 'minimal' ||
    raw === 'balanced' ||
    raw === 'insights' ||
    raw === 'spark' ||
    raw === 'custom'
  ) {
    return raw;
  }
  return undefined;
}

/** Whitelisted keys Circle may read/write in Phase 1. */
export type RemoteSettingsPayload = {
  appMode?: RemoteAppMode;
  primaryLanguage?: RemotePrimaryLanguage;
  showAlertButton?: boolean;
  showAttentionButton?: boolean;
  detectEngagementNeed?: boolean;
  showSaveButton?: boolean;
  useAiAssistant?: boolean;
  aiConversation?: boolean;
  allowSendMessages?: boolean;
  showUserInSidebar?: boolean;
  showQuickSettings?: boolean;
  showSettingsInSidebar?: boolean;
  featuresVisibility?: RemoteFeaturesVisibility;
  journeyDiary?: { allowViewSharedEntries?: boolean };
  dailyCheckIn?: RemoteDailyCheckInSettings;
  betterVisibleCursor?: boolean;
  showAiSuggestions?: boolean;
  speakOnSelection?: boolean;
  showFrequentlyUsed?: boolean;
  hideRightSidebar?: boolean;
  contentFontSize?: 'small' | 'medium' | 'large';
  visibleAreas?: RemoteVisibleAreas;
  quickAreasOrder?: string[];
  shareLocationWithCircle?: boolean;
  dashboardLayout?: RemoteDashboardLayout;
  assessmentSchedule?: RemoteAssessmentSchedule;
};

export type RemoteSettingsSource = 'patient' | 'circle';

export interface PatientRemoteSettingsDoc extends RemoteSettingsPayload {
  patientId: string;
  updatedAt: number;
  updatedByUid: string;
  updatedByName: string;
  updatedByRole?: string;
  source?: RemoteSettingsSource;
}

export type RemoteFeatureToggleDef = {
  path: string;
  label: string;
  description?: string;
  nested?: 'activity.enabled' | 'journeyDiary.allowViewSharedEntries';
  /** Parent toggle must be on before this toggle is editable. */
  requiresEnabledPath?: string;
};

export const REMOTE_APP_MODES: { key: RemoteAppMode; label: string; description: string }[] = [
  {
    key: 'intensive_care',
    label: 'ICU',
    description: 'Critical care — communication-first, minimal distractions, caregiver-controlled.',
  },
  {
    key: 'hospital',
    label: 'Hospital',
    description: 'Acute care and active recovery — structured support in hospital or rehab.',
  },
  {
    key: 'user',
    label: 'Daily Life',
    description: 'Home and everyday life — full features with sensible safety defaults.',
  },
];

export const REMOTE_FEATURE_TOGGLES: RemoteFeatureToggleDef[] = [
  { path: 'showUserInSidebar', label: 'Show user', description: 'User profile in the left sidebar.' },
  { path: 'featuresVisibility.dashboard', label: 'Dashboard', description: 'Dashboard tab in the sidebar.' },
  {
    path: 'featuresVisibility.dropIn',
    label: 'Drop-in',
    description: 'Allow Circle members to start a live drop-in session with the patient.',
  },
  { path: 'featuresVisibility.communication', label: 'Communication', description: 'Primary communication interface.' },
  { path: 'featuresVisibility.messaging', label: 'Messaging', description: 'Caregiver messaging features.' },
  { path: 'featuresVisibility.aiCompanion', label: 'MedIsOn Companion', description: 'Companion conversational interface.' },
  {
    path: 'featuresVisibility.activity.enabled',
    label: 'Vitality',
    description: 'Vitality tab in the sidebar.',
    nested: 'activity.enabled',
  },
  {
    path: 'featuresVisibility.activity.mind',
    label: 'Mind',
    description: 'Mind games and cognitive activities inside Vitality.',
    requiresEnabledPath: 'featuresVisibility.activity.enabled',
  },
  {
    path: 'featuresVisibility.activity.body.enabled',
    label: 'Body',
    description: 'Physical exercises and movement inside Vitality.',
    requiresEnabledPath: 'featuresVisibility.activity.enabled',
  },
  {
    path: 'featuresVisibility.activity.soul',
    label: 'Soul',
    description: 'Gallery, music, and uplifting content inside Vitality.',
    requiresEnabledPath: 'featuresVisibility.activity.enabled',
  },
  { path: 'featuresVisibility.journeyDiary', label: 'Journal', description: 'Journal tab on the dashboard.' },
  {
    path: 'journeyDiary.allowViewSharedEntries',
    label: 'View shared journal entries',
    description: 'Include entries shared by the circle.',
    nested: 'journeyDiary.allowViewSharedEntries',
  },
  { path: 'featuresVisibility.healthAssessments', label: 'Assessments', description: 'Assessments tab in the sidebar.' },
  {
    path: 'featuresVisibility.schedule',
    label: 'Schedule',
    description: 'Care calendar tab for appointments and scheduled assessments.',
  },
  { path: 'featuresVisibility.analytics', label: 'Analytics', description: 'Statistics and analytics tab.' },
  { path: 'showQuickSettings', label: 'Quick Settings', description: 'Quick Settings gear in the sidebar.' },
  { path: 'showSettingsInSidebar', label: 'Settings', description: 'Settings tab in the sidebar.' },
];

export const REMOTE_ASSESSMENT_VISIBILITY_TOGGLES: RemoteFeatureToggleDef[] = [
  {
    path: 'featuresVisibility.impactAssessment',
    label: 'Impact',
    description: 'Show the impact assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.painAssessment',
    label: 'Pain',
    description: 'Show the pain assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.strengthReflexAssessment',
    label: 'Strength & reflex',
    description: 'Show the strength and reflex assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.mobilityAssessment',
    label: 'Mobility',
    description: 'Show the mobility assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.numbnessAssessment',
    label: 'Numbness',
    description: 'Show the numbness assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.temperatureAssessment',
    label: 'Temperature',
    description: 'Show the temperature assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.balanceAssessment',
    label: 'Balance',
    description: 'Show the balance assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.visionAssessment',
    label: 'Vision',
    description: 'Show the vision assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.speechAssessment',
    label: 'Speech & Language',
    description: 'Show the speech and language assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.neurologicalAssessment',
    label: 'Neurological',
    description: 'Show the neurological assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.physiologicalAssessment',
    label: 'Physiological',
    description: 'Show the physiological assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.psychologicalAssessment',
    label: 'Psychological',
    description: 'Show the psychological assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.strokeSelfAssessment',
    label: 'Stroke self-assessment',
    description: 'Show the stroke self-assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
  {
    path: 'featuresVisibility.diaryAssessment',
    label: 'Diary assessment',
    description: 'Show the diary-linked assessment on the tablet.',
    requiresEnabledPath: 'featuresVisibility.schedule',
  },
];

export const REMOTE_QUICK_SETTING_TOGGLES: { path: string; label: string; description?: string }[] = [
  { path: 'betterVisibleCursor', label: 'High visibility cursor', description: 'Easier-to-see pointer on the tablet.' },
  { path: 'showAiSuggestions', label: 'AI suggestions', description: 'Suggested phrases while composing.' },
  { path: 'speakOnSelection', label: 'Speak on selection', description: 'Read aloud when an item is chosen.' },
  { path: 'showFrequentlyUsed', label: 'Frequently used', description: 'Show frequently used communication items.' },
  { path: 'hideRightSidebar', label: 'Show right sidebar', description: 'Toggle the right-hand panel (inverted: hideRightSidebar).' },
];

export const REMOTE_VISIBLE_AREA_TOGGLES: { key: keyof RemoteVisibleAreas; label: string }[] = [
  { key: 'phrases', label: 'Sentences' },
  { key: 'categories', label: 'Words' },
  { key: 'emojis', label: 'Pictures' },
  { key: 'unicode', label: 'Unicode' },
];

/** High-priority proxy toggles grouped like patient settings tabs. */
export const REMOTE_PROXY_SECTIONS: {
  id: string;
  title: string;
  toggles: RemoteFeatureToggleDef[];
}[] = [
  {
    id: 'location',
    title: 'Location',
    toggles: [
      {
        path: 'shareLocationWithCircle',
        label: 'Share location with Circle',
        description:
          'Let Circle see the patient\'s city, local time, and weather from the tablet when the app is open.',
      },
    ],
  },
  {
    id: 'alerts',
    title: 'Alerts & Attention',
    toggles: [
      {
        path: 'showAlertButton',
        label: 'Emergency alert button',
        description: 'Show the emergency alert button on the tablet.',
      },
      {
        path: 'showAttentionButton',
        label: 'Attention request button',
        description: 'Show the non-emergency attention request button.',
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    toggles: [
      {
        path: 'detectEngagementNeed',
        label: 'Detect engagement need',
        description: 'Automatically detect when the patient may need engagement support.',
      },
      {
        path: 'showSaveButton',
        label: 'Show save button',
        description: 'Show the save button in the communication interface.',
      },
    ],
  },
  {
    id: 'messaging',
    title: 'Messaging',
    toggles: [
      {
        path: 'useAiAssistant',
        label: 'AI Assistant in messaging',
        description: 'AI writing help when composing messages.',
      },
      {
        path: 'aiConversation',
        label: 'MedIsOn Companion',
        description: 'Enable the MedIsOn companion conversation feature.',
      },
      {
        path: 'allowSendMessages',
        label: 'Allow sending messages',
        description: 'Let the patient send outgoing messages.',
      },
    ],
  },
];

export const REMOTE_PROXY_TOGGLE_PATHS: string[] = REMOTE_PROXY_SECTIONS.flatMap((section) =>
  section.toggles.map((toggle) => toggle.path),
);

export function remoteSettingsDocRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'remote_settings', REMOTE_SETTINGS_DOC_ID);
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parsePrimaryLanguage(value: unknown): RemotePrimaryLanguage | undefined {
  return value === 'English' ||
    value === 'German' ||
    value === 'Spanish' ||
    value === 'Polish'
    ? value
    : undefined;
}

function parseRemoteDashboardLayout(raw: unknown): RemoteDashboardLayout | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  const clock = asString(d.clockStyle);
  const clockStyle: RemoteDashboardLayout['clockStyle'] =
    clock === 'digital' || clock === 'analog' ? clock : undefined;
  const hiddenWidgets = Array.isArray(d.hiddenWidgets)
    ? d.hiddenWidgets.filter((x): x is string => typeof x === 'string')
    : undefined;
  const preset = sanitizeRemoteDashboardPreset(d.preset);
  const temp = asString(d.temperatureUnit);
  const temperatureUnit =
    temp === 'celsius' || temp === 'fahrenheit' ? temp : undefined;
  const use24HourClock = asBool(d.use24HourClock);
  if (!hiddenWidgets?.length && !preset && !clockStyle && !temperatureUnit && use24HourClock === undefined) {
    return undefined;
  }
  return stripUndefinedDeep({
    preset,
    hiddenWidgets: hiddenWidgets?.length ? hiddenWidgets : undefined,
    clockStyle,
    temperatureUnit,
    use24HourClock: use24HourClock === true ? true : undefined,
  });
}

function parseDailyCheckIn(raw: unknown): RemoteDailyCheckInSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  const qhRaw = d.quietHours;
  const quietHours =
    qhRaw && typeof qhRaw === 'object'
      ? {
          enabled: asBool((qhRaw as Record<string, unknown>).enabled) ?? false,
          start: asString((qhRaw as Record<string, unknown>).start) ?? '22:00',
          end: asString((qhRaw as Record<string, unknown>).end) ?? '06:00',
        }
      : { enabled: false, start: '22:00', end: '06:00' };
  const questions = Array.isArray(d.questions)
    ? sanitizeDailyCheckInQuestions(d.questions)
    : undefined;
  return {
    enabled: asBool(d.enabled) ?? false,
    quietHours,
    ...(questions ? { questions } : {}),
  };
}

function parseRemoteActivityBody(raw: unknown): RemoteActivityVisibility['body'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  const enabled = asBool(d.enabled);
  const motion = asBool(d.motion);
  const verbal = asBool(d.verbal);
  if (enabled === undefined && motion === undefined && verbal === undefined) return undefined;
  return stripUndefinedDeep({ enabled, motion, verbal });
}

function parseRemoteActivity(raw: unknown): RemoteActivityVisibility | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Record<string, unknown>;
  const enabled = asBool(d.enabled);
  const mind = asBool(d.mind);
  const soul = asBool(d.soul);
  const body = parseRemoteActivityBody(d.body);
  if (enabled === undefined && mind === undefined && soul === undefined && !body) return undefined;
  return stripUndefinedDeep({ enabled, mind, soul, body });
}

function parseRemoteAssessmentVisibility(
  fv: Record<string, unknown>,
): Partial<Record<RemoteAssessmentVisibilityKey, boolean>> {
  const out: Partial<Record<RemoteAssessmentVisibilityKey, boolean>> = {};
  for (const key of REMOTE_ASSESSMENT_VISIBILITY_KEYS) {
    const value = asBool(fv[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function buildRemoteFeaturesVisibilityFromPreferences(
  fv: Record<string, unknown>,
): RemoteFeaturesVisibility {
  const activity = (fv.activity ?? {}) as Record<string, unknown>;
  const body = (activity.body ?? {}) as Record<string, unknown>;
  const healthAssessments = !!fv.healthAssessments;
  const assessmentVisibility = Object.fromEntries(
    REMOTE_ASSESSMENT_VISIBILITY_KEYS.map((key) => {
      const raw = fv[key];
      const value =
        raw === undefined
          ? REMOTE_ASSESSMENT_VISIBILITY_DEFAULTS[key]
          : !!raw;
      return [key, value];
    }),
  ) as Record<RemoteAssessmentVisibilityKey, boolean>;

  return {
    dashboard: !!fv.dashboard,
    dropIn: fv.dropIn !== false,
    communication: !!fv.communication,
    messaging: !!fv.messaging,
    aiCompanion: !!fv.aiCompanion,
    healthAssessments,
    schedule: fv.schedule !== false,
    analytics: !!fv.analytics,
    journeyDiary: !!fv.journeyDiary,
    activity: {
      enabled: !!activity.enabled,
      mind: activity.mind !== false,
      soul: activity.soul !== false,
      body: {
        enabled: body.enabled !== false,
        motion: body.motion !== false,
        verbal: body.verbal !== false,
      },
    },
    ...assessmentVisibility,
  };
}

function remoteActivityPresetForMode(mode: RemoteAppMode): RemoteActivityVisibility {
  if (mode === 'user') {
    return {
      enabled: true,
      mind: true,
      soul: true,
      body: { enabled: true, motion: true, verbal: true },
    };
  }
  return {
    enabled: false,
    mind: false,
    soul: false,
    body: { enabled: false, motion: false, verbal: false },
  };
}

function remoteAssessmentPresetForMode(
  mode: RemoteAppMode,
): Record<RemoteAssessmentVisibilityKey, boolean> {
  if (mode === 'user') {
    return Object.fromEntries(
      REMOTE_ASSESSMENT_VISIBILITY_KEYS.map((key) => [key, true]),
    ) as Record<RemoteAssessmentVisibilityKey, boolean>;
  }
  return Object.fromEntries(
    REMOTE_ASSESSMENT_VISIBILITY_KEYS.map((key) => [key, false]),
  ) as Record<RemoteAssessmentVisibilityKey, boolean>;
}

function remoteFeaturesVisibilityPresetForMode(mode: RemoteAppMode): RemoteFeaturesVisibility {
  const activity = remoteActivityPresetForMode(mode);
  const assessments = remoteAssessmentPresetForMode(mode);
  const healthAssessments = mode === 'user';
  const schedule = mode !== 'intensive_care';

  return {
    dashboard: mode === 'user',
    dropIn: mode === 'user',
    communication: true,
    messaging: mode === 'user',
    aiCompanion: mode !== 'intensive_care',
    healthAssessments,
    schedule,
    analytics: mode === 'user',
    journeyDiary: false,
    activity,
    ...assessments,
  };
}

function readFeaturesVisibilityValue(
  fv: RemoteFeaturesVisibility | undefined,
  key: string,
): boolean | undefined {
  if (!fv) return undefined;
  if (key === 'activity.enabled') return fv.activity?.enabled;
  if (key === 'activity.mind') {
    if (!fv.activity?.enabled) return fv.activity?.mind;
    if (fv.activity.mind === undefined) return true;
    return fv.activity.mind;
  }
  if (key === 'activity.soul') {
    if (!fv.activity?.enabled) return fv.activity?.soul;
    if (fv.activity.soul === undefined) return true;
    return fv.activity.soul;
  }
  if (key === 'activity.body.enabled') {
    if (!fv.activity?.enabled) return fv.activity?.body?.enabled;
    if (fv.activity.body?.enabled === undefined) return true;
    return fv.activity.body.enabled;
  }
  if (key === 'dropIn') {
    if (fv.dropIn === undefined) return true;
    return fv.dropIn;
  }
  if (key === 'schedule') {
    if (fv.schedule === undefined) return true;
    return fv.schedule;
  }
  if ((REMOTE_ASSESSMENT_VISIBILITY_KEYS as readonly string[]).includes(key)) {
    const assessmentKey = key as RemoteAssessmentVisibilityKey;
    const value = fv[assessmentKey];
    if (value === undefined) return REMOTE_ASSESSMENT_VISIBILITY_DEFAULTS[assessmentKey];
    return value;
  }
  return fv[key as keyof RemoteFeaturesVisibility] as boolean | undefined;
}

export function getRemoteFeatureToggleEnabled(
  doc: RemoteSettingsPayload,
  path: string,
): boolean {
  return getRemoteSettingValue(doc, path) ?? false;
}

export function isRemoteFeatureToggleDisabled(
  doc: RemoteSettingsPayload,
  item: RemoteFeatureToggleDef,
): boolean {
  if (!item.requiresEnabledPath) return false;
  return !getRemoteFeatureToggleEnabled(doc, item.requiresEnabledPath);
}

export function parsePatientRemoteSettings(
  patientId: string,
  data: Record<string, unknown> | undefined,
): PatientRemoteSettingsDoc | null {
  if (!data) return null;
  const fvRaw = data.featuresVisibility;
  const fv =
    fvRaw && typeof fvRaw === 'object'
      ? (fvRaw as Record<string, unknown>)
      : undefined;
  const activityRaw = fv?.activity;
  const activity = parseRemoteActivity(activityRaw);
  const assessmentVisibility = fv ? parseRemoteAssessmentVisibility(fv) : {};
  const vaRaw = data.visibleAreas;
  const visibleAreas =
    vaRaw && typeof vaRaw === 'object'
      ? {
          phrases: asBool((vaRaw as Record<string, unknown>).phrases),
          categories: asBool((vaRaw as Record<string, unknown>).categories),
          emojis: asBool((vaRaw as Record<string, unknown>).emojis),
          unicode: asBool((vaRaw as Record<string, unknown>).unicode),
        }
      : undefined;
  const jdRaw = data.journeyDiary;
  const journeyDiary =
    jdRaw && typeof jdRaw === 'object'
      ? { allowViewSharedEntries: asBool((jdRaw as Record<string, unknown>).allowViewSharedEntries) }
      : undefined;

  const appMode = asString(data.appMode);
  const mode: RemoteAppMode | undefined =
    appMode === 'intensive_care' || appMode === 'hospital' || appMode === 'user' ? appMode : undefined;

  const contentFontSize = asString(data.contentFontSize);
  const fontSize =
    contentFontSize === 'small' || contentFontSize === 'medium' || contentFontSize === 'large'
      ? contentFontSize
      : undefined;

  return {
    patientId,
    appMode: mode,
    primaryLanguage: parsePrimaryLanguage(data.primaryLanguage),
    showAlertButton: asBool(data.showAlertButton),
    showAttentionButton: asBool(data.showAttentionButton),
    detectEngagementNeed: asBool(data.detectEngagementNeed),
    showSaveButton: asBool(data.showSaveButton),
    useAiAssistant: asBool(data.useAiAssistant),
    aiConversation: asBool(data.aiConversation),
    allowSendMessages: asBool(data.allowSendMessages),
    showUserInSidebar: asBool(data.showUserInSidebar),
    showQuickSettings: asBool(data.showQuickSettings),
    showSettingsInSidebar: asBool(data.showSettingsInSidebar),
    featuresVisibility: fv
      ? {
          dashboard: asBool(fv.dashboard),
          dropIn: asBool(fv.dropIn),
          communication: asBool(fv.communication),
          messaging: asBool(fv.messaging),
          aiCompanion: asBool(fv.aiCompanion),
          healthAssessments: asBool(fv.healthAssessments),
          schedule: asBool(fv.schedule),
          analytics: asBool(fv.analytics),
          journeyDiary: asBool(fv.journeyDiary),
          activity,
          ...assessmentVisibility,
        }
      : undefined,
    journeyDiary,
    dailyCheckIn: parseDailyCheckIn(data.dailyCheckIn),
    betterVisibleCursor: asBool(data.betterVisibleCursor),
    showAiSuggestions: asBool(data.showAiSuggestions),
    speakOnSelection: asBool(data.speakOnSelection),
    showFrequentlyUsed: asBool(data.showFrequentlyUsed),
    hideRightSidebar: asBool(data.hideRightSidebar),
    contentFontSize: fontSize,
    visibleAreas,
    quickAreasOrder: Array.isArray(data.quickAreasOrder)
      ? data.quickAreasOrder.filter((x): x is string => typeof x === 'string')
      : undefined,
    shareLocationWithCircle: asBool(data.shareLocationWithCircle),
    dashboardLayout: parseRemoteDashboardLayout(data.dashboardLayout),
    assessmentSchedule: sanitizeRemoteAssessmentSchedule(data.assessmentSchedule),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    updatedByUid: asString(data.updatedByUid) ?? '',
    updatedByName: asString(data.updatedByName) ?? '',
    updatedByRole: asString(data.updatedByRole),
    source: data.source === 'circle' || data.source === 'patient' ? data.source : undefined,
  };
}

function inferContentFontSize(preferences: Record<string, unknown>): 'small' | 'medium' | 'large' {
  const raw =
    preferences.messagingFontSize ??
    (preferences.categoryCardSizes as Record<string, unknown> | undefined)?.textbox ??
    preferences.emojiSize;
  if (raw === 'small' || raw === 'large') return raw;
  return 'medium';
}

/** Build a remote-settings snapshot from patient preferences (Phase 1 whitelist). */
export function extractRemoteSettingsFromPreferences(
  patientId: string,
  preferences: Record<string, unknown>,
  meta: { uid: string; displayName: string; source?: RemoteSettingsSource },
): PatientRemoteSettingsDoc {
  const fv = (preferences.featuresVisibility ?? {}) as Record<string, unknown>;
  const dailyRaw = preferences.dailyCheckIn as Record<string, unknown> | undefined;
  const quietRaw = dailyRaw?.quietHours as Record<string, unknown> | undefined;
  const visibleAreas = (preferences.visibleAreas ?? {}) as Record<string, unknown>;
  const journeyDiary = preferences.journeyDiary as Record<string, unknown> | undefined;
  const dashboardLayoutRaw = preferences.dashboardLayout as Record<string, unknown> | undefined;

  return {
    patientId,
    appMode: preferences.appMode as RemoteAppMode | undefined,
    primaryLanguage: parsePrimaryLanguage(preferences.primaryLanguage) ?? 'English',
    showAlertButton: preferences.showAlertButton !== false,
    showAttentionButton: preferences.showAttentionButton !== false,
    detectEngagementNeed: !!preferences.detectEngagementNeed,
    showSaveButton: preferences.showSaveButton !== false,
    useAiAssistant: preferences.useAiAssistant !== false,
    aiConversation: !!preferences.aiConversation,
    allowSendMessages: preferences.allowSendMessages !== false,
    showUserInSidebar: !!preferences.showUserInSidebar,
    showQuickSettings: preferences.showQuickSettings !== false,
    showSettingsInSidebar: preferences.showSettingsInSidebar !== false,
    featuresVisibility: buildRemoteFeaturesVisibilityFromPreferences(fv),
    journeyDiary: {
      allowViewSharedEntries: !!journeyDiary?.allowViewSharedEntries,
    },
    dailyCheckIn: {
      enabled: !!(dailyRaw?.enabled ?? false),
      quietHours: {
        enabled: !!(quietRaw?.enabled ?? false),
        start: asString(quietRaw?.start) ?? '22:00',
        end: asString(quietRaw?.end) ?? '06:00',
      },
      ...(Array.isArray(dailyRaw?.questions)
        ? {
            questions: mergeDailyCheckInQuestions(
              dailyRaw?.questions as DailyCheckInQuestion[],
            ),
          }
        : {}),
    },
    betterVisibleCursor: !!preferences.betterVisibleCursor,
    showAiSuggestions: preferences.showAiSuggestions !== false,
    speakOnSelection: !!preferences.speakOnSelection,
    showFrequentlyUsed: preferences.showFrequentlyUsed !== false,
    hideRightSidebar: !!preferences.hideRightSidebar,
    contentFontSize: inferContentFontSize(preferences),
    visibleAreas: {
      phrases: visibleAreas.phrases !== false,
      categories: visibleAreas.categories !== false,
      emojis: visibleAreas.emojis !== false,
      unicode: visibleAreas.unicode !== false,
    },
    quickAreasOrder: Array.isArray(preferences.quickAreasOrder)
      ? (preferences.quickAreasOrder as string[])
      : ['phrases', 'categories', 'emojis', 'unicode'],
    shareLocationWithCircle: !!preferences.shareLocationWithCircle,
    dashboardLayout: dashboardLayoutRaw
      ? {
          preset: sanitizeRemoteDashboardPreset(dashboardLayoutRaw.preset),
          hiddenWidgets: Array.isArray(dashboardLayoutRaw.hiddenWidgets)
            ? dashboardLayoutRaw.hiddenWidgets.filter((x): x is string => typeof x === 'string')
            : undefined,
          clockStyle:
            dashboardLayoutRaw.clockStyle === 'analog' || dashboardLayoutRaw.clockStyle === 'digital'
              ? dashboardLayoutRaw.clockStyle
              : undefined,
          temperatureUnit:
            dashboardLayoutRaw.temperatureUnit === 'celsius' ||
            dashboardLayoutRaw.temperatureUnit === 'fahrenheit'
              ? dashboardLayoutRaw.temperatureUnit
              : undefined,
          use24HourClock: dashboardLayoutRaw.use24HourClock === true ? true : undefined,
        }
      : undefined,
    updatedAt: Date.now(),
    updatedByUid: meta.uid,
    updatedByName: meta.displayName,
    source: meta.source ?? 'patient',
  };
}

export function getRemoteSettingValue(
  doc: RemoteSettingsPayload,
  path: string,
): boolean | undefined {
  if (path === 'showUserInSidebar') return doc.showUserInSidebar;
  if (path === 'showQuickSettings') return doc.showQuickSettings;
  if (path === 'showSettingsInSidebar') return doc.showSettingsInSidebar;
  if (path === 'showAlertButton') return doc.showAlertButton;
  if (path === 'showAttentionButton') return doc.showAttentionButton;
  if (path === 'detectEngagementNeed') return doc.detectEngagementNeed;
  if (path === 'showSaveButton') return doc.showSaveButton;
  if (path === 'useAiAssistant') return doc.useAiAssistant;
  if (path === 'aiConversation') return doc.aiConversation;
  if (path === 'allowSendMessages') return doc.allowSendMessages;
  if (path === 'betterVisibleCursor') return doc.betterVisibleCursor;
  if (path === 'showAiSuggestions') return doc.showAiSuggestions;
  if (path === 'speakOnSelection') return doc.speakOnSelection;
  if (path === 'showFrequentlyUsed') return doc.showFrequentlyUsed;
  if (path === 'hideRightSidebar') return doc.hideRightSidebar;
  if (path === 'shareLocationWithCircle') return doc.shareLocationWithCircle;
  if (path === 'journeyDiary.allowViewSharedEntries') {
    return doc.journeyDiary?.allowViewSharedEntries;
  }
  if (path.startsWith('featuresVisibility.')) {
    const key = path.slice('featuresVisibility.'.length);
    return readFeaturesVisibilityValue(doc.featuresVisibility, key);
  }
  return undefined;
}

export function setRemoteSettingValue(
  doc: PatientRemoteSettingsDoc,
  path: string,
  value: boolean,
): PatientRemoteSettingsDoc {
  const next: PatientRemoteSettingsDoc = {
    ...doc,
    featuresVisibility: doc.featuresVisibility ? { ...doc.featuresVisibility } : {},
    journeyDiary: doc.journeyDiary ? { ...doc.journeyDiary } : {},
    visibleAreas: doc.visibleAreas ? { ...doc.visibleAreas } : {},
  };

  if (path === 'showUserInSidebar') next.showUserInSidebar = value;
  else if (path === 'showQuickSettings') next.showQuickSettings = value;
  else if (path === 'showSettingsInSidebar') next.showSettingsInSidebar = value;
  else if (path === 'showAlertButton') next.showAlertButton = value;
  else if (path === 'showAttentionButton') next.showAttentionButton = value;
  else if (path === 'detectEngagementNeed') next.detectEngagementNeed = value;
  else if (path === 'showSaveButton') next.showSaveButton = value;
  else if (path === 'useAiAssistant') next.useAiAssistant = value;
  else if (path === 'aiConversation') next.aiConversation = value;
  else if (path === 'allowSendMessages') next.allowSendMessages = value;
  else if (path === 'betterVisibleCursor') next.betterVisibleCursor = value;
  else if (path === 'showAiSuggestions') next.showAiSuggestions = value;
  else if (path === 'speakOnSelection') next.speakOnSelection = value;
  else if (path === 'showFrequentlyUsed') next.showFrequentlyUsed = value;
  else if (path === 'hideRightSidebar') next.hideRightSidebar = value;
  else if (path === 'shareLocationWithCircle') next.shareLocationWithCircle = value;
  else if (path === 'journeyDiary.allowViewSharedEntries') {
    next.journeyDiary = { ...next.journeyDiary, allowViewSharedEntries: value };
  } else if (path.startsWith('featuresVisibility.')) {
    const key = path.slice('featuresVisibility.'.length);
    const current = next.featuresVisibility ?? {};
    if (key === 'activity.enabled') {
      next.featuresVisibility = {
        ...current,
        activity: { ...(current.activity ?? {}), enabled: value },
      };
    } else if (key === 'activity.mind') {
      next.featuresVisibility = {
        ...current,
        activity: { ...(current.activity ?? {}), mind: value },
      };
    } else if (key === 'activity.soul') {
      next.featuresVisibility = {
        ...current,
        activity: { ...(current.activity ?? {}), soul: value },
      };
    } else if (key === 'activity.body.enabled') {
      next.featuresVisibility = {
        ...current,
        activity: {
          ...(current.activity ?? {}),
          body: { ...(current.activity?.body ?? {}), enabled: value },
        },
      };
    } else if (key === 'healthAssessments') {
      next.featuresVisibility = {
        ...current,
        healthAssessments: value,
      };
    } else {
      next.featuresVisibility = { ...current, [key]: value };
    }
  }
  return next;
}

export function subscribeRemoteSettings(
  db: Firestore,
  patientId: string,
  onChange: (settings: PatientRemoteSettingsDoc | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    remoteSettingsDocRef(db, patientId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(parsePatientRemoteSettings(patientId, snap.data() as Record<string, unknown>));
    },
    (err) => onError?.(err.message || 'Could not load remote settings.'),
  );
}

export async function writeRemoteSettings(
  db: Firestore,
  settings: PatientRemoteSettingsDoc,
): Promise<void> {
  await setDoc(
    remoteSettingsDocRef(db, settings.patientId),
    stripUndefinedDeep(settings),
    { merge: true },
  );
}

export function canViewRemoteSettingsTab(
  capabilities: { remoteSettings?: boolean } | undefined,
): boolean {
  return !!capabilities?.remoteSettings;
}

const REMOTE_DAILY_CHECKIN_QUIET_HOURS = {
  enabled: true,
  start: '22:00',
  end: '06:00',
} as const;

const REMOTE_PROXY_PRESET_BY_MODE: Record<
  RemoteAppMode,
  Pick<
    RemoteSettingsPayload,
    | 'showAlertButton'
    | 'showAttentionButton'
    | 'detectEngagementNeed'
    | 'showSaveButton'
    | 'useAiAssistant'
    | 'aiConversation'
    | 'allowSendMessages'
  >
> = {
  intensive_care: {
    showAlertButton: true,
    showAttentionButton: true,
    detectEngagementNeed: false,
    showSaveButton: false,
    useAiAssistant: true,
    aiConversation: false,
    allowSendMessages: true,
  },
  hospital: {
    showAlertButton: true,
    showAttentionButton: true,
    detectEngagementNeed: false,
    showSaveButton: true,
    useAiAssistant: true,
    aiConversation: false,
    allowSendMessages: true,
  },
  user: {
    showAlertButton: true,
    showAttentionButton: true,
    detectEngagementNeed: false,
    showSaveButton: true,
    useAiAssistant: true,
    aiConversation: false,
    allowSendMessages: true,
  },
};

/** Remote-settings fields that match each application mode preset (subset of patient app modes). */
function remotePresetPayloadForMode(mode: RemoteAppMode): RemoteSettingsPayload {
  const visibleAll = { phrases: true, categories: true, emojis: true, unicode: true };
  const proxyPreset = REMOTE_PROXY_PRESET_BY_MODE[mode];

  if (mode === 'intensive_care') {
    return {
      appMode: 'intensive_care',
      ...proxyPreset,
      showUserInSidebar: false,
      showQuickSettings: false,
      showSettingsInSidebar: false,
      hideRightSidebar: true,
      betterVisibleCursor: true,
      showAiSuggestions: false,
      speakOnSelection: true,
      showFrequentlyUsed: false,
      featuresVisibility: remoteFeaturesVisibilityPresetForMode('intensive_care'),
      journeyDiary: { allowViewSharedEntries: false },
      dailyCheckIn: { enabled: true, quietHours: { ...REMOTE_DAILY_CHECKIN_QUIET_HOURS } },
      visibleAreas: { phrases: false, categories: false, emojis: false, unicode: true },
      contentFontSize: 'medium',
    };
  }

  if (mode === 'user') {
    return {
      appMode: 'user',
      ...proxyPreset,
      showUserInSidebar: true,
      showQuickSettings: true,
      showSettingsInSidebar: true,
      hideRightSidebar: true,
      betterVisibleCursor: true,
      showAiSuggestions: true,
      speakOnSelection: true,
      showFrequentlyUsed: true,
      featuresVisibility: remoteFeaturesVisibilityPresetForMode('user'),
      journeyDiary: { allowViewSharedEntries: false },
      dailyCheckIn: {
        enabled: false,
        quietHours: { enabled: false, start: '22:00', end: '06:00' },
      },
      visibleAreas: visibleAll,
      contentFontSize: 'medium',
    };
  }

  return {
    appMode: 'hospital',
    ...proxyPreset,
    showUserInSidebar: false,
    showQuickSettings: false,
    showSettingsInSidebar: false,
    hideRightSidebar: true,
    betterVisibleCursor: true,
    showAiSuggestions: true,
    speakOnSelection: false,
    showFrequentlyUsed: true,
    featuresVisibility: remoteFeaturesVisibilityPresetForMode('hospital'),
    journeyDiary: { allowViewSharedEntries: false },
    dailyCheckIn: { enabled: true, quietHours: { ...REMOTE_DAILY_CHECKIN_QUIET_HOURS } },
    visibleAreas: visibleAll,
    contentFontSize: 'medium',
  };
}

function remoteBoolMatches(
  left: boolean | undefined,
  right: boolean | undefined,
): boolean {
  return !!left === !!right;
}

/** True when remote toggles differ from the selected application mode preset. */
export function isRemoteSettingsCustomized(doc: PatientRemoteSettingsDoc): boolean {
  const mode = doc.appMode ?? 'hospital';
  const preset = remotePresetPayloadForMode(mode);

  for (const item of REMOTE_FEATURE_TOGGLES) {
    if (
      !remoteBoolMatches(
        getRemoteSettingValue(doc, item.path),
        getRemoteSettingValue(preset, item.path),
      )
    ) {
      return true;
    }
  }

  for (const item of REMOTE_ASSESSMENT_VISIBILITY_TOGGLES) {
    if (
      !remoteBoolMatches(
        getRemoteSettingValue(doc, item.path),
        getRemoteSettingValue(preset, item.path),
      )
    ) {
      return true;
    }
  }

  for (const item of REMOTE_QUICK_SETTING_TOGGLES) {
    if (
      !remoteBoolMatches(
        getRemoteSettingValue(doc, item.path),
        getRemoteSettingValue(preset, item.path),
      )
    ) {
      return true;
    }
  }

  for (const path of REMOTE_PROXY_TOGGLE_PATHS) {
    // Location sharing is independent of application mode — leave it alone for "Custom".
    if (path === 'shareLocationWithCircle') continue;
    if (!remoteBoolMatches(getRemoteSettingValue(doc, path), getRemoteSettingValue(preset, path))) {
      return true;
    }
  }

  for (const item of REMOTE_VISIBLE_AREA_TOGGLES) {
    if (!remoteBoolMatches(doc.visibleAreas?.[item.key], preset.visibleAreas?.[item.key])) {
      return true;
    }
  }

  if (!remoteBoolMatches(doc.dailyCheckIn?.enabled, preset.dailyCheckIn?.enabled)) {
    return true;
  }

  return false;
}

export function formatDashboardApplicationModeLine(
  doc: PatientRemoteSettingsDoc | null | undefined,
  loading = false,
): string {
  if (loading) return 'Mode: …';
  if (!doc?.appMode || isRemoteSettingsCustomized(doc)) {
    return 'Mode: custom';
  }

  const label = REMOTE_APP_MODES.find((mode) => mode.key === doc.appMode)?.label ?? 'custom';
  return `Mode: ${label}`;
}

export function createDefaultRemoteSettings(patientId: string): PatientRemoteSettingsDoc {
  return {
    patientId,
    primaryLanguage: 'English',
    ...remotePresetPayloadForMode('hospital'),
    updatedAt: 0,
    updatedByUid: '',
    updatedByName: '',
  };
}

export function setRemoteVisibleArea(
  doc: PatientRemoteSettingsDoc,
  key: keyof RemoteVisibleAreas,
  value: boolean,
): PatientRemoteSettingsDoc {
  return {
    ...doc,
    visibleAreas: { ...doc.visibleAreas, [key]: value },
  };
}

export function setRemoteDailyCheckIn(
  doc: PatientRemoteSettingsDoc,
  patch: Partial<RemoteDailyCheckInSettings> & {
    quietHours?: Partial<RemoteDailyCheckInSettings['quietHours']>;
  },
): PatientRemoteSettingsDoc {
  const current = doc.dailyCheckIn ?? {
    enabled: false,
    quietHours: { enabled: false, start: '22:00', end: '06:00' },
  };
  return {
    ...doc,
    dailyCheckIn: {
      ...current,
      ...patch,
      quietHours: { ...current.quietHours, ...patch.quietHours },
      questions:
        patch.questions !== undefined
          ? sanitizeDailyCheckInQuestions(patch.questions)
          : current.questions,
    },
  };
}

export function setRemoteAppMode(
  doc: PatientRemoteSettingsDoc,
  appMode: RemoteAppMode,
): PatientRemoteSettingsDoc {
  const preset = remotePresetPayloadForMode(appMode);
  const next: PatientRemoteSettingsDoc = {
    ...doc,
    ...preset,
    appMode,
    patientId: doc.patientId,
    primaryLanguage: doc.primaryLanguage,
    quickAreasOrder: preset.quickAreasOrder ?? doc.quickAreasOrder,
    // Sticky: once enabled (or disabled) by proxy/patient, mode changes must not reset it.
    shareLocationWithCircle: doc.shareLocationWithCircle,
  };
  if (appMode === 'intensive_care') {
    next.dashboardLayout = { ...doc.dashboardLayout, preset: 'minimal' };
  }
  return next;
}

export function setRemoteDashboardPreset(
  doc: PatientRemoteSettingsDoc,
  preset: RemoteDashboardPreset,
): PatientRemoteSettingsDoc {
  return {
    ...doc,
    dashboardLayout: {
      ...doc.dashboardLayout,
      preset,
    },
  };
}

/** Effective patient dashboard preset for Circle display (ICU + dashboard tab → Essentials). */
export function resolveEffectiveRemoteDashboardPreset(
  doc: PatientRemoteSettingsDoc | null | undefined,
): RemoteDashboardPreset | 'custom' {
  if (doc?.appMode === 'intensive_care' && doc.featuresVisibility?.dashboard) {
    return 'minimal';
  }
  const preset = doc?.dashboardLayout?.preset;
  if (
    preset === 'minimal' ||
    preset === 'balanced' ||
    preset === 'insights' ||
    preset === 'spark'
  ) {
    return preset;
  }
  if (preset === 'custom') return 'custom';
  return 'balanced';
}

export function setRemotePrimaryLanguage(
  doc: PatientRemoteSettingsDoc,
  primaryLanguage: RemotePrimaryLanguage,
): PatientRemoteSettingsDoc {
  return { ...doc, primaryLanguage };
}

export function setRemoteContentFontSize(
  doc: PatientRemoteSettingsDoc,
  contentFontSize: 'small' | 'medium' | 'large',
): PatientRemoteSettingsDoc {
  return { ...doc, contentFontSize };
}

export function setRemoteAssessmentSchedule(
  doc: PatientRemoteSettingsDoc,
  schedule: RemoteAssessmentSchedule,
): PatientRemoteSettingsDoc {
  return {
    ...doc,
    assessmentSchedule: schedule,
  };
}
