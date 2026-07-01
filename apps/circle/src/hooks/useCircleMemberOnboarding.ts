import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  dismissMemberOnboardingWelcome,
  isOnboardingWelcomeDismissedForPatient,
  memberOnboardingRef,
} from '@medxforce/shared';

export function useCircleMemberOnboarding(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
  enabled = true,
) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!enabled || !patientId || !memberUid) {
      setDismissed(false);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let profileData: Record<string, unknown> | undefined;
    let memberData: Record<string, unknown> | undefined;

    const publishDismissed = () => {
      setDismissed(isOnboardingWelcomeDismissedForPatient(profileData, memberData, patientId));
      setLoading(false);
    };

    const profileRef = doc(db, 'circle_profiles', memberUid);
    const memberRef = memberOnboardingRef(db, patientId, memberUid);

    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        profileData = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
        publishDismissed();
      },
      () => {
        profileData = undefined;
        publishDismissed();
      },
    );

    const unsubMember = onSnapshot(
      memberRef,
      (snap) => {
        memberData = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
        publishDismissed();
      },
      () => {
        memberData = undefined;
        publishDismissed();
      },
    );

    return () => {
      unsubProfile();
      unsubMember();
    };
  }, [db, enabled, memberUid, patientId]);

  const dismissWelcome = useCallback(async () => {
    if (!patientId || !memberUid || dismissing) return;
    setDismissing(true);
    try {
      await dismissMemberOnboardingWelcome(db, patientId, memberUid);
      setDismissed(true);
    } catch (err) {
      console.warn('[Circle] Could not dismiss onboarding welcome:', err);
      throw err;
    } finally {
      setDismissing(false);
    }
  }, [db, dismissing, memberUid, patientId]);

  return {
    dismissed,
    loading,
    dismissing,
    dismissWelcome,
    showWelcome: enabled && !loading && !dismissed,
  };
}
