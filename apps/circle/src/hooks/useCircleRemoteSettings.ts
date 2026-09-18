import { useCallback, useEffect, useRef, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  applyDailyCheckInDefaultOnAllStages,
  applyDailyLifeAssessmentScheduleIfNeeded,
  createDefaultRemoteSettings,
  subscribeRemoteSettings,
  syncCirclePatientProfileLanguageFromRemoteSettings,
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
  const pendingSaveRef = useRef<PatientRemoteSettingsDoc | null>(null);
  const savingRef = useRef(false);
  const patientIdRef = useRef('');

  const patientId = patient?.patientId ?? '';
  patientIdRef.current = patientId;

  const cancelPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    savingRef.current = false;
  }, []);

  useEffect(() => {
    cancelPendingSave();
    setSaving(false);
    setError(null);
    setSavedAt(null);

    if (!patientId) {
      setSettings(null);
      setFromFirestore(false);
      setLoading(false);
      return;
    }

    setSettings(null);
    setFromFirestore(false);
    setLoading(true);

    return subscribeRemoteSettings(
      db,
      patientId,
      (remote) => {
        if (patientIdRef.current !== patientId) return;
        // Do not cancel a pending proxy save when the patient app echoes remote_settings.
        if (pendingSaveRef.current || savingRef.current) {
          setLoading(false);
          return;
        }
        setFromFirestore(remote != null);
        setSettings(remote ?? createDefaultRemoteSettings(patientId));
        setLoading(false);
      },
      (message) => {
        if (patientIdRef.current !== patientId) return;
        setError(message);
        setLoading(false);
      },
    );
  }, [cancelPendingSave, db, patientId]);

  const persist = useCallback(
    (next: PatientRemoteSettingsDoc) => {
      if (!user || !patient) return;
      const targetPatientId = patient.patientId;
      const targetRole = patient.role;
      const targetDisplayName = patient.displayName;
      const previousPrimaryLanguage = settings?.primaryLanguage;
      pendingSaveRef.current = next;
      setSettings(next);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        if (patientIdRef.current !== targetPatientId) {
          pendingSaveRef.current = null;
          savingRef.current = false;
          setSaving(false);
          return;
        }
        const draft = pendingSaveRef.current ?? next;
        savingRef.current = true;
        setSaving(true);
        setError(null);
        try {
          const payload: PatientRemoteSettingsDoc = {
            ...draft,
            patientId: targetPatientId,
            updatedAt: Date.now(),
            updatedByUid: user.uid,
            updatedByName: user.displayName || user.email || 'Circle member',
            updatedByRole: targetRole,
            source: 'circle',
          };
          await writeRemoteSettings(db, payload);
          if (patientIdRef.current !== targetPatientId) {
            pendingSaveRef.current = null;
            return;
          }
          if (
            payload.primaryLanguage &&
            payload.primaryLanguage !== previousPrimaryLanguage
          ) {
            try {
              await syncCirclePatientProfileLanguageFromRemoteSettings(
                db,
                targetPatientId,
                payload.primaryLanguage,
                user.uid,
                targetDisplayName,
                user.displayName || undefined,
              );
            } catch (err) {
              console.warn('[circleRemoteSettings] profile language', err);
            }
          }
          pendingSaveRef.current = null;
          setSavedAt(Date.now());
        } catch (err) {
          if (patientIdRef.current !== targetPatientId) return;
          setError(err instanceof Error ? err.message : 'Could not save remote settings.');
        } finally {
          if (patientIdRef.current === targetPatientId) {
            savingRef.current = false;
            setSaving(false);
          }
        }
      }, 600);
    },
    [db, patient, settings?.primaryLanguage, user],
  );

  useEffect(() => {
    if (!settings || !fromFirestore || !user || !patient) return;
    if (pendingSaveRef.current || savingRef.current) return;
    if (settings.patientId && settings.patientId !== patient.patientId) return;
    const checkIn = applyDailyCheckInDefaultOnAllStages(settings);
    const schedule = applyDailyLifeAssessmentScheduleIfNeeded(checkIn.next);
    if (checkIn.changed || schedule.changed) persist(schedule.next);
  }, [settings, fromFirestore, user, patient, persist]);

  useEffect(() => () => cancelPendingSave(), [cancelPendingSave]);

  return { settings, fromFirestore, loading, saving, error, savedAt, persist, setSettings };
}
