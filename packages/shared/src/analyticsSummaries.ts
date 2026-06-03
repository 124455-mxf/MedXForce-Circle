import { collection, doc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { CircleMemberRole, PatientCapabilities } from './patientPermissions';

/** Who may read this summary in Circle (enforced in Firestore rules). */
export type AnalyticsAudience = 'engagement' | 'care' | 'clinical';

export type AnalyticsSummaryStatus = 'none' | 'ok' | 'stale' | 'coming_soon';

export type AnalyticsTrend = 'up' | 'down' | 'flat' | 'mixed' | null;

export type AnalyticsFooterTone = 'neutral' | 'attention' | 'warning';

export interface PatientAnalyticsSummary {
  metricId: AnalyticsMetricId;
  patientId: string;
  audience: AnalyticsAudience;
  status: AnalyticsSummaryStatus;
  latestAt: number | null;
  countInWindow: number;
  windowDays: number;
  summaryText: string;
  footerTone: AnalyticsFooterTone;
  trend: AnalyticsTrend;
  isReleased: boolean;
  title: string;
  description: string;
  sectionId: AnalyticsSectionId;
  updatedAt: number;
}

export const ANALYTICS_SECTIONS = [
  {
    id: 'communication',
    title: 'Communication & engagement',
    itemIds: ['alert-attention', 'speech-history', 'ai-conversation', 'daily-check-in'],
  },
  {
    id: 'physical',
    title: 'Physical assessments',
    itemIds: [
      'impact',
      'pain',
      'strength-reflex',
      'mobility',
      'numbness',
      'temperature',
      'balance',
    ],
  },
  {
    id: 'visionHearing',
    title: 'Vision & hearing',
    itemIds: ['vision', 'hearing'],
  },
  {
    id: 'speech',
    title: 'Speech assessments',
    itemIds: ['speech'],
  },
  {
    id: 'neurologicalPhysiological',
    title: 'Neurological & physiological',
    itemIds: ['neurological', 'physiological', 'psychological'],
  },
  {
    id: 'postStroke',
    title: 'Post stroke self assessment',
    itemIds: ['stroke', 'diary'],
  },
  {
    id: 'vitality',
    title: 'Vitality',
    itemIds: ['vitality-game', 'soul-vitality'],
  },
] as const;

export type AnalyticsSectionId = (typeof ANALYTICS_SECTIONS)[number]['id'];

export const ANALYTICS_METRIC_IDS = [
  'alert-attention',
  'speech-history',
  'ai-conversation',
  'daily-check-in',
  'impact',
  'pain',
  'strength-reflex',
  'mobility',
  'numbness',
  'temperature',
  'balance',
  'vision',
  'hearing',
  'speech',
  'neurological',
  'physiological',
  'psychological',
  'stroke',
  'diary',
  'vitality-game',
  'soul-vitality',
] as const;

export type AnalyticsMetricId = (typeof ANALYTICS_METRIC_IDS)[number];

export type AnalyticsMetricDefinition = {
  id: AnalyticsMetricId;
  audience: AnalyticsAudience;
  title: string;
  description: string;
  isReleased: boolean;
  sectionId: AnalyticsSectionId;
};

/** Keep in sync with medxforce/src/lib/analyticsSummaries.ts */
export const ANALYTICS_METRIC_DEFINITIONS: Record<AnalyticsMetricId, AnalyticsMetricDefinition> = {
  'alert-attention': {
    id: 'alert-attention',
    audience: 'engagement',
    title: 'Alert & attention',
    description: 'Historical data on alertness and focus.',
    isReleased: true,
    sectionId: 'communication',
  },
  'speech-history': {
    id: 'speech-history',
    audience: 'engagement',
    title: 'Messages',
    description: 'Communication phrases, emojis, and messaging activity.',
    isReleased: true,
    sectionId: 'communication',
  },
  'ai-conversation': {
    id: 'ai-conversation',
    audience: 'engagement',
    title: 'Companion',
    description: 'Companion conversation history and interaction counts.',
    isReleased: true,
    sectionId: 'communication',
  },
  'daily-check-in': {
    id: 'daily-check-in',
    audience: 'engagement',
    title: 'Daily check-in',
    description: 'Daily check-in completion over the last 30 days.',
    isReleased: true,
    sectionId: 'communication',
  },
  impact: {
    id: 'impact',
    audience: 'care',
    title: 'Impact',
    description: 'Impact on daily life activities.',
    isReleased: true,
    sectionId: 'physical',
  },
  pain: {
    id: 'pain',
    audience: 'care',
    title: 'Pain',
    description: 'Pain levels and body map history.',
    isReleased: true,
    sectionId: 'physical',
  },
  'strength-reflex': {
    id: 'strength-reflex',
    audience: 'care',
    title: 'Strength & reflex',
    description: 'Motor function and reflex history.',
    isReleased: true,
    sectionId: 'physical',
  },
  mobility: {
    id: 'mobility',
    audience: 'care',
    title: 'Mobility & spasticity',
    description: 'Range of motion and spasticity trends.',
    isReleased: true,
    sectionId: 'physical',
  },
  numbness: {
    id: 'numbness',
    audience: 'care',
    title: 'Numbness',
    description: 'Sensation and numbness tracking.',
    isReleased: true,
    sectionId: 'physical',
  },
  temperature: {
    id: 'temperature',
    audience: 'care',
    title: 'Temperature & touch',
    description: 'Temperature sensitivity history.',
    isReleased: true,
    sectionId: 'physical',
  },
  balance: {
    id: 'balance',
    audience: 'care',
    title: 'Balance',
    description: 'Stability and fall-risk guided movements.',
    isReleased: false,
    sectionId: 'physical',
  },
  vision: {
    id: 'vision',
    audience: 'care',
    title: 'Vision',
    description: 'Visual field and tracking data.',
    isReleased: true,
    sectionId: 'visionHearing',
  },
  hearing: {
    id: 'hearing',
    audience: 'care',
    title: 'Hearing',
    description: 'Hearing profile, aids, and auditory perception.',
    isReleased: false,
    sectionId: 'visionHearing',
  },
  speech: {
    id: 'speech',
    audience: 'care',
    title: 'Speech & language',
    description: 'Communication skills, vocabulary, and articulation.',
    isReleased: false,
    sectionId: 'speech',
  },
  neurological: {
    id: 'neurological',
    audience: 'clinical',
    title: 'Neurological',
    description: 'Cognitive and neurological performance.',
    isReleased: true,
    sectionId: 'neurologicalPhysiological',
  },
  physiological: {
    id: 'physiological',
    audience: 'clinical',
    title: 'Physiological',
    description: 'Physiological recovery markers and autonomic responses.',
    isReleased: false,
    sectionId: 'neurologicalPhysiological',
  },
  psychological: {
    id: 'psychological',
    audience: 'clinical',
    title: 'Psychological support',
    description: 'Emotional well-being and mood trends.',
    isReleased: true,
    sectionId: 'neurologicalPhysiological',
  },
  stroke: {
    id: 'stroke',
    audience: 'care',
    title: 'Post stroke self report',
    description: 'Recovery across strength, mobility, and cognition.',
    isReleased: false,
    sectionId: 'postStroke',
  },
  diary: {
    id: 'diary',
    audience: 'engagement',
    title: 'Diary',
    description: 'Shared recovery notes and milestones in the circle diary.',
    isReleased: true,
    sectionId: 'postStroke',
  },
  'vitality-game': {
    id: 'vitality-game',
    audience: 'engagement',
    title: 'Mind',
    description: 'Mind vitality game performance and trends.',
    isReleased: true,
    sectionId: 'vitality',
  },
  'soul-vitality': {
    id: 'soul-vitality',
    audience: 'engagement',
    title: 'Soul',
    description: 'Media engagement and social interaction trends.',
    isReleased: true,
    sectionId: 'vitality',
  },
};

const CARE_ROLES: CircleMemberRole[] = [
  'caregiver',
  'professional_caregiver',
  'proxy',
  'facility_staff',
];

export function isCareCircleRole(role: string): boolean {
  return CARE_ROLES.includes(role as CircleMemberRole);
}

export function canReadAnalyticsAudience(
  audience: AnalyticsAudience,
  role: string,
  capabilities: PatientCapabilities,
): boolean {
  if (audience === 'engagement') return capabilities.viewEngagementTrends !== false;
  if (audience === 'care') return isCareCircleRole(role) && !!capabilities.viewCareTrends;
  if (audience === 'clinical') return !!capabilities.viewClinicalData;
  return false;
}

/** Legacy member docs may omit new flags — treat engagement as on unless explicitly false. */
export function canViewAnalyticsTab(capabilities: PatientCapabilities | undefined): boolean {
  if (!capabilities) return false;
  return (
    capabilities.viewEngagementTrends !== false ||
    !!capabilities.viewCareTrends ||
    !!capabilities.viewClinicalData
  );
}

export function filterSummariesForMember(
  summaries: PatientAnalyticsSummary[],
  role: string,
  capabilities: PatientCapabilities,
): PatientAnalyticsSummary[] {
  return summaries.filter((s) => canReadAnalyticsAudience(s.audience, role, capabilities));
}

export function analyticsSummariesCollection(db: Firestore, patientId: string) {
  return collection(db, 'patients', patientId, 'analytics_summaries');
}

export function analyticsSummaryDoc(db: Firestore, patientId: string, metricId: string) {
  return doc(db, 'patients', patientId, 'analytics_summaries', metricId);
}

export function parsePatientAnalyticsSummary(
  metricId: string,
  data: Record<string, unknown> | undefined,
): PatientAnalyticsSummary | null {
  if (!data) return null;
  const resolvedId = (typeof data.metricId === 'string' ? data.metricId : metricId) as AnalyticsMetricId;
  const def = ANALYTICS_METRIC_DEFINITIONS[resolvedId];
  if (!def) return null;
  return {
    metricId: resolvedId,
    patientId: String(data.patientId ?? ''),
    audience: (data.audience as AnalyticsAudience) ?? def?.audience ?? 'engagement',
    status: (data.status as AnalyticsSummaryStatus) ?? 'none',
    latestAt: typeof data.latestAt === 'number' ? data.latestAt : null,
    countInWindow: typeof data.countInWindow === 'number' ? data.countInWindow : 0,
    windowDays: typeof data.windowDays === 'number' ? data.windowDays : 30,
    summaryText: String(data.summaryText ?? ''),
    footerTone: (data.footerTone as AnalyticsFooterTone) ?? 'neutral',
    trend: (data.trend as AnalyticsTrend) ?? null,
    isReleased: data.isReleased === true || def?.isReleased === true,
    title: String(data.title ?? def?.title ?? metricId),
    description: String(data.description ?? def?.description ?? ''),
    sectionId: (data.sectionId as AnalyticsSectionId) ?? def?.sectionId ?? 'communication',
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}
