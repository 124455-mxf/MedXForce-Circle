import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  careDiaryMilestoneSourceRef,
  normalizeAppModeForMilestone,
  normalizeTreatmentPhaseForMilestone,
  resolveCareDiaryMilestoneCopy,
  shouldRecordCareDiaryMilestone,
} from './diaryCareMilestones';
import type { DiaryEntryTranslation } from './diaryTranslationDisplay';

export type { DiaryEntryTranslation } from './diaryTranslationDisplay';
export { resolveDiaryEntryText } from './diaryTranslationDisplay';

/** Who can see the entry — private stays with the author (and patient); circle is visible to all members. */
export type DiaryEntryVisibility = 'private' | 'circle' | 'shared_with_patient';

export type DiaryEntryMood =
  | 'grateful'
  | 'hopeful'
  | 'worried'
  | 'overwhelmed'
  | 'peaceful'
  | 'sad'
  | 'joyful'
  | 'reflective'
  | 'celebratory';

export interface CircleDiaryEntry {
  id: string;
  patientId: string;
  authorUid: string;
  authorName: string;
  title?: string;
  body: string;
  mood?: DiaryEntryMood;
  /** When the moment happened (may differ from createdAt). */
  experienceAt: number;
  visibility: DiaryEntryVisibility;
  entryKind: 'human' | 'system';
  isMilestone: boolean;
  sourceRef?: string | null;
  /** Detected language of the original title/body. */
  sourceLanguage?: string;
  /** Auto-translations for other viewer languages (patient / circle members). */
  translations?: DiaryEntryTranslation[];
  createdAt: number;
  updatedAt: number;
}

export type CircleDiaryEntryDraft = {
  title: string;
  body: string;
  mood: DiaryEntryMood | '';
  experienceAt: number;
  visibility: DiaryEntryVisibility;
  isMilestone: boolean;
};

export const DIARY_MOOD_OPTIONS: {
  value: DiaryEntryMood;
  label: string;
}[] = [
  { value: 'grateful', label: 'Grateful' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'joyful', label: 'Joyful' },
  { value: 'celebratory', label: 'Celebratory' },
  { value: 'peaceful', label: 'Peaceful' },
  { value: 'reflective', label: 'Reflective' },
  { value: 'worried', label: 'Worried' },
  { value: 'sad', label: 'Sad' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
];

const DIARY_MOOD_VALUES = new Set<string>(DIARY_MOOD_OPTIONS.map((o) => o.value));

export function diaryEntriesCollection(db: Firestore, patientId: string) {
  return collection(db, 'patients', patientId, 'diary_entries');
}

function parseDiaryVisibility(value: unknown): DiaryEntryVisibility {
  const v = String(value || 'private');
  if (v === 'circle' || v === 'shared_with_patient') return v;
  return 'private';
}

export function parseDiaryEntry(id: string, data: Record<string, unknown>): CircleDiaryEntry {
  const moodRaw = String(data.mood || '');
  const mood = DIARY_MOOD_VALUES.has(moodRaw) ? (moodRaw as DiaryEntryMood) : undefined;
  const translations = parseDiaryTranslations(data.translations);
  const sourceLanguage = data.sourceLanguage
    ? String(data.sourceLanguage).trim()
    : undefined;
  return {
    id,
    patientId: String(data.patientId || ''),
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Someone'),
    title: data.title ? String(data.title) : undefined,
    body: String(data.body || ''),
    mood,
    experienceAt: Number(data.experienceAt || data.createdAt || 0),
    visibility: parseDiaryVisibility(data.visibility),
    entryKind: data.entryKind === 'system' ? 'system' : 'human',
    isMilestone: !!data.isMilestone,
    sourceRef: data.sourceRef ? String(data.sourceRef) : null,
    ...(sourceLanguage ? { sourceLanguage } : {}),
    ...(translations.length > 0 ? { translations } : {}),
    createdAt: Number(data.createdAt || 0),
    updatedAt: Number(data.updatedAt || data.createdAt || 0),
  };
}

function parseDiaryTranslations(raw: unknown): DiaryEntryTranslation[] {
  if (!Array.isArray(raw)) return [];
  const out: DiaryEntryTranslation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const language = String(row.language || '').trim();
    const text = String(row.text || '').trim();
    if (!language || !text) continue;
    const title = row.title != null ? String(row.title).trim() : undefined;
    out.push({
      language,
      text,
      ...(title ? { title } : {}),
      ...(row.isAuto ? { isAuto: true } : {}),
    });
  }
  return out;
}

export function emptyDiaryDraft(experienceAt = Date.now()): CircleDiaryEntryDraft {
  return {
    title: '',
    body: '',
    mood: '',
    experienceAt,
    visibility: 'circle',
    isMilestone: false,
  };
}

export function diaryEntryToDraft(entry: CircleDiaryEntry): CircleDiaryEntryDraft {
  return {
    title: entry.title || '',
    body: entry.body,
    mood: entry.mood || '',
    experienceAt: entry.experienceAt,
    visibility:
      entry.visibility === 'shared_with_patient' ? 'circle' : entry.visibility,
    isMilestone: entry.isMilestone,
  };
}

/** Scoped listens so private patient entries do not break circle members with permission-denied. */
export function subscribeCircleDiaryEntries(
  db: Firestore,
  patientId: string,
  memberUid: string,
  onEntries: (entries: CircleDiaryEntry[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const coll = diaryEntriesCollection(db, patientId);
  const buckets = new Map<string, CircleDiaryEntry[]>();
  const unsubs: Unsubscribe[] = [];

  const emit = () => {
    const byId = new Map<string, CircleDiaryEntry>();
    for (const list of buckets.values()) {
      for (const entry of list) {
        byId.set(entry.id, entry);
      }
    }
    const merged = [...byId.values()].sort((a, b) => b.experienceAt - a.experienceAt);
    onEntries(merged);
  };

  const attach = (key: string, q: ReturnType<typeof query>) => {
    unsubs.push(
      onSnapshot(
        q,
        (snap) => {
          buckets.set(
            key,
            snap.docs.map((d) => parseDiaryEntry(d.id, d.data() as Record<string, unknown>)),
          );
          emit();
        },
        (err) => {
          const message = err.message || 'Could not load diary entries.';
          onError?.(message);
        },
      ),
    );
  };

  attach(
    'own',
    query(coll, where('authorUid', '==', memberUid), orderBy('experienceAt', 'desc')),
  );
  attach(
    'shared',
    query(
      coll,
      where('visibility', 'in', ['circle', 'shared_with_patient']),
      orderBy('experienceAt', 'desc'),
    ),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function createDiaryEntry(
  db: Firestore,
  params: {
    patientId: string;
    authorUid: string;
    authorName: string;
    draft: CircleDiaryEntryDraft;
    sourceLanguage?: string;
    translations?: DiaryEntryTranslation[];
  },
): Promise<string> {
  const now = Date.now();
  const title = params.draft.title.trim();
  const body = params.draft.body.trim();
  if (!body) throw new Error('Please write something for your entry.');

  const ref = await addDoc(diaryEntriesCollection(db, params.patientId), {
    patientId: params.patientId,
    authorUid: params.authorUid,
    authorName: params.authorName.trim() || 'Circle member',
    ...(title ? { title } : {}),
    body,
    ...(params.draft.mood ? { mood: params.draft.mood } : {}),
    experienceAt: params.draft.experienceAt || now,
    visibility: params.draft.visibility,
    entryKind: 'human',
    isMilestone: !!params.draft.isMilestone,
    ...(params.sourceLanguage ? { sourceLanguage: params.sourceLanguage } : {}),
    ...(params.translations && params.translations.length > 0
      ? { translations: params.translations }
      : {}),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateDiaryEntry(
  db: Firestore,
  params: {
    patientId: string;
    entryId: string;
    draft: CircleDiaryEntryDraft;
    sourceLanguage?: string;
    translations?: DiaryEntryTranslation[];
  },
): Promise<void> {
  const now = Date.now();
  const title = params.draft.title.trim();
  const body = params.draft.body.trim();
  if (!body) throw new Error('Please write something for your entry.');

  await updateDoc(doc(db, 'patients', params.patientId, 'diary_entries', params.entryId), {
    ...(title ? { title } : { title: '' }),
    body,
    mood: params.draft.mood || '',
    experienceAt: params.draft.experienceAt || now,
    visibility: params.draft.visibility,
    isMilestone: !!params.draft.isMilestone,
    ...(params.sourceLanguage != null
      ? { sourceLanguage: params.sourceLanguage || '' }
      : {}),
    ...(params.translations != null ? { translations: params.translations } : {}),
    updatedAt: now,
  });
}

export async function deleteDiaryEntry(
  db: Firestore,
  patientId: string,
  entryId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'diary_entries', entryId));
}

export function diaryMoodLabel(mood?: DiaryEntryMood): string | undefined {
  if (!mood) return undefined;
  return DIARY_MOOD_OPTIONS.find((o) => o.value === mood)?.label;
}

export function isDiaryEntrySharedWithCircle(entry: CircleDiaryEntry): boolean {
  return entry.visibility === 'circle' || entry.visibility === 'shared_with_patient';
}

async function diaryMilestoneAlreadyRecorded(
  db: Firestore,
  patientId: string,
  sourceRef: string,
): Promise<boolean> {
  const snap = await getDocs(
    query(
      diaryEntriesCollection(db, patientId),
      where('sourceRef', '==', sourceRef),
      limit(1),
    ),
  );
  return !snap.empty;
}

async function writeCareDiaryMilestone(
  db: Firestore,
  params: {
    patientId: string;
    authorUid: string;
    kind: 'appMode' | 'treatmentPhase';
    from: string;
    to: string;
    language?: string | null;
  },
): Promise<void> {
  if (!shouldRecordCareDiaryMilestone(params.from, params.to)) return;

  const copy = resolveCareDiaryMilestoneCopy(
    params.kind,
    params.from,
    params.to,
    params.language,
  );
  if (!copy) return;

  const now = Date.now();
  const sourceRef = careDiaryMilestoneSourceRef(params.kind, params.from, params.to, now);
  if (await diaryMilestoneAlreadyRecorded(db, params.patientId, sourceRef)) return;

  await addDoc(diaryEntriesCollection(db, params.patientId), {
    patientId: params.patientId,
    authorUid: params.authorUid,
    authorName: 'Care milestone',
    title: copy.title,
    body: copy.body,
    mood: '',
    experienceAt: now,
    visibility: 'circle',
    entryKind: 'system',
    isMilestone: true,
    sourceRef,
    createdAt: now,
    updatedAt: now,
  });
}

/** Record human-readable system diary milestones for care-setting transitions. */
export async function recordCareDiaryMilestones(
  db: Firestore,
  params: {
    patientId: string;
    authorUid: string;
    language?: string | null;
    appMode?: { from: string; to: string };
    treatmentPhase?: { from: string; to: string };
  },
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (params.appMode) {
    const from = normalizeAppModeForMilestone(params.appMode.from);
    const to = normalizeAppModeForMilestone(params.appMode.to);
    if (shouldRecordCareDiaryMilestone(from, to)) {
      tasks.push(
        writeCareDiaryMilestone(db, {
          patientId: params.patientId,
          authorUid: params.authorUid,
          kind: 'appMode',
          from,
          to,
          language: params.language,
        }),
      );
    }
  }

  if (params.treatmentPhase) {
    const from = normalizeTreatmentPhaseForMilestone(params.treatmentPhase.from);
    const to = normalizeTreatmentPhaseForMilestone(params.treatmentPhase.to);
    if (shouldRecordCareDiaryMilestone(from, to)) {
      tasks.push(
        writeCareDiaryMilestone(db, {
          patientId: params.patientId,
          authorUid: params.authorUid,
          kind: 'treatmentPhase',
          from,
          to,
          language: params.language,
        }),
      );
    }
  }

  await Promise.all(tasks);
}
