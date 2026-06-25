import { useCallback, useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  createDefaultRemoteSettings,
  subscribeRemoteSettings,
  writeRemoteSettings,
  type CirclePatientSummary,
  type PatientRemoteSettingsDoc,
} from '@medxforce/shared';

export function useCircleRemoteSettings(
  db: Firestore,
  patient: CirclePatientSummary | null,
  user: User | null,
) {
  const [settings, setSettings] = useState<PatientRemoteSettingsDoc | null>(null);
  const [fromFirestore, setFromFirestore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const patientId = patient?.patientId ?? '';

  useEffect(() => {
    if (!patientId) {
      setSettings(null);
      setFromFirestore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    return subscribeRemoteSettings(
      db,
      patientId,
      (remote) => {
        setFromFirestore(remote != null);
        setSettings(remote ?? createDefaultRemoteSettings(patientId));
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [db, patientId]);

  const persist = useCallback(
    (next: PatientRemoteSettingsDoc) => {
      if (!user || !patient) return;
      setSettings(next);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        setSaving(true);
        setError(null);
        try {
          const payload: PatientRemoteSettingsDoc = {
            ...next,
            patientId: patient.patientId,
            updatedAt: Date.now(),
            updatedByUid: user.uid,
            updatedByName: user.displayName || user.email || 'Circle member',
            updatedByRole: patient.role,
            source: 'circle',
          };
          await writeRemoteSettings(db, payload);
          setSavedAt(Date.now());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not save remote settings.');
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [db, patient, user],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  return { settings, fromFirestore, loading, saving, error, savedAt, persist, setSettings };
}
