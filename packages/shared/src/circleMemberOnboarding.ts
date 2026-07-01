import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

/** Placeholder until marketing site / onboarding video is live. */
export const CIRCLE_ONBOARDING_LEARN_MORE_URL = 'https://medxforce.com/circle/getting-started';

export type CircleProfileOnboardingDismissalsByPatient = Record<string, boolean>;

export function parseMemberOnboardingWelcomeDismissed(
  data: Record<string, unknown> | undefined,
): boolean {
  return data?.onboardingWelcomeDismissed === true;
}

export function parseOnboardingWelcomeDismissedByPatient(
  raw: unknown,
): CircleProfileOnboardingDismissalsByPatient {
  if (!raw || typeof raw !== 'object') return {};
  const next: CircleProfileOnboardingDismissalsByPatient = {};
  for (const [patientId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof patientId !== 'string' || !patientId.trim()) continue;
    if (value === true) next[patientId] = true;
  }
  return next;
}

export function isOnboardingWelcomeDismissedForPatient(
  profileData: Record<string, unknown> | undefined,
  memberData: Record<string, unknown> | undefined,
  patientId: string,
): boolean {
  const byPatient = parseOnboardingWelcomeDismissedByPatient(
    profileData?.onboardingWelcomeDismissedByPatient,
  );
  if (byPatient[patientId] === true) return true;
  return parseMemberOnboardingWelcomeDismissed(memberData);
}

/** Legacy member-doc path (read fallback). */
export function memberOnboardingRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export function circleProfileOnboardingRef(db: Firestore, memberUid: string) {
  return doc(db, 'circle_profiles', memberUid);
}

export async function dismissMemberOnboardingWelcome(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<void> {
  const profileRef = circleProfileOnboardingRef(db, memberUid);
  const profileSnap = await getDoc(profileRef);
  const byPatient = profileSnap.exists()
    ? parseOnboardingWelcomeDismissedByPatient(
        profileSnap.data()?.onboardingWelcomeDismissedByPatient,
      )
    : {};

  await setDoc(
    profileRef,
    {
      uid: memberUid,
      onboardingWelcomeDismissedByPatient: {
        ...byPatient,
        [patientId]: true,
      },
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
