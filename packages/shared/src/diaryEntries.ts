import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type Firestore,
  updateDoc,
} from 'firebase/firestore';

/** Who can see the entry — private stays with the author (and patient); circle is visible to all members. */
export type DiaryEntryVisibility = 'private' | 'circle';

export type DiaryEntryMood =
  | 'grateful'
  | 'hopeful'
  | 'worried'
  | 'overwhelmed'
  | 'peaceful'
  | 'sad'
  | 'joyful'
  | 'reflective';

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
  createdAt: number;
  updatedAt: number;
}

export type CircleDiaryEntryDraft = {
  title: string;
  body: string;
  mood: DiaryEntryMood | '';
  experienceAt: number;
  visibility: DiaryEntryVisibility;
};

export const DIARY_MOOD_OPTIONS: {
  value: DiaryEntryMood;
  label: string;
}[] = [
  { value: 'grateful', label: 'Grateful' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'joyful', label: 'Joyful' },
  { value: 'peaceful', label: 'Peaceful' },
  { value: 'reflective', label: 'Reflective' },
  { value: 'worried', label: 'Worried' },
  { value: 'sad', label: 'Sad' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
];

export function diaryEntriesCollection(db: Firestore, patientId: string) {
  return collection(db, 'patients', patientId, 'diary_entries');
}

export function parseDiaryEntry(id: string, data: Record<string, unknown>): CircleDiaryEntry {
  return {
    id,
    patientId: String(data.patientId || ''),
    authorUid: String(data.authorUid || ''),
    authorName: String(data.authorName || 'Someone'),
    title: data.title ? String(data.title) : undefined,
    body: String(data.body || ''),
    mood: data.mood ? (String(data.mood) as DiaryEntryMood) : undefined,
    experienceAt: Number(data.experienceAt || data.createdAt || 0),
    visibility: data.visibility === 'circle' ? 'circle' : 'private',
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
  };
}

export function diaryEntryToDraft(entry: CircleDiaryEntry): CircleDiaryEntryDraft {
  return {
    title: entry.title || '',
    body: entry.body,
    mood: entry.mood || '',
    experienceAt: entry.experienceAt,
    visibility: entry.visibility,
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
