import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  canViewPatientProfileTab,
  type CircleMemberRole,
  type PatientCapabilities,
} from './patientPermissions';
import { canReadAnalyticsAudience } from './analyticsSummaries';
import { canViewRemoteSettingsTab } from './remoteSettings';

/** Dashboard widgets members can show or hide (not the mandatory attention / live blocks). */
export type CircleDashboardWidgetKey =
  | 'alert-attention'
  | 'daily-check-in'
  | 'messages'
  | 'communication'
  | 'companion'
  | 'vitality'
  | 'assessments'
  | 'assessments-compact'
  | 'last-7-days-overview'
  | 'last-30-days-overview'
  | 'diary'
  | 'circle'
  | 'circle-map'
  | 'circle-compact'
  | 'check-in-wellness-ring'
  | 'assessment-schedule-calendar'
  | 'gallery-engagement'
  | 'media-gallery'
  | 'remote-settings'
  | 'user-profile'
  | 'patient-locale'
  | 'patient-insights'
  | 'reminder-gallery-upload'
  | 'reminder-diary-entry';

export type CircleDashboardLayoutSection =
  | 'patientOverview'
  | 'reminders'
  | 'last7days'
  | 'you'
  | 'patientApp'
  | 'stayConnected';

export type CircleDashboardLayoutPreset = 'compact' | 'detailed';
export type CircleDashboardStoredPreset = CircleDashboardLayoutPreset | 'custom';

export type CircleDashboardLayout = {
  hiddenWidgets: CircleDashboardWidgetKey[];
  preset?: CircleDashboardStoredPreset;
};

export const ALL_CUSTOMIZABLE_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'alert-attention',
  'daily-check-in',
  'messages',
  'communication',
  'companion',
  'vitality',
  'assessments',
  'assessments-compact',
  'last-7-days-overview',
  'last-30-days-overview',
  'diary',
  'circle',
  'circle-map',
  'circle-compact',
  'check-in-wellness-ring',
  'assessment-schedule-calendar',
  'gallery-engagement',
  'media-gallery',
  'remote-settings',
  'user-profile',
  'patient-locale',
  'patient-insights',
  'reminder-gallery-upload',
  'reminder-diary-entry',
];

/** Widgets friends must never see, even if a saved layout marks them visible. */
export const FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'assessment-schedule-calendar',
  'assessments',
  'assessments-compact',
];

type DashboardPresetRoleGroup = 'proxy' | 'caregiver' | 'family' | 'friend';

function dashboardPresetRoleGroup(role: CircleMemberRole): DashboardPresetRoleGroup {
  if (role === 'proxy' || role === 'family' || role === 'friend') return role;
  return 'caregiver';
}

/** Compact Home starting tiles (Aug 2026 role screenshots). */
const COMPACT_VISIBLE_BY_ROLE: Record<DashboardPresetRoleGroup, CircleDashboardWidgetKey[]> = {
  proxy: [
    'patient-locale',
    'circle-compact',
    'last-7-days-overview',
    'alert-attention',
    'daily-check-in',
    'assessments',
    'remote-settings',
    'user-profile',
  ],
  caregiver: [
    'patient-locale',
    'circle-compact',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'last-7-days-overview',
    'alert-attention',
    'daily-check-in',
    'assessments',
    'user-profile',
  ],
  family: [
    'patient-locale',
    'patient-insights',
    'circle-compact',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'last-7-days-overview',
    'alert-attention',
    'daily-check-in',
    'diary',
    'gallery-engagement',
    'media-gallery',
  ],
  friend: [
    'patient-locale',
    'patient-insights',
    'circle-compact',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'daily-check-in',
    'media-gallery',
  ],
};

/** Detailed Home starting tiles: map / Check-In pulse / Last 30 instead of compact counterparts. */
const DETAILED_VISIBLE_BY_ROLE: Record<DashboardPresetRoleGroup, CircleDashboardWidgetKey[]> = {
  proxy: [
    'patient-locale',
    'circle-map',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'last-7-days-overview',
    'alert-attention',
    'check-in-wellness-ring',
    'messages',
    'communication',
    'companion',
    'vitality',
    'assessments',
    'remote-settings',
    'user-profile',
  ],
  caregiver: [
    'patient-locale',
    'circle-compact',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'last-7-days-overview',
    'alert-attention',
    'check-in-wellness-ring',
    'messages',
    'communication',
    'companion',
    'vitality',
    'assessments',
    'user-profile',
  ],
  family: [
    'patient-locale',
    'patient-insights',
    'circle-map',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'last-7-days-overview',
    'alert-attention',
    'check-in-wellness-ring',
    'vitality',
    'diary',
    'gallery-engagement',
    'media-gallery',
  ],
  friend: [
    'patient-locale',
    'patient-insights',
    'circle-map',
    'reminder-gallery-upload',
    'reminder-diary-entry',
    'check-in-wellness-ring',
    'diary',
    'gallery-engagement',
    'media-gallery',
  ],
};

function hiddenWidgetsFromVisible(
  visible: readonly CircleDashboardWidgetKey[],
  role: CircleMemberRole,
): CircleDashboardWidgetKey[] {
  const vis = new Set(visible);
  if (role === 'friend') {
    for (const key of FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS) vis.delete(key);
  }
  return ALL_CUSTOMIZABLE_DASHBOARD_WIDGETS.filter((key) => !vis.has(key));
}

function hiddenWidgetSetEquals(
  left: readonly CircleDashboardWidgetKey[],
  right: readonly CircleDashboardWidgetKey[],
): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((key) => rightSet.has(key));
}

export function hiddenDashboardWidgetsForRolePreset(
  role: CircleMemberRole,
  preset: CircleDashboardLayoutPreset,
): CircleDashboardWidgetKey[] {
  const group = dashboardPresetRoleGroup(role);
  const visible =
    preset === 'detailed' ? DETAILED_VISIBLE_BY_ROLE[group] : COMPACT_VISIBLE_BY_ROLE[group];
  return hiddenWidgetsFromVisible(visible, role);
}

export function resolveCircleDashboardLayoutPreset(
  hiddenWidgets: readonly CircleDashboardWidgetKey[],
  role: CircleMemberRole,
): CircleDashboardStoredPreset {
  if (hiddenWidgetSetEquals(hiddenWidgets, hiddenDashboardWidgetsForRolePreset(role, 'compact'))) {
    return 'compact';
  }
  if (hiddenWidgetSetEquals(hiddenWidgets, hiddenDashboardWidgetsForRolePreset(role, 'detailed'))) {
    return 'detailed';
  }
  return 'custom';
}

/** @deprecated Use hiddenDashboardWidgetsForRolePreset(role, 'compact'). */
export const PROXY_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] =
  hiddenDashboardWidgetsForRolePreset('proxy', 'compact');
export const FAMILY_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] =
  hiddenDashboardWidgetsForRolePreset('family', 'compact');
export const FRIEND_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] =
  hiddenDashboardWidgetsForRolePreset('friend', 'compact');
export const CAREGIVER_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] =
  hiddenDashboardWidgetsForRolePreset('caregiver', 'compact');

/** Tiles that cannot both be on in Customize. If both would be visible, the second is hidden. */
export const DASHBOARD_EXCLUSIVE_WIDGET_PAIRS: ReadonlyArray<
  readonly [CircleDashboardWidgetKey, CircleDashboardWidgetKey]
> = [
  ['circle-map', 'circle-compact'],
  ['daily-check-in', 'check-in-wellness-ring'],
  ['assessments', 'assessments-compact'],
  ['last-7-days-overview', 'last-30-days-overview'],
];

export function exclusivePartnerForDashboardWidget(
  key: CircleDashboardWidgetKey,
): CircleDashboardWidgetKey | undefined {
  for (const [left, right] of DASHBOARD_EXCLUSIVE_WIDGET_PAIRS) {
    if (key === left) return right;
    if (key === right) return left;
  }
  return undefined;
}

export const CIRCLE_DASHBOARD_WIDGET_SECTIONS: Record<
  CircleDashboardLayoutSection,
  CircleDashboardWidgetKey[]
> = {
  patientOverview: ['patient-locale', 'patient-insights', 'circle-map', 'circle-compact'],
  reminders: ['reminder-gallery-upload', 'reminder-diary-entry'],
  last7days: [
    'alert-attention',
    'daily-check-in',
    'check-in-wellness-ring',
    'last-7-days-overview',
    'last-30-days-overview',
    'messages',
    'communication',
    'companion',
    'vitality',
    'assessments',
    'assessments-compact',
  ],
  you: ['diary', 'circle', 'gallery-engagement'],
  patientApp: ['remote-settings', 'user-profile'],
  stayConnected: ['media-gallery'],
};

const WIDGET_KEY_SET = new Set<string>(ALL_CUSTOMIZABLE_DASHBOARD_WIDGETS);

export function isCircleDashboardWidgetKey(value: string): value is CircleDashboardWidgetKey {
  return WIDGET_KEY_SET.has(value);
}

export function sanitizeHiddenDashboardWidgets(
  raw: unknown,
): CircleDashboardWidgetKey[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<CircleDashboardWidgetKey>();
  const next: CircleDashboardWidgetKey[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !isCircleDashboardWidgetKey(item) || seen.has(item)) continue;
    seen.add(item);
    next.push(item);
  }
  return next;
}

/** Role defaults when the member has not saved a layout yet (Compact). */
export function defaultHiddenDashboardWidgetsForRole(
  role: CircleMemberRole,
): CircleDashboardWidgetKey[] {
  return hiddenDashboardWidgetsForRolePreset(role, 'compact');
}

function sanitizeStoredDashboardPreset(raw: unknown): CircleDashboardStoredPreset | undefined {
  if (raw === 'compact' || raw === 'detailed' || raw === 'custom') return raw;
  return undefined;
}

export function parseMemberDashboardLayout(
  data: Record<string, unknown> | undefined,
): { layout: CircleDashboardLayout | null; hasStoredLayout: boolean } {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'dashboardLayout')) {
    return { layout: null, hasStoredLayout: false };
  }

  const raw = data.dashboardLayout;
  if (!raw || typeof raw !== 'object') {
    return { layout: { hiddenWidgets: [] }, hasStoredLayout: true };
  }

  return {
    layout: {
      hiddenWidgets: sanitizeHiddenDashboardWidgets(
        (raw as Record<string, unknown>).hiddenWidgets,
      ),
      preset: sanitizeStoredDashboardPreset((raw as Record<string, unknown>).preset),
    },
    hasStoredLayout: true,
  };
}

/** Hide the second widget when both of an exclusive pair would otherwise be visible. */
export function applyExclusiveDashboardWidgetPairs(
  hiddenWidgets: readonly CircleDashboardWidgetKey[],
): CircleDashboardWidgetKey[] {
  const next = new Set(hiddenWidgets);
  for (const [left, right] of DASHBOARD_EXCLUSIVE_WIDGET_PAIRS) {
    if (!next.has(left) && !next.has(right)) next.add(right);
  }
  return [...next];
}

export function resolveEffectiveHiddenDashboardWidgets(
  parsed: { layout: CircleDashboardLayout | null; hasStoredLayout: boolean },
  role: CircleMemberRole,
): CircleDashboardWidgetKey[] {
  const hidden =
    parsed.hasStoredLayout && parsed.layout
      ? parsed.layout.hiddenWidgets
      : defaultHiddenDashboardWidgetsForRole(role);
  return applyExclusiveDashboardWidgetPairs(hidden);
}

/** Legacy field on members/{uid}; prefer prefs/dashboard for reads/writes. */
export function memberDashboardLayoutLegacyRef(
  db: Firestore,
  patientId: string,
  memberUid: string,
) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

/**
 * Per-member dashboard customize prefs.
 * Kept off the member root doc so layout saves are not blocked by crowded member update rules.
 */
export function memberDashboardLayoutRef(
  db: Firestore,
  patientId: string,
  memberUid: string,
) {
  return doc(db, 'patients', patientId, 'members', memberUid, 'prefs', 'dashboard');
}

export function parsePrefsDashboardLayout(
  data: Record<string, unknown> | undefined,
): { layout: CircleDashboardLayout | null; hasStoredLayout: boolean } {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'hiddenWidgets')) {
    return { layout: null, hasStoredLayout: false };
  }
  const hiddenWidgets = sanitizeHiddenDashboardWidgets(data.hiddenWidgets);
  return {
    layout: {
      hiddenWidgets,
      preset:
        sanitizeStoredDashboardPreset(data.preset) ??
        undefined,
    },
    hasStoredLayout: true,
  };
}

export async function readMemberDashboardLayout(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<{ layout: CircleDashboardLayout | null; hasStoredLayout: boolean }> {
  const prefsSnap = await getDoc(memberDashboardLayoutRef(db, patientId, memberUid));
  if (prefsSnap.exists()) {
    return parsePrefsDashboardLayout(prefsSnap.data() as Record<string, unknown>);
  }

  const legacySnap = await getDoc(
    memberDashboardLayoutLegacyRef(db, patientId, memberUid),
  );
  if (!legacySnap.exists()) return { layout: null, hasStoredLayout: false };
  return parseMemberDashboardLayout(legacySnap.data() as Record<string, unknown>);
}

export async function writeMemberDashboardLayout(
  db: Firestore,
  patientId: string,
  memberUid: string,
  hiddenWidgets: CircleDashboardWidgetKey[],
  preset?: CircleDashboardStoredPreset,
): Promise<CircleDashboardLayout> {
  const layout: CircleDashboardLayout = {
    hiddenWidgets: sanitizeHiddenDashboardWidgets(hiddenWidgets),
    preset,
  };

  // Dedicated prefs doc — create/merge is allowed for the signed-in member only.
  await setDoc(
    memberDashboardLayoutRef(db, patientId, memberUid),
    {
      hiddenWidgets: layout.hiddenWidgets,
      ...(preset ? { preset } : {}),
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return layout;
}

export function isCircleDashboardWidgetAvailable(
  key: CircleDashboardWidgetKey,
  capabilities: PatientCapabilities | undefined,
  role?: CircleMemberRole,
): boolean {
  if (role === 'friend' && FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS.includes(key)) {
    return false;
  }
  const caps = capabilities;
  switch (key) {
    case 'alert-attention':
    case 'daily-check-in':
    case 'messages':
    case 'communication':
    case 'companion':
    case 'vitality':
    case 'last-7-days-overview':
    case 'last-30-days-overview':
    case 'diary':
      return caps?.viewEngagementTrends !== false;
    case 'assessments':
    case 'assessments-compact':
      return !!role && !!caps && canReadAnalyticsAudience('care', role, caps);
    case 'circle':
      return true;
    case 'circle-map':
    case 'circle-compact':
    case 'check-in-wellness-ring':
    case 'assessment-schedule-calendar':
      return true;
    case 'gallery-engagement':
      return caps?.viewCircleMedia !== false || caps?.richMediaUpload !== false;
    case 'media-gallery':
      return caps?.viewCircleMedia !== false || caps?.richMediaUpload !== false;
    case 'remote-settings':
      return canViewRemoteSettingsTab(caps);
    case 'user-profile':
      return canViewPatientProfileTab(caps);
    case 'patient-locale':
    case 'patient-insights':
      return true;
    case 'reminder-gallery-upload':
      return caps?.richMediaUpload === true;
    case 'reminder-diary-entry':
      return true;
    default:
      return false;
  }
}

export function isCircleDashboardWidgetVisible(
  key: CircleDashboardWidgetKey,
  hiddenWidgets: ReadonlySet<CircleDashboardWidgetKey>,
): boolean {
  return !hiddenWidgets.has(key);
}

export function isCircleDashboardWidgetVisibleForRole(
  key: CircleDashboardWidgetKey,
  hiddenWidgets: ReadonlySet<CircleDashboardWidgetKey>,
  role: CircleMemberRole,
): boolean {
  if (role === 'friend' && FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS.includes(key)) {
    return false;
  }
  return isCircleDashboardWidgetVisible(key, hiddenWidgets);
}
