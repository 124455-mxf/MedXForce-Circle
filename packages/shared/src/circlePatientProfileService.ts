import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  buildProfileChangeSummary,
  describeProfileSnapshotChanges,
  parseCircleProfileMeta,
  parseCircleProfileSnapshot,
  type CirclePatientProfileMeta,
  type CirclePatientProfileSnapshot,
  type CircleProfileNotification,
} from './circlePatientProfile';

export interface CirclePatientProfileState {
  snapshot: CirclePatientProfileSnapshot | null;
  meta: CirclePatientProfileMeta | null;
}

export async function readCirclePatientProfile(
  db: Firestore,
  patientId: string,
): Promise<CirclePatientProfileState> {
  const snap = await getDoc(doc(db, 'patients', patientId));
  if (!snap.exists()) return { snapshot: null, meta: null };
  const data = snap.data();
  return {
    snapshot: parseCircleProfileSnapshot(data.profileSnapshot),
    meta: parseCircleProfileMeta(data.profileMeta),
  };
}

export async function updateCirclePatientProfileFromProxy(
  db: Firestore,
  patientId: string,
  snapshot: CirclePatientProfileSnapshot,
  actorUid: string,
  patientDisplayName: string,
): Promise<void> {
  const patientRef = doc(db, 'patients', patientId);
  const existingSnap = await getDoc(patientRef);
  const previousSnapshot = existingSnap.exists()
    ? parseCircleProfileSnapshot(existingSnap.data()?.profileSnapshot)
    : null;

  const changedLabels = describeProfileSnapshotChanges(previousSnapshot, snapshot);
  const meta: CirclePatientProfileMeta = {
    updatedAt: Date.now(),
    updatedBy: 'proxy',
    updatedByUid: actorUid,
    summary: buildProfileChangeSummary('proxy', patientDisplayName, changedLabels),
    changedLabels,
  };

  await setDoc(
    patientRef,
    {
      profileSnapshot: snapshot,
      profileMeta: meta,
      updatedAt: meta.updatedAt,
    },
    { merge: true },
  );
}

export interface CircleProfileNotificationRow extends CircleProfileNotification {
  id: string;
}

export async function listUnreadProfileNotifications(
  db: Firestore,
  patientId: string,
  readerUid: string,
  max = 5,
): Promise<CircleProfileNotificationRow[]> {
  const snap = await getDocs(
    query(
      collection(db, 'patients', patientId, 'profile_notifications'),
      orderBy('timestamp', 'desc'),
      limit(max),
    ),
  );

  return snap.docs
    .map((row) => {
      const data = row.data();
      return {
        id: row.id,
        type: data.type as CircleProfileNotification['type'],
        timestamp: Number(data.timestamp) || 0,
        summary: String(data.summary || ''),
        changedLabels: Array.isArray(data.changedLabels) ? data.changedLabels.map(String) : [],
        readBy: (data.readBy as Record<string, number>) || {},
      };
    })
    .filter((row) => !row.readBy?.[readerUid]);
}

export async function markProfileNotificationRead(
  db: Firestore,
  patientId: string,
  notificationId: string,
  readerUid: string,
): Promise<void> {
  const ref = doc(db, 'patients', patientId, 'profile_notifications', notificationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const readBy = { ...((snap.data()?.readBy as Record<string, number>) || {}), [readerUid]: Date.now() };
  await updateDoc(ref, { readBy });
}
