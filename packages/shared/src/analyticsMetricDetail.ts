/** Keep in sync with medxforce/src/lib/analyticsMetricDetail.ts */

export type AnalyticsTrendDirection = 'up' | 'down' | 'stable';

export type TopCountItem = { label: string; count: number };

export type MessagesMessagingBreakdown = {
  sent: number;
  replies: number;
  conversations: number;
  updates: number;
  drafts: number;
  notes: number;
  deletions: number;
};

export type MessagesTimelinePoint = {
  date: string;
  communication: number;
  messaging: number;
};

export type AlertAttentionTimelinePoint = {
  date: string;
  alert: number;
  attention: number;
};

export type CompanionTimelinePoint = {
  date: string;
  conversations: number;
  interactions: number;
  detected: number;
};

export type DailyCheckInTimelinePoint = {
  date: string;
  completed: number;
  skipped: number;
};

export type DailyCheckInAnswerTrendPoint = {
  date: string;
  label: string;
  mood?: number;
  pain?: number;
  sleep?: number;
  vitality?: number;
};

export type VisionTimelinePoint = {
  date: string;
  label: string;
  fieldIssues: number;
  focusIssues: number;
  motorIssues: number;
  severity: number;
  colorScore: number;
  contrastScore: number;
};

export type VisionFindingItem = {
  label: string;
  value: string;
  status: 'normal' | 'issue' | 'skipped' | 'neutral';
};

export type VisionCategoryTrend = {
  current: number;
  trend: AnalyticsTrendDirection;
};

export type VitalityGameTimelinePoint = {
  date: string;
  label: string;
  games: number;
  accuracy: number;
};

export type DomainScoreTrend = {
  current: number;
  change: number;
  trend: AnalyticsTrendDirection;
};

export type NeurologicalTimelinePoint = {
  date: string;
  label: string;
  overall: number;
  executive: number;
  language: number;
  attention: number;
};

export type NeurologicalLatestSnapshot = {
  namingSuccess: boolean | null;
  comprehensionSuccess: boolean | null;
  sequenceSuccess: boolean | null;
  fluencyCount: number;
  trailErrors: number;
  trailLatency: number;
};

export type PsychologicalScoreTrend = {
  current: number;
  change: number;
  trend: AnalyticsTrendDirection;
};

export type PsychologicalTimelinePoint = {
  date: string;
  label: string;
  mood: number;
  anxiety: number;
  stress: number;
  sleep: number;
  energy: number;
};

export type AnalyticsMetricDetail =
  | {
      kind: 'alert_attention';
      alerts: number;
      attentions: number;
      trend: AnalyticsTrendDirection;
      timeline?: AlertAttentionTimelinePoint[];
    }
  | {
      kind: 'companion';
      total: number;
      conversations: number;
      interactions: number;
      newCount: number;
      resumed: number;
      detected: number;
      avgInteractions: string;
      trend?: AnalyticsTrendDirection;
      topTopics?: TopCountItem[];
      timeline?: CompanionTimelinePoint[];
    }
  | {
      kind: 'messages';
      communication: number;
      messaging: number;
      trend: AnalyticsTrendDirection;
      topItems: TopCountItem[];
      messagingBreakdown?: MessagesMessagingBreakdown;
      timeline?: MessagesTimelinePoint[];
    }
  | {
      kind: 'daily_check_in';
      completed: number;
      skipped: number;
      total: number;
      skipRate: number;
      trend?: AnalyticsTrendDirection;
      timeline?: DailyCheckInTimelinePoint[];
      answerTrend?: DailyCheckInAnswerTrendPoint[];
    }
  | {
      kind: 'vitality_game';
      gamesPlayed: number;
      avgAccuracy: number;
      totalTimeSeconds: number;
      totalTimeLabel: string;
      trend: AnalyticsTrendDirection;
      level: string;
      timeline?: VitalityGameTimelinePoint[];
    }
  | {
      kind: 'assessment_count';
      count: number;
      average?: number;
      trend: AnalyticsTrendDirection;
    }
  | {
      kind: 'diary';
      entryCount: number;
      milestoneCount: number;
      latestAt: number | null;
      trend: AnalyticsTrendDirection;
    }
  | {
      kind: 'soul_gallery';
      albumCount: number;
      photoCount: number;
      videoCount: number;
      unseenPhotoCount: number;
      reactionCount: number;
      latestAt: number | null;
      trend: AnalyticsTrendDirection;
    }
  | {
      kind: 'vision';
      count: number;
      average: number;
      trend: AnalyticsTrendDirection;
      timeline: VisionTimelinePoint[];
      latestFindings: VisionFindingItem[];
      categoryTrends: {
        focus: VisionCategoryTrend;
        field: VisionCategoryTrend;
        motor: VisionCategoryTrend;
      };
    }
  | {
      kind: 'neurological';
      count: number;
      average: number;
      trend: AnalyticsTrendDirection;
      overall: DomainScoreTrend;
      executive: DomainScoreTrend;
      language: DomainScoreTrend;
      attention: DomainScoreTrend;
      timeline: NeurologicalTimelinePoint[];
      latestSnapshot?: NeurologicalLatestSnapshot;
    }
  | {
      kind: 'psychological';
      count: number;
      trend: AnalyticsTrendDirection;
      mood: PsychologicalScoreTrend;
      anxiety: PsychologicalScoreTrend;
      sleep: PsychologicalScoreTrend;
      stress: PsychologicalScoreTrend;
      energy: PsychologicalScoreTrend;
      timeline: PsychologicalTimelinePoint[];
    };

function asFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseTrend(value: unknown): AnalyticsTrendDirection {
  return value === 'up' || value === 'down' || value === 'stable' ? value : 'stable';
}

function parseTopItems(raw: unknown): TopCountItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is TopCountItem =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as TopCountItem).label === 'string' &&
        typeof (item as TopCountItem).count === 'number' &&
        Number.isFinite((item as TopCountItem).count),
    )
    .map((item) => ({ label: item.label, count: item.count }));
}

function parseMessagingBreakdown(raw: unknown): MessagesMessagingBreakdown | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const b = raw as Record<string, unknown>;
  const breakdown: MessagesMessagingBreakdown = {
    sent: asFiniteNumber(b.sent),
    replies: asFiniteNumber(b.replies),
    conversations: asFiniteNumber(b.conversations),
    updates: asFiniteNumber(b.updates),
    drafts: asFiniteNumber(b.drafts),
    notes: asFiniteNumber(b.notes),
    deletions: asFiniteNumber(b.deletions),
  };
  const hasAny = Object.values(breakdown).some((n) => n > 0);
  return hasAny ? breakdown : undefined;
}

function parseMessagesTimeline(raw: unknown): MessagesTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is MessagesTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as MessagesTimelinePoint).date === 'string',
    )
    .map((item) => ({
      date: item.date,
      communication: asFiniteNumber(item.communication),
      messaging: asFiniteNumber(item.messaging),
    }));
  return points.length > 0 ? points : undefined;
}

function parseAlertAttentionTimeline(raw: unknown): AlertAttentionTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is AlertAttentionTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as AlertAttentionTimelinePoint).date === 'string',
    )
    .map((item) => ({
      date: item.date,
      alert: asFiniteNumber(item.alert),
      attention: asFiniteNumber(item.attention),
    }));
  return points.length > 0 ? points : undefined;
}

function parseAlertAttentionDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  return {
    kind: 'alert_attention',
    alerts: asFiniteNumber(raw.alerts),
    attentions: asFiniteNumber(raw.attentions),
    trend: parseTrend(raw.trend),
    timeline: parseAlertAttentionTimeline(raw.timeline),
  };
}

function parseCompanionTimeline(raw: unknown): CompanionTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is CompanionTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as CompanionTimelinePoint).date === 'string',
    )
    .map((item) => ({
      date: item.date,
      conversations: asFiniteNumber(item.conversations),
      interactions: asFiniteNumber(item.interactions),
      detected: asFiniteNumber(item.detected),
    }));
  return points.length > 0 ? points : undefined;
}

function parseCompanionDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  return {
    kind: 'companion',
    total: asFiniteNumber(raw.total),
    conversations: asFiniteNumber(raw.conversations),
    interactions: asFiniteNumber(raw.interactions),
    newCount: asFiniteNumber(raw.newCount),
    resumed: asFiniteNumber(raw.resumed),
    detected: asFiniteNumber(raw.detected),
    avgInteractions:
      typeof raw.avgInteractions === 'string' || typeof raw.avgInteractions === 'number'
        ? String(raw.avgInteractions)
        : '0',
    trend: parseTrend(raw.trend),
    topTopics: parseTopItems(raw.topTopics),
    timeline: parseCompanionTimeline(raw.timeline),
  };
}

function parseDailyCheckInTimeline(raw: unknown): DailyCheckInTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is DailyCheckInTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as DailyCheckInTimelinePoint).date === 'string',
    )
    .map((item) => ({
      date: item.date,
      completed: asFiniteNumber(item.completed),
      skipped: asFiniteNumber(item.skipped),
    }));
  return points.length > 0 ? points : undefined;
}

function parseDailyCheckInAnswerTrend(raw: unknown): DailyCheckInAnswerTrendPoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is DailyCheckInAnswerTrendPoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as DailyCheckInAnswerTrendPoint).date === 'string' &&
        typeof (item as DailyCheckInAnswerTrendPoint).label === 'string',
    )
    .map((item) => ({
      date: item.date,
      label: item.label,
      mood: typeof item.mood === 'number' && Number.isFinite(item.mood) ? item.mood : undefined,
      pain: typeof item.pain === 'number' && Number.isFinite(item.pain) ? item.pain : undefined,
      sleep: typeof item.sleep === 'number' && Number.isFinite(item.sleep) ? item.sleep : undefined,
      vitality:
        typeof item.vitality === 'number' && Number.isFinite(item.vitality)
          ? item.vitality
          : undefined,
    }));
  return points.length > 0 ? points : undefined;
}

function parseDailyCheckInDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  return {
    kind: 'daily_check_in',
    completed: asFiniteNumber(raw.completed),
    skipped: asFiniteNumber(raw.skipped),
    total: asFiniteNumber(raw.total),
    skipRate: asFiniteNumber(raw.skipRate),
    trend: parseTrend(raw.trend),
    timeline: parseDailyCheckInTimeline(raw.timeline),
    answerTrend: parseDailyCheckInAnswerTrend(raw.answerTrend),
  };
}

function parseDiaryDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  const latestAt =
    typeof raw.latestAt === 'number' && Number.isFinite(raw.latestAt) ? raw.latestAt : null;
  return {
    kind: 'diary',
    entryCount: asFiniteNumber(raw.entryCount),
    milestoneCount: asFiniteNumber(raw.milestoneCount),
    latestAt,
    trend: parseTrend(raw.trend),
  };
}

function parseSoulGalleryDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  const latestAt =
    typeof raw.latestAt === 'number' && Number.isFinite(raw.latestAt) ? raw.latestAt : null;
  return {
    kind: 'soul_gallery',
    albumCount: asFiniteNumber(raw.albumCount),
    photoCount: asFiniteNumber(raw.photoCount),
    videoCount: asFiniteNumber(raw.videoCount),
    unseenPhotoCount: asFiniteNumber(raw.unseenPhotoCount),
    reactionCount: asFiniteNumber(raw.reactionCount),
    latestAt,
    trend: parseTrend(raw.trend),
  };
}

function parseVisionTimeline(raw: unknown): VisionTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is VisionTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as VisionTimelinePoint).date === 'string' &&
        typeof (item as VisionTimelinePoint).label === 'string',
    )
    .map((item) => ({
      date: item.date,
      label: item.label,
      fieldIssues: asFiniteNumber(item.fieldIssues),
      focusIssues: asFiniteNumber(item.focusIssues),
      motorIssues: asFiniteNumber(item.motorIssues),
      severity: asFiniteNumber(item.severity),
      colorScore: asFiniteNumber(item.colorScore),
      contrastScore: asFiniteNumber(item.contrastScore),
    }));
  return points.length > 0 ? points : undefined;
}

function parseVisionFindings(raw: unknown): VisionFindingItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .filter(
      (item): item is VisionFindingItem =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as VisionFindingItem).label === 'string' &&
        typeof (item as VisionFindingItem).value === 'string',
    )
    .map((item) => ({
      label: item.label,
      value: item.value,
      status:
        item.status === 'normal' ||
        item.status === 'issue' ||
        item.status === 'skipped' ||
        item.status === 'neutral'
          ? item.status
          : 'neutral',
    }));
  return items.length > 0 ? items : undefined;
}

function parseVisionCategoryTrend(raw: unknown): VisionCategoryTrend {
  if (!raw || typeof raw !== 'object') return { current: 0, trend: 'stable' };
  const item = raw as Record<string, unknown>;
  return {
    current: asFiniteNumber(item.current),
    trend: parseTrend(item.trend),
  };
}

function parseVisionDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  const categoryTrendsRaw = raw.categoryTrends;
  const categoryTrends =
    categoryTrendsRaw && typeof categoryTrendsRaw === 'object'
      ? (categoryTrendsRaw as Record<string, unknown>)
      : {};
  return {
    kind: 'vision',
    count: asFiniteNumber(raw.count),
    average: asFiniteNumber(raw.average),
    trend: parseTrend(raw.trend),
    timeline: parseVisionTimeline(raw.timeline) ?? [],
    latestFindings: parseVisionFindings(raw.latestFindings) ?? [],
    categoryTrends: {
      focus: parseVisionCategoryTrend(categoryTrends.focus),
      field: parseVisionCategoryTrend(categoryTrends.field),
      motor: parseVisionCategoryTrend(categoryTrends.motor),
    },
  };
}

function parseDomainScoreTrend(raw: unknown): DomainScoreTrend {
  if (!raw || typeof raw !== 'object') return { current: 0, change: 0, trend: 'stable' };
  const item = raw as Record<string, unknown>;
  return {
    current: asFiniteNumber(item.current),
    change: asFiniteNumber(item.change),
    trend: parseTrend(item.trend),
  };
}

function parseNeurologicalTimeline(raw: unknown): NeurologicalTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is NeurologicalTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as NeurologicalTimelinePoint).date === 'string',
    )
    .map((item) => ({
      date: item.date,
      label: typeof item.label === 'string' ? item.label : item.date,
      overall: asFiniteNumber(item.overall),
      executive: asFiniteNumber(item.executive),
      language: asFiniteNumber(item.language),
      attention: asFiniteNumber(item.attention),
    }));
  return points.length > 0 ? points : undefined;
}

function parseNeurologicalLatestSnapshot(raw: unknown): NeurologicalLatestSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Record<string, unknown>;
  return {
    namingSuccess:
      item.namingSuccess === true || item.namingSuccess === false ? item.namingSuccess : null,
    comprehensionSuccess:
      item.comprehensionSuccess === true || item.comprehensionSuccess === false
        ? item.comprehensionSuccess
        : null,
    sequenceSuccess:
      item.sequenceSuccess === true || item.sequenceSuccess === false ? item.sequenceSuccess : null,
    fluencyCount: asFiniteNumber(item.fluencyCount),
    trailErrors: asFiniteNumber(item.trailErrors),
    trailLatency: asFiniteNumber(item.trailLatency),
  };
}

function parseNeurologicalDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  return {
    kind: 'neurological',
    count: asFiniteNumber(raw.count),
    average: asFiniteNumber(raw.average),
    trend: parseTrend(raw.trend),
    overall: parseDomainScoreTrend(raw.overall),
    executive: parseDomainScoreTrend(raw.executive),
    language: parseDomainScoreTrend(raw.language),
    attention: parseDomainScoreTrend(raw.attention),
    timeline: parseNeurologicalTimeline(raw.timeline) ?? [],
    latestSnapshot: parseNeurologicalLatestSnapshot(raw.latestSnapshot),
  };
}

function parsePsychologicalScoreTrend(raw: unknown): PsychologicalScoreTrend {
  if (!raw || typeof raw !== 'object') return { current: 0, change: 0, trend: 'stable' };
  const item = raw as Record<string, unknown>;
  return {
    current: asFiniteNumber(item.current),
    change: asFiniteNumber(item.change),
    trend: parseTrend(item.trend),
  };
}

function parsePsychologicalTimeline(raw: unknown): PsychologicalTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is PsychologicalTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as PsychologicalTimelinePoint).date === 'string',
    )
    .map((item) => ({
      date: item.date,
      label: typeof item.label === 'string' ? item.label : item.date,
      mood: asFiniteNumber(item.mood),
      anxiety: asFiniteNumber(item.anxiety),
      stress: asFiniteNumber(item.stress),
      sleep: asFiniteNumber(item.sleep),
      energy: asFiniteNumber(item.energy),
    }));
  return points.length > 0 ? points : undefined;
}

function parsePsychologicalDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  return {
    kind: 'psychological',
    count: asFiniteNumber(raw.count),
    trend: parseTrend(raw.trend),
    mood: parsePsychologicalScoreTrend(raw.mood),
    anxiety: parsePsychologicalScoreTrend(raw.anxiety),
    sleep: parsePsychologicalScoreTrend(raw.sleep),
    stress: parsePsychologicalScoreTrend(raw.stress),
    energy: parsePsychologicalScoreTrend(raw.energy),
    timeline: parsePsychologicalTimeline(raw.timeline) ?? [],
  };
}

function parseAssessmentCountDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  const average =
    typeof raw.average === 'number' && Number.isFinite(raw.average) ? raw.average : undefined;
  return {
    kind: 'assessment_count',
    count: asFiniteNumber(raw.count),
    ...(average !== undefined ? { average } : {}),
    trend: parseTrend(raw.trend),
  };
}

function parseVitalityGameTimeline(raw: unknown): VitalityGameTimelinePoint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const points = raw
    .filter(
      (item): item is VitalityGameTimelinePoint =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as VitalityGameTimelinePoint).date === 'string' &&
        typeof (item as VitalityGameTimelinePoint).label === 'string',
    )
    .map((item) => ({
      date: item.date,
      label: item.label,
      games: asFiniteNumber(item.games),
      accuracy: asFiniteNumber(item.accuracy),
    }));
  return points.length > 0 ? points : undefined;
}

function parseVitalityGameDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  const totalTimeLabel =
    typeof raw.totalTimeLabel === 'string' ? raw.totalTimeLabel : '0M 0S';
  return {
    kind: 'vitality_game',
    gamesPlayed: asFiniteNumber(raw.gamesPlayed),
    avgAccuracy: asFiniteNumber(raw.avgAccuracy),
    totalTimeSeconds: asFiniteNumber(raw.totalTimeSeconds),
    totalTimeLabel,
    trend: parseTrend(raw.trend),
    level: typeof raw.level === 'string' ? raw.level : 'N/A',
    timeline: parseVitalityGameTimeline(raw.timeline),
  };
}

function parseMessagesDetail(raw: Record<string, unknown>): AnalyticsMetricDetail {
  return {
    kind: 'messages',
    communication: asFiniteNumber(raw.communication),
    messaging: asFiniteNumber(raw.messaging),
    trend: parseTrend(raw.trend),
    topItems: parseTopItems(raw.topItems),
    messagingBreakdown: parseMessagingBreakdown(raw.messagingBreakdown),
    timeline: parseMessagesTimeline(raw.timeline),
  };
}

export function parseAnalyticsMetricDetail(raw: unknown): AnalyticsMetricDetail | undefined {
  if (!raw || typeof raw !== 'object' || !('kind' in raw)) return undefined;
  const d = raw as Record<string, unknown>;
  if (typeof d.kind !== 'string') return undefined;

  switch (d.kind) {
    case 'alert_attention':
      return parseAlertAttentionDetail(d);
    case 'companion':
      return parseCompanionDetail(d);
    case 'daily_check_in':
      return parseDailyCheckInDetail(d);
    case 'messages':
      return parseMessagesDetail(d);
    case 'assessment_count':
      return parseAssessmentCountDetail(d);
    case 'vision':
      return parseVisionDetail(d);
    case 'neurological':
      return parseNeurologicalDetail(d);
    case 'psychological':
      return parsePsychologicalDetail(d);
    case 'diary':
      return parseDiaryDetail(d);
    case 'soul_gallery':
      return parseSoulGalleryDetail(d);
    case 'vitality_game':
      return parseVitalityGameDetail(d);
    default:
      return d as AnalyticsMetricDetail;
  }
}
