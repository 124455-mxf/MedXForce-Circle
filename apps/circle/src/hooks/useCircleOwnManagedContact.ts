import { useCallback, useEffect, useRef, useState } from 'react';
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
  shouldSyncCircleMemberInviteContactId,
  syncCircleMemberInviteContactId,
  type CircleManagedContact,
  type CirclePatientSummary,
} from '@medxforce/shared';

function isPendingProvisionPatient(patient: CirclePatientSummary | null): boolean {
  return patient?.isPendingProvision === true || patient?.provisionStatus === 'pending';
}

function managedContactEqual(
  a: CircleManagedContact | null,
  b: CircleManagedContact | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.id === b.id &&
    a.name === b.name &&
    (a.firstName || '') === (b.firstName || '') &&
    (a.lastName || '') === (b.lastName || '') &&
    (a.dateOfBirth || '') === (b.dateOfBirth || '') &&
    a.email === b.email &&
    a.mobile === b.mobile &&
    a.language === b.language &&
    a.relationship === b.relationship &&
    a.kind === b.kind &&
    a.alert === b.alert &&
    a.attention === b.attention &&
    a.message === b.message &&
    a.sms === b.sms
  );
}

export function useCircleOwnManagedContact(
  db: Firestore,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const [contact, setContact] = useState<CircleManagedContact | null>(null);
  const [memberDocContactId, setMemberDocContactId] = useState<string | undefined>();
  const [memberRole, setMemberRole] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const pendingProvision = isPendingProvisionPatient(patient);
  const syncAttemptedRef = useRef('');

  const loadOwnContact = useCallback(async () => {
    if (!patient?.patientId || !user.email) {
      setContact(null);
      setMemberDocContactId(undefined);
      setMemberRole(undefined);
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
      const nextMemberDocContactId =
        String(memberData?.contactId || '').trim() || undefined;
      setMemberDocContactId((prev) =>
        prev === nextMemberDocContactId ? prev : nextMemberDocContactId,
      );
      setMemberRole((prev) => {
        const nextRole = String(memberData?.role || '').trim() || undefined;
        return prev === nextRole ? prev : nextRole;
      });
      let memberProfile = parseMemberContactProfile(memberData);
      let memberPrefs = parseMemberNotifyPreferences(memberData);
      if (!pendingProvision) {
        const [contactPrefsSnap, notifyPrefsSnap] = await Promise.all([
          getDoc(
            doc(db, 'patients', patient.patientId, 'members', user.uid, 'prefs', 'contact'),
          ),
          getDoc(
            doc(
              db,
              'patients',
              patient.patientId,
              'members',
              user.uid,
              'prefs',
              'notifications',
            ),
          ),
        ]);
        if (contactPrefsSnap.exists()) {
          memberProfile = parseMemberContactProfile(
            contactPrefsSnap.data() as Record<string, unknown>,
          );
        }
        if (notifyPrefsSnap.exists()) {
          memberPrefs = parseMemberNotifyPreferences(
            notifyPrefsSnap.data() as Record<string, unknown>,
          );
        }
      }
      const merged = mergeContactWithMemberContactProfile(base, memberProfile);
      const nextContact = mergeContactWithMemberNotifyPreferences(merged, memberPrefs);
      setContact((prev) => (managedContactEqual(prev, nextContact) ? prev : nextContact));
    } catch (err) {
      console.warn('[useCircleOwnManagedContact]', err);
      setContact(null);
      setMemberDocContactId(undefined);
      setMemberRole(undefined);
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
      contactPrefsData?: Record<string, unknown> | undefined,
      notifyPrefsData?: Record<string, unknown> | undefined,
    ) => {
      if (!patientData) return;
      const listed = parsePatientManagedContacts(patientData);
      const base = findManagedContactByEmail(listed, user.email ?? '');
      const nextMemberDocContactId =
        String(memberData?.contactId || '').trim() || undefined;
      const nextRole = String(memberData?.role || '').trim() || undefined;
      setMemberDocContactId((prev) =>
        prev === nextMemberDocContactId ? prev : nextMemberDocContactId,
      );
      setMemberRole((prev) => (prev === nextRole ? prev : nextRole));
      if (!base) {
        setContact((prev) => (prev === null ? prev : null));
        return;
      }
      const memberProfile = parseMemberContactProfile(contactPrefsData ?? memberData);
      const memberPrefs = parseMemberNotifyPreferences(notifyPrefsData ?? memberData);
      const merged = mergeContactWithMemberContactProfile(base, memberProfile);
      const nextContact = mergeContactWithMemberNotifyPreferences(merged, memberPrefs);
      setContact((prev) => (managedContactEqual(prev, nextContact) ? prev : nextContact));
    };

    let latestPatient: Record<string, unknown> | undefined;
    let latestMember: Record<string, unknown> | undefined;
    let latestContactPrefs: Record<string, unknown> | undefined;
    let latestNotifyPrefs: Record<string, unknown> | undefined;

    const unsubPatient = onSnapshot(
      patientRef,
      (snap) => {
        latestPatient = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
        apply(latestPatient, latestMember, latestContactPrefs, latestNotifyPrefs);
      },
      (err) => {
        console.warn('[useCircleOwnManagedContact] patient listener', err);
      },
    );
    const unsubMember = onSnapshot(
      memberRef,
      (snap) => {
        latestMember = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
        apply(latestPatient, latestMember, latestContactPrefs, latestNotifyPrefs);
      },
      (err) => {
        console.warn('[useCircleOwnManagedContact] member listener', err);
      },
    );

    const unsubs = [unsubPatient, unsubMember];
    if (!pendingProvision) {
      const contactPrefsRef = doc(
        db,
        'patients',
        patient.patientId,
        'members',
        user.uid,
        'prefs',
        'contact',
      );
      const notifyPrefsRef = doc(
        db,
        'patients',
        patient.patientId,
        'members',
        user.uid,
        'prefs',
        'notifications',
      );
      unsubs.push(
        onSnapshot(contactPrefsRef, (snap) => {
          latestContactPrefs = snap.exists()
            ? (snap.data() as Record<string, unknown>)
            : undefined;
          apply(latestPatient, latestMember, latestContactPrefs, latestNotifyPrefs);
        }),
        onSnapshot(notifyPrefsRef, (snap) => {
          latestNotifyPrefs = snap.exists()
            ? (snap.data() as Record<string, unknown>)
            : undefined;
          apply(latestPatient, latestMember, latestContactPrefs, latestNotifyPrefs);
        }),
      );
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [db, patient?.patientId, pendingProvision, user.email, user.uid]);

  useEffect(() => {
    if (!patient?.patientId || !user.uid || !contact?.id) return;
    if (!shouldSyncCircleMemberInviteContactId(memberRole)) return;
    if (contact.id === memberDocContactId) return;

    const attemptKey = `${patient.patientId}:${user.uid}:${contact.id}:${memberRole ?? ''}`;
    if (syncAttemptedRef.current === attemptKey) return;
    syncAttemptedRef.current = attemptKey;

    void syncCircleMemberInviteContactId(
      db,
      patient.patientId,
      user.uid,
      contact.id,
      memberDocContactId,
      memberRole,
    ).catch((err) => {
      console.warn('[useCircleOwnManagedContact] contactId sync failed', err);
    });
  }, [contact?.id, db, memberDocContactId, memberRole, patient?.patientId, user.uid]);

  return { contact, memberDocContactId, loading };
}
