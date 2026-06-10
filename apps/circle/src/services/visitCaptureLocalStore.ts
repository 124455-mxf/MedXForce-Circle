const DB_NAME = 'medx_visit_capture';
const DB_VERSION = 1;
const STORE = 'segments';

export type LocalVisitSegment = {
  id: string;
  sessionId: string;
  segmentIndex: number;
  blob: Blob;
  durationMs?: number;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function saveLocalVisitSegment(segment: LocalVisitSegment): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    tx.objectStore(STORE).put(segment);
  });
  db.close();
}

export async function listLocalVisitSegments(sessionId: string): Promise<LocalVisitSegment[]> {
  const db = await openDb();
  const all = await new Promise<LocalVisitSegment[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as LocalVisitSegment[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
  });
  db.close();
  return all
    .filter((s) => s.sessionId === sessionId)
    .sort((a, b) => a.segmentIndex - b.segmentIndex);
}

export async function clearLocalVisitSegments(sessionId: string): Promise<void> {
  const segments = await listLocalVisitSegments(sessionId);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
    const store = tx.objectStore(STORE);
    for (const seg of segments) {
      store.delete(seg.id);
    }
  });
  db.close();
}
