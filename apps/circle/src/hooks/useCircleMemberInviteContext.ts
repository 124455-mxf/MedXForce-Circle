import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, type Firestore } from 'firebase/firestore';
import type { CareCalendarMemberInviteContext, CirclePatientSummary } from '@medxforce/shared';
import { useCircleOwnManagedContact } from './useCircleOwnManagedContact';

export function useCircleMemberInviteContext(
  db: Firestore,
  user: User,
  patient: CirclePatientSummary | null,
) {
  const { contact, memberDocContactId, loading } = useCircleOwnManagedContact(db, user, patient);
  const [inviteContactId, setInviteContactId] = useState<string | undefined>();
  const [inviteContactIdReady, setInviteContactIdReady] = useState(false);

  useEffect(() => {
    if (!patient?.patientId || !user.uid) {
      setInviteContactId(undefined);
      setInviteContactIdReady(true);
      return;
    }

    const memberRef = doc(db, 'patients', patient.patientId, 'members', user.uid);
    return onSnapshot(memberRef, (snap) => {
      const inviteRef = String(snap.data()?.inviteRef || '').trim();
      if (!inviteRef) {
        setInviteContactId(undefined);
        setInviteContactIdReady(true);
        return;
      }
      setInviteContactIdReady(false);
      void getDoc(doc(db, 'circle_invites', inviteRef))
        .then((inviteSnap) => {
          const cid = inviteSnap.exists()
            ? String(inviteSnap.data()?.contactId || '').trim()
            : '';
          setInviteContactId(cid || undefined);
        })
        .catch(() => setInviteContactId(undefined))
        .finally(() => setInviteContactIdReady(true));
    });
  }, [db, patient?.patientId, user.uid]);

  const inviteContext = useMemo<CareCalendarMemberInviteContext>(
    () => ({
      memberUid: user.uid,
      contactId: contact?.id,
      memberDocContactId,
      inviteContactId,
      displayName:
        contact?.name?.trim() ||
        user.displayName?.trim() ||
        user.email?.split('@')[0] ||
        undefined,
    }),
    [
      contact?.id,
      contact?.name,
      inviteContactId,
      memberDocContactId,
      user.displayName,
      user.email,
      user.uid,
    ],
  );

  const memberContactId =
    contact?.id ?? memberDocContactId ?? inviteContactId ?? undefined;

  const inviteContextReady = !loading && inviteContactIdReady;

  return { inviteContext, memberContactId, contact, loading, inviteContextReady };
}
