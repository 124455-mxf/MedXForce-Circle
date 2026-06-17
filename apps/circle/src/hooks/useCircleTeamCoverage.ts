import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where, type Firestore } from 'firebase/firestore';
import {
  analyzeCircleTeamCoverage,
  parsePatientManagedContacts,
  type CircleInviteListItem,
  type CircleManagedContact,
  type TeamCoverageAnalysis,
} from '@medxforce/shared';

const EMPTY_ANALYSIS: TeamCoverageAnalysis = {
  hasBackupProxy: false,
  caregiverCount: 0,
  gaps: ['backupProxy', 'otherCaregivers'],
};

export function useCircleTeamCoverage(
  db: Firestore,
  patientId: string | undefined,
  isPendingProvision = false,
): { analysis: TeamCoverageAnalysis; loading: boolean } {
  const [contacts, setContacts] = useState<CircleManagedContact[]>([]);
  const [invites, setInvites] = useState<CircleInviteListItem[]>([]);
  const [contactsReady, setContactsReady] = useState(false);
  const [invitesReady, setInvitesReady] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setContacts([]);
      setInvites([]);
      setContactsReady(false);
      setInvitesReady(false);
      return undefined;
    }

    setContactsReady(false);
    setInvitesReady(false);

    const contactsRef = isPendingProvision
      ? doc(db, 'patient_provisions', patientId)
      : doc(db, 'patients', patientId);

    const unsubContacts = onSnapshot(
      contactsRef,
      (snap) => {
        setContacts(snap.exists() ? parsePatientManagedContacts(snap.data()) : []);
        setContactsReady(true);
      },
      () => {
        setContacts([]);
        setContactsReady(true);
      },
    );

    const unsubInvites = isPendingProvision
      ? onSnapshot(
          collection(db, 'patient_provisions', patientId, 'draft_invites'),
          (snap) => {
            const rows = snap.docs
              .map((inviteDoc) => {
                const data = inviteDoc.data() as Record<string, unknown>;
                const status = (data.status || 'pending') as CircleInviteListItem['status'];
                return {
                  id: inviteDoc.id,
                  invitedEmail: String(data.invitedEmail || ''),
                  displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
                  role: String(data.role || 'member'),
                  proxyTier:
                    data.proxyTier === 'backup' || data.proxyTier === 'primary'
                      ? data.proxyTier
                      : undefined,
                  status,
                  updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
                  acceptedByUid:
                    typeof data.acceptedByUid === 'string' ? data.acceptedByUid : undefined,
                } satisfies CircleInviteListItem;
              })
              .filter((item) => item.invitedEmail);
            setInvites(rows);
            setInvitesReady(true);
          },
          () => {
            setInvites([]);
            setInvitesReady(true);
          },
        )
      : onSnapshot(
          query(collection(db, 'circle_invites'), where('patientId', '==', patientId)),
          (snap) => {
            const rows = snap.docs
              .map((inviteDoc) => {
                const data = inviteDoc.data() as Record<string, unknown>;
                const status = (data.status || 'pending') as CircleInviteListItem['status'];
                return {
                  id: inviteDoc.id,
                  invitedEmail: String(data.invitedEmail || ''),
                  displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
                  role: String(data.role || 'member'),
                  proxyTier:
                    data.proxyTier === 'backup' || data.proxyTier === 'primary'
                      ? data.proxyTier
                      : undefined,
                  status,
                  updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
                  acceptedByUid:
                    typeof data.acceptedByUid === 'string' ? data.acceptedByUid : undefined,
                } satisfies CircleInviteListItem;
              })
              .filter((item) => item.invitedEmail);
            setInvites(rows);
            setInvitesReady(true);
          },
          () => {
            setInvites([]);
            setInvitesReady(true);
          },
        );

    return () => {
      unsubContacts();
      unsubInvites();
    };
  }, [db, isPendingProvision, patientId]);

  const analysis = useMemo(
    () => (contactsReady && invitesReady ? analyzeCircleTeamCoverage(contacts, invites) : EMPTY_ANALYSIS),
    [contacts, contactsReady, invites, invitesReady],
  );

  return {
    analysis,
    loading: !patientId || !contactsReady || !invitesReady,
  };
}
