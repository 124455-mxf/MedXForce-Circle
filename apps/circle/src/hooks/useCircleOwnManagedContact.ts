import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, type Firestore } from 'firebase/firestore';
import {
  findManagedContactByEmail,
  listPatientManagedContacts,
  listProvisionManagedContacts,
  mergeContactWithMemberContactProfile,
  mergeContactWithMemberNotifyPreferences,
  parseMemberContactProfile,
  parseMemberNotifyPreferences,
  parsePatientManagedContacts,
  type CircleManagedContact,
  type CirclePatientSummary,
} from '@medxforce/shared';

function isPendingProvisionPatient(patient: CirclePatientSummary | null): boolean {
  return patient?.isPendingProvision === true || patient?.provisionStatus === 'pending';
}

export function useCircleOwnManagedContact(
  db: Firestore,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingProvision = isPendingProvisionPatient(patient);

  const loadOwnContact = useCallback(async () => {
    if (!patient?.patientId || !user.email) {
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const listed = pendingProvision
        ? await listProvisionManagedContacts(db, patient.patientId)
        : await listPatientManagedContacts(db, patient.patientId);
      const base = findManagedContactByEmail(listed, user.email) ?? null;
      if (!base || !user.uid) {
        setContact(base);
        return;
      }
      const memberRef = pendingProvision
        ? doc(db, 'patient_provisions', patient.patientId, 'members', user.uid)
        : doc(db, 'patients', patient.patientId, 'members', user.uid);
      const memberSnap = await getDoc(memberRef);
      const memberData = memberSnap.exists()
        ? (memberSnap.data() as Record<string, unknown>)
        : undefined;
      const memberProfile = parseMemberContactProfile(memberData);
      const memberPrefs = parseMemberNotifyPreferences(memberData);
      const merged = mergeContactWithMemberContactProfile(base, memberProfile);
      setContact(mergeContactWithMemberNotifyPreferences(merged, memberPrefs));
    } catch (err) {
      console.warn('[useCircleOwnManagedContact]', err);
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId, pendingProvision, user.email, user.uid]);

  useEffect(() => {
    void loadOwnContact();
  }, [loadOwnContact]);

  useEffect(() => {
    if (!patient?.patientId || !user.uid || !user.email) return;

    const patientRef = pendingProvision
      ? doc(db, 'patient_provisions', patient.patientId)
      : doc(db, 'patients', patient.patientId);
    const memberRef = pendingProvision
      ? doc(db, 'patient_provisions', patient.patientId, 'members', user.uid)
      : doc(db, 'patients', patient.patientId, 'members', user.uid);

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
      const memberProfile = parseMemberContactProfile(memberData);
      const memberPrefs = parseMemberNotifyPreferences(memberData);
      const merged = mergeContactWithMemberContactProfile(base, memberProfile);
      setContact(mergeContactWithMemberNotifyPreferences(merged, memberPrefs));
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
  }, [db, patient?.patientId, pendingProvision, user.email, user.uid]);

  return { contact, loading };
}
