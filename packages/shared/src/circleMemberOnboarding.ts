import { doc, setDoc, type Firestore } from 'firebase/firestore';

/** Placeholder until marketing site / onboarding video is live. */
export const CIRCLE_ONBOARDING_LEARN_MORE_URL = 'https://medxforce.com/circle/getting-started';

export function parseMemberOnboardingWelcomeDismissed(
  data: Record<string, unknown> | undefined,
): boolean {
  return data?.onboardingWelcomeDismissed === true;
}

export function memberOnboardingRef(db: Firestore, patientId: string, memberUid: string) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export async function dismissMemberOnboardingWelcome(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<void> {
  await setDoc(
    memberOnboardingRef(db, patientId, memberUid),
    {
      onboardingWelcomeDismissed: true,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
