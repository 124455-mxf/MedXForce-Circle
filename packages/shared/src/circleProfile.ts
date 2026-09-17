import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export interface CircleUserProfile {
  uid: string;
  displayName?: string;
  photoUrl?: string;
  email?: string;
  /** Preferred language for Circle UI and patient-app contact labeling. */
  language?: string;
  /** Preferred IANA time zone for appointments (home zone, not live GPS). */
  timezoneId?: string;
  /** Who last set `language`: member in Circle app vs patient/proxy in patient app. */
  languageSource?: 'circle' | 'patient';
  /** Patient circle for proxy/patient-managed language writes (rules validation only). */
  managedPatientId?: string;
  /** When true, patient-app Circle presence indicators omit this member. */
  hideOnlineStatusFromPatient?: boolean;
  /** Patient Circle opens on sign-in (synced across devices). */
  startupPatientId?: string;
  /** Circle UI text size: small | medium | large. */
  textSize?: string;
  /** Fingerprint of a dismissed cross-patient identity mismatch notice. */
  identityMismatchNoticeFingerprint?: string;
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
    timezoneId:
      typeof data.timezoneId === 'string' && data.timezoneId.trim()
        ? data.timezoneId.trim()
        : undefined,
    languageSource:
      data.languageSource === 'circle' || data.languageSource === 'patient'
        ? data.languageSource
        : undefined,
    hideOnlineStatusFromPatient: data.hideOnlineStatusFromPatient === true,
    startupPatientId:
      typeof data.startupPatientId === 'string' && data.startupPatientId.trim()
        ? data.startupPatientId.trim()
        : undefined,
    textSize: typeof data.textSize === 'string' ? data.textSize : undefined,
    identityMismatchNoticeFingerprint:
      typeof data.identityMismatchNoticeFingerprint === 'string' &&
      data.identityMismatchNoticeFingerprint.trim()
        ? data.identityMismatchNoticeFingerprint.trim()
        : undefined,
    updatedAt: data.updatedAt ?? 0,
  };
}

function omitUndefinedFields<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export async function saveCircleUserProfile(
  db: Firestore,
  uid: string,
  patch: Partial<
    Pick<
      CircleUserProfile,
      | 'displayName'
      | 'photoUrl'
      | 'email'
      | 'language'
      | 'languageSource'
      | 'timezoneId'
      | 'managedPatientId'
      | 'hideOnlineStatusFromPatient'
      | 'textSize'
      | 'identityMismatchNoticeFingerprint'
    >
  > & {
    /** Pass null to clear the synced startup patient preference. */
    startupPatientId?: string | null;
  },
): Promise<void> {
  const { startupPatientId, ...rest } = patch;
  await setDoc(
    doc(db, 'circle_profiles', uid),
    {
      uid,
      ...omitUndefinedFields(rest as Record<string, unknown>),
      ...(startupPatientId === null
        ? { startupPatientId: deleteField() }
        : startupPatientId !== undefined
          ? { startupPatientId: startupPatientId.trim() }
          : {}),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
