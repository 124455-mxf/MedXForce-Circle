import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export interface CircleUserProfile {
  uid: string;
  displayName?: string;
  photoUrl?: string;
  email?: string;
  /** Preferred language for Circle UI and patient-app contact labeling. */
  language?: string;
  /** When true, patient-app Circle presence indicators omit this member. */
  hideOnlineStatusFromPatient?: boolean;
  updatedAt: number;
}

export async function getCircleUserProfile(
  db: Firestore,
  uid: string,
): Promise<CircleUserProfile | null> {
  const snap = await getDoc(doc(db, 'circle_profiles', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    email: data.email,
    language: typeof data.language === 'string' ? data.language : undefined,
    hideOnlineStatusFromPatient: data.hideOnlineStatusFromPatient === true,
    updatedAt: data.updatedAt ?? 0,
  };
}

export async function saveCircleUserProfile(
  db: Firestore,
  uid: string,
  patch: Partial<
    Pick<
      CircleUserProfile,
      'displayName' | 'photoUrl' | 'email' | 'language' | 'hideOnlineStatusFromPatient'
    >
  >,
): Promise<void> {
  await setDoc(
    doc(db, 'circle_profiles', uid),
    {
      uid,
      ...patch,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
