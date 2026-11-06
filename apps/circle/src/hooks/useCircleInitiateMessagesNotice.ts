import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  canCircleMemberInitiateMessage,
  dismissCircleInitiateMessagesNotice,
  isCircleInitiateMessagesNoticeDismissed,
  parseCircleInitiateMessagesConfig,
  type PatientRemoteSettingsDoc,
} from '@medxforce/shared';

export function useCircleInitiateMessagesNotice(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
  memberRole: string | undefined,
  remoteSettings: PatientRemoteSettingsDoc | null | undefined,
  enabled = true,
) {
  const [profileData, setProfileData] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  const config = useMemo(
    () => parseCircleInitiateMessagesConfig(remoteSettings),
    [remoteSettings],
  );

  const canInitiate =
    !!patientId &&
    !!memberUid &&
    !!memberRole &&
    canCircleMemberInitiateMessage(config, remoteSettings?.appMode, {
      uid: memberUid,
      role: memberRole,
    });

  useEffect(() => {
    if (!enabled || !patientId || !memberUid || !canInitiate) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const profileRef = doc(db, 'circle_profiles', memberUid);
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        setProfileData(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
        setLoading(false);
      },
      () => {
        setProfileData(undefined);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [canInitiate, db, enabled, memberUid, patientId]);

  const dismissed =
    !patientId ||
    isCircleInitiateMessagesNoticeDismissed(
      profileData,
      patientId,
      config.circleInitiateMessagesEnabledAt,
    );

  const dismissNotice = useCallback(async () => {
    if (!patientId || !memberUid || dismissing) return;
    setDismissing(true);
    try {
      await dismissCircleInitiateMessagesNotice(
        db,
        patientId,
        memberUid,
        config.circleInitiateMessagesEnabledAt,
      );
    } catch (err) {
      console.warn('[Circle] Could not dismiss initiate-messages notice:', err);
      throw err;
    } finally {
      setDismissing(false);
    }
  }, [config.circleInitiateMessagesEnabledAt, db, dismissing, memberUid, patientId]);

  const showNotice =
    enabled &&
    canInitiate &&
    config.circleInitiateMessagesEnabledAt > 0 &&
    !loading &&
    !dismissed;

  return {
    canInitiate,
    showNotice,
    dismissing,
    dismissNotice,
  };
}
