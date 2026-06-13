import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  findManagedContactByEmail,
  listPatientManagedContacts,
  mergeContactWithMemberNotifyPreferences,
  parseMemberNotifyPreferences,
  parsePatientManagedContacts,
  readMemberNotifyPreferences,
  type CircleManagedContact,
  type CirclePatientSummary,
} from '@medxforce/shared';

export function useCircleOwnManagedContact(
  db: Firestore,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOwnContact = useCallback(async () => {
    if (!patient?.patientId || !user.email) {
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const listed = await listPatientManagedContacts(db, patient.patientId);
      const base = findManagedContactByEmail(listed, user.email) ?? null;
      if (!base || !user.uid) {
        setContact(base);
        return;
      }
      const memberPrefs = await readMemberNotifyPreferences(db, patient.patientId, user.uid);
      setContact(mergeContactWithMemberNotifyPreferences(base, memberPrefs));
    } catch (err) {
      console.warn('[useCircleOwnManagedContact]', err);
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId, user.email, user.uid]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId || !user.uid || !user.email) return;

    const patientRef = doc(db, 'patients', patient.patientId);
    const memberRef = doc(db, 'patients', patient.patientId, 'members', user.uid);

    const apply = (
      patientData: Record<string, unknown> | undefined,
      memberData: Record<string, unknown> | undefined,
    ) => {
      if (!patientData) return;
      const listed = parsePatientManagedContacts(patientData);
      const base = findManagedContactByEmail(listed, user.email ?? '');
      if (!base) {
        setContact(null);
        return;
      }
      const memberPrefs = parseMemberNotifyPreferences(memberData);
      setContact(mergeContactWithMemberNotifyPreferences(base, memberPrefs));
    };

    let latestPatient: Record<string, unknown> | undefined;
    let latestMember: Record<string, unknown> | undefined;

    const unsubPatient = onSnapshot(patientRef, (snap) => {
      latestPatient = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      apply(latestPatient, latestMember);
    });
    const unsubMember = onSnapshot(memberRef, (snap) => {
      latestMember = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      apply(latestPatient, latestMember);
    });

    return () => {
      unsubPatient();
      unsubMember();
    };
  }, [db, patient?.patientId, user.email, user.uid]);

  return { contact, loading };
}
