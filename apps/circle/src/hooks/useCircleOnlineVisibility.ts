import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { saveCircleUserProfile } from '@medxforce/shared';
import { markCircleMemberPresenceOffline } from '../services/circleMemberPresenceService';

export function useCircleOnlineVisibility(
  db: Firestore,
  uid: string | undefined,
  activePatientId?: string,
) {
  const [hideOnlineStatusFromPatient, setHideOnlineStatusFromPatient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!uid) {
      setHideOnlineStatusFromPatient(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      doc(db, 'circle_profiles', uid),
      (snap) => {
        setHideOnlineStatusFromPatient(snap.data()?.hideOnlineStatusFromPatient === true);
        setLoading(false);
      },
      () => {
        setHideOnlineStatusFromPatient(false);
        setLoading(false);
      },
    );
  }, [db, uid]);

  const updateHideOnlineStatusFromPatient = useCallback(
    async (hide: boolean) => {
      if (!uid) return;
      setSaving(true);
      try {
        await saveCircleUserProfile(db, uid, { hideOnlineStatusFromPatient: hide });
        if (hide && activePatientId) {
          await markCircleMemberPresenceOffline(db, activePatientId, uid);
        }
        setHideOnlineStatusFromPatient(hide);
      } finally {
        setSaving(false);
      }
    },
    [activePatientId, db, uid],
  );

  return {
    hideOnlineStatusFromPatient,
    loading,
    saving,
    updateHideOnlineStatusFromPatient,
  };
}
