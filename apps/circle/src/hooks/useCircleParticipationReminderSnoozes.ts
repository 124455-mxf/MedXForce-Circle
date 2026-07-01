import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  parseMemberReminderSnoozes,
  parseReminderSnoozesByPatient,
  snoozeParticipationReminder,
  type CircleParticipationReminderKind,
  type CircleParticipationReminderSnoozes,
} from '@medxforce/shared';

function readPatientSnoozesFromProfileData(
  data: Record<string, unknown> | undefined,
  patientId: string,
): CircleParticipationReminderSnoozes {
  if (!data) return {};
  const byPatient = parseReminderSnoozesByPatient(data.reminderSnoozesByPatient);
  return byPatient[patientId] ?? {};
}

export function useCircleParticipationReminderSnoozes(
  db: Firestore,
  patientId: string | undefined,
  memberUid: string | undefined,
): {
  snoozes: CircleParticipationReminderSnoozes;
  loading: boolean;
  dismissReminder: (kind: CircleParticipationReminderKind) => Promise<void>;
} {
  const [snoozes, setSnoozes] = useState<CircleParticipationReminderSnoozes>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId || !memberUid) {
      setSnoozes({});
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let profileSnoozes: CircleParticipationReminderSnoozes = {};
    let legacySnoozes: CircleParticipationReminderSnoozes = {};

    const publishMergedSnoozes = () => {
      setSnoozes({ ...legacySnoozes, ...profileSnoozes });
      setLoading(false);
    };

    const profileRef = doc(db, 'circle_profiles', memberUid);
    const legacyRef = doc(db, 'patients', patientId, 'members', memberUid);

    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        profileSnoozes = snap.exists()
          ? readPatientSnoozesFromProfileData(snap.data() as Record<string, unknown>, patientId)
          : {};
        publishMergedSnoozes();
      },
      () => {
        profileSnoozes = {};
        publishMergedSnoozes();
      },
    );

    const unsubLegacy = onSnapshot(
      legacyRef,
      (snap) => {
        legacySnoozes = snap.exists()
          ? parseMemberReminderSnoozes(snap.data() as Record<string, unknown>)
          : {};
        publishMergedSnoozes();
      },
      () => {
        legacySnoozes = {};
        publishMergedSnoozes();
      },
    );

    return () => {
      unsubProfile();
      unsubLegacy();
    };
  }, [db, memberUid, patientId]);

  const dismissReminder = useCallback(
    async (kind: CircleParticipationReminderKind) => {
      if (!patientId || !memberUid) return;
      const next = await snoozeParticipationReminder(db, patientId, memberUid, kind, snoozes);
      setSnoozes(next);
    },
    [db, memberUid, patientId, snoozes],
  );

  return { snoozes, loading, dismissReminder };
}
