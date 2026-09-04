import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  circleMemberIdentityFingerprint,
  circleMemberIdentityHasMismatch,
  getCircleUserProfile,
  loadCircleMemberIdentitySnapshots,
  saveCircleUserProfile,
  type CircleMemberIdentitySnapshot,
  type CirclePatientSummary,
} from '@medxforce/shared';

export const CIRCLE_IDENTITY_MISMATCH_CHANGED = 'circleIdentityMismatchChanged';

export function notifyCircleIdentityMismatchChanged() {
  window.dispatchEvent(new Event(CIRCLE_IDENTITY_MISMATCH_CHANGED));
}

export function useCircleMemberIdentityMismatch(
  db: Firestore,
  user: User | null,
  patients: CirclePatientSummary[],
) {
  const [snapshots, setSnapshots] = useState<CircleMemberIdentitySnapshot[]>([]);
  const [dismissedFingerprint, setDismissedFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const patientKey = patients
    .map((p) => `${p.patientId}:${p.displayName}`)
    .sort()
    .join('|');

  useEffect(() => {
    const onChanged = () => setReloadToken((n) => n + 1);
    window.addEventListener(CIRCLE_IDENTITY_MISMATCH_CHANGED, onChanged);
    return () => window.removeEventListener(CIRCLE_IDENTITY_MISMATCH_CHANGED, onChanged);
  }, []);

  useEffect(() => {
    if (!user?.uid || !user.email || patients.length < 2) {
      setSnapshots([]);
      setDismissedFingerprint(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void Promise.all([
      loadCircleMemberIdentitySnapshots(
        db,
        user.uid,
        user.email,
        patients.map((p) => ({ patientId: p.patientId, displayName: p.displayName })),
      ),
      getCircleUserProfile(db, user.uid),
    ])
      .then(([rows, profile]) => {
        if (!active) return;
        setSnapshots(rows);
        setDismissedFingerprint(profile?.identityMismatchNoticeFingerprint?.trim() || null);
      })
      .catch((err) => {
        console.warn('[Circle] Identity mismatch load skipped —', err);
        if (active) setSnapshots([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // patientKey captures ids + display names without depending on the array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, patientKey, reloadToken, user?.email, user?.uid]);

  const hasMismatch = useMemo(
    () => circleMemberIdentityHasMismatch(snapshots),
    [snapshots],
  );
  const fingerprint = useMemo(
    () => (hasMismatch ? circleMemberIdentityFingerprint(snapshots) : ''),
    [hasMismatch, snapshots],
  );
  const patientNames = useMemo(
    () => snapshots.map((row) => row.patientName).filter(Boolean),
    [snapshots],
  );

  const showDashboardNotice = hasMismatch && fingerprint !== dismissedFingerprint;

  const dismissDashboardNotice = useCallback(async () => {
    if (!user?.uid || !fingerprint) return;
    const previous = dismissedFingerprint;
    setDismissedFingerprint(fingerprint);
    try {
      await saveCircleUserProfile(db, user.uid, {
        identityMismatchNoticeFingerprint: fingerprint,
      });
    } catch (err) {
      console.warn('[Circle] Identity mismatch dismiss failed —', err);
      setDismissedFingerprint(previous);
    }
  }, [db, dismissedFingerprint, fingerprint, user?.uid]);

  return {
    loading,
    hasMismatch,
    patientNames,
    showDashboardNotice,
    dismissDashboardNotice,
  };
}
