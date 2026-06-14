import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  parseMemberReminderSnoozes,
  snoozeParticipationReminder,
  type CircleParticipationReminderKind,
  type CircleParticipationReminderSnoozes,
} from '@medxforce/shared';

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
    const ref = doc(db, 'patients', patientId, 'members', memberUid);
    return onSnapshot(
      ref,
      (snap) => {
        setSnoozes(
          snap.exists()
            ? parseMemberReminderSnoozes(snap.data() as Record<string, unknown>)
            : {},
        );
        setLoading(false);
      },
      () => {
        setSnoozes({});
        setLoading(false);
      },
    );
  }, [db, memberUid, patientId]);

  const dismissReminder = async (kind: CircleParticipationReminderKind) => {
    if (!patientId || !memberUid) return;
    const next = await snoozeParticipationReminder(db, patientId, memberUid, kind, snoozes);
    setSnoozes(next);
  };

  return { snoozes, loading, dismissReminder };
}
