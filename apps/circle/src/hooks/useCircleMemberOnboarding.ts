import { useCallback, useEffect, useState } from 'react';
import { onSnapshot, type Firestore } from 'firebase/firestore';
import {
  dismissMemberOnboardingWelcome,
  memberOnboardingRef,
  parseMemberOnboardingWelcomeDismissed,
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
    return onSnapshot(
      memberOnboardingRef(db, patientId, memberUid),
      (snap) => {
        setDismissed(
          snap.exists()
            ? parseMemberOnboardingWelcomeDismissed(snap.data() as Record<string, unknown>)
            : false,
        );
        setLoading(false);
      },
      () => {
        setDismissed(false);
        setLoading(false);
      },
    );
  }, [db, enabled, memberUid, patientId]);

  const dismissWelcome = useCallback(async () => {
    if (!patientId || !memberUid || dismissing) return;
    setDismissing(true);
    try {
      await dismissMemberOnboardingWelcome(db, patientId, memberUid);
      setDismissed(true);
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
