import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import {
  buildProfileChangeSummary,
  describeProfileSnapshotChanges,
  meaningfulProfileChangedLabels,
  parseCircleProfileMeta,
  parseCircleProfileSnapshot,
  profileNotificationDocId,
  profileSnapshotFingerprint,
  sanitizeProfileSnapshotForFirestore,
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

  if (
    previousSnapshot &&
    profileSnapshotFingerprint(previousSnapshot) === profileSnapshotFingerprint(snapshot)
  ) {
    return;
  }

  const changedLabels = describeProfileSnapshotChanges(previousSnapshot, snapshot);
  const meaningfulChanges = meaningfulProfileChangedLabels(changedLabels);
  const firestoreSnapshot = sanitizeProfileSnapshotForFirestore(snapshot);
  if (meaningfulChanges.length === 0) {
    await setDoc(
      patientRef,
      {
        profileSnapshot: firestoreSnapshot,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    return;
  }

  const meta: CirclePatientProfileMeta = {
    updatedAt: Date.now(),
    updatedBy: 'proxy',
    updatedByUid: actorUid,
    summary: buildProfileChangeSummary('proxy', patientDisplayName, changedLabels),
    changedLabels,
  };

  const profilePicture = String(snapshot.identity.profilePicture || '').trim();
  await setDoc(
    patientRef,
    {
      profileSnapshot: firestoreSnapshot,
      profileMeta: meta,
      updatedAt: meta.updatedAt,
      photoUrl: profilePicture ? profilePicture : deleteField(),
    },
    { merge: true },
  );

  if (meaningfulChanges.length > 0) {
    const notificationId = profileNotificationDocId('patient_edit', changedLabels);
    try {
      await setDoc(
        doc(db, 'patients', patientId, 'profile_notifications', notificationId),
        {
          type: 'patient_edit',
          timestamp: meta.updatedAt,
          summary: meta.summary || buildProfileChangeSummary('proxy', patientDisplayName, changedLabels),
          changedLabels,
          readBy: { [actorUid]: meta.updatedAt },
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('[updateCirclePatientProfileFromProxy] profile notification', err);
    }
  }
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
  try {
    const snap = await getDocs(
      collection(db, 'patients', patientId, 'profile_notifications'),
    );

    const unread = snap.docs
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
      .filter((row) => !row.readBy?.[readerUid])
      .sort((a, b) => b.timestamp - a.timestamp);

    const seenSignatures = new Set<string>();
    return unread
      .filter((row) => {
        const signature = profileNotificationDocId(row.type, row.changedLabels);
        if (seenSignatures.has(signature)) return false;
        seenSignatures.add(signature);
        return true;
      })
      .slice(0, max);
  } catch (err) {
    console.warn('[listUnreadProfileNotifications]', err);
    return [];
  }
}

export async function markProfileNotificationRead(
  db: Firestore,
  patientId: string,
  notificationId: string,
  readerUid: string,
): Promise<void> {
  const ref = doc(db, 'patients', patientId, 'profile_notifications', notificationId);
  await updateDoc(ref, {
    [`readBy.${readerUid}`]: Date.now(),
  });
}
