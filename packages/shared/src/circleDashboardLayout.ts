import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { CircleMemberRole, PatientCapabilities } from './patientPermissions';
import { canViewRemoteSettingsTab } from './remoteSettings';

/** Dashboard widgets members can show or hide (not the mandatory attention / live blocks). */
export type CircleDashboardWidgetKey =
  | 'alert-attention'
  | 'daily-check-in'
  | 'messages'
  | 'communication'
  | 'vitality'
  | 'assessments'
  | 'diary'
  | 'circle'
  | 'circle-map'
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
  | 'stayConnected'
  | 'patientApp';

export type CircleDashboardLayout = {
  hiddenWidgets: CircleDashboardWidgetKey[];
};

export const ALL_CUSTOMIZABLE_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'alert-attention',
  'daily-check-in',
  'messages',
  'communication',
  'vitality',
  'assessments',
  'diary',
  'circle',
  'circle-map',
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

/**
 * Optional tiles hidden for proxy until they opt in via Customize dashboard.
 * Sourced from Dermo Patient Test-proxy-01 saved layout (Aug 2026).
 * Visible by default: locale, last-7-day clinical tiles, remote settings, user profile.
 */
export const PROXY_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'patient-insights',
  'reminder-gallery-upload',
  'reminder-diary-entry',
  'diary',
  'circle',
  'gallery-engagement',
  'media-gallery',
  'circle-map',
  'check-in-wellness-ring',
];

/**
 * Optional tiles hidden for family until they opt in via Customize dashboard.
 * Matches Dermo Patient Test-family-01 saved layout (Aug 2026).
 */
export const FAMILY_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'vitality',
  'assessments',
  'assessment-schedule-calendar',
  'gallery-engagement',
  'user-profile',
];

/** Widgets friends must never see, even if a saved layout marks them visible. */
export const FRIEND_NEVER_VISIBLE_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'assessment-schedule-calendar',
];

/**
 * Optional tiles hidden for friends until they opt in (locale + insights + gallery + reminders stay on).
 * Matches Dermo Patient Test-friend-01 saved layout (Aug 2026).
 */
export const FRIEND_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [
  'alert-attention',
  'daily-check-in',
  'messages',
  'communication',
  'vitality',
  'assessments',
  'diary',
  'circle',
  'circle-map',
  'check-in-wellness-ring',
  'assessment-schedule-calendar',
  'gallery-engagement',
  'remote-settings',
  'user-profile',
];

/**
 * Caregiver / facility_staff / professional_caregiver: show all customizable tiles by default.
 * Matches Dermo Patient Test-care-01 saved layout (empty hiddenWidgets).
 */
export const CAREGIVER_ROLE_HIDDEN_DASHBOARD_WIDGETS: CircleDashboardWidgetKey[] = [];

export const CIRCLE_DASHBOARD_WIDGET_SECTIONS: Record<
  CircleDashboardLayoutSection,
  CircleDashboardWidgetKey[]
> = {
  patientOverview: ['patient-locale', 'patient-insights'],
  reminders: ['reminder-gallery-upload', 'reminder-diary-entry'],
  last7days: [
    'alert-attention',
    'daily-check-in',
    'messages',
    'communication',
    'vitality',
    'assessments',
  ],
  you: ['diary', 'circle', 'gallery-engagement'],
  stayConnected: ['media-gallery', 'circle-map', 'check-in-wellness-ring'],
  patientApp: ['remote-settings', 'user-profile'],
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

/** Role defaults when the member has not saved a layout yet. */
export function defaultHiddenDashboardWidgetsForRole(
  role: CircleMemberRole,
): CircleDashboardWidgetKey[] {
  if (role === 'friend') return [...FRIEND_ROLE_HIDDEN_DASHBOARD_WIDGETS];
  if (role === 'family') return [...FAMILY_ROLE_HIDDEN_DASHBOARD_WIDGETS];
  if (role === 'proxy') return [...PROXY_ROLE_HIDDEN_DASHBOARD_WIDGETS];
  return [...CAREGIVER_ROLE_HIDDEN_DASHBOARD_WIDGETS];
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
    },
    hasStoredLayout: true,
  };
}

export function resolveEffectiveHiddenDashboardWidgets(
  parsed: { layout: CircleDashboardLayout | null; hasStoredLayout: boolean },
  role: CircleMemberRole,
): CircleDashboardWidgetKey[] {
  if (parsed.hasStoredLayout && parsed.layout) {
    return parsed.layout.hiddenWidgets;
  }
  return defaultHiddenDashboardWidgetsForRole(role);
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
  return {
    layout: {
      hiddenWidgets: sanitizeHiddenDashboardWidgets(data.hiddenWidgets),
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
): Promise<CircleDashboardLayout> {
  const layout: CircleDashboardLayout = {
    hiddenWidgets: sanitizeHiddenDashboardWidgets(hiddenWidgets),
  };

  // Dedicated prefs doc — create/merge is allowed for the signed-in member only.
  await setDoc(
    memberDashboardLayoutRef(db, patientId, memberUid),
    {
      hiddenWidgets: layout.hiddenWidgets,
      updatedAt: Date.now(),
    },
    { merge: true },
  );

  return layout;
}

export function isCircleDashboardWidgetAvailable(
  key: CircleDashboardWidgetKey,
  capabilities: PatientCapabilities | undefined,
): boolean {
  const caps = capabilities;
  switch (key) {
    case 'alert-attention':
    case 'daily-check-in':
    case 'messages':
    case 'communication':
    case 'vitality':
    case 'assessments':
    case 'diary':
      return caps?.viewEngagementTrends !== false;
    case 'circle':
      return true;
    case 'circle-map':
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
      return true;
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
