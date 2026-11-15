import fs from 'node:fs';

const canvasPath =
  'C:/Users/ThomasRunds(MXF)/.cursor/projects/c-Users-ThomasRunds-MXF-Desktop-medxforce/canvases/care-transition-readiness.canvas.tsx';
const outPath =
  'C:/Users/ThomasRunds(MXF)/Desktop/medxforce-circle/packages/shared/src/careTransitionReadiness.ts';

const s = fs.readFileSync(canvasPath, 'utf8');
const start = s.indexOf('const PACKS: TransitionPack[] = ');
const end = s.indexOf('\nconst REGION_LABEL');
if (start < 0 || end < 0) throw new Error('PACKS block not found');

const packs = s
  .slice(start, end)
  .replace('const PACKS: TransitionPack[] = ', 'export const CARE_TRANSITION_PACKS: CareTransitionPack[] = ');

const header = `/** Care transition readiness — shared Circle pack templates + progress helpers. */
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import type { CircleMemberRole } from './patientPermissions';
import type { TreatmentPhaseValue } from './treatmentPhase';
import { normalizeTreatmentPhaseForSchedule } from './treatmentPhase';

export type CareTransitionRegion = 'us' | 'de' | 'generic';
export type CareTransitionPackId =
  | 'crisis-icu'
  | 'icu-to-ward'
  | 'ward-to-acute'
  | 'acute-to-rehab'
  | 'rehab-to-home'
  | 'home-settle';

export type CareTransitionKnowCourse = {
  id: string;
  title: string;
  duration: string;
  audience: string;
  href: string;
};

export type CareTransitionChecklistItem = {
  id: string;
  title: string;
  why: string;
  when: string;
  roles: Array<'proxy' | 'caregiver' | 'family'>;
  regions: CareTransitionRegion[] | 'all';
  custom?: boolean;
  knowCourseIds?: string[];
};

export type CareTransitionCustomTask = {
  id: string;
  title: string;
  why: string;
  when: string;
};

export type CareTransitionPack = {
  id: CareTransitionPackId;
  title: string;
  subtitle: string;
  kind: 'crisis' | 'transition' | 'settle';
  fromLabel: string;
  toLabel: string;
  mxPhase: string;
  audience: string;
  items: CareTransitionChecklistItem[];
  suggestedKnow: CareTransitionKnowCourse[];
};

`;

const footer = `
export type CareTransitionReadinessState = {
  activePackId: CareTransitionPackId | null;
  region: CareTransitionRegion;
  doneIds: string[];
  dismissedIds: string[];
  customTasks: CareTransitionCustomTask[];
  attachedKnow: CareTransitionKnowCourse[];
  updatedAt: number;
  updatedByUid?: string;
};

export const EMPTY_CARE_TRANSITION_STATE: CareTransitionReadinessState = {
  activePackId: null,
  region: 'generic',
  doneIds: [],
  dismissedIds: [],
  customTasks: [],
  attachedKnow: [],
  updatedAt: 0,
};

export function getCareTransitionPack(id: CareTransitionPackId | null | undefined): CareTransitionPack | null {
  if (!id) return null;
  return CARE_TRANSITION_PACKS.find((p) => p.id === id) ?? null;
}

export function canManageCareTransitionPack(role: CircleMemberRole): boolean {
  return role === 'proxy' || role === 'caregiver' || role === 'professional_caregiver';
}

export function suggestedPackForTreatmentPhase(
  phase: string | null | undefined,
): CareTransitionPackId | null {
  const normalized = normalizeTreatmentPhaseForSchedule(phase);
  if (!normalized) return null;
  switch (normalized as TreatmentPhaseValue) {
    case 'icu':
      return 'crisis-icu';
    case 'acute':
      return 'ward-to-acute';
    case 'rehab':
      return 'acute-to-rehab';
    case 'maintenance':
      return 'rehab-to-home';
    case 'palliative':
      return 'home-settle';
    default:
      return null;
  }
}

export function suggestedPackForPhaseTransition(
  fromPhase: string | null | undefined,
  toPhase: string | null | undefined,
): CareTransitionPackId | null {
  const from = normalizeTreatmentPhaseForSchedule(fromPhase);
  const to = normalizeTreatmentPhaseForSchedule(toPhase);
  if (!to) return null;
  if (to === 'icu') return 'crisis-icu';
  if (from === 'icu' && to === 'acute') return 'icu-to-ward';
  if (to === 'acute') return 'ward-to-acute';
  if (to === 'rehab') return 'acute-to-rehab';
  if (to === 'maintenance') return from === 'rehab' ? 'rehab-to-home' : 'home-settle';
  if (to === 'palliative') return 'home-settle';
  return suggestedPackForTreatmentPhase(to);
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 200);
}

function parseCustomTasks(raw: unknown): CareTransitionCustomTask[] {
  if (!Array.isArray(raw)) return [];
  const out: CareTransitionCustomTask[] = [];
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    if (!id || !title) continue;
    out.push({
      id: id.slice(0, 80),
      title: title.slice(0, 200),
      why: typeof row.why === 'string' ? row.why.slice(0, 500) : '',
      when: typeof row.when === 'string' ? row.when.slice(0, 80) : 'Custom',
    });
  }
  return out;
}

function parseKnowCourses(raw: unknown): CareTransitionKnowCourse[] {
  if (!Array.isArray(raw)) return [];
  const out: CareTransitionKnowCourse[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const href = typeof row.href === 'string' ? row.href.trim() : '';
    if (!id || !title || !href) continue;
    out.push({
      id: id.slice(0, 80),
      title: title.slice(0, 200),
      duration: typeof row.duration === 'string' ? row.duration.slice(0, 40) : 'Link',
      audience: typeof row.audience === 'string' ? row.audience.slice(0, 80) : 'Circle',
      href: href.slice(0, 500),
    });
  }
  return out;
}

export function parseCareTransitionReadinessState(
  data: Record<string, unknown> | undefined,
): CareTransitionReadinessState {
  if (!data) return { ...EMPTY_CARE_TRANSITION_STATE };
  const packId = typeof data.activePackId === 'string' ? data.activePackId : null;
  const activePackId =
    packId && CARE_TRANSITION_PACKS.some((p) => p.id === packId)
      ? (packId as CareTransitionPackId)
      : null;
  const regionRaw = typeof data.region === 'string' ? data.region : 'generic';
  const region: CareTransitionRegion =
    regionRaw === 'us' || regionRaw === 'de' || regionRaw === 'generic' ? regionRaw : 'generic';
  return {
    activePackId,
    region,
    doneIds: asStringArray(data.doneIds).slice(0, 80),
    dismissedIds: asStringArray(data.dismissedIds).slice(0, 80),
    customTasks: parseCustomTasks(data.customTasks),
    attachedKnow: parseKnowCourses(data.attachedKnow),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    updatedByUid: typeof data.updatedByUid === 'string' ? data.updatedByUid : undefined,
  };
}

export function careTransitionReadinessRef(db: Firestore, patientId: string) {
  return doc(db, 'patients', patientId, 'care_transition_readiness', 'state');
}

export async function readCareTransitionReadinessState(
  db: Firestore,
  patientId: string,
): Promise<CareTransitionReadinessState> {
  const snap = await getDoc(careTransitionReadinessRef(db, patientId));
  if (!snap.exists()) return { ...EMPTY_CARE_TRANSITION_STATE };
  return parseCareTransitionReadinessState(snap.data() as Record<string, unknown>);
}

export async function writeCareTransitionReadinessState(
  db: Firestore,
  patientId: string,
  state: CareTransitionReadinessState,
  updatedByUid?: string,
): Promise<CareTransitionReadinessState> {
  const next: CareTransitionReadinessState = {
    ...state,
    updatedAt: Date.now(),
    updatedByUid,
  };
  await setDoc(careTransitionReadinessRef(db, patientId), next, { merge: true });
  return next;
}

export function filterChecklistForViewer(
  pack: CareTransitionPack,
  region: CareTransitionRegion,
  role: CircleMemberRole,
  customTasks: CareTransitionCustomTask[],
  dismissedIds: ReadonlySet<string>,
): CareTransitionChecklistItem[] {
  const viewerRole: 'proxy' | 'caregiver' | 'family' =
    role === 'proxy' ? 'proxy' : role === 'family' || role === 'friend' ? 'family' : 'caregiver';

  const template = pack.items.filter((item) => {
    if (!item.roles.includes(viewerRole)) return false;
    if (item.regions === 'all') return true;
    if (region === 'generic') return false;
    return item.regions.includes(region);
  });

  const custom: CareTransitionChecklistItem[] = customTasks.map((task) => ({
    id: task.id,
    title: task.title,
    why: task.why || 'Added by your circle for this patient.',
    when: task.when || 'Custom',
    roles: ['proxy', 'caregiver', 'family'],
    regions: 'all',
    custom: true,
  }));

  return [...template, ...custom].filter((item) => !dismissedIds.has(item.id));
}

export function careTransitionProgress(
  items: CareTransitionChecklistItem[],
  doneIds: ReadonlySet<string>,
): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => doneIds.has(i.id)).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
`;

fs.writeFileSync(outPath, header + packs + footer);
console.log('wrote', outPath, fs.statSync(outPath).size);
