import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

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
  isMilestone: boolean;
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
    isMilestone: !!data.isMilestone,
    createdAt: Number(data.createdAt || 0),
    updatedAt: Number(data.updatedAt || data.createdAt || 0),
  };
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
